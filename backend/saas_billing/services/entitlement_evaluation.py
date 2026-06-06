from django.core.cache import cache
from saas_billing.models import DataType, PlanEntitlement, TenantEntitlementOverride

class EntitlementEvaluationService:
    @staticmethod
    def _parse_value(value, data_type):
        if data_type == DataType.INTEGER:
            try:
                return int(value)
            except ValueError:
                return 0
        elif data_type == DataType.BOOLEAN:
            return str(value).lower() in ('true', '1', 'yes', 't')
        return str(value)

    @classmethod
    def get_entitlement_value(cls, tenant, key):
        """
        Fetch the entitlement value for a given tenant and key.
        Checks TenantEntitlementOverride first, then falls back to PlanEntitlement.
        Uses Redis caching to avoid DB hits on every API call.
        """
        cache_key = f"tenant_{tenant.id}_entitlement_{key}"
        cached_value = cache.get(cache_key)
        if cached_value is not None:
            return cached_value

        # 1. Check override
        override = TenantEntitlementOverride.objects.filter(tenant=tenant, entitlement_key=key).first()
        if override:
            val = cls._parse_value(override.value, override.data_type)
            cache.set(cache_key, val, timeout=3600)  # Cache for 1 hour
            return val

        # 2. Check plan entitlement
        if not hasattr(tenant, 'subscription') or not tenant.subscription:
            cache.set(cache_key, False, timeout=3600)
            return False # No active subscription
            
        from saas_billing.models import SubscriptionStatus
        if tenant.subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]:
            # Feature denied if not active or trialing
            cache.set(cache_key, False, timeout=3600)
            return False
            
        entitlement = PlanEntitlement.objects.filter(plan=tenant.subscription.plan, key=key).first()
        if entitlement:
            val = cls._parse_value(entitlement.value, entitlement.data_type)
            cache.set(cache_key, val, timeout=3600)
            return val
            
        cache.set(cache_key, False, timeout=3600)
        return False

    @classmethod
    def has_feature(cls, tenant, feature_key, user=None):
        """
        Check if a boolean feature is enabled by delegating to the centralized resolution layer.
        """
        from platform_admin.services.feature_resolution import FeatureResolutionService
        return FeatureResolutionService.resolve_feature_access(user, tenant, feature_key)

    @classmethod
    def get_all_entitlements(cls, tenant, user=None):
        """
        Fetch all boolean feature entitlements for a tenant.
        Returns a dictionary: {'feature_code': True/False, ...}
        """
        if not tenant:
            return {}

        cache_key = f"tenant_{tenant.id}_all_entitlements"
        if user and getattr(user, 'is_superuser', False):
            cache_key = f"tenant_{tenant.id}_all_entitlements_su_{user.id}"
            
        cached_val = cache.get(cache_key)
        if cached_val is not None:
            return cached_val

        # Get all features
        from platform_admin.models import Feature
        all_features = Feature.objects.filter(is_active=True)

        entitlements = {}
        from platform_admin.services.feature_resolution import FeatureResolutionService
        for feature in all_features:
            entitlements[feature.code] = FeatureResolutionService.resolve_feature_access(user, tenant, feature.code)

        cache.set(cache_key, entitlements, timeout=3600)
        return entitlements

    @classmethod
    def evaluate_enforcement_state(cls, tenant, limit_key, current_usage):
        """
        Evaluates the enforcement state based on usage vs limit.
        Returns EnforcementState enum.
        """
        from saas_billing.models import EnforcementState, AuditEventType, PlatformAuditRecord
        import logging
        logger = logging.getLogger(__name__)

        limit_val = cls.get_entitlement_value(tenant, limit_key)
        if limit_val is None:
            return EnforcementState.DENIED

        if isinstance(limit_val, int):
            if current_usage < (limit_val * 0.9):
                return EnforcementState.ALLOWED
            elif current_usage < limit_val:
                return EnforcementState.WARNING
            else:
                # Example: allow 10% grace or time-based grace.
                # For simplicity in this implementation, we will use a small overage allowance as grace.
                # If current_usage is less than 110% of limit, it's GRACE_PERIOD.
                if current_usage <= (limit_val * 1.1):
                    # In a real 7-day grace period, we would check a `GracePeriod` model.
                    return EnforcementState.GRACE_PERIOD
                else:
                    PlatformAuditRecord.objects.create(
                        tenant=tenant,
                        event_type=AuditEventType.ENTITLEMENT_DENIAL,
                        message=f"Denied {limit_key}. Usage: {current_usage}, Limit: {limit_val}"
                    )
                    return EnforcementState.DENIED
                    
        return EnforcementState.DENIED

    @classmethod
    def check_limit(cls, tenant, limit_key, current_usage):
        """
        Backwards compatibility: Returns True if ALLOWED, WARNING, or GRACE_PERIOD.
        Returns False if DENIED.
        """
        from saas_billing.models import EnforcementState
        state = cls.evaluate_enforcement_state(tenant, limit_key, current_usage)
        return state in [EnforcementState.ALLOWED, EnforcementState.WARNING, EnforcementState.GRACE_PERIOD]
