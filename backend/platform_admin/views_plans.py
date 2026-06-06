from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from accounts.permissions import IsSuperAdmin

from saas_billing.models import Plan
from platform_admin.models import Feature, PlanFeature

class PlatformPlanManagementView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        plans = Plan.objects.all().order_by('base_price_monthly')
        
        data = []
        for p in plans:
            features = PlanFeature.objects.filter(plan=p).select_related('feature')
            data.append({
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "is_active": p.is_active,
                "is_public": p.is_public,
                "base_price_monthly": str(p.base_price_monthly),
                "base_price_yearly": str(p.base_price_yearly),
                "trial_days": p.trial_days,
                "features": [{
                    "feature_id": pf.feature.id,
                    "feature_name": pf.feature.name,
                    "feature_code": pf.feature.code,
                    "is_enabled": pf.is_enabled,
                    "limit": pf.limit
                } for pf in features]
            })
            
        return Response(data)

class PlatformPlanFeatureToggleView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, plan_id, feature_id):
        is_enabled = request.data.get('is_enabled', True)
        limit = request.data.get('limit', None)
        
        try:
            plan_feature = PlanFeature.objects.get(plan_id=plan_id, feature_id=feature_id)
            plan_feature.is_enabled = is_enabled
            if limit is not None:
                plan_feature.limit = limit
            plan_feature.save()
            return Response({"message": "Plan feature updated."})
        except PlanFeature.DoesNotExist:
            return Response({"error": "PlanFeature not found"}, status=status.HTTP_404_NOT_FOUND)
