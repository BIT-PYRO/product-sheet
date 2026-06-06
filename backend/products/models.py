from django.db import models
from common.models import AuditModel
from core_tenants.models import TenantAwareModel, TenantCompanyModel


# ---------------------------------------------------------------------------
# Tenant-scoped catalogue / lookup models
# ---------------------------------------------------------------------------

class Collection(TenantAwareModel):
	name = models.CharField(max_length=120)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']
		# Name is unique per-tenant (not globally unique)
		unique_together = [('tenant', 'name')]

	def __str__(self):
		return self.name


class Material(TenantAwareModel):
	name = models.CharField(max_length=120)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']
		unique_together = [('tenant', 'name')]

	def __str__(self):
		return self.name


class Category(TenantAwareModel):
	name = models.CharField(max_length=120)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']
		unique_together = [('tenant', 'name')]

	def __str__(self):
		return self.name


class Channel(TenantAwareModel):
	name = models.CharField(max_length=120)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']
		unique_together = [('tenant', 'name')]

	def __str__(self):
		return self.name


class Product(AuditModel, TenantCompanyModel):
	# master_sku is unique per tenant (not globally unique)
	master_sku = models.CharField(max_length=60)
	designer_sku = models.CharField(max_length=60, blank=True, default='')
	designer_skus = models.JSONField(default=list, blank=True, help_text='List of all designer SKUs linked to this master SKU')
	name = models.CharField(max_length=255, blank=True, default='')
	category = models.CharField(max_length=120, blank=True, default='')
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	invoice_price = models.DecimalField(max_digits=14, decimal_places=2, default=0, blank=True, help_text='Per-unit price used when auto-calculating invoice totals from picklist orders')
	is_active = models.BooleanField(default=True)
	# Each item: {"value": "...", "quantity": "...", "location": "..."}
	die_numbers = models.JSONField(default=list, blank=True)
	findings = models.JSONField(default=list, blank=True)

	# Display / metadata fields
	material = models.CharField(max_length=120, blank=True, default='')
	weight = models.CharField(max_length=60, blank=True, default='')
	weight_unit = models.CharField(max_length=30, blank=True, default='cts')
	collection = models.CharField(max_length=120, blank=True, default='')
	setting_type = models.CharField(max_length=120, blank=True, default='')
	enamel_type = models.CharField(max_length=120, blank=True, default='')
	active_channels = models.CharField(max_length=120, blank=True, default='')
	color = models.CharField(max_length=120, blank=True, default='')
	enamel = models.CharField(max_length=120, blank=True, default='')
	# Each entry: {type, species, variety, color, cut, shape, length, width, height, qty}
	stone_entries = models.JSONField(default=list, blank=True)
	# Each entry: {type, color} — full multi-row plating information
	plating_entries = models.JSONField(default=list, blank=True)
	# Legacy single-row fields kept for backward compatibility; new saves use plating_entries
	plating_type = models.CharField(max_length=120, blank=True, default='')
	plating_color = models.CharField(max_length=120, blank=True, default='')
	notes = models.TextField(blank=True, default='')
	images = models.JSONField(default=list, blank=True)

	class Meta:
		ordering = ['-created_at']
		# master_sku is unique within a tenant (two tenants may share the same SKU)
		unique_together = [('tenant', 'master_sku')]
		indexes = [
			models.Index(fields=['tenant', 'company', 'is_active']),
		]

	def __str__(self):
		return f'{self.master_sku} - {self.name}'

	# Backward compatibility for Phase 5
	@property
	def default_variant(self):
		return self.variants.first()

	@property
	def display_weight(self):
		if self.default_variant:
			opt = self.default_variant.options.filter(attribute__code__iexact='weight').first()
			if opt: return opt.value
		return self.weight

	@property
	def display_price(self):
		if self.default_variant:
			return self.default_variant.price
		return self.selling_price


TABLE_TYPE_CHOICES = [
	('live_stock', 'Live Stock Situation'),
	('stone_info', 'Stone Info'),
	('plating_info', 'Plating Info'),
]


class TableColumnConfig(TenantAwareModel):
	"""Per-tenant column configuration for dynamic tables (live stock, stone info, plating info)."""
	table_type = models.CharField(max_length=40, choices=TABLE_TYPE_CHOICES)
	key = models.CharField(max_length=80)          # internal JS key e.g. 'waxPiece'
	label = models.CharField(max_length=120)        # display header e.g. 'Wax Piece'
	order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ['table_type', 'order']
		# Unique per tenant (not globally)
		unique_together = [('tenant', 'table_type', 'key')]

	def __str__(self):
		return f'{self.table_type} / {self.label}'


# ---------------------------------------------------------------------------
# Dynamic Product Architecture (Phase 5)
# ---------------------------------------------------------------------------

class ProductAttribute(TenantCompanyModel):
	name = models.CharField(max_length=120)
	code = models.CharField(max_length=120)

	class Meta:
		unique_together = [('tenant', 'code')]
		ordering = ['name']

	def __str__(self):
		return self.name


class ProductAttributeDefinition(TenantCompanyModel):
	attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE, related_name='definitions')
	category = models.CharField(max_length=120, blank=True, default='', help_text="Category name this applies to. Blank means all categories.")
	is_required = models.BooleanField(default=False)
	order = models.IntegerField(default=0)

	class Meta:
		ordering = ['order', 'id']

	def __str__(self):
		return f"{self.attribute.name} - {self.category or 'All'}"


class ProductVariant(AuditModel, TenantCompanyModel):
	product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
	sku = models.CharField(max_length=120)
	price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	is_active = models.BooleanField(default=True)

	class Meta:
		unique_together = [('tenant', 'sku')]
		ordering = ['sku']

	def __str__(self):
		return self.sku


class ProductVariantOption(TenantCompanyModel):
	variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='options')
	attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE)
	value = models.CharField(max_length=255)

	class Meta:
		unique_together = [('variant', 'attribute')]

	def __str__(self):
		return f"{self.variant.sku} - {self.attribute.name}: {self.value}"

