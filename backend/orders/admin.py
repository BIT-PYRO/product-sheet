from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('name', 'sku', 'quantity', 'price', 'taxable', 'total_price')
    readonly_fields = ('total_price', 'created_at', 'updated_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_id', 'status', 'total', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('notes',)
    readonly_fields = ('subtotal', 'total', 'created_at', 'updated_at', 'created_by')
    inlines = [OrderItemInline]

    fieldsets = (
        ('Order Info', {
            'fields': ('customer_id', 'status', 'created_by', 'created_at', 'updated_at')
        }),
        ('Items', {
            'fields': (),
        }),
        ('Pricing', {
            'fields': ('subtotal', 'discount', 'shipping', 'tax', 'total')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.calculate_total()
        super().save_model(request, obj, form, change)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'name', 'quantity', 'price', 'total_price', 'taxable')
    list_filter = ('taxable', 'created_at')
    search_fields = ('name', 'sku', 'order__id')
    readonly_fields = ('total_price', 'created_at', 'updated_at')
