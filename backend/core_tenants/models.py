import uuid
from django.conf import settings
from django.db import models
from common.models import TimeStampedModel
from core_tenants.managers import TenantManager, CompanyManager

class Tenant(TimeStampedModel):
    """
    Represents a client organization (Tenant) in the multi-tenant SaaS environment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Tenant organization name.")
    slug = models.SlugField(max_length=255, unique=True, help_text="Unique URL-friendly identifier.")
    is_active = models.BooleanField(default=True, help_text="Designates whether this tenant is active.")

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
