from django.contrib import admin

from inventory.models import InventoryTransaction, PicklistGroup, PicklistItem


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "txn_type", "quantity", "remark", "created_at")
    list_filter = ("txn_type",)
    search_fields = ("product__sku", "remark")


class PicklistItemInline(admin.TabularInline):
    model = PicklistItem
    extra = 0
    fields = ("sku", "listing_name", "needed")


@admin.register(PicklistGroup)
class PicklistGroupAdmin(admin.ModelAdmin):
    list_display = ("number", "name", "uploaded_by", "uploaded_at", "group_id")
    list_filter = ("number", "uploaded_by")
    search_fields = ("group_id", "name", "uploaded_by", "items__sku", "items__listing_name")
    inlines = [PicklistItemInline]
