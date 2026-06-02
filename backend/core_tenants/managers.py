from django.db import models
from core_tenants.context import get_current_tenant, get_current_company


# ---------------------------------------------------------------------------
# Tenant-only QuerySet / Manager
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Company-only QuerySet / Manager
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Combined Tenant + Company QuerySet / Manager
# ---------------------------------------------------------------------------

class TenantCompanyQuerySet(models.QuerySet):
    """QuerySet that can be scoped to a tenant, a company, or both."""

    def for_tenant(self, tenant):
        """Scope to a specific tenant."""
        return self.filter(tenant=tenant)

    def for_company(self, company):
        """Scope to a specific company."""
        return self.filter(company=company)

    def for_context(self, tenant=None, company=None):
        """Scope to both tenant and company simultaneously."""
        qs = self
        if tenant:
            qs = qs.filter(tenant=tenant)
        if company:
            qs = qs.filter(company=company)
        return qs


class TenantCompanyManager(models.Manager):
    """
    Default manager for models that inherit TenantCompanyModel.

    Automatically scopes all queries to the active tenant AND company from
    the thread-safe ContextVar. Falls back gracefully when context is not set
    (e.g. during migrations, management commands, or admin).
    """

    def get_queryset(self):
        tenant = get_current_tenant()
        company = get_current_company()
        qs = TenantCompanyQuerySet(self.model, using=self._db)
        if tenant:
            qs = qs.filter(tenant=tenant)
        if company:
            qs = qs.filter(company=company)
        return qs

    def for_tenant(self, tenant):
        """Return all records for a specific tenant (ignores company context)."""
        return TenantCompanyQuerySet(self.model, using=self._db).filter(tenant=tenant)

    def for_company(self, company):
        """Return all records for a specific company (ignores tenant context)."""
        return TenantCompanyQuerySet(self.model, using=self._db).filter(company=company)

    def for_context(self, tenant=None, company=None):
        """Manually scope to given tenant and/or company."""
        return TenantCompanyQuerySet(self.model, using=self._db).for_context(
            tenant=tenant, company=company
        )
