from django.test import TestCase
from django.contrib.auth import get_user_model
from core_tenants.models import Tenant, Company
from workforce.models import WorkforceMember
from core_permissions.roles import UserRole

class WorkforceMemberUserSyncTestCase(TestCase):
	def setUp(self):
		self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant")
		self.company = Company.objects.create(tenant=self.tenant, name="Test Company", code="TEST")
		self.User = get_user_model()

	def test_create_workforce_member_syncs_user(self):
		# Create workforce member with an email
		member = WorkforceMember.objects.create(
			tenant=self.tenant,
			company=self.company,
			full_name="John Doe",
			email="john@example.com",
			designation="Manager",
			active=True
		)

		# Check if Django user was created/synced
		user = self.User.objects.filter(email="john@example.com").first()
		self.assertIsNotNone(user)
		self.assertEqual(user.username, "john@example.com")
		self.assertEqual(user.role, UserRole.MANAGER)
		self.assertEqual(user.tenant, self.tenant)
		self.assertEqual(user.active_company, self.company)
		self.assertTrue(user.is_active)
		self.assertTrue(user.is_approved)
		self.assertTrue(user.accessible_companies.filter(id=self.company.id).exists())

	def test_update_designation_updates_user_role(self):
		member = WorkforceMember.objects.create(
			tenant=self.tenant,
			company=self.company,
			full_name="Jane Doe",
			email="jane@example.com",
			designation="Associate",
			active=True
		)

		# Update designation
		member.designation = "Department Head"
		member.save()

		user = self.User.objects.get(email="jane@example.com")
		self.assertEqual(user.role, UserRole.DEPARTMENT_HEAD)

	def test_deactivate_member_deactivates_user(self):
		member = WorkforceMember.objects.create(
			tenant=self.tenant,
			company=self.company,
			full_name="Bob Smith",
			email="bob@example.com",
			designation="Intern",
			active=True
		)

		# Deactivate
		member.active = False
		member.save()

		user = self.User.objects.get(email="bob@example.com")
		self.assertFalse(user.is_active)
