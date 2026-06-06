from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from accounts.permissions import IsSuperAdmin

from core_tenants.models import Tenant, TenantStatus, Company, TenantBranding
from saas_billing.models import Subscription
from accounts.models import User
from platform_admin.models import PlatformActionAudit

class TenantManagementListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        tenants = Tenant.objects.select_related('industry', 'plan').all().order_by('-created_at')
        
        # We can implement pagination later, for now we will just return everything
        data = []
        for t in tenants:
            users_count = User.objects.filter(tenant=t).count()
            data.append({
                "id": t.id,
                "company": t.name,
                "industry": t.industry.name if t.industry else "None",
                "plan": t.plan.name if t.plan else "None",
                "status": t.status,
                "users": users_count,
                "storage": "0 GB", # Mocked for now
                "created_at": t.created_at,
                "trial_end_date": getattr(t.subscription, 'trial_end_date', None) if hasattr(t, 'subscription') else None
            })
            
        return Response(data)

class TenantManagementDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, tenant_id):
        try:
            tenant = Tenant.objects.select_related('industry', 'plan').get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)
            
        # Basic Info
        basic_info = {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "status": tenant.status,
            "industry": tenant.industry.name if tenant.industry else None,
            "plan": tenant.plan.name if tenant.plan else None,
            "created_at": tenant.created_at
        }
        
        # Subscription Info
        sub_info = None
        if hasattr(tenant, 'subscription') and tenant.subscription:
            sub = tenant.subscription
            sub_info = {
                "id": sub.id,
                "status": sub.status,
                "plan_name": sub.plan.name,
                "trial_end_date": sub.trial_end_date,
                "current_period_end": sub.current_period_end
            }
            
        # Branding
        branding = None
        tb = TenantBranding.objects.filter(tenant=tenant).first()
        if tb:
            branding = {
                "primary_color": tb.primary_color,
                "secondary_color": tb.secondary_color,
                "support_email": tb.support_email,
                "company_website": tb.company_website
            }
            
        return Response({
            "overview": basic_info,
            "subscription": sub_info,
            "branding": branding
        })


class TenantActionView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, tenant_id):
        action = request.data.get('action')
        reason = request.data.get('reason')
        
        if not action or not reason:
            return Response({"error": "Action and Reason are required for auditing."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        client_ip = request.META.get('REMOTE_ADDR')

        with transaction.atomic():
            old_state = {"status": tenant.status}
            new_state = {}
            
            if action == 'suspend':
                tenant.status = TenantStatus.SUSPENDED
                tenant.save()
                new_state = {"status": TenantStatus.SUSPENDED}
                
            elif action == 'reactivate':
                # Restore to ACTIVE_TRIAL or ACTIVE_PAID (simplified for now)
                tenant.status = TenantStatus.ACTIVE_TRIAL 
                tenant.save()
                new_state = {"status": TenantStatus.ACTIVE_TRIAL}
                
            elif action == 'cancel_subscription':
                tenant.status = TenantStatus.CANCELLED
                tenant.save()
                if hasattr(tenant, 'subscription') and tenant.subscription:
                    from saas_billing.models import SubscriptionStatus
                    tenant.subscription.status = SubscriptionStatus.CANCELED
                    tenant.subscription.save()
                new_state = {"status": TenantStatus.CANCELLED}
                
            else:
                return Response({"error": "Unknown action"}, status=400)

            # Mandatory Audit Logging
            PlatformActionAudit.objects.create(
                action_type=action.upper(),
                target_tenant=tenant,
                performed_by=request.user,
                old_state=old_state,
                new_state=new_state,
                reason=reason,
                ip_address=client_ip
            )

        return Response({"message": f"Tenant {action} successful.", "new_status": tenant.status})

class PlatformAuditListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        audits = PlatformActionAudit.objects.select_related('performed_by', 'target_tenant').order_by('-created_at')
        
        # Simple search filter
        search = request.query_params.get('search', '')
        if search:
            audits = audits.filter(
                action_type__icontains=search
            ) | audits.filter(
                target_tenant__name__icontains=search
            ) | audits.filter(
                performed_by__email__icontains=search
            )
            
        # Hard cap to 100 for now to prevent massive payloads
        audits = audits[:100]
        
        data = [{
            "id": a.id,
            "action": a.action_type,
            "tenant": a.target_tenant.name if a.target_tenant else "Unknown",
            "performed_by": a.performed_by.get_full_name() if a.performed_by else "System",
            "reason": a.reason,
            "created_at": a.created_at
        } for a in audits]
        
        return Response(data)
