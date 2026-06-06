import logging
import random
from decimal import Decimal
from celery import shared_task, group
from django.utils import timezone
from django.db.models import FileField, ImageField
from django.db import OperationalError
from django.contrib.auth import get_user_model
from django.apps import apps
from core_tenants.models import Tenant, Company
from saas_billing.models import TenantUsageSnapshot

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, autoretry_for=(OperationalError,), retry_backoff=True)
def aggregate_single_tenant(self, tenant_id):
    """
    Calculates current usage metrics for a single tenant.
    Designed to be run asynchronously via fan-out to prevent thundering herd.
    """
    try:
        tenant = Tenant.objects.get(id=tenant_id, is_active=True)
    except Tenant.DoesNotExist:
        return
        
    today = timezone.now().date()
    
    try:
        active_users = User.objects.filter(tenant=tenant, is_active=True).count()
        total_users = User.objects.filter(tenant=tenant).count()
        companies_count = Company.objects.filter(tenant=tenant).count()
        
        from products.models import Product
        products_count = Product.objects.filter(tenant=tenant).count()
        
        from orders.models import Order
        orders_count = Order.objects.filter(tenant=tenant).count()
        
        from jobs.models import Job
        jobs_count = Job.objects.filter(tenant=tenant).count()
        
        # API Requests - Placeholder
        api_requests_count = 0
        
        # Note: We do NOT overwrite storage_used_mb here, as it is tracked by signals
        # and reconciled by a separate task. We only update the other metrics.
        
        snapshot, created = TenantUsageSnapshot.objects.get_or_create(
            tenant=tenant,
            snapshot_date=today,
            defaults={
                'active_users': active_users,
                'total_users': total_users,
                'companies': companies_count,
                'products': products_count,
                'orders': orders_count,
                'jobs': jobs_count,
                'api_requests': api_requests_count
            }
        )
        
        if not created:
            snapshot.active_users = active_users
            snapshot.total_users = total_users
            snapshot.companies = companies_count
            snapshot.products = products_count
            snapshot.orders = orders_count
            snapshot.jobs = jobs_count
            snapshot.api_requests = api_requests_count
            snapshot.save(update_fields=['active_users', 'total_users', 'companies', 'products', 'orders', 'jobs', 'api_requests'])

    except Exception as e:
        logger.error(f"USAGE_AGGREGATION_FAILURE: Error aggregating usage for tenant {tenant_id}: {str(e)}")
        raise

@shared_task
def aggregate_all_tenants():
    """
    Master task that fans out to individual tenant aggregation tasks.
    Uses Celery groups and random countdowns (jitter) to organically spread DB load.
    """
    tenant_ids = list(Tenant.objects.filter(is_active=True).values_list('id', flat=True))
    
    # We use countdown with random jitter (0 to 600 seconds) to spread the load over 10 minutes
    # preventing database connection pool exhaustion at exactly midnight.
    
    tasks = []
    for tid in tenant_ids:
        jitter = random.randint(0, 600)
        tasks.append(aggregate_single_tenant.signature((tid,), countdown=jitter))
        
    if tasks:
        job = group(tasks)
        job.apply_async()


@shared_task
def reconcile_tenant_storage():
    """
    Nightly task to recalculate total file sizes across the entire database for each tenant.
    Automatically corrects Storage Drift (from bulk deletes, failures, etc).
    """
    tenant_ids = list(Tenant.objects.filter(is_active=True).values_list('id', flat=True))
    today = timezone.now().date()
    
    # Find all models with FileFields
    file_models = []
    for model in apps.get_models():
        if hasattr(model, 'tenant') and any(isinstance(f, (FileField, ImageField)) for f in model._meta.fields):
            file_fields = [f.name for f in model._meta.fields if isinstance(f, (FileField, ImageField))]
            file_models.append((model, file_fields))
            
    for tid in tenant_ids:
        try:
            tenant = Tenant.objects.get(id=tid)
            total_bytes = 0
            
            for model, fields in file_models:
                # Get all instances for this tenant
                instances = model.objects.filter(tenant=tenant)
                # In a huge DB, this could be slow, but typically models aren't massive enough to crash this.
                # Ideally, we would do this using DB aggregation if size was an IntegerField, but FileField doesn't store size.
                for instance in instances.iterator():
                    for field in fields:
                        f = getattr(instance, field)
                        if f and f.name:
                            try:
                                total_bytes += f.size
                            except Exception:
                                pass
                                
            calculated_mb = Decimal(total_bytes) / Decimal(1024 * 1024)
            
            snapshot, created = TenantUsageSnapshot.objects.get_or_create(
                tenant=tenant, 
                snapshot_date=today
            )
            
            current_mb = snapshot.storage_used_mb or Decimal('0.00')
            
            # Check for drift > 5%
            drift = abs(current_mb - calculated_mb)
            threshold = max(Decimal('1.00'), current_mb * Decimal('0.05')) # 1MB or 5%
            
            if drift > threshold:
                logger.warning(f"STORAGE_DRIFT_CORRECTED: Tenant {tid} drift {drift}MB. Updating to {calculated_mb}MB.")
                
            snapshot.storage_used_mb = calculated_mb
            snapshot.save(update_fields=['storage_used_mb'])
            
        except Exception as e:
            logger.error(f"Error reconciling storage for tenant {tid}: {str(e)}")
