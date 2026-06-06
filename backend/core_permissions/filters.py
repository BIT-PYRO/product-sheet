from rest_framework.filters import BaseFilterBackend
from core_permissions.roles import UserRole
from core_tenants.models import Tenant, Company

class SaaSIsolationFilterBackend(BaseFilterBackend):
    """
    Airtight global database-level filter backend enforcing:
    - SUPER_ADMIN / superusers: Full access to all database records across all tenants.
    - TENANT_OWNER: Full access to all records belonging to their tenant, across all companies.
    - Other roles (COMPANY_ADMIN, MANAGER, STAFF, VIEWER): Access is strictly limited
      to records matching their tenant AND their active company (retrieved from the request context).
    """

    def filter_queryset(self, request, queryset, view):
        user = request.user
        if not user or not user.is_authenticated:
            return queryset.none()

        # Resolve effective role (mapping legacy roles to new roles)
        role = getattr(user, 'role', None)
        if role == UserRole.ADMIN_LEGACY:
            role = UserRole.TENANT_OWNER
        elif role == UserRole.MANAGER_LEGACY:
            role = UserRole.MANAGER
        elif role == UserRole.STAFF_LEGACY:
            role = UserRole.STAFF
        elif role == UserRole.DEPARTMENT_HEAD:
            role = UserRole.MANAGER
        elif user.__class__.__name__ == 'VirtualAPIKeyUser':
            role = UserRole.TENANT_OWNER

        # SUPER_ADMIN and superusers bypass all isolation filters
        if role == UserRole.SUPER_ADMIN or user.is_superuser:
            return queryset

        # Every other user must belong to a tenant
        if not user.tenant:
            return queryset.none()

        model = queryset.model
        
        # Check if the model has a tenant attribute
        has_tenant = hasattr(model, 'tenant') or any(f.name == 'tenant' for f in model._meta.get_fields())
        if not has_tenant:
            # If the model does not have tenant context (e.g. system-wide models), do not filter
            return queryset

        # Resolve the unscoped manager to bypass thread-local manager limits (if present)
        # and explicitly enforce security.
        manager = getattr(model, 'unscoped_objects', model.objects)
        base_qs = manager.all()

        # TENANT_OWNER: filter by tenant only (all companies allowed)
        if role == UserRole.TENANT_OWNER:
            return base_qs.filter(tenant=user.tenant)

        # For COMPANY_ADMIN, MANAGER, STAFF, VIEWER: filter by tenant and active company
        active_company = getattr(request, 'company', None) or user.active_company
        if not active_company:
            return queryset.none()

        # Verify active company belongs to user's tenant and they have access
        if active_company.tenant != user.tenant or not user.accessible_companies.filter(id=active_company.id).exists():
            return queryset.none()

        has_company = hasattr(model, 'company') or any(f.name == 'company' for f in model._meta.get_fields())
        if has_company:
            return base_qs.filter(tenant=user.tenant, company=active_company)

        # Model is tenant-aware but not company-aware (e.g., Collections, Lookups)
        return base_qs.filter(tenant=user.tenant)
