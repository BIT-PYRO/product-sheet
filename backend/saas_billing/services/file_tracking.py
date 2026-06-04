from decimal import Decimal
from django.utils import timezone
from saas_billing.models import TenantUsageSnapshot

class FileUploadTrackingService:
    @staticmethod
    def _update_tenant_storage(tenant, bytes_delta):
        """
        Updates the TenantUsageSnapshot for today by adding/subtracting megabytes.
        """
        if not tenant or bytes_delta == 0:
            return
            
        mb_delta = Decimal(bytes_delta) / Decimal(1024 * 1024)
        today = timezone.now().date()
        
        # We need to get or create today's snapshot
        snapshot, created = TenantUsageSnapshot.objects.get_or_create(
            tenant=tenant, 
            snapshot_date=today,
            defaults={'storage_used_mb': Decimal('0.00')}
        )
        
        # Note: In a highly concurrent environment, this should be done using F() expressions 
        # to prevent race conditions.
        from django.db.models import F
        snapshot.storage_used_mb = F('storage_used_mb') + mb_delta
        snapshot.save(update_fields=['storage_used_mb'])
        
        # After F() update, we refresh if we need the absolute value, but we don't return it here.

    @classmethod
    def add_bytes(cls, tenant, bytes_added):
        cls._update_tenant_storage(tenant, bytes_added)

    @classmethod
    def subtract_bytes(cls, tenant, bytes_subtracted):
        cls._update_tenant_storage(tenant, -bytes_subtracted)
