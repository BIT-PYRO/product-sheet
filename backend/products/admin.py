from django.contrib import admin
from .models import Category, Channel, Collection, Material, Product, TableColumnConfig


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(TableColumnConfig)
class TableColumnConfigAdmin(admin.ModelAdmin):
    list_display = ('table_type', 'order', 'key', 'label')
    list_filter = ('table_type',)
    ordering = ('table_type', 'order')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('master_sku', 'designer_sku', 'name', 'category', 'selling_price', 'cost_price', 'is_active')
    search_fields = ('master_sku', 'designer_sku', 'name', 'category')
    list_filter = ('is_active', 'category')
