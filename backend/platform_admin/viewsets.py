from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core_tenants.models import Tenant, Company
from core_tenants.serializers import TenantSerializer, CompanySerializer
from core_tenants.services.tenant_service import TenantOnboardingService
from core_permissions.permissions import IsSuperAdmin

class PlatformTenantViewSet(viewsets.ModelViewSet):
    """
    Platform Management ViewSet for Tenants.
    EXCLUSIVELY accessible to Super Admins.
    Provides listing, creation, and activation/deactivation.
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def create(self, request, *args, **kwargs):
        """
        Creates a basic Tenant, or routes to onboarding if owner parameters are supplied.
        """
        if 'owner_username' in request.data:
            # Route to onboarding service for full provisioning
            required_fields = ['tenant_name', 'owner_username', 'owner_email', 'owner_password']
            for field in required_fields:
                if not request.data.get(field):
                    return Response({"error": f"Field '{field}' is required for onboarding."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                tenant, company, user = TenantOnboardingService.onboard_tenant(
                    tenant_name=request.data.get('tenant_name'),
                    slug=request.data.get('slug'),
                    company_name=request.data.get('company_name'),
                    owner_username=request.data.get('owner_username'),
                    owner_email=request.data.get('owner_email'),
                    owner_password=request.data.get('owner_password')
                )
                return Response({
                    "status": "success",
                    "message": "Tenant and owner onboarded successfully via Super Admin portal.",
                    "tenant": TenantSerializer(tenant).data
                }, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Fallback to standard tenant creation
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activates a Tenant."""
        tenant = self.get_object()
        tenant.is_active = True
        tenant.save(update_fields=['is_active', 'updated_at'])
        return Response({
            "status": "success",
            "message": f"Tenant {tenant.name} has been activated.",
            "is_active": True
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivates a Tenant."""
        tenant = self.get_object()
        tenant.is_active = False
        tenant.save(update_fields=['is_active', 'updated_at'])
        return Response({
            "status": "success",
            "message": f"Tenant {tenant.name} has been deactivated.",
            "is_active": False
        }, status=status.HTTP_200_OK)


class PlatformCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Platform Management ViewSet for Companies.
    EXCLUSIVELY accessible to Super Admins.
    Provides read-only listing of all companies on the platform.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
