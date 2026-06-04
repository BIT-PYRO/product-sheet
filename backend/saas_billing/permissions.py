from rest_framework import permissions
from functools import wraps
from rest_framework.exceptions import PermissionDenied, PaymentRequired
from core_tenants.context import get_current_tenant
from saas_billing.services.entitlement_evaluation import EntitlementEvaluationService
from saas_billing.models import PlatformAuditRecord, AuditEventType

class SaaSFeaturePermission(permissions.BasePermission):
    """
    Permission class to be used directly in ViewSets.
    Requires setting `required_entitlement` on the ViewSet.
    """
    def has_permission(self, request, view):
        entitlement_key = getattr(view, 'required_entitlement', None)
        if not entitlement_key:
            return True # If no entitlement specified, allow
            
        tenant = request.tenant if hasattr(request, 'tenant') else get_current_tenant()
        if not tenant:
            return False

        has_access = EntitlementEvaluationService.has_feature(tenant, entitlement_key)
        if not has_access:
            PlatformAuditRecord.objects.create(
                tenant=tenant,
                event_type=AuditEventType.ENTITLEMENT_DENIAL,
                message=f"Denied feature {entitlement_key}"
            )
            raise PaymentRequired(detail=f"Your current plan does not include the '{entitlement_key}' feature. Please upgrade.")
        return True


def require_entitlement(entitlement_key):
    """
    Decorator for function-based views or specific viewset actions.
    Usage: @require_entitlement('exports_enabled')
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            tenant = request.tenant if hasattr(request, 'tenant') else get_current_tenant()
            if not tenant:
                raise PermissionDenied("Tenant context missing.")
                
            has_access = EntitlementEvaluationService.has_feature(tenant, entitlement_key)
            if not has_access:
                PlatformAuditRecord.objects.create(
                    tenant=tenant,
                    event_type=AuditEventType.ENTITLEMENT_DENIAL,
                    message=f"Denied feature {entitlement_key} via decorator"
                )
                raise PaymentRequired(detail=f"Your current plan does not include the '{entitlement_key}' feature. Please upgrade.")
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
