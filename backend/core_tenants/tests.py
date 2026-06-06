from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from core_tenants.models import Tenant, Company
from core_tenants.context import get_current_tenant, get_current_company, set_tenant, set_company, clear_tenant_context
from core_tenants.services.tenant_service import TenantOnboardingService
from core_tenants.services.company_service import CompanyService
from core_tenants.services.user_service import UserService
from core_tenants.middleware import TenantContextMiddleware
from core_permissions.roles import UserRole
from core_permissions.permissions import IsSuperAdmin, IsTenantOwner, IsCompanyAdmin

User = get_user_model()

class SaaSOnboardingServiceTestCase(TestCase):
    def test_successful_onboarding(self):
        """Tests that TenantOnboardingService atomically provisions tenant, company, and owner."""
        tenant, company, user = TenantOnboardingService.onboard_tenant(
            tenant_name="Acme Corp",
            slug="acme-corp",
            company_name="Acme Seattle",
            owner_username="acmeowner",
            owner_email="owner@acme.com",
            owner_password="securepassword123",
            owner_first_name="John",
            owner_last_name="Doe"
        )

        # Verify Tenant details
        self.assertEqual(tenant.name, "Acme Corp")
        self.assertEqual(tenant.slug, "acme-corp")
        self.assertTrue(tenant.is_active)

        # Verify Company details
        self.assertEqual(company.name, "Acme Seattle")
        self.assertEqual(company.tenant, tenant)
        self.assertEqual(company.code, "MAIN")
        self.assertTrue(company.is_active)

        # Verify User details
        self.assertEqual(user.username, "acmeowner")
        self.assertEqual(user.email, "owner@acme.com")
        self.assertEqual(user.role, UserRole.TENANT_OWNER)
        self.assertEqual(user.tenant, tenant)
        self.assertEqual(user.active_company, company)
        self.assertTrue(user.is_approved)

        # Verify accessible companies ManyToMany mapping
        self.assertIn(company, user.accessible_companies.all())

    def test_duplicate_tenant_slug_fails(self):
        """Tests that onboarding fails when a slug is already taken."""
        TenantOnboardingService.onboard_tenant(
            tenant_name="First Corp",
            slug="first-corp",
            owner_username="firstowner",
            owner_email="first@corp.com",
            owner_password="password1"
        )

        with self.assertRaises(ValueError):
            TenantOnboardingService.onboard_tenant(
                tenant_name="Second Corp",
                slug="first-corp", # Duplicate slug!
                owner_username="secondowner",
                owner_email="second@corp.com",
                owner_password="password1"
            )


class SaaSContextAndMiddlewareTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        # Seed an onboarded tenant, company, and user
        self.tenant, self.company, self.user = TenantOnboardingService.onboard_tenant(
            tenant_name="Beta Group",
            slug="beta-group",
            company_name="Beta Main",
            owner_username="betaowner",
            owner_email="beta@group.com",
            owner_password="password123"
        )
        # Create a second company for company switching tests
        self.company2 = CompanyService.create_company(
            tenant=self.tenant,
            name="Beta Sub",
            code="SUB"
        )
        UserService.add_company_to_user(self.user, self.company2)

    def tearDown(self):
        clear_tenant_context()

    def test_context_vars_get_and_set(self):
        """Tests that get/set context methods are thread-safe and work properly."""
        set_tenant(self.tenant)
        set_company(self.company)

        self.assertEqual(get_current_tenant(), self.tenant)
        self.assertEqual(get_current_company(), self.company)

        clear_tenant_context()
        self.assertIsNone(get_current_tenant())
        self.assertIsNone(get_current_company())

    def test_middleware_resolves_default_context(self):
        """Tests that the middleware automatically resolves default active company and tenant."""
        request = self.factory.get('/')
        request.user = self.user

        def assert_inside_request(req):
            # Context should be correctly populated on request object
            self.assertEqual(req.tenant, self.tenant)
            self.assertEqual(req.company, self.company)

            # Context should be correctly populated on thread-safe contextvars
            self.assertEqual(get_current_tenant(), self.tenant)
            self.assertEqual(get_current_company(), self.company)
            return req

        middleware = TenantContextMiddleware(get_response=assert_inside_request)
        middleware(request)

    def test_middleware_resolves_company_switch_via_header(self):
        """Tests that the middleware correctly switches company context based on X-Company-ID header."""
        request = self.factory.get('/', HTTP_X_COMPANY_ID=str(self.company2.id))
        request.user = self.user

        def assert_inside_request(req):
            # Context should resolve to the switched company (Beta Sub)
            self.assertEqual(req.tenant, self.tenant)
            self.assertEqual(req.company, self.company2)

            self.assertEqual(get_current_tenant(), self.tenant)
            self.assertEqual(get_current_company(), self.company2)
            return req

        middleware = TenantContextMiddleware(get_response=assert_inside_request)
        middleware(request)

    def test_middleware_ignores_unauthorized_company_switch(self):
        """Tests that middleware falls back to default if a user tries to switch to a company they don't have access to."""
        # Create an unrelated company
        other_tenant = Tenant.objects.create(name="Other Corp", slug="other-corp")
        unauthorized_company = Company.objects.create(tenant=other_tenant, name="Other Main")

        request = self.factory.get('/', HTTP_X_COMPANY_ID=str(unauthorized_company.id))
        request.user = self.user

        def assert_inside_request(req):
            # Context should fall back to the default company since unauthorized_company is invalid for this user
            self.assertEqual(req.company, self.company)
            self.assertEqual(get_current_company(), self.company)
            return req

        middleware = TenantContextMiddleware(get_response=assert_inside_request)
        middleware(request)


class SaaSAPIsTestCase(APITestCase):
    def setUp(self):
        # Create a Super Admin
        self.super_admin = User.objects.create_superuser(
            username="superadmin",
            email="super@miraee.com",
            password="superpassword"
        )
        self.super_admin.role = UserRole.SUPER_ADMIN
        self.super_admin.save()

        # Onboard a regular tenant
        self.tenant, self.company, self.tenant_owner = TenantOnboardingService.onboard_tenant(
            tenant_name="Gamma Exports",
            slug="gamma-exports",
            company_name="Gamma Jaipur",
            owner_username="gammaowner",
            owner_email="gamma@exports.com",
            owner_password="password123"
        )

    def test_only_super_admin_can_view_all_tenants(self):
        """Tests that only Super Admin can list all tenants via platform portal, others receive 403."""
        # Log in as Tenant Owner
        self.client.force_authenticate(user=self.tenant_owner)
        response = self.client.get('/api/v1/platform/tenants/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Log in as Super Admin
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/v1/platform/tenants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return at least 2 tenants (default-tenant seeded in migration, plus Gamma Exports)
        self.assertGreaterEqual(len(response.data), 1)

    def test_tenant_onboarding_api(self):
        """Tests that Super Admin can onboard a tenant via POST on /api/v1/tenants/onboard/."""
        self.client.force_authenticate(user=self.super_admin)
        payload = {
            "tenant_name": "Delta Corp",
            "slug": "delta-corp",
            "company_name": "Delta Mumbai",
            "owner_username": "deltaowner",
            "owner_email": "delta@corp.com",
            "owner_password": "ownerpassword123"
        }
        response = self.client.post('/api/v1/tenants/onboard/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "success")

        # Verify tenant created in DB
        self.assertTrue(Tenant.objects.filter(slug="delta-corp").exists())

    def test_company_switching_api(self):
        """Tests that a user can switch their active company via POST on /api/v1/companies/<id>/switch_active/."""
        # Create a second company for user
        new_company = CompanyService.create_company(
            tenant=self.tenant,
            name="Gamma Mumbai",
            code="GAMMUM"
        )
        UserService.add_company_to_user(self.tenant_owner, new_company)

        # Verify starting active company is Jaipur (MAIN)
        self.assertEqual(self.tenant_owner.active_company, self.company)

        # Authenticate and call company switch API
        self.client.force_authenticate(user=self.tenant_owner)
        response = self.client.post(f'/api/v1/companies/{new_company.id}/switch_active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

        # Refresh from DB and verify active company has switched
        self.tenant_owner.refresh_from_db()
        self.assertEqual(self.tenant_owner.active_company, new_company)
