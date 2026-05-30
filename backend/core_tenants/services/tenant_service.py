from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from core_tenants.models import Tenant, Company
from core_permissions.roles import UserRole

User = get_user_model()

class TenantOnboardingService:
    @staticmethod
    @transaction.atomic
    def onboard_tenant(tenant_name, slug=None, company_name=None, owner_username=None, 
                       owner_email=None, owner_password=None, owner_first_name="", owner_last_name=""):
        """
        Onboards a new Tenant:
        1. Creates Tenant
        2. Creates First Company
        3. Creates/Updates Tenant Owner User
        4. Assigns Tenant Owner Role
        5. Associates user with Tenant and Company
        All wrapped in a transaction block.
        """
        if not slug:
            slug = slugify(tenant_name)

        if not company_name:
            company_name = f"{tenant_name} Main"

        # Check if slug is already taken
        if Tenant.objects.filter(slug=slug).exists():
            raise ValueError(f"A tenant with slug '{slug}' already exists.")

        # Check if owner username is already taken by a user belonging to another tenant
        if User.objects.filter(username=owner_username).exclude(tenant__isnull=True).exists():
            raise ValueError(f"Username '{owner_username}' is already taken.")

        # 1. Create Tenant (automatically activated)
        tenant = Tenant.objects.create(
            name=tenant_name,
            slug=slug,
            is_active=True
        )

        # 2. Create first Company for the Tenant
        company = Company.objects.create(
            tenant=tenant,
            name=company_name,
            code="MAIN",
            is_active=True
        )

        # 3. Create or fetch the Tenant Owner User
        user, created = User.objects.get_or_create(
            username=owner_username,
            defaults={
                'email': owner_email,
                'first_name': owner_first_name,
                'last_name': owner_last_name,
                'is_active': True,
                'is_approved': True,  # Onboarded owners are auto-approved
            }
        )

        if not created:
            # Update user fields for existing users
            if owner_email:
                user.email = owner_email
            user.is_approved = True
            user.is_active = True

        if owner_password:
            user.set_password(owner_password)

        # 4. Assign role and associate with tenant/company
        user.role = UserRole.TENANT_OWNER
        user.tenant = tenant
        user.active_company = company
        user.save()

        # 5. Add first company to user's accessible companies
        user.accessible_companies.add(company)

        return tenant, company, user
