from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import APIKey, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		('Role', {'fields': ('role',)}),
	)
	list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
	list_display = ('name', 'key_prefix', 'given_to', 'page_scopes', 'can_read', 'can_write', 'can_comment', 'is_active', 'last_used_at', 'created_at')
	list_filter = ('is_active', 'can_read', 'can_write', 'can_comment')
	search_fields = ('name', 'given_to', 'key_prefix')
	readonly_fields = ('key_prefix', 'key_hash', 'last_used_at', 'created_at', 'updated_at', 'created_by')
	ordering = ('-created_at',)
