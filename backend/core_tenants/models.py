import uuid
from django.conf import settings
from django.db import models
from common.models import TimeStampedModel
from core_tenants.managers import TenantManager, CompanyManager, TenantCompanyManager

class TenantStatus(models.TextChoices):
    PENDING_VERIFICATION = 'pending_verification', 'Pending Verification'
    ACTIVE_TRIAL = 'active_trial', 'Active Trial'
    ACTIVE_PAID = 'active_paid', 'Active Paid'
    TRIAL_EXPIRED = 'trial_expired', 'Trial Expired'
    GRACE_PERIOD = 'grace_period', 'Grace Period'
    PAST_DUE = 'past_due', 'Past Due'
    SUSPENDED = 'suspended', 'Suspended'
    CANCELLED = 'cancelled', 'Cancelled'

class Tenant(TimeStampedModel):
    """
    Represents a client organization (Tenant) in the multi-tenant SaaS environment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Tenant organization name.")
    slug = models.SlugField(max_length=255, unique=True, help_text="Unique URL-friendly identifier.")
    is_active = models.BooleanField(default=True, help_text="Designates whether this tenant is active.")
    status = models.CharField(max_length=50, choices=TenantStatus.choices, default=TenantStatus.PENDING_VERIFICATION)
    onboarding_step = models.IntegerField(default=1)
    onboarding_completed = models.BooleanField(default=False)
    external_shop_id = models.CharField(max_length=255, blank=True, default='', help_text="External shop ID for repair queue sync.")
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Customer ID for SaaS billing.")
    razorpay_customer_id = models.CharField(max_length=255, blank=True, null=True, help_text="Razorpay Customer ID for SaaS billing.")
    industry = models.ForeignKey('industries.Industry', on_delete=models.SET_NULL, null=True, blank=True, related_name='tenants', help_text="The primary industry vertical for this tenant.")
    plan = models.ForeignKey('saas_billing.Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='tenants', help_text="The SaaS plan this tenant is subscribed to.")

    class Meta:
        ordering = ['name']
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return self.name


class Company(TimeStampedModel):
    """
    Represents an individual company or entity owned by a Tenant.
    A Tenant can own multiple Companies.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='companies',
        help_text="Tenant that owns this company."
    )
    name = models.CharField(max_length=255, help_text="Company name.")
    code = models.CharField(max_length=50, blank=True, default="", help_text="Internal company code.")
    gst_number = models.CharField(max_length=15, blank=True, default="", help_text="Tax registration number.")
    address = models.TextField(blank=True, default="", help_text="Postal address of the company.")
    is_active = models.BooleanField(default=True, help_text="Designates whether this company is active.")

    class Meta:
        ordering = ['name']
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        unique_together = [('tenant', 'name'), ('tenant', 'code')]

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"


# ---------------------------------------------------------------------------
# Reusable Abstract Foundation Models (Step 3)
# ---------------------------------------------------------------------------

class TenantAwareModel(models.Model):
    """
    Abstract base model that enforces tenant isolation.
    Subclasses will automatically filter records based on the active Tenant context.
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='%(class)s_related',
        db_index=True,
        help_text="Tenant this record belongs to."
    )

    # Attach default manager with tenant isolation, and clear unscoped manager
    objects = TenantManager()
    unscoped_objects = models.Manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not getattr(self, 'tenant_id', None):
            from core_tenants.context import get_current_tenant
            tenant = get_current_tenant()
            if tenant:
                self.tenant = tenant
        super().save(*args, **kwargs)


class CompanyAwareModel(models.Model):
    """
    Abstract base model that enforces company isolation.
    Subclasses will automatically filter records based on the active Company context.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='%(class)s_related',
        db_index=True,
        help_text="Company this record belongs to."
    )

    # Attach default manager with company isolation, and clear unscoped manager
    objects = CompanyManager()
    unscoped_objects = models.Manager()

    class Meta:
        abstract = True


class AuditAwareModel(models.Model):
    """
    Abstract base model that tracks creation and updates.
    """
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_created_by_related',
        help_text="User who created the record."
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_updated_by_related',
        help_text="User who last updated the record."
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        from core_tenants.context import get_current_user
        user = get_current_user()
        if user:
            if not getattr(self, 'created_by_id', None):
                self.created_by = user
            self.updated_by = user
        super().save(*args, **kwargs)


class TenantCompanyModel(models.Model):
    """
    Abstract base model that enforces BOTH tenant and company isolation.

    This is the primary base for all ERP-level models. Subclasses will
    automatically filter records based on both the active Tenant and the
    active Company in the request context.

    Usage:
        class Product(AuditModel, TenantCompanyModel):
            ...

    The `objects` manager auto-scopes to the active tenant + company.
    The `unscoped_objects` manager bypasses all scoping (for migrations, admin).
    """

    tenant = models.ForeignKey(
        'core_tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='%(class)s_related',
        db_index=True,
        help_text="Tenant this record belongs to.",
    )
    company = models.ForeignKey(
        'core_tenants.Company',
        on_delete=models.CASCADE,
        related_name='%(class)s_company_related',
        db_index=True,
        help_text="Company this record belongs to.",
    )

    # Auto-scoped manager (respects ContextVar tenant + company)
    objects = TenantCompanyManager()
    # Bypass all scoping — use in migrations, management commands, admin
    unscoped_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['tenant', 'company']),
        ]

    def save(self, *args, **kwargs):
        if not getattr(self, 'tenant_id', None):
            from core_tenants.context import get_current_tenant
            tenant = get_current_tenant()
            if tenant:
                self.tenant = tenant
        if not getattr(self, 'company_id', None):
            from core_tenants.context import get_current_company
            company = get_current_company()
            if company:
                self.company = company
        super().save(*args, **kwargs)

class TenantBranding(TimeStampedModel):
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='branding')
    company_logo = models.URLField(max_length=500, blank=True, default='')
    primary_color = models.CharField(max_length=20, blank=True, default='#000000')
    secondary_color = models.CharField(max_length=20, blank=True, default='#FFFFFF')
    support_email = models.EmailField(blank=True, default='')
    company_website = models.URLField(max_length=500, blank=True, default='')
    company_phone = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return f"{self.tenant.name} Branding"
