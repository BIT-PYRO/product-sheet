from django.db import models

from common.models import AuditModel


class WorkforceMember(AuditModel):
	full_name = models.CharField(max_length=255)
	phone = models.CharField(max_length=20, blank=True)
	whatsapp = models.CharField(max_length=20, blank=True)
	email = models.EmailField(max_length=254, blank=True)
	dob = models.DateField(null=True, blank=True)
	gender = models.CharField(max_length=20, blank=True)
	department = models.CharField(max_length=100, blank=True)
	current_address = models.JSONField(default=dict, blank=True)
	permanent_address = models.JSONField(default=dict, blank=True)
	gst_number = models.CharField(max_length=20, blank=True)
	current_location = models.CharField(max_length=100, blank=True)
	first_language = models.CharField(max_length=50, blank=True)
	second_language = models.CharField(max_length=50, blank=True)
	notes = models.TextField(blank=True)
	active = models.BooleanField(default=True)

	def __str__(self):
		return f'{self.full_name} ({self.phone})'
