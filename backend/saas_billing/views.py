from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Sum

from core_permissions.permissions import IsSuperAdmin, IsTenantOwner
from core_tenants.context import get_current_tenant
from core_tenants.models import Tenant

from saas_billing.models import (
    Plan, Subscription, Invoice, Payment, TenantUsageSnapshot, SubscriptionStatus
)
from saas_billing.serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer, PaymentSerializer,
    TenantUsageSnapshotSerializer, CheckoutRequestSerializer
)
from saas_billing.services.subscription_lifecycle import SubscriptionLifecycleService
from saas_billing.services.payment_gateway import StripeGateway

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """Publicly available plans."""
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]

class SubscriptionViewSet(viewsets.ViewSet):
    """Tenant owner view for their own subscription."""
    permission_classes = [IsAuthenticated, IsTenantOwner]

    def list(self, request):
        tenant = request.tenant if hasattr(request, 'tenant') else get_current_tenant()
        subscription = get_object_or_404(Subscription, tenant=tenant)
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)

class CheckoutView(views.APIView):
    """Handles creating a checkout session."""
    permission_classes = [IsAuthenticated, IsTenantOwner]

    def post(self, request):
        serializer = CheckoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        tenant = request.tenant if hasattr(request, 'tenant') else get_current_tenant()
        plan = get_object_or_404(Plan, id=serializer.validated_data['plan_id'])
        
        # In a real system, verify if subscription exists, or upgrade.
        subscription, created = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                'plan': plan,
                'billing_cycle': serializer.validated_data['billing_cycle']
            }
        )
        if created:
            subscription = SubscriptionLifecycleService.create_subscription(
                tenant, plan, serializer.validated_data['billing_cycle']
            )
        
        gateway = StripeGateway()
        session = gateway.create_checkout_session(
            subscription,
            serializer.validated_data['success_url'],
            serializer.validated_data['cancel_url']
        )
        
        return Response(session)

class StripeWebhookView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        gateway = StripeGateway()
        signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        
        try:
            result = gateway.handle_webhook(request.body, signature)
            status_code = status.HTTP_200_OK if result.get('status') != 'duplicate' else status.HTTP_208_ALREADY_REPORTED
            return Response(result, status=status_code)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsTenantOwner]

    def get_queryset(self):
        tenant = self.request.tenant if hasattr(self.request, 'tenant') else get_current_tenant()
        return Invoice.objects.filter(tenant=tenant)

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsTenantOwner]

    def get_queryset(self):
        tenant = self.request.tenant if hasattr(self.request, 'tenant') else get_current_tenant()
        return Payment.objects.filter(invoice__tenant=tenant)

class AdminRevenueView(views.APIView):
    """Super Admin view for overall SaaS revenue."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        mrr = active_subs.aggregate(total_mrr=Sum('locked_price'))['total_mrr'] or 0
        arr = mrr * 12
        count = active_subs.count()
        
        return Response({
            "active_subscriptions": count,
            "mrr": mrr,
            "arr": arr,
        })

class AdminTenantUsageView(views.APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, tenant_id):
        tenant = get_object_or_404(Tenant, id=tenant_id)
        snapshot = TenantUsageSnapshot.objects.filter(tenant=tenant).order_by('-snapshot_date').first()
        if not snapshot:
            return Response({"detail": "No usage data found for this tenant."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TenantUsageSnapshotSerializer(snapshot)
        return Response(serializer.data)
