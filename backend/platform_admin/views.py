from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from .models import Feature
from .serializers import FeatureSerializer
from common.api import api_success

class PlatformFeaturesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cache_key = "platform_features_registry"
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            return api_success(cached_data, message="Platform features fetched from cache.")
            
        features = Feature.objects.filter(is_active=True).order_by('category', 'name')
        serializer = FeatureSerializer(features, many=True)
        
        # Cache for 15 minutes
        cache.set(cache_key, serializer.data, timeout=900)
        
        return api_success(serializer.data, message="Platform features fetched.")

from saas_billing.models import UpgradeRequestEvent
from core_tenants.context import get_current_tenant
from rest_framework import status

class UpgradeRequestEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        feature_code = request.data.get('feature_code')
        if not feature_code:
            return Response({"error": "feature_code is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        tenant = request.tenant if hasattr(request, 'tenant') else get_current_tenant()
        if not tenant:
            if hasattr(request.user, 'tenant'):
                tenant = request.user.tenant
            else:
                return Response({"error": "No tenant context found"}, status=status.HTTP_400_BAD_REQUEST)
            
        plan_name = tenant.subscription.plan.name if hasattr(tenant, 'subscription') and tenant.subscription else 'None'
        
        UpgradeRequestEvent.objects.create(
            tenant=tenant,
            user=request.user,
            plan_name=plan_name,
            feature_code=feature_code
        )
        
        return api_success({"status": "success"}, message="Upgrade request recorded.")
