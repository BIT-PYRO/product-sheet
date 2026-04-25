from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import Invoice, JournalEntry, JournalItem, Ledger, Outstanding, PendingExpense


class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ledger
        fields = ('id', 'name', 'type')


class JournalItemCreateSerializer(serializers.Serializer):
    ledger = serializers.PrimaryKeyRelatedField(queryset=Ledger.objects.all())
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))
    department = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    payment_method = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    vendor_payee = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    bill_date = serializers.DateField(required=False, allow_null=True)
    ref_id = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)

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
        
        # We also need request to access uploaded files
        request = self.context.get('request')

        with transaction.atomic():
            entry = JournalEntry.objects.create(**validated_data)
            
            from .models import JournalItemAttachment
            
            for index, item_data in enumerate(items_data):
                # Pop out standard fields to leave extra fields
                debit = item_data.pop('debit', Decimal('0'))
                credit = item_data.pop('credit', Decimal('0'))
                ledger = item_data.pop('ledger')
                # Pop type (which frontend might send, we don't need to save it directly into JournalItem)
                item_data.pop('type', None)

                # Create the item with the rest of the attributes
                j_item = JournalItem.objects.create(
                    entry=entry,
                    ledger=ledger,
                    debit=debit,
                    credit=credit,
                    **item_data
                )
                
                # Check for attachments in request.FILES
                # The frontend sends debit_X_attachment_Y or credit_X_attachment_Y
                if request and request.FILES:
                    # In items_data, we don't have the original 'type' to know if it's debit or credit easily?
                    # The frontend passes `type` ('debit' or 'credit') in the item.
                    # Wait, we popped it, but we can access it before popping if we check request data
                    pass # We will handle attachment creation outside because we don't have index easily mapped to 'debit'/'credit' lists
                    
            return entry


class JournalItemSerializer(serializers.ModelSerializer):
    ledger_name = serializers.CharField(source='ledger.name', read_only=True)

    class Meta:
        model = JournalItem
        fields = ('id', 'ledger', 'ledger_name', 'debit', 'credit', 'department', 'payment_method', 'vendor_payee', 'bill_date', 'ref_id', 'notes')


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


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        from .models import Expense
        model = Expense
        fields = ('id', 'amount', 'category', 'category_name', 'account', 'account_name', 'date', 'description', 'department', 'receipt', 'created_at')


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        from .models import Income
        model = Income
        fields = ('id', 'amount', 'category', 'category_name', 'account', 'account_name', 'date', 'description', 'department', 'receipt', 'created_at')


class OutstandingReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import OutstandingReceipt
        model = OutstandingReceipt
        fields = ('id', 'file', 'filename', 'uploaded_at')


class OutstandingSerializer(serializers.ModelSerializer):
    linked_journal_id = serializers.IntegerField(source='linked_journal.id', read_only=True, allow_null=True)
    settlement_journal_id = serializers.IntegerField(source='settlement_journal.id', read_only=True, allow_null=True)
    settlement_account_name = serializers.CharField(source='settlement_account.name', read_only=True, allow_null=True, default=None)
    receipts = OutstandingReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = Outstanding
        fields = (
            'id', 'type', 'party_name', 'amount', 'status', 'description', 'department',
            'due_date', 'linked_journal_id', 'settlement_journal_id',
            'settlement_account_name', 'receipts', 'created_at', 'updated_at'
        )


class InvoiceSerializer(serializers.ModelSerializer):
    outstanding_id = serializers.IntegerField(source='outstanding.id', read_only=True, allow_null=True)
    journal_entry_id = serializers.IntegerField(source='journal_entry.id', read_only=True, allow_null=True)

    class Meta:
        model = Invoice
        fields = (
            'id', 'type', 'party_name', 'amount', 'department',
            'due_date', 'description', 'status',
            'outstanding_id', 'journal_entry_id',
            'created_at', 'updated_at',
        )
        read_only_fields = ('status', 'outstanding_id', 'journal_entry_id', 'created_at', 'updated_at')


class InvoiceCreateSerializer(serializers.Serializer):
    type        = serializers.ChoiceField(choices=Invoice.InvoiceType.choices)
    party_name  = serializers.CharField(max_length=200)
    amount      = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    department  = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    due_date    = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')


class InvoiceSettleSerializer(serializers.Serializer):
    """
    payment_account: ID of the Account to use for settlement (Bank / Cash).
    """
    from .models import Account as _Account
    payment_account = serializers.PrimaryKeyRelatedField(
        queryset=_Account.objects.all(),
        help_text='ID of the Account (bank/cash) used for payment.',
    )

