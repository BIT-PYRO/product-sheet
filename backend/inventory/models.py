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
	location = models.CharField(max_length=255, blank=True, default='')
	remark = models.CharField(max_length=255, blank=True)

	def __str__(self):
		return f'{self.product.master_sku} | {self.txn_type} | {self.quantity}'


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


class PriceBy(models.TextChoices):
	PCS = 'pcs', 'By Piece'
	WEIGHT = 'weight', 'By Weight'


class StoneItem(AuditModel):
	stone_type = models.CharField(max_length=120, blank=True, default='')
	species = models.CharField(max_length=120, blank=True, default='')
	variety = models.CharField(max_length=120, blank=True, default='')
	color = models.CharField(max_length=120, blank=True, default='')
	quality = models.CharField(max_length=120, blank=True, default='')
	wax_setting = models.BooleanField(default=False)
	cut = models.CharField(max_length=120, blank=True, default='')
	dos = models.TextField(blank=True, default='')
	donts = models.TextField(blank=True, default='')
	shape = models.CharField(max_length=120, blank=True, default='')
	length = models.CharField(max_length=60, blank=True, default='')
	width = models.CharField(max_length=60, blank=True, default='')
	height = models.CharField(max_length=60, blank=True, default='')
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	weight_cts = models.DecimalField(max_digits=12, decimal_places=4, default=0)

	class Meta:
		ordering = ('-created_at',)

	@property
	def average_weight_stock(self):
		if self.qty and float(self.qty) > 0:
			return round(float(self.weight_cts) / float(self.qty), 4)
		return 0

	def __str__(self):
		return f'{self.stone_type} | {self.species} | {self.variety}'


class StoneStockEntry(AuditModel):
	stone = models.ForeignKey(
		StoneItem,
		on_delete=models.CASCADE,
		related_name='stock_entries',
	)
	qty_added = models.DecimalField(max_digits=12, decimal_places=3)
	weight_cts_added = models.DecimalField(max_digits=12, decimal_places=4)
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	price_by = models.CharField(max_length=10, choices=PriceBy.choices, default=PriceBy.PCS)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	remark = models.CharField(max_length=255, blank=True, default='')

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f'{self.stone} | +{self.qty_added}'


class ToolItem(AuditModel):
	tool_name = models.CharField(max_length=255)
	particulars = models.CharField(max_length=255, blank=True, default='')
	department = models.CharField(max_length=120, blank=True, default='')
	quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	unit = models.CharField(max_length=60, blank=True, default='')
	location = models.CharField(max_length=255, blank=True, default='')

	class Meta:
		ordering = ('id',)

	def __str__(self):
		return self.tool_name


class OtherItem(AuditModel):
	item_name = models.CharField(max_length=255)
	category = models.CharField(max_length=60, blank=True, default='')
	quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	unit = models.CharField(max_length=60, blank=True, default='PCS')
	min_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	notes = models.TextField(blank=True, default='')

	class Meta:
		ordering = ('id',)

	def __str__(self):
		return self.item_name


class MachineItem(AuditModel):
	machine_name = models.CharField(max_length=255)
	particulars = models.CharField(max_length=255, blank=True, default='')
	department = models.CharField(max_length=120, blank=True, default='')
	min_required_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	running_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	running_unit = models.CharField(max_length=60, blank=True, default='')
	running_location = models.CharField(max_length=255, blank=True, default='')
	idle_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	idle_unit = models.CharField(max_length=60, blank=True, default='')
	idle_location = models.CharField(max_length=255, blank=True, default='')
	breakdown_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	breakdown_unit = models.CharField(max_length=60, blank=True, default='')
	breakdown_location = models.CharField(max_length=255, blank=True, default='')
	maintenance_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	maintenance_unit = models.CharField(max_length=60, blank=True, default='')
	maintenance_location = models.CharField(max_length=255, blank=True, default='')

	class Meta:
		ordering = ('id',)

	def __str__(self):
		return self.machine_name


class ProductInventoryItem(AuditModel):
	"""Tracks per-product final stock entries in the product inventory."""
	product = models.ForeignKey(
		Product,
		on_delete=models.CASCADE,
		related_name='product_inventory_items',
	)
	final_sku = models.CharField(max_length=120)
	value = models.DecimalField(max_digits=14, decimal_places=3, default=0)
	unit = models.CharField(max_length=30, default='PCS')
	location = models.CharField(max_length=255, blank=True, default='')
	total_in_demand = models.DecimalField(max_digits=14, decimal_places=3, default=0)

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f'{self.product.master_sku} | {self.final_sku} | {self.value} {self.unit}'
