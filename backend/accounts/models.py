import random
import string

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
	ADMIN = 'admin', 'Admin'
	MANAGER = 'manager', 'Manager'
	STAFF = 'staff', 'Staff'


class User(AbstractUser):
	role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STAFF)
	is_approved = models.BooleanField(
		default=False,
		help_text='Approved users have full access. Unapproved users can only access their Profile page.',
	)


class RoleDefaultPermissions(models.Model):
	role = models.CharField(max_length=100)  # designation, e.g. Director, Manager, Associate
	department = models.CharField(max_length=100, default='')  # e.g. Marketing, Finance; '' = all departments
	permissions = models.JSONField(default=dict, blank=True)

	class Meta:
		unique_together = [('role', 'department')]
		verbose_name = 'Role Default Permissions'
		verbose_name_plural = 'Role Default Permissions'

	def __str__(self):
		return f'Default permissions for {self.role} / {self.department or "all"}'


class EmailOTP(models.Model):
	email = models.EmailField(db_index=True)
	otp = models.CharField(max_length=4)
	created_at = models.DateTimeField(auto_now_add=True)
	used = models.BooleanField(default=False)

	class Meta:
		ordering = ['-created_at']

	def is_valid(self):
		age = (timezone.now() - self.created_at).total_seconds()
		return not self.used and age < 600  # 10 minutes

	@classmethod
	def generate_otp(cls):
		return ''.join(random.choices(string.digits, k=4))
class Permission(models.Model):
    identifier = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return self.identifier

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    permissions = models.ManyToManyField(Permission, related_name='roles', blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
