from django.db import models
from common.models import AuditModel

class FeatureGroup(AuditModel):
    name = models.CharField(max_length=120)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

class Feature(AuditModel):
    group = models.ForeignKey(FeatureGroup, on_delete=models.CASCADE, related_name='features')
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    
    # Taxonomy & Lifecycle fields (Phase 5C)
    category = models.CharField(max_length=100, default='General')
    is_active = models.BooleanField(default=True)
    is_deprecated = models.BooleanField(default=False)
    is_beta = models.BooleanField(default=False)
    min_plan_name = models.CharField(max_length=100, blank=True, null=True)
    route = models.CharField(max_length=255, blank=True, null=True)
    icon = models.CharField(max_length=100, blank=True, null=True)
    
    # Industry Mapping
    industries = models.ManyToManyField('industries.Industry', blank=True, related_name='features', help_text="If empty, applies to all industries.")

    def __str__(self):
        return f"{self.group.name} - {self.name}"

class PlanFeature(AuditModel):
    plan = models.ForeignKey('saas_billing.Plan', on_delete=models.CASCADE, related_name='plan_features')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE)
    is_enabled = models.BooleanField(default=True)
    limit = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")

    class Meta:
        unique_together = [('plan', 'feature')]

    def __str__(self):
        return f"{self.plan.name} - {self.feature.name}"

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache


# ── Feature registry cache ────────────────────────────────────────────────────

@receiver(post_save, sender=Feature)
@receiver(post_delete, sender=Feature)
def invalidate_feature_cache(sender, instance, **kwargs):
    """Bust the platform feature-registry cache whenever a Feature changes."""
    cache.delete("platform_features_registry")


# ── PlanFeature cache invalidation ───────────────────────────────────────────

def _bust_plan_entitlement_caches(plan):
    """
    Delete every per-tenant entitlement cache that references *plan*.
    Iterates all subscriptions for the plan and wipes:
      - tenant_{id}_all_entitlements
      - tenant_{id}_all_entitlements_su_*   (superuser variants)
      - tenant_{id}_feature_{code}          (per-feature per-tenant keys)
    Also wipes the global feature registry.
    """
    from saas_billing.models import Subscription

    cache.delete("platform_features_registry")

    # Collect all active features so we can nuke per-feature keys too
    feature_codes = list(Feature.objects.values_list('code', flat=True))

    for subscription in Subscription.objects.filter(plan=plan).select_related('tenant'):
        tenant_id = subscription.tenant_id
        # Bulk-delete the aggregate key
        cache.delete(f"tenant_{tenant_id}_all_entitlements")
        # Per-feature keys
        for code in feature_codes:
            cache.delete(f"tenant_{tenant_id}_feature_{code}")
        # Superuser variant keys — delete by prefix pattern when possible,
        # or accept they expire naturally (TTL ≤ 3600 s).
        # Most cache backends don't support wildcard delete, so we skip the
        # superuser-variant keys here; superusers bypass the cache anyway.


@receiver(post_save, sender=PlanFeature)
@receiver(post_delete, sender=PlanFeature)
def invalidate_plan_feature_cache(sender, instance, **kwargs):
    """Bust caches for all tenants on the plan when a PlanFeature changes."""
    _bust_plan_entitlement_caches(instance.plan)



# ── TenantEntitlementOverride cache invalidation ─────────────────────────────
# Registered lazily in platform_admin.apps.PlatformAdminConfig.ready()
# via platform_admin/signals.py to avoid a circular-import with saas_billing.

