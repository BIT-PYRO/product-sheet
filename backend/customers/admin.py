from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('id', 'company_name', 'business_type', 'mobile', 'email', 'status', 'created_at')
    list_filter = ('status', 'business_type', 'state')
    search_fields = ('company_name', 'gst_number', 'pan_number', 'mobile', 'email')
