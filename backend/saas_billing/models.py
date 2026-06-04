from django.db import models
from django.conf import settings
from core_tenants.models import Tenant

class SubscriptionStatus(models.TextChoices):
    TRIALING = 'trialing', 'Trialing'
    ACTIVE = 'active', 'Active'
    PAST_DUE = 'past_due', 'Past Due'
    SUSPENDED = 'suspended', 'Suspended'
    CANCELED = 'canceled', 'Canceled'
    EXPIRED = 'expired', 'Expired'

class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    OPEN = 'open', 'Open'
    PAID = 'paid', 'Paid'
    VOID = 'void', 'Void'
    UNCOLLECTIBLE = 'uncollectible', 'Uncollectible'

class BillingCycle(models.TextChoices):
    MONTHLY = 'monthly', 'Monthly'
    YEARLY = 'yearly', 'Yearly'

class DataType(models.TextChoices):
    INTEGER = 'integer', 'Integer'
    BOOLEAN = 'boolean', 'Boolean'
    STRING = 'string', 'String'

class Plan(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    trial_days = models.PositiveIntegerField(default=0)
    base_price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    base_price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class PlanEntitlement(models.Model):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='entitlements')
    key = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    data_type = models.CharField(max_length=50, choices=DataType.choices, default=DataType.STRING)

    class Meta:
        unique_together = ('plan', 'key')
        indexes = [
            models.Index(fields=['plan', 'key']),
        ]

    def __str__(self):
        return f"{self.plan.code} - {self.key}: {self.value}"

class TenantEntitlementOverride(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='entitlement_overrides')
    entitlement_key = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    data_type = models.CharField(max_length=50, choices=DataType.choices, default=DataType.STRING)
    reason = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.data_type == DataType.BOOLEAN:
            if isinstance(self.value, bool):
                self.value = 'true' if self.value else 'false'
            elif isinstance(self.value, str):
                self.value = self.value.lower()
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete(f"tenant_{self.tenant_id}_entitlement_{self.entitlement_key}")

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete(f"tenant_{self.tenant_id}_entitlement_{self.entitlement_key}")
        super().delete(*args, **kwargs)

    class Meta:
        unique_together = ('tenant', 'entitlement_key')

class Subscription(models.Model):
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    status = models.CharField(max_length=50, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIALING)
    
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    billing_cycle = models.CharField(max_length=50, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    
    locked_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    locked_currency = models.CharField(max_length=3, default='USD')

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'end_date']),
        ]

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name} ({self.status})"

class SubscriptionHistory(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='history')
    old_plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, related_name='+')
    new_plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, related_name='+')
    old_status = models.CharField(max_length=50, null=True, blank=True)
    new_status = models.CharField(max_length=50, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=255, blank=True, null=True)

class SubscriptionEvent(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    
    # Optional field for idempotency tracking
    idempotency_key = models.CharField(max_length=255, blank=True, null=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

class TenantUsageSnapshot(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='usage_snapshots')
    snapshot_date = models.DateField(auto_now_add=True)
    
    active_users = models.PositiveIntegerField(default=0)
    total_users = models.PositiveIntegerField(default=0)
    companies = models.PositiveIntegerField(default=0)
    products = models.PositiveIntegerField(default=0)
    orders = models.PositiveIntegerField(default=0)
    jobs = models.PositiveIntegerField(default=0)
    storage_used_mb = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    api_requests = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('tenant', 'snapshot_date')

class Invoice(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, related_name='invoices')
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    pdf_url = models.URLField(max_length=500, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['tenant', 'status']),
        ]

class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    gateway_reference = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50) # e.g. succeeded, failed, pending
    
    created_at = models.DateTimeField(auto_now_add=True)

class CreditNote(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='credit_notes')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_notes')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class EnforcementState(models.TextChoices):
    ALLOWED = 'allowed', 'Allowed'
    WARNING = 'warning', 'Warning'
    GRACE_PERIOD = 'grace_period', 'Grace Period'
    DENIED = 'denied', 'Denied'

class AuditEventType(models.TextChoices):
    WEBHOOK_FAILURE = 'webhook_failure', 'Webhook Failure'
    PAYMENT_FAILURE = 'payment_failure', 'Payment Failure'
    ENTITLEMENT_DENIAL = 'entitlement_denial', 'Entitlement Denial'
    STORAGE_DRIFT_CORRECTED = 'storage_drift_corrected', 'Storage Drift Corrected'
    USAGE_AGGREGATION_FAILURE = 'usage_aggregation_failure', 'Usage Aggregation Failure'
    SUBSCRIPTION_UPGRADE = 'subscription_upgrade', 'Subscription Upgrade'
    SUBSCRIPTION_DOWNGRADE = 'subscription_downgrade', 'Subscription Downgrade'
    SUBSCRIPTION_CANCELLED = 'subscription_cancelled', 'Subscription Cancelled'
    SUBSCRIPTION_RENEWED = 'subscription_renewed', 'Subscription Renewed'

class PlatformAuditRecord(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_records')
    subscription = models.ForeignKey('Subscription', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_records')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_records')
    old_plan = models.ForeignKey('Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    new_plan = models.ForeignKey('Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    event_type = models.CharField(max_length=50, choices=AuditEventType.choices)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
        ]
