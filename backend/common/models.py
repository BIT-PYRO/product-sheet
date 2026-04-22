from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True


class AuditModel(TimeStampedModel):
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='%(class)s_created',
	)
	updated_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='%(class)s_updated',
	)

	class Meta:
		abstract = True


class DeletionLog(models.Model):
	"""Records every deletion that passes through the API layer."""
	deleted_at = models.DateTimeField(auto_now_add=True)
	deleted_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='deletion_logs',
	)
	# Plain-text snapshot of the username at deletion time — survives user account removal.
	deleted_by_name = models.CharField(max_length=200, blank=True, default='')
	app_label = models.CharField(max_length=100)
	model_name = models.CharField(max_length=100)
	object_id = models.CharField(max_length=100)
	object_repr = models.CharField(max_length=500)
	serialized_data = models.JSONField(default=dict)

	class Meta:
		ordering = ['-deleted_at']
		indexes = [
			models.Index(fields=['app_label', 'model_name']),
		]

	def __str__(self):
		return f'Deleted {self.app_label}.{self.model_name} #{self.object_id} at {self.deleted_at}'
