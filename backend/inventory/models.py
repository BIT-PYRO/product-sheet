from django.db import models

from common.models import AuditModel
from products.models import Product


class InventoryTxnType(models.TextChoices):
	IN = 'in', 'IN'
	OUT = 'out', 'OUT'
	ADJUST = 'adjust', 'ADJUST'
	DEMAND = 'demand', 'DEMAND'


class StockType(models.TextChoices):
	CURRENT = 'current', 'Current Stock'
	MIN = 'min', 'Minimum Suggested'
	WIP = 'wip', 'WIP'


class InventoryTransaction(AuditModel):
	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='inventory_transactions',
	)
	txn_type = models.CharField(max_length=10, choices=InventoryTxnType.choices)
	quantity = models.IntegerField()
	stage = models.CharField(max_length=60, blank=True, default='')
	stock_type = models.CharField(max_length=20, choices=StockType.choices, default='current', blank=True)
	remark = models.CharField(max_length=255, blank=True)

	def __str__(self):
		return f'{self.product.sku} | {self.txn_type} | {self.quantity}'


class PicklistGroup(AuditModel):
	group_id = models.CharField(max_length=120, unique=True)
	number = models.PositiveIntegerField(unique=True)
	name = models.CharField(max_length=255)
	uploaded_by = models.CharField(max_length=120, blank=True)
	uploaded_at = models.DateTimeField()

	class Meta:
		ordering = ('-number', '-uploaded_at')

	def __str__(self):
		return f'Picklist {self.number} | {self.name}'


class PicklistItem(AuditModel):
	group = models.ForeignKey(
		PicklistGroup,
		on_delete=models.CASCADE,
		related_name='items',
	)
	sku = models.CharField(max_length=60)
	listing_name = models.CharField(max_length=255, blank=True)
	needed = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ('id',)
		constraints = [
			models.UniqueConstraint(fields=('group', 'sku'), name='unique_picklist_sku_per_group'),
		]

	def __str__(self):
		return f'{self.group.number} | {self.sku} | {self.needed}'
