from rest_framework import permissions
from core_permissions.roles import UserRole
from core_tenants.models import Tenant, Company

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
        if isinstance(obj, Company):
            return request.user.accessible_companies.filter(id=obj.id).exists()

        # If the object has a 'company' reference
        if hasattr(obj, 'company') and obj.company is not None:
            return request.user.accessible_companies.filter(id=obj.company.id).exists()

        return False


class SaaSResourcePermission(permissions.BasePermission):
    """
    Unified enterprise role-based access control for all ERP modules.
    Enforces the following rules:
    - SUPER_ADMIN / superusers: Full access (read & write & delete) on any resource.
    - TENANT_OWNER: Full access (read & write & delete) on any resource belonging to their tenant.
    - COMPANY_ADMIN: Full access (read & write & delete) on their accessible companies.
    - DEPARTMENT_HEAD: Read access, write access to operational models restricted to their department, no DELETE.
    - MANAGER: Full read & write access, but strictly NO DELETE.
    - STAFF: Full read access, write access ONLY to operational models (Job, InventoryTransaction, IssueRequest, etc.), and strictly NO DELETE.
    - VIEWER: Strictly read-only access (GET, HEAD, OPTIONS) on all models.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Set thread-local user for DRF requests (handles lazy authentication)
        from core_tenants.context import set_current_user
        set_current_user(request.user)

        # Set tenant/company context if request.user has a tenant
        # (This is especially important for API Key users to ensure ContextVar is set correctly)
        if getattr(request.user, 'tenant', None):
            from core_tenants.context import set_tenant, set_company
            set_tenant(request.user.tenant)
            request.tenant = request.user.tenant
            
            # Re-read active company or set default
            if hasattr(request.user, 'active_company') and request.user.active_company:
                set_company(request.user.active_company)
                request.company = request.user.active_company
            
            # If X-Company-ID header is present, override company context
            import uuid
            x_company_id = request.headers.get('X-Company-ID') or request.META.get('HTTP_X_COMPANY_ID')
            if x_company_id:
                try:
                    company_uuid = uuid.UUID(x_company_id)
                    from core_tenants.models import Company
                    company = Company.objects.filter(id=company_uuid, tenant=request.user.tenant).first()
                    if company:
                        set_company(company)
                        request.company = company
                except (ValueError, TypeError):
                    pass

        # Super admin and Django superusers bypass all restrictions
        if getattr(request.user, 'role', None) == UserRole.SUPER_ADMIN or request.user.is_superuser:
            return True

        is_api_key_user = request.user.__class__.__name__ == 'VirtualAPIKeyUser'

        # Every other user must belong to a tenant
        if not getattr(request.user, 'tenant', None):
            return False

        # Non-superuser and non-APIKey users must be approved
        if not is_api_key_user and not getattr(request.user, 'is_approved', False):
            return False

        # Resolve effective role (mapping legacy roles to new roles)
        role = getattr(request.user, 'role', None)
        if role == UserRole.ADMIN_LEGACY:
            role = UserRole.TENANT_OWNER
        elif role == UserRole.MANAGER_LEGACY:
            role = UserRole.MANAGER
        elif role == UserRole.STAFF_LEGACY:
            role = UserRole.STAFF

        # VIEWER: strictly read-only
        if role == UserRole.VIEWER:
            return request.method in permissions.SAFE_METHODS

        # STAFF: read-only by default, write restricted to specific operational models, no DELETE
        if role == UserRole.STAFF:
            if request.method in permissions.SAFE_METHODS:
                return True

            if request.method == 'DELETE':
                return False

            # Check if operational model is writeable by Staff
            model = getattr(getattr(view, 'queryset', None), 'model', None)
            if model:
                allowed_staff_write_models = {
                    'Job', 'InventoryTransaction', 'StoneTransaction', 'StockTransaction',
                    'FindingInventoryTransaction', 'ProductInventoryTransaction', 'IssueRequest', 'RepairItem'
                }
                if model.__name__ in allowed_staff_write_models:
                    return True
            return False

        # DEPARTMENT_HEAD: read-only by default, write restricted to specific operational models, no DELETE
        if role == UserRole.DEPARTMENT_HEAD:
            if request.method in permissions.SAFE_METHODS:
                return True

            if request.method == 'DELETE':
                return False

            # Check if operational model is writeable by Department Head
            model = getattr(getattr(view, 'queryset', None), 'model', None)
            if model:
                allowed_dept_head_write_models = {
                    'Job', 'InventoryTransaction', 'StoneTransaction', 'StockTransaction',
                    'FindingInventoryTransaction', 'ProductInventoryTransaction', 'IssueRequest', 'RepairItem'
                }
                if model.__name__ in allowed_dept_head_write_models:
                    return True
            return False

        # MANAGER: full write, but strictly no DELETE
        if role == UserRole.MANAGER:
            return request.method != 'DELETE'

        # COMPANY_ADMIN and TENANT_OWNER: full write and delete
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Super Admins have full access
        if getattr(user, 'role', None) == UserRole.SUPER_ADMIN or user.is_superuser:
            return True

        # Enforce Tenant Boundary first
        if hasattr(obj, 'tenant') and obj.tenant is not None:
            if obj.tenant != user.tenant:
                return False
        elif isinstance(obj, Tenant):
            if obj != user.tenant:
                return False

        # Resolve effective role
        role = getattr(user, 'role', None)
        if role == UserRole.ADMIN_LEGACY:
            role = UserRole.TENANT_OWNER
        elif role == UserRole.MANAGER_LEGACY:
            role = UserRole.MANAGER
        elif role == UserRole.STAFF_LEGACY:
            role = UserRole.STAFF

        # TENANT_OWNER has access to all companies in their tenant
        if role == UserRole.TENANT_OWNER:
            return True

        # Enforce Company alignment for other roles
        if isinstance(obj, Company):
            return user.accessible_companies.filter(id=obj.id).exists()

        if hasattr(obj, 'company') and obj.company is not None:
            return user.accessible_companies.filter(id=obj.company.id).exists()

        # For DEPARTMENT_HEAD, enforce department-level limits if workforce record has a department
        if role == UserRole.DEPARTMENT_HEAD:
            if user.email:
                from workforce.models import WorkforceMember
                # Search for workforce member in current tenant
                member = WorkforceMember.objects.filter(email__iexact=user.email, tenant=user.tenant).first()
                if member and member.department:
                    dept = member.department.strip()
                    # Check if object has a department
                    if hasattr(obj, 'department') and getattr(obj, 'department', None):
                        if str(getattr(obj, 'department')).strip() != dept:
                            return False
                    # Check if object is a Job (has dept_from / dept_to)
                    if hasattr(obj, 'dept_from') and getattr(obj, 'dept_from', None):
                        dept_from = str(getattr(obj, 'dept_from')).strip()
                        dept_to = str(getattr(obj, 'dept_to', '')).strip()
                        if dept_from != dept and dept_to != dept:
                            return False

        # Fall back to matching tenant for objects without explicit company attribute
        return True

