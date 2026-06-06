from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import APIKey, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		('Role', {'fields': ('role', 'is_approved')}),
		('SaaS Tenancy', {'fields': ('tenant', 'active_company', 'accessible_companies')}),
	)
	list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'tenant', 'active_company', 'is_approved', 'is_staff')
	list_filter = DjangoUserAdmin.list_filter + ('role', 'tenant', 'is_approved')
	search_fields = DjangoUserAdmin.search_fields + ('tenant__name',)
	filter_horizontal = DjangoUserAdmin.filter_horizontal + ('accessible_companies',)


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
	list_display = ('name', 'key_prefix', 'given_to', 'page_scopes', 'can_read', 'can_write', 'can_comment', 'is_active', 'last_used_at', 'created_at')
	list_filter = ('is_active', 'can_read', 'can_write', 'can_comment')
	search_fields = ('name', 'given_to', 'key_prefix')
	readonly_fields = ('key_prefix', 'key_hash', 'last_used_at', 'created_at', 'updated_at', 'created_by')
	ordering = ('-created_at',)
