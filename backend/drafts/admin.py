from django.contrib import admin

from drafts.models import Draft


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "entity_type", "is_submitted", "created_at", "updated_at")
    list_filter = ("entity_type", "is_submitted")
    search_fields = ("owner__username", "entity_type")
