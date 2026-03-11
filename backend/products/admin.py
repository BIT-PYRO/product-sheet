from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'category', 'selling_price', 'cost_price', 'is_active')
    search_fields = ('sku', 'name', 'category')
    list_filter = ('is_active', 'category')
