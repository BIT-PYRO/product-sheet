from rest_framework import permissions
from core_permissions.roles import UserRole

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to global Platform/Super Administrators.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == UserRole.SUPER_ADMIN or request.user.is_superuser)
        )


class IsTenantOwner(permissions.BasePermission):
    """
    Allows access only to the Tenant Owner.
    Ensures object-level tenant matches the user's tenant context.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.TENANT_OWNER
        )

    def has_object_permission(self, request, view, obj):
        # If the object has a direct 'tenant' reference
        if hasattr(obj, 'tenant') and obj.tenant is not None:
            return obj.tenant == request.user.tenant
        
        # If the object itself is a Tenant instance
        from core_tenants.models import Tenant
        if isinstance(obj, Tenant):
            return obj == request.user.tenant
            
        return False


class IsCompanyAdmin(permissions.BasePermission):
    """
    Allows access to Company Admins and Tenant Owners.
    Ensures object-level company belongs to the user's accessible companies.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.TENANT_OWNER, UserRole.COMPANY_ADMIN]
        )

    def has_object_permission(self, request, view, obj):
        # Ensure the tenant matches first
        if hasattr(obj, 'tenant') and obj.tenant is not None:
            if obj.tenant != request.user.tenant:
                return False

        # If the object itself is a Company instance
        from core_tenants.models import Company
        if isinstance(obj, Company):
            return request.user.accessible_companies.filter(id=obj.id).exists()

        # If the object has a 'company' reference
        if hasattr(obj, 'company') and obj.company is not None:
            return request.user.accessible_companies.filter(id=obj.company.id).exists()

        return False
