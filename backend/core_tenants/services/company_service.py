from core_tenants.models import Company

class CompanyService:
    @staticmethod
    def create_company(tenant, name, code="", gst_number="", address="", is_active=True):
        """
        Creates a new company for the specified tenant.
        """
        if Company.objects.filter(tenant=tenant, name=name).exists():
            raise ValueError(f"A company named '{name}' already exists for this tenant.")

        if code and Company.objects.filter(tenant=tenant, code=code).exists():
            raise ValueError(f"A company with code '{code}' already exists for this tenant.")

        return Company.objects.create(
            tenant=tenant,
            name=name,
            code=code,
            gst_number=gst_number,
            address=address,
            is_active=is_active
        )

    @staticmethod
    def deactivate_company(company):
        """Deactivates a company."""
        company.is_active = False
        company.save(update_fields=['is_active', 'updated_at'])
        return company

    @staticmethod
    def activate_company(company):
        """Activates a company."""
        company.is_active = True
        company.save(update_fields=['is_active', 'updated_at'])
        return company
