from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core_permissions.roles import UserRole
from core_tenants.models import Tenant, Company
from core_tenants.services.tenant_service import TenantOnboardingService
from core_tenants.services.company_service import CompanyService
from core_tenants.services.user_service import UserService
from core_tenants.context import clear_tenant_context

from products.models import Product
from jobs.models import Job
from inventory.models import InventoryTransaction, IssueRequest, ProductInventoryItem

User = get_user_model()

class ERPEnterpriseSecurityTestCase(APITestCase):
    """
    Comprehensive multi-tenant isolation, RBAC, and boundary protection test suite.
    """

    def setUp(self):
        clear_tenant_context()

        # ── Setup Tenant A ( Jaipur jewels ) ──────────────────────────────────
        self.tenant_a, self.company_a1, self.owner_a = TenantOnboardingService.onboard_tenant(
            tenant_name="Jaipur Jewels",
            slug="jaipur-jewels",
            company_name="Jaipur Main Office",
            owner_username="jaipurowner",
            owner_email="owner@jaipur.com",
            owner_password="password123"
        )
        self.company_a2 = CompanyService.create_company(
            tenant=self.tenant_a,
            name="Jaipur Sub Branch",
            code="JAI-SUB"
        )
        UserService.add_company_to_user(self.owner_a, self.company_a2)

        # Create other users inside Tenant A
        self.admin_a = User.objects.create_user(
            username="jaipuradmin", email="admin@jaipur.com", password="password123",
            tenant=self.tenant_a, active_company=self.company_a1, role=UserRole.COMPANY_ADMIN, is_approved=True
        )
        self.admin_a.accessible_companies.add(self.company_a1)

        self.manager_a = User.objects.create_user(
            username="jaipurmanager", email="manager@jaipur.com", password="password123",
            tenant=self.tenant_a, active_company=self.company_a1, role=UserRole.MANAGER, is_approved=True
        )
        self.manager_a.accessible_companies.add(self.company_a1)

        self.staff_a = User.objects.create_user(
            username="jaipurstaff", email="staff@jaipur.com", password="password123",
            tenant=self.tenant_a, active_company=self.company_a1, role=UserRole.STAFF, is_approved=True
        )
        self.staff_a.accessible_companies.add(self.company_a1)

        self.viewer_a = User.objects.create_user(
            username="jaipurviewer", email="viewer@jaipur.com", password="password123",
            tenant=self.tenant_a, active_company=self.company_a1, role=UserRole.VIEWER, is_approved=True
        )
        self.viewer_a.accessible_companies.add(self.company_a1)

        # Seed data in Tenant A (Company A1)
        self.product_a1 = Product.objects.create(
            tenant=self.tenant_a, company=self.company_a1,
            master_sku="JAI-SKU-001", name="Gold Necklace", category="Necklaces",
            selling_price=1200, cost_price=1000
        )
        self.job_a1 = Job.objects.create(
            tenant=self.tenant_a, company=self.company_a1,
            title="Polish gold necklace", status="created"
        )

        # Seed data in Tenant A (Company A2)
        self.product_a2 = Product.objects.create(
            tenant=self.tenant_a, company=self.company_a2,
            master_sku="JAI-SKU-002", name="Diamond Ring", category="Rings",
            selling_price=5000, cost_price=4000
        )

        # ── Setup Tenant B ( Delhi Jewels ) ──────────────────────────────────
        self.tenant_b, self.company_b1, self.owner_b = TenantOnboardingService.onboard_tenant(
            tenant_name="Delhi Jewels",
            slug="delhi-jewels",
            company_name="Delhi Main",
            owner_username="delhiowner",
            owner_email="owner@delhi.com",
            owner_password="password123"
        )
        self.product_b = Product.objects.create(
            tenant=self.tenant_b, company=self.company_b1,
            master_sku="DEL-SKU-100", name="Silver Bracelet", category="Bracelets",
            selling_price=500, cost_price=400
        )

        # ── Setup Super Admin ────────────────────────────────────────────────
        self.super_admin = User.objects.create_superuser(
            username="globaladmin", email="admin@platform.com", password="password123"
        )
        self.super_admin.role = UserRole.SUPER_ADMIN
        self.super_admin.save()

    def tearDown(self):
        clear_tenant_context()

    # ---------------------------------------------------------------------------
    # Tenant Isolation Tests (Cross-Tenant Boundaries)
    # ---------------------------------------------------------------------------

    def test_tenant_isolation_reads(self):
        """Verifies Tenant B user cannot read Tenant A product, receives 404."""
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tenant_isolation_writes(self):
        """Verifies Tenant B user cannot update or delete Tenant A product."""
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.put(f'/api/v1/products/{self.product_a1.id}/', {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ---------------------------------------------------------------------------
    # Company Isolation Tests (Intra-Tenant Boundaries)
    # ---------------------------------------------------------------------------

    def test_company_isolation_company_admin(self):
        """Verifies Company A1 admin cannot access Company A2 data."""
        self.client.force_authenticate(user=self.admin_a)
        
        # Accessing A1 (assigned) product -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Accessing A2 (unassigned) product -> 404 NOT FOUND
        response = self.client.get(f'/api/v1/products/{self.product_a2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tenant_owner_intra_tenant_access(self):
        """Verifies Tenant Owner can access all companies within their tenant."""
        self.client.force_authenticate(user=self.owner_a)

        # Reading from Company A1 -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Reading from Company A2 -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_a2.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ---------------------------------------------------------------------------
    # RBAC & Role Hierarchy Tests
    # ---------------------------------------------------------------------------

    def test_rbac_super_admin_unrestricted(self):
        """Verifies Super Admin can query and delete any product across all tenants."""
        self.client.force_authenticate(user=self.super_admin)
        
        # Read from Tenant A -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Read from Tenant B -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rbac_manager_no_delete(self):
        """Verifies Manager has full write but strictly 403 on Delete."""
        self.client.force_authenticate(user=self.manager_a)
        
        # Update product -> 200 OK
        response = self.client.patch(f'/api/v1/products/{self.product_a1.id}/', {"name": "Manager Gold Necklace"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Delete product -> 403 FORBIDDEN
        response = self.client.delete(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_staff_restricted_write(self):
        """Verifies Staff can write to Jobs but not Products, and cannot delete."""
        self.client.force_authenticate(user=self.staff_a)
        
        # Write to Product -> 403 FORBIDDEN
        response = self.client.patch(f'/api/v1/products/{self.product_a1.id}/', {"name": "Staff Gold Necklace"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Write to Job (operational model) -> 200 OK
        response = self.client.patch(f'/api/v1/jobs/{self.job_a1.id}/', {"title": "Staff Job Title"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Delete Job -> 403 FORBIDDEN
        response = self.client.delete(f'/api/v1/jobs/{self.job_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_viewer_strictly_read_only(self):
        """Verifies Viewer is blocked from all writes/deletions."""
        self.client.force_authenticate(user=self.viewer_a)

        # Read product -> 200 OK
        response = self.client.get(f'/api/v1/products/{self.product_a1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Create product -> 403 FORBIDDEN
        response = self.client.post('/api/v1/products/', {"master_sku": "VIEWER-SKU", "name": "Viewer Ring"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ---------------------------------------------------------------------------
    # Bulk Upload & Reference Validation Security
    # ---------------------------------------------------------------------------

    def test_bulk_upload_skus_validation(self):
        """Verifies bulk upload rejects SKUs belonging to other tenants/companies."""
        self.client.force_authenticate(user=self.admin_a)

        # Attempt to upload a die inventory item linking to a product in Tenant B (cross-tenant sku)
        payload = {
            "items": [
                {
                    "die_code": "DIE-901",
                    "quantity": 5,
                    "master_skus": [self.product_b.master_sku]  # Cross-tenant SKU!
                }
            ]
        }
        response = self.client.post('/api/v1/inventory/die-inventory/bulk-upload/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"], 0)
        self.assertEqual(len(response.data["errors"]), 1)
        self.assertIn("do not exist in your active company catalogue", response.data["errors"][0])

    # ---------------------------------------------------------------------------
    # Audit preparation validation
    # ---------------------------------------------------------------------------

    def test_audit_fields_auto_population(self):
        """Verifies created_by and updated_by are populated correctly via thread-local context."""
        self.client.force_authenticate(user=self.admin_a)

        # Create a Job
        payload = {"title": "Audit Tracking Job"}
        response = self.client.post('/api/v1/jobs/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        job_id = response.data["data"]["id"]
        job = Job.objects.get(pk=job_id)
        
        # Verify created_by matches the active request user
        self.assertEqual(job.created_by, self.admin_a)
        self.assertEqual(job.updated_by, self.admin_a)
