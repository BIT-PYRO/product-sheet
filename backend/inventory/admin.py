from django.contrib import admin

from inventory.models import InventoryTransaction, MachineItem, OtherItem, PicklistGroup, PicklistItem, ToolItem


@admin.register(ToolItem)
class ToolItemAdmin(admin.ModelAdmin):
    list_display = ("id", "tool_name", "particulars", "department", "quantity", "unit", "location")
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
