from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_billing.views import (
    PlanViewSet, SubscriptionViewSet, CheckoutView, StripeWebhookView,
    InvoiceViewSet, PaymentViewSet, AdminRevenueView, AdminTenantUsageView
)

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('subscription/', SubscriptionViewSet.as_view({'get': 'list'}), name='subscription-detail'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    
    # Platform Admin Routes
    path('platform-admin/revenue/', AdminRevenueView.as_view(), name='admin-revenue'),
    path('platform-admin/tenants/<uuid:tenant_id>/usage/', AdminTenantUsageView.as_view(), name='admin-tenant-usage'),
]
