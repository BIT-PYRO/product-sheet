from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User, EmailVerificationToken
from core_tenants.models import Tenant, Company, TenantBranding, TenantStatus
from saas_billing.models import Plan, Subscription, SubscriptionStatus
from industries.models import Industry
from products.models import ProductAttribute
from core_permissions.roles import UserRole

class TestOnboarding(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.industry, _ = Industry.objects.get_or_create(name='Fashion')
        self.plan, _ = Plan.objects.get_or_create(
            code='GROWTH',
            defaults={
                'name': 'Growth', 'is_public': True, 'is_trial_available': True, 'trial_days': 14
            }
        )

    def test_successful_signup_and_provisioning(self):
        url = reverse('signup')
        data = {
            "company_name": "Test Fashion Corp",
            "industry_id": self.industry.id,
            "plan_id": self.plan.id,
            "owner_name": "John Doe",
            "email": "john@example.com",
            "password": "strongpassword123"
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        
        # Verify Tenant
        tenant = Tenant.objects.get(name="Test Fashion Corp")
        assert tenant.slug == "test-fashion-corp"
        assert tenant.status == TenantStatus.PENDING_VERIFICATION
        
        # Verify Company
        company = Company.objects.get(tenant=tenant)
        assert company.name == "Test Fashion Corp"

        # Verify Branding
        assert TenantBranding.objects.filter(tenant=tenant).exists()

        # Verify User
        user = User.objects.get(email="john@example.com")
        assert user.role == UserRole.TENANT_OWNER
        assert user.tenant == tenant
        assert not user.is_active

        # Verify Subscription
        sub = Subscription.objects.get(tenant=tenant)
        assert sub.plan == self.plan
        assert sub.status == SubscriptionStatus.TRIALING

        # Verify Industry Attributes
        attrs = ProductAttribute.objects.filter(tenant=tenant).values_list('code', flat=True)
        assert set(attrs) == {'size', 'color', 'fabric'}

        # Verify Token
        token = EmailVerificationToken.objects.get(user=user)
        assert not token.used

    def test_duplicate_email(self):
        url = reverse('signup')
        data = {
            "company_name": "Company A",
            "industry_id": self.industry.id,
            "plan_id": self.plan.id,
            "owner_name": "John",
            "email": "duplicate@example.com",
            "password": "pw"
        }
        self.client.post(url, data, format='json')
        
        # Second attempt
        data["company_name"] = "Company B"
        response = self.client.post(url, data, format='json')
        assert response.status_code == 400
        assert "Email is already registered" in response.data['error']
        
        # Verify rollback (Company B should not exist)
        assert not Tenant.objects.filter(name="Company B").exists()

    def test_slug_collision(self):
        url = reverse('signup')
        data = {
            "company_name": "Acme",
            "industry_id": self.industry.id,
            "plan_id": self.plan.id,
            "owner_name": "John",
            "email": "j1@example.com",
            "password": "pw"
        }
        self.client.post(url, data, format='json')
        
        data['email'] = "j2@example.com"
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['tenant_slug'] == "acme-2"

    def test_email_verification(self):
        url = reverse('signup')
        data = {
            "company_name": "Verify Me",
            "industry_id": self.industry.id,
            "plan_id": self.plan.id,
            "owner_name": "John",
            "email": "verify@example.com",
            "password": "pw"
        }
        self.client.post(url, data, format='json')
        user = User.objects.get(email="verify@example.com")
        token_record = EmailVerificationToken.objects.get(user=user)
        
        # Mock token extraction since raw token is returned but not in API response (only in email/print)
        # We need raw_token, wait, let's modify test to capture it or just test the model method.
        # Actually `EmailVerificationToken.generate_token` creates it. Let's do it directly.
        token_instance, raw_token = EmailVerificationToken.generate_token(user)
        
        verify_url = reverse('verify_email')
        resp = self.client.post(verify_url, {"token": raw_token}, format='json')
        assert resp.status_code == 200
        
        user.refresh_from_db()
        assert user.is_email_verified
        assert user.is_active
        assert user.tenant.status == TenantStatus.ACTIVE_TRIAL

    def test_wizard_completion(self):
        url = reverse('signup')
        data = {
            "company_name": "Wizard Corp",
            "industry_id": self.industry.id,
            "plan_id": self.plan.id,
            "owner_name": "John",
            "email": "wiz@example.com",
            "password": "pw"
        }
        self.client.post(url, data, format='json')
        user = User.objects.get(email="wiz@example.com")
        
        self.client.force_authenticate(user=user)
        wizard_url = reverse('onboarding_wizard')
        
        resp = self.client.patch(wizard_url, {
            "step": 2,
            "branding": {
                "primary_color": "#FF0000"
            }
        }, format='json')
        
        assert resp.status_code == 200
        
        user.tenant.refresh_from_db()
        assert user.tenant.onboarding_step == 2
        branding = TenantBranding.objects.get(tenant=user.tenant)
        assert branding.primary_color == "#FF0000"
