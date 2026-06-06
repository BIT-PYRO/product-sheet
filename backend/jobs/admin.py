from django.contrib import admin

from jobs.models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "product", "assignee", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("title",)
