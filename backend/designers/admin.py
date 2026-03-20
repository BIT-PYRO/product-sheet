from django.contrib import admin

from .models import DesignerSheet


@admin.register(DesignerSheet)
class DesignerSheetAdmin(admin.ModelAdmin):
    list_display = ('sku', 'is_active', 'created_at')
    search_fields = ('sku',)
    list_filter = ('is_active',)
