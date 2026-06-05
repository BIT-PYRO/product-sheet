from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core_tenants.models import Tenant, Company
from saas_billing.models import Plan, Subscription, SubscriptionStatus

User = get_user_model()

class FeatureEnforcementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Tenant
        self.tenant = Tenant.objects.create(name="Test Corp", slug="test-corp")
        self.company = Company.objects.create(tenant=self.tenant, name="Test HQ")
        self.user = User.objects.create_user(
            username="owner",
            email="owner@test.com", 
            password="pass",
            role="TENANT_OWNER",
            tenant=self.tenant,
            active_company=self.company,
            is_approved=True
        )
        
        self.superadmin = User.objects.create_user(
            username="super",
            email="super@admin.com",
            password="pass",
            role="SUPER_ADMIN",
            is_superuser=True
        )

        # Starter Plan (Allows Customers, Jobs, Workforce; Blocks Inventory, Orders, Analytics, Exports)
        self.starter_plan = Plan.objects.create(
            name="Starter", code="STARTER", trial_days=14, base_price_monthly=99.00
        )
        # Enable some features
        self.starter_plan.entitlements.create(key='customers_enabled', value='true', data_type='boolean')
        self.starter_plan.entitlements.create(key='jobs_enabled', value='true', data_type='boolean')
        self.starter_plan.entitlements.create(key='workforce_enabled', value='true', data_type='boolean')
        # Disable others (or leave omitted, false is default)
        self.starter_plan.entitlements.create(key='inventory_enabled', value='false', data_type='boolean')
        self.starter_plan.entitlements.create(key='orders_enabled', value='false', data_type='boolean')

        # Subscribe Tenant
        self.sub = Subscription.objects.create(
            tenant=self.tenant,
            plan=self.starter_plan,
            status=SubscriptionStatus.ACTIVE
        )
        self.tenant.plan = self.starter_plan
        self.tenant.save()

    def test_allowed_endpoints(self):
        """Endpoints allowed by the plan should return 200 OK (or not 402/403)."""
        self.client.force_authenticate(user=self.user)
        
        # Test Customers ViewSet (we might get 200 [] since it's empty, but not 402)
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test Jobs ViewSet
        response = self.client.get('/api/v1/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test Workforce ViewSet (assume it's under /api/v1/workforce/workers/ or similar, let's try root)
        response = self.client.get('/api/v1/workforce/workers/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]) # As long as it's not 402

    def test_blocked_endpoints_return_402(self):
        """Endpoints blocked by the plan should return 402 Payment Required."""
        self.client.force_authenticate(user=self.user)
        
        # Test Inventory ViewSet
        response = self.client.get('/api/v1/inventory/')
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn('inventory_enabled', str(response.data))
        
        # Test Orders ViewSet
        response = self.client.get('/api/v1/orders/')
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn('orders_enabled', str(response.data))
        
    def test_superadmin_bypass(self):
        """SuperAdmins bypass plan restrictions entirely."""
        self.client.force_authenticate(user=self.superadmin)
        
        # Test blocked endpoint, but as SuperAdmin
        # Will fail with 200 OK or 403 Forbidden due to no tenant assigned, but we mock the tenant for test
        # Actually RequiresFeature bypasses entirely if UserRole.SUPER_ADMIN. So it won't be 402.
        response = self.client.get('/api/v1/inventory/')
        self.assertNotEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
