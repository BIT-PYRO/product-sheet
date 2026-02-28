from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
	ADMIN = 'admin', 'Admin'
	MANAGER = 'manager', 'Manager'
	STAFF = 'staff', 'Staff'


class User(AbstractUser):
	role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STAFF)
