import os
import django
import uuid
import time
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User, EmailVerificationToken
from core_tenants.models import Tenant, Company, TenantBranding, TenantStatus
from saas_billing.models import Plan, Subscription, SubscriptionStatus
from industries.models import Industry
from products.models import ProductAttribute

print("Starting Runtime Tests for Phase 6 Audit...")
test_id = str(uuid.uuid4())[:8]
email = f"audit_{test_id}@test.com"
company_name = f"Audit Corp {test_id}"

# Find a public plan with trial
plan = Plan.objects.filter(is_public=True).first()
if not plan:
    print("FAIL: No public plan found.")
    exit(1)

industry = Industry.objects.first()

payload = {
    "company_name": company_name,
    "industry_id": industry.id,
    "plan_id": plan.id,
    "owner_name": "Audit User",
    "email": email,
    "password": "Password123!"
}

# 1. Signup Request
print(f"Testing Signup via API for {email}...")
res = requests.post("http://localhost:8000/api/v1/auth/signup/", json=payload)
if res.status_code == 201:
    print("PASS: Signup successful.")
else:
    print(f"FAIL: Signup returned {res.status_code} - {res.text}")
    exit(1)

# Check DB records
user = User.objects.get(email=email)
tenant = user.tenant

# 2. Slug Reservation
if tenant.slug.startswith("audit-corp-"):
    print("PASS: Slug reservation generated correctly:", tenant.slug)
else:
    print("FAIL: Slug is", tenant.slug)

# 3. Tenant lifecycle
if tenant.status == TenantStatus.PENDING_VERIFICATION:
    print("PASS: Tenant status is PENDING_VERIFICATION.")
else:
    print("FAIL: Tenant status is", tenant.status)

# 4. Subscription & Trial
sub = Subscription.objects.get(tenant=tenant)
if sub.status == SubscriptionStatus.TRIALING:
    print("PASS: Subscription created and set to TRIALING.")
else:
    print("FAIL: Subscription status is", sub.status)

# 5. Branding
branding = TenantBranding.objects.filter(tenant=tenant).first()
if branding:
    print("PASS: Tenant Branding created.")
else:
    print("FAIL: Tenant Branding missing.")

# 6. Industry Provisioning
attrs = ProductAttribute.objects.filter(tenant=tenant)
if attrs.exists():
    print(f"PASS: Industry Provisioning created {attrs.count()} attributes.")
else:
    print("FAIL: Industry attributes missing.")

# 7. Email verification
print("Testing Email Verification...")
# Generate a new token using the model method so we have the raw token
token_instance, raw_token = EmailVerificationToken.generate_token(user)

res_verify = requests.post("http://localhost:8000/api/v1/auth/verify-email/", json={"token": raw_token})
if res_verify.status_code == 200:
    print("PASS: Email verified via API.")
else:
    print("FAIL: Verification failed", res_verify.text)

user.refresh_from_db()
tenant.refresh_from_db()
if user.is_active and user.is_email_verified and tenant.status == TenantStatus.ACTIVE_TRIAL:
    print("PASS: User is active and Tenant advanced to ACTIVE_TRIAL.")
else:
    print("FAIL: User/Tenant status did not advance after verification.")

# 8. Wizard Completion
# Login to get JWT
res_login = requests.post("http://localhost:8000/api/v1/auth/login/", json={"username": email, "password": "Password123!"})
jwt = res_login.json()['data']['access']
headers = {"Authorization": f"Bearer {jwt}"}

print("Testing Wizard Completion...")
res_wizard = requests.patch("http://localhost:8000/api/v1/onboarding/", json={"step": 5, "completed": True}, headers=headers)
if res_wizard.status_code == 200:
    print("PASS: Wizard completion updated.")
else:
    print("FAIL: Wizard completion", res_wizard.status_code)

print("\n--- AUDIT COMPLETE ---")
