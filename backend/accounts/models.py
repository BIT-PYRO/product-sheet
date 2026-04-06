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
		default=True,
		help_text='Approved users have full access. Unapproved users can only see Home and Profile.',
	)


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
