from celery import Task
from core_tenants.context import set_tenant, set_company, clear_tenant_context, get_current_tenant, get_current_company
from core_tenants.models import Tenant, Company
import logging

logger = logging.getLogger(__name__)

class TenantAwareTask(Task):
    """
    Celery task base class that automatically propagates tenant context.
    """
    def apply_async(self, args=None, kwargs=None, **options):
        if kwargs is None:
            kwargs = {}
        # Propagate tenant context if not already in kwargs
        if 'tenant_id' not in kwargs:
            tenant = get_current_tenant()
            if tenant:
                kwargs['tenant_id'] = str(tenant.id)
        return super().apply_async(args, kwargs, **options)

    def __call__(self, *args, **kwargs):
        # Extract tenant_id from kwargs
        tenant_id = kwargs.pop('tenant_id', None)
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                set_tenant(tenant)
            except Tenant.DoesNotExist:
                logger.warning(f"Tenant {tenant_id} not found in task {self.name}")
        try:
            return self.run(*args, **kwargs)
        finally:
            clear_tenant_context()


class CompanyAwareTask(Task):
    """
    Celery task base class that automatically propagates both tenant and company contexts.
    """
    def apply_async(self, args=None, kwargs=None, **options):
        if kwargs is None:
            kwargs = {}
        # Propagate tenant and company context if not already in kwargs
        if 'tenant_id' not in kwargs:
            tenant = get_current_tenant()
            if tenant:
                kwargs['tenant_id'] = str(tenant.id)
        if 'company_id' not in kwargs:
            company = get_current_company()
            if company:
                kwargs['company_id'] = str(company.id)
        return super().apply_async(args, kwargs, **options)

    def __call__(self, *args, **kwargs):
        # Extract tenant_id and company_id from kwargs
        tenant_id = kwargs.pop('tenant_id', None)
        company_id = kwargs.pop('company_id', None)
        
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                set_tenant(tenant)
            except Tenant.DoesNotExist:
                logger.warning(f"Tenant {tenant_id} not found in task {self.name}")
                
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                set_company(company)
            except Company.DoesNotExist:
                logger.warning(f"Company {company_id} not found in task {self.name}")
                
        try:
            return self.run(*args, **kwargs)
        finally:
            clear_tenant_context()
