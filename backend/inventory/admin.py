from django.contrib import admin

from inventory.models import InventoryTransaction


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "txn_type", "quantity", "remark", "created_at")
    list_filter = ("txn_type",)
    search_fields = ("product__sku", "remark")
