from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from accounts.permissions import IsSuperAdmin

from core_tenants.models import Tenant, TenantStatus
from saas_billing.models import Subscription, SubscriptionStatus, UpgradeRequestEvent
from platform_admin.models import PlatformActionAudit
from django.contrib.auth import get_user_model

User = get_user_model()

class PlatformDashboardMetricsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            now = timezone.now()
            thirty_days_ago = now - timedelta(days=30)

            tenants = Tenant.objects.all()
            
            # Core Metrics
            total_tenants = tenants.count()
            active_tenants = tenants.filter(status=TenantStatus.ACTIVE_TRIAL).count() + tenants.filter(status=TenantStatus.ACTIVE_PAID).count()
            trial_tenants = tenants.filter(status=TenantStatus.ACTIVE_TRIAL).count()
            suspended_tenants = tenants.filter(status=TenantStatus.SUSPENDED).count()
            cancelled_tenants = tenants.filter(status=TenantStatus.CANCELLED).count()
            active_paid_tenants = tenants.filter(status=TenantStatus.ACTIVE_PAID).count()

            # Revenue
            active_paid_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).select_related('plan')
            mrr = float(sum((sub.plan.base_price_monthly or 0) for sub in active_paid_subs if sub.plan))
            arr = float(sum((sub.plan.base_price_yearly or (sub.plan.base_price_monthly or 0) * 12) for sub in active_paid_subs if sub.plan))
            
            # Tenant Growth (Last 6 Months)
            growth = []
            for i in range(5, -1, -1):
                month_start = (now.replace(day=1) - timedelta(days=30*i)).replace(day=1)
                month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
                count = tenants.filter(created_at__range=(month_start, month_end)).count()
                growth.append({"name": month_start.strftime("%b"), "value": count})

            # Industry Distribution
            industries = list(tenants.values('industry__name').annotate(value=Count('id')))
            industry_dist = [{"name": i['industry__name'] or "Unknown", "value": i['value']} for i in industries]

            # Plan Distribution
            plans = list(tenants.values('plan__name').annotate(value=Count('id')))
            plan_dist = [{"name": p['plan__name'] or "Unknown", "value": p['value']} for p in plans]

            # Recent Signups
            recent_signups = tenants.select_related('plan').order_by('-created_at')[:5]
            recent_signups_data = [{
                "id": str(t.id),
                "name": t.name,
                "created_at": t.created_at,
                "plan": t.plan.name if t.plan else "N/A"
            } for t in recent_signups]

            # Recent Upgrades
            recent_upgrades = UpgradeRequestEvent.objects.select_related('tenant', 'user').order_by('-created_at')[:5]
            recent_upgrades_data = [{
                "id": r.id,
                "tenant": r.tenant.name if r.tenant else "Unknown",
                "user": r.user.get_full_name() if r.user else "Unknown",
                "feature": r.feature_code,
                "plan": r.plan_name,
                "status": r.status,
                "created_at": r.created_at
            } for r in recent_upgrades]

            return Response({
                "metrics": {
                    "total_tenants": total_tenants,
                    "active_tenants": active_tenants,
                    "trial_tenants": trial_tenants,
                    "suspended_tenants": suspended_tenants,
                    "cancelled_tenants": cancelled_tenants,
                    "active_paid_tenants": active_paid_tenants,
                    "mrr": mrr,
                    "arr": arr,
                },
                "charts": {
                    "growth": growth,
                    "industry_distribution": industry_dist,
                    "plan_distribution": plan_dist
                },
                "recent_activity": {
                    "signups": recent_signups_data,
                    "upgrades": recent_upgrades_data
                }
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"Dashboard error: {str(e)}"}, status=500)


class PlatformDashboardActivityFeedView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        audits = PlatformActionAudit.objects.select_related('performed_by', 'target_tenant').order_by('-created_at')[:20]
        data = [{
            "id": a.id,
            "action": a.action_type,
            "tenant": a.target_tenant.name if a.target_tenant else "Unknown",
            "performed_by": a.performed_by.get_full_name() if a.performed_by else "System",
            "reason": a.reason,
            "created_at": a.created_at
        } for a in audits]
        
        return Response(data)


class SystemHealthView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from core.services.startup_validation import StartupValidationService
        
        health_data = StartupValidationService.check_health()
        
        # Add basic API health
        health_data["api"] = {"status": "healthy", "message": "API is operational"}
        
        return Response(health_data)
