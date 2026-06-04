from django.contrib import admin
from saas_billing.models import (
    Plan, PlanEntitlement, TenantEntitlementOverride, Subscription,
    SubscriptionHistory, SubscriptionEvent, TenantUsageSnapshot,
    Invoice, Payment, CreditNote
)

class PlanEntitlementInline(admin.TabularInline):
    model = PlanEntitlement
    extra = 1

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'trial_days', 'base_price_monthly', 'base_price_yearly')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    inlines = [PlanEntitlementInline]

@admin.register(TenantEntitlementOverride)
class TenantEntitlementOverrideAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'entitlement_key', 'value', 'data_type', 'created_by')
    search_fields = ('tenant__name', 'entitlement_key')

class SubscriptionHistoryInline(admin.TabularInline):
    model = SubscriptionHistory
    extra = 0
    readonly_fields = ('changed_at', 'old_plan', 'new_plan', 'old_status', 'new_status', 'reason')
    can_delete = False

class SubscriptionEventInline(admin.TabularInline):
    model = SubscriptionEvent
    extra = 0
    readonly_fields = ('created_at', 'event_type', 'payload')
    can_delete = False

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'plan', 'status', 'billing_cycle', 'locked_price', 'end_date')
    list_filter = ('status', 'billing_cycle', 'plan')
    search_fields = ('tenant__name', 'tenant__slug')
    inlines = [SubscriptionHistoryInline, SubscriptionEventInline]
    
    # Bulk actions
    actions = ['mark_as_past_due']

    @admin.action(description='Mark selected subscriptions as Past Due')
    def mark_as_past_due(self, request, queryset):
        from saas_billing.services.subscription_lifecycle import SubscriptionLifecycleService
        for sub in queryset:
            SubscriptionLifecycleService.apply_grace_period(sub)

@admin.register(TenantUsageSnapshot)
class TenantUsageSnapshotAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'snapshot_date', 'active_users', 'companies', 'orders', 'storage_used_mb')
    list_filter = ('snapshot_date',)
    search_fields = ('tenant__name',)

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'tenant', 'amount_due', 'amount_paid', 'status', 'due_date')
    list_filter = ('status',)
    search_fields = ('tenant__name',)
    inlines = [PaymentInline]

@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'invoice', 'amount', 'created_at')
    search_fields = ('tenant__name',)
