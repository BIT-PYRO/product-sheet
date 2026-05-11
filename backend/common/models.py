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


class ActivityLog(models.Model):
	"""Comprehensive audit trail for every create/update/delete/upload/login event."""

	ACTION_CREATE  = 'create'
	ACTION_UPDATE  = 'update'
	ACTION_DELETE  = 'delete'
	ACTION_UPLOAD  = 'upload'
	ACTION_LOGIN   = 'login'
	ACTION_CHOICES = [
		(ACTION_CREATE, 'Create'),
		(ACTION_UPDATE, 'Update'),
		(ACTION_DELETE, 'Delete'),
		(ACTION_UPLOAD, 'Upload'),
		(ACTION_LOGIN,  'Login'),
	]

	SHEET_PRODUCT    = 'product'
	SHEET_DESIGNER   = 'designer'
	SHEET_FINDING    = 'finding'
	SHEET_WORKFORCE  = 'workforce'
	SHEET_CUSTOMER   = 'customer'
	SHEET_KYC        = 'kyc'
	SHEET_JOB        = 'job'
	SHEET_INVENTORY  = 'inventory'
	SHEET_ORDER      = 'order'
	SHEET_ACCOUNTING = 'accounting'
	SHEET_HR         = 'hr'
	SHEET_AUTH       = 'auth'
	SHEET_OTHER      = 'other'
	SHEET_CHOICES = [
		(SHEET_PRODUCT,    'Product'),
		(SHEET_DESIGNER,   'Designer'),
		(SHEET_FINDING,    'Finding'),
		(SHEET_WORKFORCE,  'Workforce'),
		(SHEET_CUSTOMER,   'Customer'),
		(SHEET_KYC,        'KYC'),
		(SHEET_JOB,        'Job'),
		(SHEET_INVENTORY,  'Inventory'),
		(SHEET_ORDER,      'Order'),
		(SHEET_ACCOUNTING, 'Accounting'),
		(SHEET_HR,         'HR'),
		(SHEET_AUTH,       'Auth'),
		(SHEET_OTHER,      'Other'),
	]

	timestamp     = models.DateTimeField(auto_now_add=True, db_index=True)
	user          = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='activity_logs',
	)
	user_name     = models.CharField(max_length=300, blank=True, default='')
	action        = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
	sheet         = models.CharField(max_length=30, choices=SHEET_CHOICES, default=SHEET_OTHER, db_index=True)
	model_name    = models.CharField(max_length=100, blank=True, default='')
	object_id     = models.CharField(max_length=100, blank=True, default='')
	object_repr   = models.CharField(max_length=500, blank=True, default='')
	# For updates: {field: {"old": ..., "new": ...}}; for uploads: {"files": [...]}
	changes       = models.JSONField(default=dict, blank=True)
	rows_affected = models.PositiveIntegerField(default=1)
	ip_address    = models.GenericIPAddressField(null=True, blank=True)
	extra         = models.JSONField(default=dict, blank=True)

	class Meta:
		ordering = ['-timestamp']
		indexes = [
			models.Index(fields=['timestamp', 'sheet']),
			models.Index(fields=['user', 'timestamp']),
			models.Index(fields=['action', 'timestamp']),
		]

	def __str__(self):
		return f'{self.user_name} {self.action} {self.model_name} #{self.object_id} at {self.timestamp}'


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
