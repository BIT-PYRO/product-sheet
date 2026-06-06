from django.contrib import admin

from workforce.models import WorkforceMember


@admin.register(WorkforceMember)
class WorkforceMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "phone", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("full_name", "phone")
