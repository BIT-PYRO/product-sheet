from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from core_tenants.models import Tenant
from saas_billing.models import (
    Plan, PlanEntitlement, DataType, Subscription, SubscriptionStatus,
    BillingCycle, TenantEntitlementOverride, Invoice, Payment, CreditNote
)
from saas_billing.services.subscription_lifecycle import SubscriptionLifecycleService
from saas_billing.services.entitlement_evaluation import EntitlementEvaluationService
from saas_billing.services.saas_pricing import SaaSPricingService

User = get_user_model()

class BillingTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant")
        self.user = User.objects.create(username="testuser", tenant=self.tenant)
        
        # Free Plan
        self.free_plan = Plan.objects.create(
            name="Free", code="free", trial_days=0,
            base_price_monthly=0, base_price_yearly=0
        )
        PlanEntitlement.objects.create(plan=self.free_plan, key="max_users", value="2", data_type=DataType.INTEGER)
        PlanEntitlement.objects.create(plan=self.free_plan, key="exports_enabled", value="false", data_type=DataType.BOOLEAN)

        # Starter Plan
        self.starter_plan = Plan.objects.create(
            name="Starter", code="starter", trial_days=14,
            base_price_monthly=49.00, base_price_yearly=490.00
        )
        PlanEntitlement.objects.create(plan=self.starter_plan, key="max_users", value="10", data_type=DataType.INTEGER)
        PlanEntitlement.objects.create(plan=self.starter_plan, key="exports_enabled", value="true", data_type=DataType.BOOLEAN)

    def test_trial_subscription_lifecycle(self):
        """Tests that a starter plan gets a 14 day trial."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.starter_plan)
        self.assertEqual(sub.status, SubscriptionStatus.TRIALING)
        self.assertIsNotNone(sub.trial_end_date)
        self.assertEqual(sub.locked_price, self.starter_plan.base_price_monthly)

    def test_free_subscription_lifecycle(self):
        """Tests that a free plan goes straight to active with no trial."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.free_plan)
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertIsNone(sub.trial_end_date)
        self.assertEqual(sub.locked_price, Decimal('0.00'))

    def test_upgrade_subscription(self):
        """Tests upgrading from Free to Starter."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.free_plan)
        self.assertEqual(sub.plan, self.free_plan)
        
        updated_sub = SubscriptionLifecycleService.upgrade_subscription(sub, self.starter_plan)
        self.assertEqual(updated_sub.plan, self.starter_plan)
        self.assertEqual(updated_sub.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(updated_sub.locked_price, self.starter_plan.base_price_monthly)

    def test_entitlement_evaluation_limits(self):
        """Tests checking integer limits."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.starter_plan)
        # max_users is 10
        self.assertTrue(EntitlementEvaluationService.check_limit(self.tenant, "max_users", 5)) # 5 <= 10
        self.assertTrue(EntitlementEvaluationService.check_limit(self.tenant, "max_users", 10)) # 10 <= 10 is True (Inclusive Limit)
        self.assertFalse(EntitlementEvaluationService.check_limit(self.tenant, "max_users", 15))

    def test_entitlement_evaluation_booleans(self):
        """Tests checking boolean features."""
        SubscriptionLifecycleService.create_subscription(self.tenant, self.starter_plan)
        # exports_enabled is true
        self.assertTrue(EntitlementEvaluationService.has_feature(self.tenant, "exports_enabled"))
        self.assertFalse(EntitlementEvaluationService.has_feature(self.tenant, "non_existent_feature"))

    def test_entitlement_override(self):
        """Tests SuperAdmin overriding an entitlement for a specific tenant."""
        SubscriptionLifecycleService.create_subscription(self.tenant, self.free_plan)
        
        # By default, free plan has exports disabled
        self.assertFalse(EntitlementEvaluationService.has_feature(self.tenant, "exports_enabled"))
        
        # SuperAdmin overrides it
        TenantEntitlementOverride.objects.create(
            tenant=self.tenant,
            entitlement_key="exports_enabled",
            value="true",
            data_type=DataType.BOOLEAN
        )
        
        # Should now be True
        self.assertTrue(EntitlementEvaluationService.has_feature(self.tenant, "exports_enabled"))

    def test_proration_calculation(self):
        """Tests proration calculation."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.free_plan, BillingCycle.MONTHLY)
        prorated_diff = SaaSPricingService.calculate_proration(
            current_subscription=sub,
            new_plan=self.starter_plan,
            days_remaining=15,
            total_days_in_cycle=30
        )
        # Free is 0/day, Starter is 49/30 = 1.633/day. 1.633 * 15 = ~24.50
        self.assertEqual(prorated_diff, Decimal('24.50'))

    def test_invoice_creation(self):
        """Tests basic invoice and payment linking."""
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.starter_plan)
        invoice = Invoice.objects.create(
            tenant=self.tenant,
            subscription=sub,
            amount_due=sub.locked_price
        )
        Payment.objects.create(
            invoice=invoice,
            amount=sub.locked_price,
            status="succeeded"
        )
        self.assertEqual(invoice.payments.count(), 1)

    def test_webhook_idempotency(self):
        """Tests that webhooks with the same ID are caught as duplicates."""
        from saas_billing.services.payment_gateway import StripeGateway
        from saas_billing.models import SubscriptionEvent
        
        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.starter_plan)
        
        gateway = StripeGateway()
        
        # Simulate processing an event and marking it
        SubscriptionEvent.objects.create(
            subscription=sub,
            event_type="invoice.payment_succeeded",
            idempotency_key="evt_12345",
            payload={"status": "paid"}
        )
        
        # Check idempotency directly on the gateway
        is_duplicate = gateway.check_idempotency("evt_12345")
        self.assertTrue(is_duplicate)
        
        is_duplicate = gateway.check_idempotency("evt_new")
        self.assertFalse(is_duplicate)

    def test_usage_aggregation_task(self):
        """Tests that the Celery task aggregates usage correctly."""
        # Note: The original aggregate_tenant_usage was refactored into aggregate_single_tenant.
        from saas_billing.tasks.usage_aggregation import aggregate_single_tenant
        from saas_billing.models import TenantUsageSnapshot
        
        # Create a second user
        User.objects.create(username="testuser2", tenant=self.tenant)
        
        # Run the task synchronously
        aggregate_single_tenant(self.tenant.id)
        
        # A snapshot should have been created
        snapshot = TenantUsageSnapshot.objects.get(tenant=self.tenant)
        
        self.assertEqual(snapshot.active_users, 2)
        self.assertEqual(snapshot.total_users, 2)

    def test_subscription_audit_events(self):
        from saas_billing.models import PlatformAuditRecord, AuditEventType

        sub = SubscriptionLifecycleService.create_subscription(self.tenant, self.free_plan)
        
        # Test Upgrade
        SubscriptionLifecycleService.upgrade_subscription(sub, self.starter_plan, actor=self.user)
        self.assertTrue(PlatformAuditRecord.objects.filter(
            tenant=self.tenant, subscription=sub, actor=self.user,
            old_plan=self.free_plan, new_plan=self.starter_plan,
            event_type=AuditEventType.SUBSCRIPTION_UPGRADE
        ).exists())

        # Test Downgrade
        SubscriptionLifecycleService.downgrade_subscription(sub, self.free_plan, at_period_end=False, actor=self.user)
        self.assertTrue(PlatformAuditRecord.objects.filter(
            tenant=self.tenant, subscription=sub, actor=self.user,
            old_plan=self.starter_plan, new_plan=self.free_plan,
            event_type=AuditEventType.SUBSCRIPTION_DOWNGRADE
        ).exists())

        # Test Cancel
        SubscriptionLifecycleService.cancel_subscription(sub, at_period_end=False, actor=self.user)
        self.assertTrue(PlatformAuditRecord.objects.filter(
            tenant=self.tenant, subscription=sub, actor=self.user,
            old_plan=self.free_plan, new_plan=self.free_plan,
            event_type=AuditEventType.SUBSCRIPTION_CANCELLED
        ).exists())

        # Test Renew
        SubscriptionLifecycleService.renew_subscription(sub, actor=self.user)
        self.assertTrue(PlatformAuditRecord.objects.filter(
            tenant=self.tenant, subscription=sub, actor=self.user,
            old_plan=self.free_plan, new_plan=self.free_plan,
            event_type=AuditEventType.SUBSCRIPTION_RENEWED
        ).exists())
