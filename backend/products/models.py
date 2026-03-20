from django.db import models
from common.models import AuditModel


class Product(AuditModel):
	sku = models.CharField(max_length=60, unique=True)
	name = models.CharField(max_length=255)
	category = models.CharField(max_length=120, blank=True)
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	is_active = models.BooleanField(default=True)
	# Each item: {"value": "...", "quantity": "...", "location": "..."}
	die_numbers = models.JSONField(default=list, blank=True)
	findings = models.JSONField(default=list, blank=True)

	def __str__(self):
		return f'{self.sku} - {self.name}'
