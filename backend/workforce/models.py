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
	barcode_number = models.CharField(max_length=50, blank=True, null=True, unique=True, db_index=True)
	date_of_joining = models.DateField(null=True, blank=True)

	# Stores the ID from the external software so webhook updates can be matched
	external_id = models.CharField(max_length=255, blank=True, db_index=True)

	def __str__(self):
		return f'{self.full_name} ({self.phone})'
