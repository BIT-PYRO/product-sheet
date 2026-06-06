from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from core_tenants.models import TenantBranding

class OnboardingWizardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({"error": "No tenant associated."}, status=status.HTTP_400_BAD_REQUEST)
        
        branding, _ = TenantBranding.objects.get_or_create(tenant=tenant)
        
        return Response({
            "step": tenant.onboarding_step,
            "completed": tenant.onboarding_completed,
            "branding": {
                "company_logo": branding.company_logo,
                "primary_color": branding.primary_color,
                "secondary_color": branding.secondary_color,
                "support_email": branding.support_email,
                "company_website": branding.company_website,
                "company_phone": branding.company_phone,
            }
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({"error": "No tenant associated."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        
        if 'step' in data:
            tenant.onboarding_step = data['step']
        if 'completed' in data:
            tenant.onboarding_completed = data['completed']
        tenant.save()

        if 'branding' in data:
            branding, _ = TenantBranding.objects.get_or_create(tenant=tenant)
            brand_data = data['branding']
            branding.company_logo = brand_data.get('company_logo', branding.company_logo)
            branding.primary_color = brand_data.get('primary_color', branding.primary_color)
            branding.secondary_color = brand_data.get('secondary_color', branding.secondary_color)
            branding.support_email = brand_data.get('support_email', branding.support_email)
            branding.company_website = brand_data.get('company_website', branding.company_website)
            branding.company_phone = brand_data.get('company_phone', branding.company_phone)
            branding.save()

        return Response({"message": "Onboarding progress saved."}, status=status.HTTP_200_OK)
