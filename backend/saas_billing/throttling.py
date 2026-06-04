from rest_framework.throttling import ScopedRateThrottle
from django.core.cache import cache
from saas_billing.services.entitlement_evaluation import EntitlementEvaluationService

class TenantGroupRateThrottle(ScopedRateThrottle):
    """
    Limits API access based on the tenant's PlanEntitlement.
    Falls back to a global `api_limit` if no scope-specific limit exists.
    """
    
    def allow_request(self, request, view):
        # We can only throttle if we have a tenant
        self.tenant = getattr(request, 'tenant', None)
        if not self.tenant:
            return True
            
        # Determine scope from view, or use 'global'
        self.scope = getattr(view, 'throttle_scope', 'global')

        # Retrieve dynamic rate from entitlement service
        # First try scoped limit (e.g., api_limit_inventory), then fallback to global
        scoped_limit_key = f"api_limit_{self.scope}"
        rate_value = EntitlementEvaluationService.get_entitlement_value(self.tenant, scoped_limit_key)
        
        if rate_value is None:
            rate_value = EntitlementEvaluationService.get_entitlement_value(self.tenant, "api_limit")

        if rate_value in (None, False, 0, "0"):
            # No limit defined, or 0. Deny or fallback to system default.
            # Assuming standard is unthrottled if not explicitly locked.
            return True

        if str(rate_value).lower() == "unlimited":
            return True

        # Assume value is formatted as "1000/day" or similar, or just an integer representing daily limit
        if isinstance(rate_value, int) or str(rate_value).isdigit():
            self.rate = f"{rate_value}/day"
        else:
            self.rate = str(rate_value)
            
        self.num_requests, self.duration = self.parse_rate(self.rate)

        # Standard DRF logic from here
        self.key = self.get_cache_key(request, view)
        if self.key is None:
            return True

        self.history = self.cache.get(self.key, [])
        self.now = self.timer()

        # Drop any requests from the history which have now passed the
        # throttle duration
        while self.history and self.history[-1] <= self.now - self.duration:
            self.history.pop()
            
        current_usage = len(self.history)
        
        # We can evaluate soft-limits here instead of hard blocks
        from saas_billing.models import EnforcementState
        
        # Re-evaluate with the new threshold logic
        if isinstance(rate_value, int) or str(rate_value).isdigit():
            limit_val = int(rate_value)
            
            state = EntitlementEvaluationService.evaluate_enforcement_state(
                self.tenant, scoped_limit_key, current_usage
            )
            
            if state == EnforcementState.WARNING:
                request._entitlement_warning = f"You are approaching your API limit ({current_usage}/{limit_val})."
            elif state == EnforcementState.GRACE_PERIOD:
                request._entitlement_warning = f"GRACE PERIOD: You have exceeded your API limit ({current_usage}/{limit_val}). Please upgrade."
            elif state == EnforcementState.DENIED:
                return self.throttle_failure()
        else:
            # Fallback to standard DRF if it's unlimited or unparseable
            if current_usage >= self.num_requests:
                return self.throttle_failure()

        return self.throttle_success()

    def get_cache_key(self, request, view):
        if not self.tenant:
            return None
        return f"throttle:tenant:{self.tenant.id}:{self.scope}"
