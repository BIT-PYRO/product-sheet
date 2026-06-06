from django.db import models

from common.models import AuditModel
from core_tenants.models import TenantCompanyModel
from workforce.models import WorkforceMember


class KYCStatus(models.TextChoices):
	PENDING = 'pending', 'Pending'
	APPROVED = 'approved', 'Approved'
	REJECTED = 'rejected', 'Rejected'


class KYCRecord(AuditModel, TenantCompanyModel):
	member = models.OneToOneField(
		WorkforceMember,
		on_delete=models.CASCADE,
		related_name='kyc',
	)
	status = models.CharField(
		max_length=20,
		choices=KYCStatus.choices,
		default=KYCStatus.PENDING,
	)
	id_number = models.CharField(max_length=80, blank=True)

	class Meta:
		indexes = [
			models.Index(fields=['tenant', 'company', 'status']),
		]

	def __str__(self):
		return f'{self.member.full_name} - {self.status}'
