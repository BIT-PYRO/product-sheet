from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from accounts.permissions import IsSuperAdmin

from saas_billing.models import UpgradeRequestEvent
from platform_admin.models import Feature
from core_tenants.models import Tenant

class UpgradeFunnelAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            events = UpgradeRequestEvent.objects.all()
            
            total_requests = events.count()
            contacted = events.filter(status='contacted').count()
            converted = events.filter(status='converted').count()
            rejected = events.filter(status='rejected').count()
            
            # Requests per feature
            feature_stats = list(events.values('feature_code').annotate(count=Count('id')))
            
            return Response({
                "funnel": {
                    "total": total_requests,
                    "contacted": contacted,
                    "converted": converted,
                    "rejected": rejected
                },
                "features": feature_stats
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class FeatureAdoptionAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # High level mock for now, this would normally require tracking queries.
        # But we can query how many tenants have a specific feature enabled via their plan.
        features = Feature.objects.all()
        total_tenants = Tenant.objects.count()
        
        adoption_data = []
        for f in features:
            # We can approximate active tenants by those on a plan that includes this feature
            from saas_billing.models import Subscription, SubscriptionStatus
            from platform_admin.models import PlanFeature
            
            plans_with_feature = PlanFeature.objects.filter(feature=f, is_enabled=True).values_list('plan_id', flat=True)
            active_subs_count = Subscription.objects.filter(
                plan_id__in=plans_with_feature, 
                status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
            ).count()
            
            usage_pct = round((active_subs_count / total_tenants) * 100, 1) if total_tenants > 0 else 0
            
            adoption_data.append({
                "feature": f.name,
                "code": f.code,
                "enabled_tenants": active_subs_count,
                "usage_percent": usage_pct
            })
            
        return Response(adoption_data)
