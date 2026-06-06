from django.db import models
from django.contrib.postgres.indexes import GinIndex

from common.models import AuditModel
from core_tenants.models import TenantCompanyModel
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


class InventoryTransaction(AuditModel, TenantCompanyModel):
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

	class Meta:
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['tenant', 'company', 'txn_type']),
		]

	def __str__(self):
		return f'{self.product.master_sku} | {self.txn_type} | {self.quantity}'


class PicklistGroup(AuditModel, TenantCompanyModel):
	# group_id and number are unique per tenant (not globally unique)
	group_id = models.CharField(max_length=120)
	number = models.PositiveIntegerField()
	name = models.CharField(max_length=255)
	uploaded_by = models.CharField(max_length=120, blank=True)
	uploaded_at = models.DateTimeField()

	class Meta:
		ordering = ('-number', '-uploaded_at')
		unique_together = [
			('tenant', 'group_id'),
			('tenant', 'number'),
		]

	def __str__(self):
		return f'Picklist {self.number} | {self.name}'


class PicklistItem(AuditModel, TenantCompanyModel):
	group = models.ForeignKey(
		PicklistGroup,
		on_delete=models.CASCADE,
		related_name='items',
	)
	sku = models.CharField(max_length=60)
	listing_name = models.CharField(max_length=255, blank=True)
	needed = models.PositiveIntegerField(default=0)
	# Extra metadata (e.g. product images, available stock) stored as JSON.
	# The column already exists in the DB; declared here so Django includes it
	# in INSERT/UPDATE statements and bulk_create does not omit it.
	attributes = models.JSONField(default=dict, blank=True)

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


class StoneItem(AuditModel, TenantCompanyModel):
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
	used_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	weight_cts = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	min_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)

	class Meta:
		ordering = ('-created_at',)

	@property
	def average_weight_stock(self):
		if self.qty and float(self.qty) > 0:
			return round(float(self.weight_cts) / float(self.qty), 4)
		return 0

	def __str__(self):
		return f'{self.stone_type} | {self.species} | {self.variety}'


class StoneStockEntry(AuditModel, TenantCompanyModel):
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


class ToolItem(AuditModel, TenantCompanyModel):
	tool_name = models.CharField(max_length=255)
	particulars = models.CharField(max_length=255, blank=True, default='')
	department = models.CharField(max_length=120, blank=True, default='')
	# New stock
	new_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	new_unit = models.CharField(max_length=60, blank=True, default='')
	new_location = models.CharField(max_length=255, blank=True, default='')
	# Used stock
	used_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	used_unit = models.CharField(max_length=60, blank=True, default='')
	used_location = models.CharField(max_length=255, blank=True, default='')
	# In Use
	in_use_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	in_use_unit = models.CharField(max_length=60, blank=True, default='')
	# Minimum required in stock
	min_required_stock = models.DecimalField(max_digits=12, decimal_places=3, default=0)

	class Meta:
		ordering = ('id',)

	def __str__(self):
		return self.tool_name


class OtherItem(AuditModel, TenantCompanyModel):
	item_name = models.CharField(max_length=255)
	category = models.CharField(max_length=60, blank=True, default='')
	quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	used_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	unit = models.CharField(max_length=60, blank=True, default='PCS')
	min_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	notes = models.TextField(blank=True, default='')

	class Meta:
		ordering = ('id',)

	def __str__(self):
		return self.item_name


class MachineItem(AuditModel, TenantCompanyModel):
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


class ProductInventoryItem(AuditModel, TenantCompanyModel):
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


# ── Stock Transaction (movement log for Tools / Machines / Others) ──────────

class StockTransaction(AuditModel, TenantCompanyModel):
	"""Received / Issued movement log for Tools, Machines and Others inventory."""

	INVENTORY_TYPE_CHOICES = [
		('tools', 'Tools'),
		('machines', 'Machines'),
		('others', 'Others'),
	]
	TXN_CHOICES = [
		('received', 'Received'),
		('issued', 'Issued'),
	]

	txn_date = models.DateField()
	inventory_type = models.CharField(max_length=20, choices=INVENTORY_TYPE_CHOICES)
	txn_type = models.CharField(max_length=10, choices=TXN_CHOICES)
	item_name = models.CharField(max_length=255)
	particulars = models.CharField(max_length=255, blank=True, default='')
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	qty_unit = models.CharField(max_length=30, blank=True, default='PCS')
	weight = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
	weight_unit = models.CharField(max_length=20, blank=True, default='KG')
	location = models.CharField(max_length=255, blank=True, default='')
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	received_from = models.CharField(max_length=255, blank=True, default='')
	issued_to = models.CharField(max_length=255, blank=True, default='')
	usage = models.CharField(max_length=10, blank=True, default='new')  # 'new' or 'used'
	activity_status = models.CharField(max_length=60, blank=True, default='')
	remark = models.CharField(max_length=255, blank=True, default='')
	tool = models.ForeignKey('ToolItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
	machine = models.ForeignKey('MachineItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
	other_item = models.ForeignKey('OtherItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')

	class Meta:
		ordering = ('-txn_date', '-created_at')

	def __str__(self):
		return f'{self.inventory_type} | {self.txn_type} | {self.item_name} | {self.qty}'


# ── Stone Transaction (movement log for Stone Inventory) ────────────────────

class StoneTransaction(AuditModel, TenantCompanyModel):
	"""Received / Issued movement log for Stone inventory."""

	TXN_CHOICES = [
		('received', 'Received'),
		('issued', 'Issued'),
	]

	txn_date = models.DateField()
	txn_type = models.CharField(max_length=10, choices=TXN_CHOICES)
	inventory_type = models.CharField(max_length=60, blank=True, default='')
	stone_name = models.CharField(max_length=255, blank=True, default='')
	variety = models.CharField(max_length=120, blank=True, default='')
	stone_type = models.CharField(max_length=120, blank=True, default='')
	shape = models.CharField(max_length=120, blank=True, default='')
	color = models.CharField(max_length=120, blank=True, default='')
	species = models.CharField(max_length=120, blank=True, default='')
	quality = models.CharField(max_length=120, blank=True, default='')
	cut = models.CharField(max_length=120, blank=True, default='')
	length = models.CharField(max_length=60, blank=True, default='')
	width = models.CharField(max_length=60, blank=True, default='')
	height = models.CharField(max_length=60, blank=True, default='')
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	weight = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	weight_unit = models.CharField(max_length=20, blank=True, default='CTS')
	location = models.CharField(max_length=255, blank=True, default='')
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	received_from = models.CharField(max_length=255, blank=True, default='')
	issued_to = models.CharField(max_length=255, blank=True, default='')
	usage = models.CharField(max_length=10, blank=True, default='new')  # 'new' or 'used'
	remark = models.CharField(max_length=255, blank=True, default='')
	activity_status = models.CharField(max_length=60, blank=True, default='')
	stone = models.ForeignKey('StoneItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='stone_transactions')

	class Meta:
		ordering = ('-txn_date', '-created_at')

	def __str__(self):
		return f'{self.txn_type} | {self.stone_name} | {self.qty}'


# ── Finding Inventory Item (standalone — separate from findings.Finding) ─────

class FindingInventoryItem(AuditModel, TenantCompanyModel):
	"""Standalone finding inventory. NOT linked to the Master Finding Sheet."""

	finding_code = models.CharField(max_length=120)
	die_number = models.CharField(max_length=120, blank=True, default='')
	size = models.CharField(max_length=60, blank=True, default='')
	material = models.CharField(max_length=120, blank=True, default='')
	finding_stage = models.CharField(max_length=120, blank=True, default='')
	mechanism = models.CharField(max_length=120, blank=True, default='')
	quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	weight = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	dead_weight = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	mold_qty_per_die = models.CharField(max_length=60, blank=True, default='')
	polish = models.CharField(max_length=120, blank=True, default='')
	total_measurements = models.CharField(max_length=120, blank=True, default='')
	design_material = models.CharField(max_length=120, blank=True, default='')
	min_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	used_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	notes = models.TextField(blank=True, default='')

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f'{self.finding_code} | {self.material} | {self.quantity}'


# ── Finding Inventory Transaction ────────────────────────────────────────────

class FindingInventoryTransaction(AuditModel, TenantCompanyModel):
	"""Movement log for standalone Finding inventory."""

	TXN_CHOICES = [
		('received', 'Received'),
		('issued', 'Issued'),
	]

	txn_date = models.DateField()
	finding = models.ForeignKey('FindingInventoryItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
	finding_code = models.CharField(max_length=120, blank=True, default='')
	txn_type = models.CharField(max_length=10, choices=TXN_CHOICES)
	inventory_type = models.CharField(max_length=60, blank=True, default='')
	die_number = models.CharField(max_length=120, blank=True, default='')
	size = models.CharField(max_length=60, blank=True, default='')
	material = models.CharField(max_length=120, blank=True, default='')
	stage = models.CharField(max_length=120, blank=True, default='')
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	weight = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	dead_weight = models.DecimalField(max_digits=12, decimal_places=4, default=0)
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	received_from = models.CharField(max_length=255, blank=True, default='')
	issued_to = models.CharField(max_length=255, blank=True, default='')
	usage = models.CharField(max_length=10, blank=True, default='new')  # 'new' or 'used'
	remark = models.CharField(max_length=255, blank=True, default='')
	activity_status = models.CharField(max_length=60, blank=True, default='')

	class Meta:
		ordering = ('-txn_date', '-created_at')

	def __str__(self):
		return f'{self.txn_type} | {self.finding_code} | {self.qty}'


# ── Product Inventory Transaction ────────────────────────────────────────────

class ProductInventoryTransaction(AuditModel, TenantCompanyModel):
	"""Movement log for Product inventory."""

	TXN_CHOICES = [
		('received', 'Received'),
		('issued', 'Issued'),
	]

	txn_date = models.DateField()
	product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_txns')
	master_sku = models.CharField(max_length=120, blank=True, default='')
	designer_sku = models.CharField(max_length=120, blank=True, default='')
	final_sku = models.CharField(max_length=120, blank=True, default='')
	txn_type = models.CharField(max_length=10, choices=TXN_CHOICES)
	inventory_type = models.CharField(max_length=60, blank=True, default='')
	metal = models.CharField(max_length=60, blank=True, default='')
	value = models.DecimalField(max_digits=14, decimal_places=3, default=0)
	unit = models.CharField(max_length=30, blank=True, default='PCS')
	location = models.CharField(max_length=255, blank=True, default='')
	wip = models.DecimalField(max_digits=14, decimal_places=3, default=0)
	total_in_demand = models.DecimalField(max_digits=14, decimal_places=3, default=0)
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	received_from = models.CharField(max_length=255, blank=True, default='')
	issued_to = models.CharField(max_length=255, blank=True, default='')
	remark = models.CharField(max_length=255, blank=True, default='')
	activity_status = models.CharField(max_length=60, blank=True, default='')

	class Meta:
		ordering = ('-txn_date', '-created_at')

	def __str__(self):
		return f'{self.txn_type} | {self.master_sku} | {self.value}'


# ── Issue Request (persisted issue requests for all inventory types) ─────────

class IssueRequest(AuditModel, TenantCompanyModel):
	"""Persisted issue request for any inventory type."""

	INVENTORY_TYPE_CHOICES = [
		('tools', 'Tools'),
		('machines', 'Machines'),
		('others', 'Others'),
		('stone', 'Stone'),
		('finding', 'Finding'),
		('product', 'Product'),
		('die', 'Die'),
	]
	STATUS_CHOICES = [
		('pending', 'Pending'),
		('approved', 'Approved'),
		('rejected', 'Rejected'),
	]

	inventory_type = models.CharField(max_length=20, choices=INVENTORY_TYPE_CHOICES)
	item_id = models.IntegerField(null=True, blank=True)
	item_name = models.CharField(max_length=255)
	quantity = models.DecimalField(max_digits=12, decimal_places=3)
	issued_to = models.CharField(max_length=255)
	issued_by = models.CharField(max_length=255, blank=True, default='')
	reason = models.TextField(blank=True, default='')
	reference_id = models.CharField(max_length=120, blank=True, default='')
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
	requested_at = models.DateTimeField(auto_now_add=True)
	reviewed_at = models.DateTimeField(null=True, blank=True)
	remark = models.CharField(max_length=255, blank=True, default='')

	class Meta:
		ordering = ('-requested_at',)
		indexes = [
			models.Index(fields=['tenant', 'company', 'status']),
		]

	def __str__(self):
		return f'{self.inventory_type} | {self.item_name} | {self.quantity} | {self.status}'


# ── Die Inventory Item ───────────────────────────────────────────────────────

class DieInventoryItem(AuditModel, TenantCompanyModel):
	"""Master record for a die used in jewellery manufacturing."""

	# die_code is unique per tenant (not globally)
	die_code = models.CharField(max_length=120)
	image = models.TextField(blank=True, default='')          # URL or base64
	master_skus = models.JSONField(default=list, blank=True)  # list of master SKU strings
	designer_skus = models.JSONField(default=list, blank=True)  # list of designer SKU strings
	# Maps UPPERCASE master_sku → qty_per_piece (how many of this die per piece of that SKU)
	sku_qty_per_piece = models.JSONField(default=dict, blank=True, help_text='{\"SKU1\": 2, \"SKU2\": 4} — dies needed per piece of each master SKU')
	location = models.CharField(max_length=255, blank=True, default='')
	quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	wax_piece_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	wax_piece_location = models.CharField(max_length=255, blank=True, default='')
	wax_setting_qty = models.CharField(max_length=60, blank=True, default='')
	wax_setting_location = models.CharField(max_length=255, blank=True, default='')
	casting_qty = models.CharField(max_length=60, blank=True, default='')
	casting_location = models.CharField(max_length=255, blank=True, default='')
	# Pre-casting missing sub-fields
	wax_piece_min = models.CharField(max_length=60, blank=True, default='')
	wax_piece_wip = models.CharField(max_length=60, blank=True, default='')
	wax_setting_min = models.CharField(max_length=60, blank=True, default='')
	wax_setting_wip = models.CharField(max_length=60, blank=True, default='')
	casting_min = models.CharField(max_length=60, blank=True, default='')
	casting_wip = models.CharField(max_length=60, blank=True, default='')
	# Post-casting stages
	filling_min = models.CharField(max_length=60, blank=True, default='')
	filling_current = models.CharField(max_length=60, blank=True, default='')
	filling_wip = models.CharField(max_length=60, blank=True, default='')
	filling_location = models.CharField(max_length=255, blank=True, default='')
	pre_polish_min = models.CharField(max_length=60, blank=True, default='')
	pre_polish_current = models.CharField(max_length=60, blank=True, default='')
	pre_polish_wip = models.CharField(max_length=60, blank=True, default='')
	pre_polish_location = models.CharField(max_length=255, blank=True, default='')
	hand_setting_min = models.CharField(max_length=60, blank=True, default='')
	hand_setting_current = models.CharField(max_length=60, blank=True, default='')
	hand_setting_wip = models.CharField(max_length=60, blank=True, default='')
	hand_setting_location = models.CharField(max_length=255, blank=True, default='')
	final_polish_min = models.CharField(max_length=60, blank=True, default='')
	final_polish_current = models.CharField(max_length=60, blank=True, default='')
	final_polish_wip = models.CharField(max_length=60, blank=True, default='')
	final_polish_location = models.CharField(max_length=255, blank=True, default='')
	plating_min = models.CharField(max_length=60, blank=True, default='')
	plating_current = models.CharField(max_length=60, blank=True, default='')
	plating_wip = models.CharField(max_length=60, blank=True, default='')
	plating_location = models.CharField(max_length=255, blank=True, default='')
	notes = models.TextField(blank=True, default='')
	used_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	min_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)

	class Meta:
		ordering = ('-created_at',)
		unique_together = [('tenant', 'die_code')]
		indexes = [
			GinIndex(fields=['master_skus']),
		]

	def __str__(self):
		return self.die_code


# ── Die Inventory Transaction (movement log) ─────────────────────────────────

class DieTransaction(AuditModel, TenantCompanyModel):
	"""Received / Issued movement log for Die inventory."""

	TXN_CHOICES = [
		('received', 'Received'),
		('issued', 'Issued'),
	]

	txn_date = models.DateField()
	die = models.ForeignKey('DieInventoryItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
	die_code = models.CharField(max_length=120, blank=True, default='')
	txn_type = models.CharField(max_length=10, choices=TXN_CHOICES)
	inventory_type = models.CharField(max_length=60, blank=True, default='')
	master_sku = models.CharField(max_length=120, blank=True, default='')
	designer_sku = models.CharField(max_length=120, blank=True, default='')
	location = models.CharField(max_length=255, blank=True, default='')
	qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	wax_piece_qty = models.DecimalField(max_digits=12, decimal_places=3, default=0)
	wax_piece_location = models.CharField(max_length=255, blank=True, default='')
	wax_setting_qty = models.CharField(max_length=60, blank=True, default='')
	wax_setting_location = models.CharField(max_length=255, blank=True, default='')
	casting_qty = models.CharField(max_length=60, blank=True, default='')
	casting_location = models.CharField(max_length=255, blank=True, default='')
	price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
	amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
	received_from = models.CharField(max_length=255, blank=True, default='')
	issued_to = models.CharField(max_length=255, blank=True, default='')
	remark = models.CharField(max_length=255, blank=True, default='')
	activity_status = models.CharField(max_length=60, blank=True, default='')

	class Meta:
		ordering = ('-txn_date', '-created_at')

	def __str__(self):
		return f'{self.txn_type} | {self.die_code} | {self.qty}'


# ── Repair Queue & Repair Batches ─────────────────────────────────────────────

class RepairBatch(AuditModel, TenantCompanyModel):
	# batch_no is unique per tenant (not globally)
	batch_no = models.CharField(max_length=120, help_text="e.g. Repair-YYYY-MM-DD")
	date = models.DateField(help_text="Confirmation/Creation date")
	confirmed = models.BooleanField(default=False)
	confirmed_at = models.DateTimeField(null=True, blank=True)
	voucher_created = models.BooleanField(default=False)

	class Meta:
		ordering = ('-date', '-created_at')
		unique_together = [('tenant', 'batch_no')]
		indexes = [
			models.Index(fields=['tenant', 'company', 'confirmed']),
		]

	def __str__(self):
		return f'{self.batch_no} ({self.date})'


class RepairItem(AuditModel, TenantCompanyModel):
	STAGE_CHOICES = [
		('hand_setting', 'Hand Setting'),
		('final_polish', 'Final Polish'),
		('plating', 'Plating'),
	]

	# repair_item_id is unique per tenant (not globally)
	repair_item_id = models.IntegerField()
	product = models.CharField(max_length=255)
	sku = models.CharField(max_length=60)
	variant = models.CharField(max_length=255, blank=True, default='')
	quantity = models.IntegerField(default=1)
	repair_stage = models.CharField(max_length=60, choices=STAGE_CHOICES)
	repair_stage_label = models.CharField(max_length=120)
	resolved_by = models.CharField(max_length=255, blank=True, null=True)
	scanned_at = models.DateTimeField(null=True, blank=True)

	confirmed = models.BooleanField(default=False)
	confirmed_at = models.DateTimeField(null=True, blank=True)
	sent_to_repair = models.BooleanField(default=False)
	batch = models.ForeignKey(RepairBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name='items')

	class Meta:
		ordering = ('-scanned_at', '-created_at')
		unique_together = [('tenant', 'repair_item_id')]
		indexes = [
			models.Index(fields=['tenant', 'company', 'repair_stage', 'confirmed']),
		]

	def __str__(self):
		return f'{self.product} ({self.sku}) | Stage: {self.repair_stage_label} | Qty: {self.quantity}'
