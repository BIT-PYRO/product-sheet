from django.contrib import admin
from django.utils.html import format_html
from core_tenants.models import Tenant, Company, TenantBranding

class TenantBrandingInline(admin.StackedInline):
    model = TenantBranding
    can_delete = False

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'status', 'is_active_indicator', 'created_at')
    list_filter = ('status', 'is_active', 'created_at')
    search_fields = ('name', 'slug')
    ordering = ('name',)
    actions = ['activate_tenants', 'deactivate_tenants']
    inlines = [TenantBrandingInline]

    @admin.display(description="Status", ordering="is_active")
    def is_active_indicator(self, obj):
        color = "green" if obj.is_active else "red"
        text = "Active" if obj.is_active else "Inactive"
        return format_html('<b style="color: {};">{}</b>', color, text)

    @admin.action(description="Activate selected tenants")
    def activate_tenants(self, request, queryset):
        rows = queryset.update(is_active=True)
        self.message_user(request, f"Activated {rows} tenants successfully.")

    @admin.action(description="Deactivate selected tenants")
    def deactivate_tenants(self, request, queryset):
        rows = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {rows} tenants successfully.")


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'tenant', 'gst_number', 'is_active_indicator', 'created_at')
    list_filter = ('is_active', 'tenant', 'created_at')
    search_fields = ('name', 'code', 'gst_number', 'tenant__name')
    ordering = ('tenant', 'name')
    actions = ['activate_companies', 'deactivate_companies']

    @admin.display(description="Status", ordering="is_active")
    def is_active_indicator(self, obj):
        color = "green" if obj.is_active else "red"
        text = "Active" if obj.is_active else "Inactive"
        return format_html('<b style="color: {};">{}</b>', color, text)

    @admin.action(description="Activate selected companies")
    def activate_companies(self, request, queryset):
        rows = queryset.update(is_active=True)
        self.message_user(request, f"Activated {rows} companies successfully.")

    @admin.action(description="Deactivate selected companies")
    def deactivate_companies(self, request, queryset):
        rows = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {rows} companies successfully.")
