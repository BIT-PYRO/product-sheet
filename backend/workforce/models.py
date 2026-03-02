from django.db import models

from common.models import AuditModel


class WorkforceMember(AuditModel):
	full_name = models.CharField(max_length=255)
	phone = models.CharField(max_length=20, blank=True)
	active = models.BooleanField(default=True)

	def __str__(self):
		return f'{self.full_name} ({self.phone})'
