from django.contrib import admin

from .models import Finding


@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ('finding_code', 'die_number', 'size', 'quantity', 'weight', 'material', 'finding_stage', 'mechanism', 'is_active', 'created_at')
    list_filter = ('is_active', 'material', 'finding_stage')
    search_fields = ('finding_code', 'die_number', 'mechanism')
