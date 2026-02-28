from django.conf import settings
from django.db import models

from common.models import AuditModel
from products.models import Product


class JobStatus(models.TextChoices):
	CREATED = 'created', 'Created'
	ASSIGNED = 'assigned', 'Assigned'
	IN_PROGRESS = 'in_progress', 'In Progress'
	COMPLETED = 'completed', 'Completed'
	CANCELLED = 'cancelled', 'Cancelled'


class Job(AuditModel):
	title = models.CharField(max_length=255)
	product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='jobs')
	assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
	status = models.CharField(max_length=30, choices=JobStatus.choices, default=JobStatus.CREATED)

	def __str__(self):
		return f'{self.title} ({self.status})'
