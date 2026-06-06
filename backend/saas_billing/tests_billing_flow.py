from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from saas_billing.models import (
    Plan, Subscription, SubscriptionStatus, PaymentTransaction, Invoice
)
from core_tenants.models import Tenant, TenantStatus
from saas_billing.services.subscription_lifecycle import SubscriptionLifecycleService

class BillingFlowTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Corp", slug="test-corp")
        self.plan = Plan.objects.create(
            name="Pro Plan",
            code="pro",
            base_price_monthly=50.00,
            base_price_yearly=500.00,
            is_active=True
        )

    def test_subscription_creation_and_activation(self):
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.plan)
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(sub.locked_price, 50.00)

    def test_grace_period_flow(self):
        # 1. Create and activate
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.plan)
        
        # 2. Apply Grace Period
        SubscriptionLifecycleService.apply_grace_period(sub)
        self.assertEqual(sub.status, SubscriptionStatus.GRACE_PERIOD)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.status, TenantStatus.GRACE_PERIOD)
        
        # 3. Mark Past Due
        SubscriptionLifecycleService.mark_past_due(sub)
        self.assertEqual(sub.status, SubscriptionStatus.PAST_DUE)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.status, TenantStatus.PAST_DUE)

    def test_change_plan_and_cancel(self):
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.plan)
        new_plan = Plan.objects.create(
            name="Enterprise", code="ent", base_price_monthly=100.00, is_active=True
        )
        
        # Upgrade
        sub = SubscriptionLifecycleService.upgrade_subscription(sub, new_plan)
        self.assertEqual(sub.plan, new_plan)
        self.assertEqual(sub.locked_price, 100.00)
        
        # Cancel at period end
        sub = SubscriptionLifecycleService.cancel_subscription(sub, at_period_end=True)
        self.assertTrue(sub.cancel_at_period_end)
        self.assertNotEqual(sub.status, SubscriptionStatus.CANCELLED)
        
        # Cancel immediately
        sub = SubscriptionLifecycleService.cancel_subscription(sub, at_period_end=False)
        self.assertFalse(sub.cancel_at_period_end)
        self.assertEqual(sub.status, SubscriptionStatus.CANCELLED)
