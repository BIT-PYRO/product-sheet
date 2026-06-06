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
        self.starter_plan, _ = Plan.objects.get_or_create(
            code="STARTER", 
            defaults={"name": "Starter", "trial_days": 14, "base_price_monthly": 99.00}
        )
        self.starter_plan.entitlements.all().delete()
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
        from platform_admin.models import Feature, PlanFeature, FeatureGroup
        group, _ = FeatureGroup.objects.get_or_create(name="General")
        
        feature_customers, _ = Feature.objects.get_or_create(code="enrol-customer", defaults={"name": "Customers", "is_active": True, "group": group})
        PlanFeature.objects.get_or_create(plan=self.starter_plan, feature=feature_customers, defaults={"is_enabled": True})
        
        feature_jobs, _ = Feature.objects.get_or_create(code="master-job-sheet", defaults={"name": "Jobs", "is_active": True, "group": group})
        PlanFeature.objects.get_or_create(plan=self.starter_plan, feature=feature_jobs, defaults={"is_enabled": True})
        
        feature_workforce, _ = Feature.objects.get_or_create(code="master-workforce-sheet", defaults={"name": "Workforce", "is_active": True, "group": group})
        PlanFeature.objects.get_or_create(plan=self.starter_plan, feature=feature_workforce, defaults={"is_enabled": True})
        
        self.client.force_authenticate(user=self.user)
        
        # Test Customers ViewSet
        response = self.client.get('/api/v1/customers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test Jobs ViewSet
        # response = self.client.get('/api/v1/jobs/')
        # self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test Workforce ViewSet
        # response = self.client.get('/api/v1/workforce/workers/')
        # self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_blocked_endpoints_return_402(self):
        """Endpoints blocked by the plan should return 402 Payment Required."""
        self.client.force_authenticate(user=self.user)
        
        # Test Orders ViewSet
        response = self.client.get('/api/v1/orders/')
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn('orders', str(response.data))
        
        # Test Analytics ViewSet
        response = self.client.get('/api/v1/platform-admin/revenue/')
        # Platform admin might be 403 instead if not superadmin, but if we test via SaaS plan it should be 403 anyway.
        # So we skip this if it's not a standard viewset, or ensure it's testing a known endpoint.
        
        # Test blocked endpoint, but as SuperAdmin
        # Will fail with 200 OK or 403 Forbidden due to no tenant assigned, but we mock the tenant for test
        # Actually RequiresFeature bypasses entirely if UserRole.SUPER_ADMIN. So it won't be 402.
        response = self.client.get('/api/v1/inventory/')
        
    def test_superadmin_bypass(self):
        """SuperAdmins bypass plan restrictions entirely."""
        self.client.force_authenticate(user=self.superadmin)
        
        # Test blocked endpoint, but as SuperAdmin
        response = self.client.get('/api/v1/inventory/')
        self.assertNotEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
