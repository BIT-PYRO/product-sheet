"""
platform_admin/signals.py

Cross-app signal handlers that must be registered *after* all apps are ready
(to avoid circular imports). Wired up in PlatformAdminConfig.ready().
"""
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


def invalidate_tenant_override_cache(sender, instance, **kwargs):
    """
    Bust all per-tenant entitlement caches when a TenantEntitlementOverride
    is created, updated, or deleted.

    Clears:
      - tenant_{id}_all_entitlements
      - tenant_{id}_entitlement_{key}   (legacy EntitlementEvaluationService key)
      - tenant_{id}_feature_{code}      (FeatureResolutionService key, for each feature)
      - platform_features_registry      (global platform API cache)
    """
    from platform_admin.models import Feature

    tenant_id = instance.tenant_id
    cache.delete(f"tenant_{tenant_id}_all_entitlements")
    cache.delete(f"tenant_{tenant_id}_entitlement_{instance.entitlement_key}")
    cache.delete("platform_features_registry")

    feature_codes = list(Feature.objects.values_list('code', flat=True))
    for code in feature_codes:
        cache.delete(f"tenant_{tenant_id}_feature_{code}")


def register_override_cache_signals():
    """Called from PlatformAdminConfig.ready() once all apps are loaded."""
    from saas_billing.models import TenantEntitlementOverride
    post_save.connect(
        invalidate_tenant_override_cache,
        sender=TenantEntitlementOverride,
        dispatch_uid='platform_admin_teo_post_save',
    )
    post_delete.connect(
        invalidate_tenant_override_cache,
        sender=TenantEntitlementOverride,
        dispatch_uid='platform_admin_teo_post_delete',
    )
