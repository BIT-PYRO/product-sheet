from django.contrib import admin

from inventory.models import (
    InventoryTransaction, MachineItem, OtherItem, PicklistGroup, PicklistItem, ToolItem,
    StockTransaction, StoneTransaction,
    FindingInventoryItem, FindingInventoryTransaction,
    ProductInventoryTransaction, IssueRequest,
    DieInventoryItem, DieTransaction,
)


@admin.register(ToolItem)
class ToolItemAdmin(admin.ModelAdmin):
    list_display = ("id", "tool_name", "particulars", "department", "new_qty", "new_unit", "new_location", "used_qty", "in_use_qty", "min_required_stock")
    search_fields = ("tool_name", "department")


@admin.register(OtherItem)
class OtherItemAdmin(admin.ModelAdmin):
    list_display = ("id", "item_name", "category", "quantity", "unit", "min_level")
    list_filter = ("category",)
    search_fields = ("item_name",)


@admin.register(MachineItem)
class MachineItemAdmin(admin.ModelAdmin):
    list_display = ("id", "machine_name", "department", "running_qty", "idle_qty", "breakdown_qty", "maintenance_qty")
    search_fields = ("machine_name", "department")


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


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "txn_date", "inventory_type", "txn_type", "item_name", "qty", "qty_unit", "received_from", "issued_to")
    list_filter = ("inventory_type", "txn_type")
    search_fields = ("item_name", "particulars", "received_from", "issued_to")
    date_hierarchy = "txn_date"


@admin.register(StoneTransaction)
class StoneTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "txn_date", "txn_type", "stone_name", "qty", "weight", "weight_unit", "received_from", "issued_to")
    list_filter = ("txn_type",)
    search_fields = ("stone_name", "variety", "species", "issued_to", "received_from")
    date_hierarchy = "txn_date"


@admin.register(FindingInventoryItem)
class FindingInventoryItemAdmin(admin.ModelAdmin):
    list_display = ("id", "finding_code", "die_number", "material", "finding_stage", "quantity", "weight")
    list_filter = ("material", "finding_stage")
    search_fields = ("finding_code", "die_number", "mechanism")


@admin.register(FindingInventoryTransaction)
class FindingInventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "txn_date", "txn_type", "finding_code", "qty", "material", "issued_to", "received_from")
    list_filter = ("txn_type",)
    search_fields = ("finding_code", "material", "issued_to", "received_from")
    date_hierarchy = "txn_date"


@admin.register(ProductInventoryTransaction)
class ProductInventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "txn_date", "txn_type", "master_sku", "final_sku", "value", "unit", "issued_to", "received_from")
    list_filter = ("txn_type",)
    search_fields = ("master_sku", "designer_sku", "final_sku", "issued_to", "received_from")
    date_hierarchy = "txn_date"


@admin.register(IssueRequest)
class IssueRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "inventory_type", "item_name", "quantity", "issued_to", "status", "requested_at")
    list_filter = ("inventory_type", "status")
    search_fields = ("item_name", "issued_to", "issued_by", "reason", "reference_id")
    date_hierarchy = "requested_at"


@admin.register(DieInventoryItem)
class DieInventoryItemAdmin(admin.ModelAdmin):
    list_display = ("id", "die_code", "location", "quantity", "wax_piece_qty", "wax_setting_qty", "casting_qty")
    search_fields = ("die_code", "location", "notes")


@admin.register(DieTransaction)
class DieTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "txn_date", "txn_type", "die_code", "qty", "issued_to", "received_from")
    list_filter = ("txn_type",)
    search_fields = ("die_code", "master_sku", "designer_sku", "issued_to", "received_from", "remark")
    date_hierarchy = "txn_date"
