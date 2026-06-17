from django.db import models

from common.models import AuditModel
from core_tenants.models import TenantCompanyModel


class WorkforceMember(AuditModel, TenantCompanyModel):
	full_name = models.CharField(max_length=255)
	phone = models.CharField(max_length=20, blank=True)
	whatsapp = models.CharField(max_length=20, blank=True)
	email = models.EmailField(max_length=254, blank=True)
	dob = models.DateField(null=True, blank=True)
	gender = models.CharField(max_length=20, blank=True)
	department = models.CharField(max_length=100, blank=True)
	current_address = models.JSONField(default=dict, blank=True)
	permanent_address = models.JSONField(default=dict, blank=True)
	designation = models.CharField(max_length=150, blank=True)
	category = models.TextField(blank=True)
	working_style = models.CharField(max_length=50, blank=True)
	gst_number = models.CharField(max_length=20, blank=True)
	account_name = models.CharField(max_length=200, blank=True)
	bank_name = models.CharField(max_length=200, blank=True)
	account_number = models.CharField(max_length=50, blank=True)
	ifsc = models.CharField(max_length=20, blank=True)
	current_location = models.CharField(max_length=100, blank=True)
	first_language = models.CharField(max_length=50, blank=True)
	second_language = models.CharField(max_length=50, blank=True)
	notes = models.TextField(blank=True)
	active = models.BooleanField(default=True)
	permissions = models.JSONField(default=dict, blank=True)
	profile_photo_url = models.URLField(max_length=1000, blank=True)
	aadhaar_url = models.URLField(max_length=1000, blank=True)
	pan_url = models.URLField(max_length=1000, blank=True)
	# barcode_number is unique per tenant (not globally)
	barcode_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
	date_of_joining = models.DateField(null=True, blank=True)

	# Stores the ID from the external software so webhook updates can be matched
	external_id = models.CharField(max_length=255, blank=True, db_index=True)

	class Meta:
		# barcode_number uniqueness is scoped to tenant
		unique_together = [('tenant', 'barcode_number')]
		indexes = [
			models.Index(fields=['tenant', 'company', 'active']),
		]

	def __str__(self):
		return f'{self.full_name} ({self.phone})'


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=WorkforceMember)
def sync_django_user_on_workforce_save(sender, instance, created, **kwargs):
	email = (instance.email or '').strip().lower()
	if not email:
		return

	from django.contrib.auth import get_user_model
	from core_permissions.roles import UserRole

	User = get_user_model()

	# Determine mapped role from designation
	def map_designation_to_user_role(designation: str) -> str:
		val = (designation or '').strip().lower()
		if not val:
			return UserRole.STAFF
		if val == 'superuser':
			return UserRole.SUPER_ADMIN
		elif val in ('chairman', 'ceo', 'owner', 'tenant owner', 'tenant_owner'):
			return UserRole.TENANT_OWNER
		elif val in ('director', 'admin', 'company admin', 'company_admin', 'general manager'):
			return UserRole.COMPANY_ADMIN
		elif val in ('department head', 'department_head', 'dept head', 'dept_head'):
			return UserRole.DEPARTMENT_HEAD
		elif val == 'manager':
			return UserRole.MANAGER
		elif val == 'associate':
			return UserRole.STAFF
		elif val in ('intern', 'viewer'):
			return UserRole.VIEWER
		
		# Fallback
		if 'head' in val:
			return UserRole.DEPARTMENT_HEAD
		elif 'manager' in val:
			return UserRole.MANAGER
		elif 'director' in val or 'admin' in val:
			return UserRole.COMPANY_ADMIN
		elif 'intern' in val:
			return UserRole.VIEWER
		return UserRole.STAFF

	user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
	if user is None:
		user = User(username=email, email=email)
		user.set_unusable_password()

	user.is_active = bool(instance.active)
	user.is_approved = True  # active workforce members get approved access automatically

	if instance.tenant:
		user.tenant = instance.tenant
	if instance.company:
		user.active_company = instance.company

	user.role = map_designation_to_user_role(instance.designation)
	user.save()

	if instance.company:
		user.accessible_companies.add(instance.company)

