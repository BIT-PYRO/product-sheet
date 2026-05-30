import uuid
from django.utils.deprecation import MiddlewareMixin
from core_tenants.context import set_tenant, set_company, clear_tenant_context
from core_tenants.models import Company

class TenantContextMiddleware(MiddlewareMixin):
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response

    def __call__(self, request):
        # 1. Clear any leftover context to start fresh
        clear_tenant_context()

        try:
            # 2. Determine context if the user is authenticated
            if request.user and request.user.is_authenticated:
                user = request.user
                tenant = user.tenant
                active_company = user.active_company

                # Check if user is requesting a company switch via header
                x_company_id = request.headers.get('X-Company-ID') or request.META.get('HTTP_X_COMPANY_ID')
                
                if x_company_id:
                    try:
                        # Validate UUID format
                        company_uuid = uuid.UUID(x_company_id)
                        # Check if company is in user's accessible companies and belongs to user's tenant
                        company = user.accessible_companies.filter(id=company_uuid, tenant=tenant).first()
                        if company:
                            active_company = company
                    except (ValueError, TypeError):
                        # If UUID is malformed, fall back to user's default active company
                        pass

                # Set request attributes
                request.tenant = tenant
                request.company = active_company

                # Populate the thread-safe/async-safe contextvars
                if tenant:
                    set_tenant(tenant)
                if active_company:
                    set_company(active_company)

            # 3. Process the request
            response = self.get_response(request)
            return response

        finally:
            # 4. Always clear context at the end of the request-response cycle
            clear_tenant_context()
