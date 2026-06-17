from django.core.cache import cache
from platform_admin.models import Feature, PlanFeature
from saas_billing.models import TenantEntitlementOverride, DataType
from core_tenants.models import Tenant

class FeatureResolutionService:
    @classmethod
    def resolve_feature_access(cls, user, tenant, feature_code):
        """
        The single centralized source of truth for feature access decisions.
        Resolves access using the hierarchy:
        1. Industry Feature Availability
        2. Plan Feature Enablement
        3. Tenant Override
        4. User Permission
        """
        # 4. User Permission (Superusers get access to all active features)
        if user and getattr(user, 'is_superuser', False):
            return True

        if not tenant:
            return False

        from core_tenants.models import TenantStatus
        if tenant.status == TenantStatus.SUSPENDED:
            return False
        if tenant.status in [TenantStatus.TRIAL_EXPIRED, TenantStatus.PAST_DUE, TenantStatus.CANCELLED]:
            return False

        cache_key = f"tenant_{tenant.id}_feature_{feature_code}"
        cached_val = cache.get(cache_key)
        if cached_val is not None:
            return cached_val

        # Fetch the feature
        feature = Feature.objects.filter(code=feature_code, is_active=True).first()
        if not feature:
            cache.set(cache_key, False, timeout=3600)
            return False

        # 1. Industry Feature Availability
        # If the feature targets specific industries, the tenant's industry must be among them.
        if feature.industries.exists():
            if not tenant.industry or not feature.industries.filter(id=tenant.industry.id).exists():
                cache.set(cache_key, False, timeout=3600)
                return False

        # 3. Tenant Override (Overrides Plan Enablement)
        override = TenantEntitlementOverride.objects.filter(tenant=tenant, entitlement_key=feature_code).first()
        if override:
            val = cls._parse_boolean(override.value, override.data_type)
            cache.set(cache_key, val, timeout=3600)
            return val
            
        # Legacy fallback: Check if override exists for old key format (e.g. inventory_enabled)
        legacy_override = TenantEntitlementOverride.objects.filter(tenant=tenant, entitlement_key=f"{feature_code}_enabled").first()
        if legacy_override:
            val = cls._parse_boolean(legacy_override.value, legacy_override.data_type)
            cache.set(cache_key, val, timeout=3600)
            return val

        # 2. Plan Feature Enablement
        if not hasattr(tenant, 'subscription') or not tenant.subscription:
            cache.set(cache_key, True, timeout=3600)
            return True

        from saas_billing.models import SubscriptionStatus
        if tenant.subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.GRACE_PERIOD]:
            cache.set(cache_key, False, timeout=3600)
            return False

        plan_feature = PlanFeature.objects.filter(plan=tenant.subscription.plan, feature=feature).first()
        if plan_feature:
            cache.set(cache_key, plan_feature.is_enabled, timeout=3600)
            return plan_feature.is_enabled

        cache.set(cache_key, False, timeout=3600)
        return False

    @staticmethod
    def _parse_boolean(value, data_type):
        if data_type == DataType.BOOLEAN:
            return str(value).lower() in ('true', '1', 'yes', 't')
        return str(value).lower() in ('true', '1', 'yes', 't')
