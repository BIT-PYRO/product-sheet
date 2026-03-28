from django.contrib import admin

from .models import DesignerSheet


@admin.register(DesignerSheet)
class DesignerSheetAdmin(admin.ModelAdmin):
    list_display = ('sku', 'motive_code', 'master_sku', 'is_active', 'created_at')
    search_fields = ('sku', 'motive_code', 'master_sku')
    list_filter = ('is_active',)
