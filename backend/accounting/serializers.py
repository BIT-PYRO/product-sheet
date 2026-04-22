from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import JournalEntry, JournalItem, Ledger, PendingExpense


class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ledger
        fields = ('id', 'name', 'type')


class JournalItemCreateSerializer(serializers.Serializer):
    ledger = serializers.PrimaryKeyRelatedField(queryset=Ledger.objects.all())
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))

    def validate(self, attrs):
        debit = attrs.get('debit', Decimal('0'))
        credit = attrs.get('credit', Decimal('0'))

        if debit == 0 and credit == 0:
            raise serializers.ValidationError('Each journal item must have either debit or credit amount.')
        if debit > 0 and credit > 0:
            raise serializers.ValidationError('A journal item cannot have both debit and credit values.')

        return attrs


class JournalEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    items = JournalItemCreateSerializer(many=True, min_length=2)

    def validate(self, attrs):
        items = attrs.get('items', [])
        total_debit = sum((item['debit'] for item in items), Decimal('0'))
        total_credit = sum((item['credit'] for item in items), Decimal('0'))

        if total_debit != total_credit:
            raise serializers.ValidationError(
                {'items': 'Total debit must be equal to total credit.'}
            )

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        with transaction.atomic():
            entry = JournalEntry.objects.create(**validated_data)
            JournalItem.objects.bulk_create(
                [
                    JournalItem(
                        entry=entry,
                        ledger=item['ledger'],
                        debit=item['debit'],
                        credit=item['credit'],
                    )
                    for item in items_data
                ]
            )

        return entry


class JournalItemSerializer(serializers.ModelSerializer):
    ledger_name = serializers.CharField(source='ledger.name', read_only=True)

    class Meta:
        model = JournalItem
        fields = ('id', 'ledger', 'ledger_name', 'debit', 'credit')


class JournalEntrySerializer(serializers.ModelSerializer):
    items = JournalItemSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = ('id', 'date', 'description', 'created_at', 'items')


class PendingExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.PrimaryKeyRelatedField(source='category', read_only=True, allow_null=True)

    class Meta:
        model = PendingExpense
        fields = (
            'id', 'employee_name', 'amount', 'category_id', 'category_name',
            'description', 'source_id', 'source', 'status', 'created_at', 'updated_at',
        )


class ApproveExpenseSerializer(serializers.Serializer):
    """Expects the Ledger (asset type) that will be credited (payment account)."""
    payment_ledger = serializers.PrimaryKeyRelatedField(
        queryset=Ledger.objects.filter(type__in=['asset', 'liability']),
        help_text='ID of the asset/liability ledger to credit (e.g. Cash, Bank).',
    )
