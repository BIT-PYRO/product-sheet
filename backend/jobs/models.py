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


class JobPriority(models.TextChoices):
	LOW = 'low', 'Low'
	MEDIUM = 'medium', 'Medium'
	HIGH = 'high', 'High'
	URGENT = 'urgent', 'Urgent'


class JobUrgency(models.TextChoices):
	NORMAL = 'normal', 'Normal'
	EXPRESS = 'express', 'Express'
	ASAP = 'asap', 'ASAP'


class VoucherApprovalStatus(models.TextChoices):
	PENDING = 'pending', 'Pending'
	APPROVED = 'approved', 'Approved'
	IN_PROCESS = 'in_process', 'In Process'
	AWAITING = 'awaiting', 'Awaiting'
	PARTIALLY_COMPLETED = 'partially_complete', 'Partially Completed'
	COMPLETED = 'completed', 'Completed'
	REPLACED = 'replaced', 'Replaced'


class Job(AuditModel):
	# Jewelry job fields (legacy)
	title = models.CharField(max_length=255, blank=True, default="Untitled Job")
	product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='jobs', null=True, blank=True)
	assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
	
	# Generic job fields
	job_type = models.CharField(max_length=100, blank=True, help_text='Type of work (e.g., Electrical, AC Repair, etc.)')
	work_type = models.CharField(max_length=50, blank=True, choices=[('In-House', 'In-House'), ('Contract', 'Contract'), ('Job Work', 'Job Work')], help_text='Work type for generic jobs')
	issued_to = models.CharField(max_length=255, blank=True, help_text='Name of person/vendor job is issued to')
	issued_by = models.CharField(max_length=255, blank=True, help_text='Name of person issuing the job')
	contact = models.CharField(max_length=20, blank=True, help_text='Contact number for job')
	notes = models.TextField(blank=True, help_text='Additional notes for the job')
	schedule = models.DateField(null=True, blank=True, help_text='Scheduled completion date')
	description = models.TextField(blank=True)
	assignee_name = models.CharField(max_length=255, blank=True, help_text='Name of assignee for non-jewelry jobs')
	location = models.CharField(max_length=255, blank=True)
	start_date = models.DateField(null=True, blank=True)
	due_date = models.DateField(null=True, blank=True)
	estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
	priority = models.CharField(max_length=20, choices=JobPriority.choices, default=JobPriority.MEDIUM)
	urgency = models.CharField(max_length=20, choices=JobUrgency.choices, default=JobUrgency.NORMAL)
	special_instructions = models.TextField(blank=True)
	workers = models.JSONField(default=list, blank=True, help_text='List of workers assigned with roles')
	materials = models.JSONField(default=list, blank=True, help_text='List of materials required')
	tools = models.JSONField(default=list, blank=True, help_text='List of tools/equipment needed')
	uploaded_files = models.JSONField(default=list, blank=True, help_text='List of uploaded files (photos, documents, etc.)')

	# Voucher-specific fields
	voucher_no = models.CharField(max_length=30, blank=True, default='', help_text='e.g. JJ-01')
	voucher_type = models.CharField(max_length=20, blank=True, default='New', choices=[('New', 'New'), ('Re-Issue', 'Re-Issue')], help_text='New or Re-Issue voucher')
	dept_from = models.CharField(max_length=100, blank=True, default='', help_text='Source department')
	dept_to = models.CharField(max_length=100, blank=True, default='', help_text='Destination department')
	# Each entry: {sku, category, metal, issued_qty, unit1, issued_weight, unit2}
	material_rows = models.JSONField(default=list, blank=True, help_text='Issued material rows from SKU table')
	# Each entry: {variety, color, cut, shape, length, width, height, qty}
	stone_rows = models.JSONField(default=list, blank=True, help_text='Stone issuance rows')
	# Each entry: {die_number, quantity, weight, unit}
	die_weight_rows = models.JSONField(default=list, blank=True, help_text='Die/findings rows')

	status = models.CharField(max_length=30, choices=JobStatus.choices, default=JobStatus.CREATED)

	# Voucher workflow fields
	approval_status = models.CharField(
		max_length=30,
		choices=VoucherApprovalStatus.choices,
		default=VoucherApprovalStatus.PENDING,
		blank=True,
		help_text='Voucher approval workflow status',
	)
	approved_by = models.CharField(max_length=255, blank=True, default='', help_text='Who approved this voucher')
	approved_at = models.DateTimeField(null=True, blank=True, help_text='When voucher was approved')
	picklist_group = models.ForeignKey(
		'inventory.PicklistGroup',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='vouchers',
		help_text='Picklist this voucher was generated from',
	)
	batch_id = models.CharField(max_length=120, blank=True, default='', help_text='Groups vouchers from same bulk creation')
	department_order = models.PositiveIntegerField(default=0, help_text='Sequence order in department pipeline (0=first)')
	# Receive tracking
	received_by = models.CharField(max_length=255, blank=True, default='', help_text='Who received/accepted the job')
	received_rows = models.JSONField(default=list, blank=True, help_text='Audit log of all receive events [{timestamp, received_by, is_partial, rows}]')

	def __str__(self):
		return f'{self.title} ({self.status})'
