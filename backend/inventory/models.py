from django.db import models

from common.models import AuditModel
from products.models import Product


class InventoryTxnType(models.TextChoices):
	IN = 'in', 'IN'
	OUT = 'out', 'OUT'
	ADJUST = 'adjust', 'ADJUST'
	DEMAND = 'demand', 'DEMAND'


class InventoryTransaction(AuditModel):
	product = models.ForeignKey(
		Product,
		on_delete=models.PROTECT,
		related_name='inventory_transactions',
	)
	txn_type = models.CharField(max_length=10, choices=InventoryTxnType.choices)
	quantity = models.IntegerField()
	remark = models.CharField(max_length=255, blank=True)

	def __str__(self):
		return f'{self.product.sku} | {self.txn_type} | {self.quantity}'
