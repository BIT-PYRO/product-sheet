from django.db import models

class UserRole(models.TextChoices):
    # SaaS Roles
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    TENANT_OWNER = 'TENANT_OWNER', 'Tenant Owner'
    COMPANY_ADMIN = 'COMPANY_ADMIN', 'Company Admin'
    DEPARTMENT_HEAD = 'DEPARTMENT_HEAD', 'Department Head'
    MANAGER = 'MANAGER', 'Manager'
    STAFF = 'STAFF', 'Staff'
    VIEWER = 'VIEWER', 'Viewer'

    # Legacy roles for backward-compatibility with existing database records
    ADMIN_LEGACY = 'admin', 'Legacy Admin'
    MANAGER_LEGACY = 'manager', 'Legacy Manager'
    STAFF_LEGACY = 'staff', 'Legacy Staff'

    @classmethod
    def get_saas_choices(cls):
        """Returns only the new enterprise SaaS choices."""
        return [
            (cls.SUPER_ADMIN.value, cls.SUPER_ADMIN.label),
            (cls.TENANT_OWNER.value, cls.TENANT_OWNER.label),
            (cls.COMPANY_ADMIN.value, cls.COMPANY_ADMIN.label),
            (cls.DEPARTMENT_HEAD.value, cls.DEPARTMENT_HEAD.label),
            (cls.MANAGER.value, cls.MANAGER.label),
            (cls.STAFF.value, cls.STAFF.label),
            (cls.VIEWER.value, cls.VIEWER.label),
        ]
