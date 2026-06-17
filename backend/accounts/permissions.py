from rest_framework.permissions import BasePermission

from .models import SCOPE_CHOICES

# Map scope identifier → URL prefix served by that scope
SCOPE_URL_MAP = {
    'master_inventory': '/api/v1/inventory/',
    'master_products': '/api/v1/products/',
    'master_jobs': '/api/v1/jobs/',
    'master_workforce': '/api/v1/workforce/',
    'master_kyc': '/api/v1/kyc/',
    'master_customers': '/api/v1/customers/',
    'master_designers': '/api/v1/designers/',
    'orders': '/api/v1/orders/',
    'drafts': '/api/v1/drafts/',
    'findings': '/api/v1/findings/',
    'product_inventory': '/api/v1/product-inventory/',
    'accounting': '/api/accounting/',
    'hr': '/api/hr/',
}

_SAFE_METHODS = frozenset(('GET', 'HEAD', 'OPTIONS'))


from core_permissions.roles import UserRole

class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_superuser', False):
            return True
        role = getattr(request.user, 'role', None)
        return role in [
            'admin', 'manager',
            UserRole.SUPER_ADMIN, UserRole.TENANT_OWNER, UserRole.COMPANY_ADMIN, UserRole.MANAGER
        ]


class IsSuperAdmin(BasePermission):
    """
    Enforces that only Django superusers can access this route.
    Used exclusively for Platform Operations Center.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class APIKeyScopePermission(BasePermission):
    """
    Enforces page-scope and read/write/comment rules for API key users.

    Regular JWT-authenticated users pass through without any check here
    (their access continues to be governed by role-based permissions).
    """

    message = 'API key does not have permission for this resource or action.'

    def has_permission(self, request, view):
        from .api_key_auth import VirtualAPIKeyUser

        # Not an API key request — nothing to check
        if not isinstance(request.user, VirtualAPIKeyUser):
            return True

        api_key = request.user.api_key

        # --- Scope check ---------------------------------------------------
        allowed_prefixes = [
            SCOPE_URL_MAP[s]
            for s in (api_key.page_scopes or [])
            if s in SCOPE_URL_MAP
        ]
        path = request.path
        if not any(path.startswith(prefix) for prefix in allowed_prefixes):
            self.message = 'API key is not scoped to this page.'
            return False

        # --- Method / permission check -------------------------------------
        method = request.method.upper()
        if method in _SAFE_METHODS:
            return bool(api_key.can_read)
        if method == 'PATCH':
            # Either full write OR comment (limited write) allows PATCH
            return bool(api_key.can_write or api_key.can_comment)
        # POST, PUT, DELETE require full write permission
        return bool(api_key.can_write)
