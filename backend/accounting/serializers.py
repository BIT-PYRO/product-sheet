from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import (
    BankAccount, BankTransaction,
    BulkSettlement,
    Invoice, JournalEntry, JournalItem, Ledger, Outstanding, PendingExpense,
)


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
                if request and request.FILES:
                    pass  # Handled outside
                    
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
    receipts = serializers.SerializerMethodField()

    def get_receipts(self, obj):
        res = []
        if obj.receipt:
            res.append({'id': f'dir_{obj.id}', 'file': obj.receipt.url, 'filename': obj.receipt.name.split('/')[-1]})
        if obj.journal_entry:
            from .models import Outstanding
            for out in Outstanding.objects.filter(settlement_journal=obj.journal_entry):
                for r in out.receipts.all():
                    res.append({'id': r.id, 'file': r.file.url, 'filename': r.filename})
        return res

    class Meta:
        from .models import Expense
        model = Expense
        fields = ('id', 'amount', 'category', 'category_name', 'account', 'account_name', 'date', 'description', 'department', 'receipt', 'receipts', 'created_at')


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    receipts = serializers.SerializerMethodField()

    def get_receipts(self, obj):
        res = []
        if obj.receipt:
            res.append({'id': f'dir_{obj.id}', 'file': obj.receipt.url, 'filename': obj.receipt.name.split('/')[-1]})
        if obj.journal_entry:
            from .models import Outstanding
            for out in Outstanding.objects.filter(settlement_journal=obj.journal_entry):
                for r in out.receipts.all():
                    res.append({'id': r.id, 'file': r.file.url, 'filename': r.filename})
        return res

    class Meta:
        from .models import Income
        model = Income
        fields = ('id', 'amount', 'category', 'category_name', 'account', 'account_name', 'date', 'description', 'department', 'receipt', 'receipts', 'created_at')


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
    receipts = serializers.SerializerMethodField()

    def get_receipts(self, obj):
        if obj.outstanding:
            from .models import OutstandingReceipt
            qs = OutstandingReceipt.objects.filter(outstanding=obj.outstanding)
            return OutstandingReceiptSerializer(qs, many=True).data
        return []

    class Meta:
        model = Invoice
        fields = (
            'id', 'type', 'party_name', 'amount', 'department',
            'due_date', 'description', 'status',
            'outstanding_id', 'journal_entry_id',
            'receipts',
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

# ---------------------------------------------------------------------------
# Banking
# ---------------------------------------------------------------------------

class BankAccountSerializer(serializers.ModelSerializer):
    ledger_id = serializers.IntegerField(source='ledger.id', read_only=True, allow_null=True)
    ledger_name = serializers.CharField(source='ledger.name', read_only=True, allow_null=True, default=None)
    # Computed balance
    balance = serializers.SerializerMethodField()
    total_credits = serializers.SerializerMethodField()
    total_debits = serializers.SerializerMethodField()
    transaction_count = serializers.SerializerMethodField()
    unprocessed_count = serializers.SerializerMethodField()
    last_transaction_date = serializers.SerializerMethodField()

    class Meta:
        model = BankAccount
        fields = (
            'id', 'name', 'bank_name', 'account_number', 'opening_balance',
            'ledger_id', 'ledger_name',
            'balance', 'total_credits', 'total_debits',
            'transaction_count', 'unprocessed_count', 'last_transaction_date',
            'created_at',
        )

    def _txns(self, obj):
        return obj.transactions.exclude(status=BankTransaction.Status.IGNORED)

    def get_total_credits(self, obj):
        from django.db.models import Sum
        result = self._txns(obj).filter(type='credit').aggregate(s=Sum('amount'))['s'] or 0
        return float(result)

    def get_total_debits(self, obj):
        from django.db.models import Sum
        result = self._txns(obj).filter(type='debit').aggregate(s=Sum('amount'))['s'] or 0
        return float(result)

    def get_balance(self, obj):
        return float(obj.opening_balance) + self.get_total_credits(obj) - self.get_total_debits(obj)

    def get_transaction_count(self, obj):
        return obj.transactions.count()

    def get_unprocessed_count(self, obj):
        return obj.transactions.filter(status=BankTransaction.Status.UNPROCESSED).count()

    def get_last_transaction_date(self, obj):
        last = obj.transactions.order_by('-date').values_list('date', flat=True).first()
        return str(last) if last else None


class BankAccountCreateSerializer(serializers.ModelSerializer):
    ledger_id = serializers.PrimaryKeyRelatedField(
        queryset=Ledger.objects.all(), source='ledger', required=False, allow_null=True,
    )

    class Meta:
        model = BankAccount
        fields = ('id', 'name', 'bank_name', 'account_number', 'opening_balance', 'ledger_id')


class BankTransactionSerializer(serializers.ModelSerializer):
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    suggested_ledger_name = serializers.CharField(source='suggested_ledger.name', read_only=True, allow_null=True, default=None)
    journal_entry_id = serializers.IntegerField(source='journal_entry.id', read_only=True, allow_null=True)

    class Meta:
        model = BankTransaction
        fields = (
            'id', 'bank_account', 'bank_account_name',
            'date', 'description', 'amount', 'type', 'status',
            'department', 'suggested_ledger', 'suggested_ledger_name',
            'journal_entry_id', 'unique_hash', 'created_at',
        )


class BulkSettlementSerializer(serializers.ModelSerializer):
    settlement_account_name = serializers.CharField(
        source='settlement_account.name', read_only=True
    )
    # Resolve the Outstanding objects for the detail view
    items = serializers.SerializerMethodField()

    class Meta:
        model = BulkSettlement
        fields = (
            'id', 'label', 'settlement_account', 'settlement_account_name',
            'settlement_date', 'total_amount', 'items_count',
            'outstanding_ids', 'notes', 'created_at', 'items',
        )

    def get_items(self, obj):
        qs = Outstanding.objects.filter(pk__in=obj.outstanding_ids)
        return OutstandingSerializer(qs, many=True).data
