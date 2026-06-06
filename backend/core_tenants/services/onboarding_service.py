import re
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from django.core.mail import send_mail

from accounts.models import User, EmailVerificationToken
from core_tenants.models import Tenant, Company, TenantBranding, TenantStatus
from core_permissions.roles import UserRole
from saas_billing.models import Plan, Subscription, SubscriptionStatus, PlatformAuditRecord, AuditEventType
from industries.models import Industry
from products.models import ProductAttribute

RESERVED_SLUGS = {
    'admin', 'api', 'billing', 'platform', 'support', 'help', 
    'docs', 'login', 'signup', 'dashboard', 'miraee'
}

class TenantOnboardingService:
    
    @classmethod
    def onboard(cls, company_name, industry_id, plan_id, owner_name, email, password):
        """
        The single entry point for self-service tenant onboarding.
        Everything runs in a strict atomic transaction.
        """
        with transaction.atomic():
            # 1. Validate constraints early
            if User.objects.filter(email__iexact=email).exists():
                raise ValueError("Email is already registered.")
            
            plan = Plan.objects.get(id=plan_id)
            if not plan.is_public:
                raise ValueError("Invalid plan selected.")
                
            industry = Industry.objects.get(id=industry_id)

            # 2. Slug Generation & Reservation
            base_slug = slugify(company_name) or 'tenant'
            slug = base_slug
            counter = 1
            while slug in RESERVED_SLUGS or Tenant.objects.filter(slug=slug).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"

            # 3. Create Tenant, Company, and Branding
            tenant = Tenant.objects.create(
                name=company_name,
                slug=slug,
                status=TenantStatus.PENDING_VERIFICATION,
                industry=industry,
                plan=plan
            )
            
            company = Company.objects.create(
                tenant=tenant,
                name=company_name
            )
            
            TenantBranding.objects.create(tenant=tenant)

            # 4. User Setup
            # Note: We split name into first and last roughly
            parts = owner_name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''
            
            user = User(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                tenant=tenant,
                active_company=company,
                role=UserRole.TENANT_OWNER,
                is_email_verified=False,
                is_active=False  # Must verify email to login
            )
            user.set_password(password)
            user.save()

            # 5. Payment Gateway Readiness & Subscription
            status = SubscriptionStatus.TRIALING if plan.is_trial_available else SubscriptionStatus.ACTIVE
            end_date = timezone.now() + timedelta(days=plan.trial_days) if plan.is_trial_available else None
            
            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=status,
                trial_end_date=end_date if plan.is_trial_available else None
            )

            # 6. Industry Provisioning
            cls._provision_industry_attributes(tenant, company, industry)

            # 7. Verification Token
            token_instance, raw_token = EmailVerificationToken.generate_token(user)

            # 8. Audit Logging
            PlatformAuditRecord.objects.create(
                tenant=tenant,
                subscription=subscription,
                actor=user,
                new_plan=plan,
                event_type=AuditEventType.SUBSCRIPTION_UPGRADE,
                message=f"Tenant {company_name} onboarded.",
                payload={"industry": industry.name, "plan": plan.code}
            )
            
            return {
                "tenant": tenant,
                "user": user,
                "token": raw_token
            }

    @staticmethod
    def _provision_industry_attributes(tenant, company, industry):
        ind_name = industry.name.lower()
        attributes = []
        if 'fashion' in ind_name:
            attributes = [('Size', 'size'), ('Color', 'color'), ('Fabric', 'fabric')]
        elif 'perfume' in ind_name:
            attributes = [('Volume', 'volume'), ('Fragrance', 'fragrance')]
        elif 'home decor' in ind_name:
            attributes = [('Material', 'material'), ('Dimensions', 'dimensions'), ('Color', 'color')]
        
        for name, code in attributes:
            ProductAttribute.objects.get_or_create(
                tenant=tenant,
                company=company,
                code=code,
                defaults={'name': name}
            )
