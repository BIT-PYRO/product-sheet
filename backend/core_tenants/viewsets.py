from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from core_tenants.models import Tenant, Company
from core_tenants.serializers import TenantSerializer, CompanySerializer
from core_tenants.services.tenant_service import TenantOnboardingService
from core_tenants.services.company_service import CompanyService
from core_tenants.services.user_service import UserService
from core_permissions.permissions import IsSuperAdmin, IsTenantOwner, IsCompanyAdmin
from core_permissions.roles import UserRole

class TenantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Tenants.
    Super Admins have full access. Tenant Owners can only view their own Tenant.
    """
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin | IsTenantOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN or user.is_superuser:
            return Tenant.objects.all()
        if user.tenant:
            return Tenant.objects.filter(id=user.tenant.id)
        return Tenant.objects.none()

    def get_permissions(self):
        # Strictly restrict creation, updates, and deletion to Super Admins only
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSuperAdmin])
    def onboard(self, request):
        """
        Endpoint for Super Admins to onboard a new Tenant, its first Company, and its Tenant Owner User.
        """
        required_fields = ['tenant_name', 'owner_username', 'owner_email', 'owner_password']
        for field in required_fields:
            if not request.data.get(field):
                return Response({"error": f"Field '{field}' is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tenant, company, user = TenantOnboardingService.onboard_tenant(
                tenant_name=request.data.get('tenant_name'),
                slug=request.data.get('slug'),
                company_name=request.data.get('company_name'),
                owner_username=request.data.get('owner_username'),
                owner_email=request.data.get('owner_email'),
                owner_password=request.data.get('owner_password'),
                owner_first_name=request.data.get('owner_first_name', ''),
                owner_last_name=request.data.get('owner_last_name', '')
            )
            return Response({
                "status": "success",
                "message": "Tenant onboarded successfully.",
                "tenant": TenantSerializer(tenant).data,
                "company": CompanySerializer(company).data,
                "owner": {
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Companies.
    Tenant Owners and Company Admins can manage their tenant's companies.
    """
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN or user.is_superuser:
            return Company.objects.all()
        if user.tenant:
            # Users can see companies belonging to their tenant
            return Company.objects.filter(tenant=user.tenant)
        return Company.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.tenant:
            raise ValidationError("You must belong to a tenant to create a company.")

        try:
            company = CompanyService.create_company(
                tenant=user.tenant,
                name=serializer.validated_data.get('name'),
                code=serializer.validated_data.get('code', ''),
                gst_number=serializer.validated_data.get('gst_number', ''),
                address=serializer.validated_data.get('address', ''),
                is_active=serializer.validated_data.get('is_active', True)
            )
            # Add new company to user's accessible companies automatically
            UserService.add_company_to_user(user, company)
            serializer.instance = company
        except ValueError as e:
            raise ValidationError(str(e))

    def perform_destroy(self, instance):
        # Call company service to deactivate instead of deleting (soft deletion practice in SaaS)
        CompanyService.deactivate_company(instance)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def switch_active(self, request, pk=None):
        """
        Allows a user to switch their active company to this one.
        """
        company = self.get_object()
        try:
            UserService.set_active_company(request.user, company)
            return Response({
                "status": "success",
                "message": f"Switched active company to {company.name}.",
                "active_company_id": str(company.id)
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
