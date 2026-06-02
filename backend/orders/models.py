from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator

from common.models import AuditModel
from core_tenants.models import TenantCompanyModel
from products.models import Product


class OrderSource(models.TextChoices):
    CUSTOM = 'custom', 'Custom'
    PICKLIST = 'picklist', 'Picklist'
    SHOPIFY = 'shopify', 'Shopify'
    SAMPLE = 'sample', 'Sample'


class OrderStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'


class Order(AuditModel, TenantCompanyModel):
    customer_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Reference to customer ID from external CMS"
    )
    customer_name = models.CharField(max_length=255, blank=True, default='')
    customer_email = models.EmailField(blank=True, default='')
    customer_phone = models.CharField(max_length=20, blank=True, default='')
    customer_address = models.TextField(blank=True, default='')
    customer_city = models.CharField(max_length=100, blank=True, default='')
    customer_state = models.CharField(max_length=100, blank=True, default='')
    customer_zip = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    shipping = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    tax = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    notes = models.TextField(blank=True, default='')
    order_type = models.CharField(max_length=100, blank=True, default='JANKI')
    units = models.CharField(max_length=50, blank=True, default='Pieces')
    picklist_number = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Picklist number this order was generated from'
    )
    order_source = models.CharField(
        max_length=20,
        choices=OrderSource.choices,
        default=OrderSource.CUSTOM,
        help_text='Origin of the order: custom, picklist, shopify, or sample'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} - {self.status}'

    def calculate_total(self):
        """Calculate total including tax"""
        self.subtotal = sum(item.total_price for item in self.items.all())
        self.total = self.subtotal + self.shipping - self.discount + self.tax
        return self.total


class OrderItem(AuditModel, TenantCompanyModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items'
    )
    # For custom items
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    taxable = models.BooleanField(default=True)
    images = models.JSONField(default=list, blank=True)  # Store base64 images
    note = models.TextField(blank=True, default='')
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['tenant', 'company', 'order']),
        ]

    def __str__(self):
        return f'{self.name} x{self.quantity}'

    def save(self, *args, **kwargs):
        self.total_price = self.price * self.quantity
        super().save(*args, **kwargs)
