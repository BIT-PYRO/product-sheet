from rest_framework import serializers
from saas_billing.models import (
    Plan, PlanEntitlement, Subscription, Invoice, Payment, TenantUsageSnapshot
)

class PlanEntitlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanEntitlement
        fields = ['key', 'value', 'data_type']

class PlanSerializer(serializers.ModelSerializer):
    entitlements = PlanEntitlementSerializer(many=True, read_only=True)

    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'code', 'description', 'is_active', 'trial_days',
            'base_price_monthly', 'base_price_yearly', 'currency', 'entitlements'
        ]

class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'tenant', 'plan', 'status', 'start_date', 'end_date',
            'trial_end_date', 'cancel_at_period_end', 'billing_cycle',
            'locked_price', 'locked_currency'
        ]

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'amount_due', 'amount_paid', 'due_date', 'status', 'pdf_url', 'created_at']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'currency', 'status', 'created_at']

class TenantUsageSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantUsageSnapshot
        fields = [
            'snapshot_date', 'active_users', 'total_users', 'companies',
            'products', 'orders', 'jobs', 'storage_used_mb', 'api_requests'
        ]

class CheckoutRequestSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'])
    success_url = serializers.URLField()
    cancel_url = serializers.URLField()
