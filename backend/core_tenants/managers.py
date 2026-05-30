from django.db import models
from core_tenants.context import get_current_tenant, get_current_company

class TenantQuerySet(models.QuerySet):
    def for_tenant(self, tenant):
        """Manually scope queryset to a specific tenant."""
        return self.filter(tenant=tenant)

class TenantManager(models.Manager):
    def get_queryset(self):
        """Automatically filters the queryset to the active tenant in context if set."""
        tenant = get_current_tenant()
        qs = TenantQuerySet(self.model, using=self._db)
        if tenant:
            return qs.filter(tenant=tenant)
        return qs

    def for_tenant(self, tenant):
        """Helper to get a manually filtered queryset."""
        return self.get_queryset().for_tenant(tenant)

class CompanyQuerySet(models.QuerySet):
    def for_company(self, company):
        """Manually scope queryset to a specific company."""
        return self.filter(company=company)

class CompanyManager(models.Manager):
    def get_queryset(self):
        """Automatically filters the queryset to the active company in context if set."""
        company = get_current_company()
        qs = CompanyQuerySet(self.model, using=self._db)
        if company:
            return qs.filter(company=company)
        return qs

    def for_company(self, company):
        """Helper to get a manually filtered queryset."""
        return self.get_queryset().for_company(company)
