from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('master_sku', 'designer_sku', 'name', 'category', 'selling_price', 'cost_price', 'is_active')
    search_fields = ('master_sku', 'designer_sku', 'name', 'category')
    list_filter = ('is_active', 'category')
