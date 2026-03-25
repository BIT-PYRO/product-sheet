from django.db import models
from common.models import AuditModel


class Product(AuditModel):
	sku = models.CharField(max_length=60, unique=True)
	name = models.CharField(max_length=255)
	category = models.CharField(max_length=120, blank=True, default='')
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	is_active = models.BooleanField(default=True)
	# Each item: {"value": "...", "quantity": "...", "location": "..."}
	die_numbers = models.JSONField(default=list, blank=True)
	findings = models.JSONField(default=list, blank=True)

	# Display / metadata fields
	material = models.CharField(max_length=120, blank=True, default='')
	weight = models.CharField(max_length=60, blank=True, default='')
	collection = models.CharField(max_length=120, blank=True, default='')
	setting_type = models.CharField(max_length=120, blank=True, default='')
	enamel_type = models.CharField(max_length=120, blank=True, default='')
	active_channels = models.CharField(max_length=120, blank=True, default='')
	master_sku = models.CharField(max_length=60, blank=True, default='')
	color = models.CharField(max_length=120, blank=True, default='')
	enamel = models.CharField(max_length=120, blank=True, default='')
	stone_name = models.CharField(max_length=120, blank=True, default='')
	stone_cut = models.CharField(max_length=120, blank=True, default='')
	stone_color = models.CharField(max_length=120, blank=True, default='')
	stone_size = models.CharField(max_length=120, blank=True, default='')
	stone_quantity = models.CharField(max_length=60, blank=True, default='')
	plating_type = models.CharField(max_length=120, blank=True, default='')
	plating_color = models.CharField(max_length=120, blank=True, default='')
	notes = models.TextField(blank=True, default='')
	images = models.JSONField(default=list, blank=True)

	def __str__(self):
		return f'{self.sku} - {self.name}'
