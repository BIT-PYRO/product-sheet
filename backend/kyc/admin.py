from django.contrib import admin

from kyc.models import KYCRecord


@admin.register(KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "member", "status", "id_number", "created_at")
    list_filter = ("status",)
    search_fields = ("member__full_name", "id_number")
