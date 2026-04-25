from django.db import models


class Ledger(models.Model):
    class LedgerType(models.TextChoices):
        ASSET = 'asset', 'Asset'
        LIABILITY = 'liability', 'Liability'
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    name = models.CharField(max_length=120, unique=True)
    type = models.CharField(max_length=20, choices=LedgerType.choices)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.type})'


class JournalEntry(models.Model):
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    import_hash = models.CharField(max_length=64, blank=True, null=True, unique=True, db_index=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'JournalEntry #{self.pk} - {self.date}'


class JournalItem(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='items')
    ledger = models.ForeignKey(Ledger, on_delete=models.PROTECT, related_name='journal_items')
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Detailed fields from the comprehensive form
    department = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    vendor_payee = models.CharField(max_length=150, blank=True, null=True)
    bill_date = models.DateField(blank=True, null=True)
    ref_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(debit__gte=0) & models.Q(credit__gte=0),
                name='accounting_journalitem_non_negative_amounts',
            ),
            models.CheckConstraint(
                check=~(models.Q(debit=0) & models.Q(credit=0)),
                name='accounting_journalitem_not_both_zero',
            ),
            models.CheckConstraint(
                check=models.Q(debit=0) | models.Q(credit=0),
                name='accounting_journalitem_single_sided',
            ),
        ]

    def __str__(self):
        return f'Item #{self.pk} entry={self.entry_id} ledger={self.ledger_id}'


class PendingExpense(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    employee_name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    # Maps to an expense-type Ledger (e.g. Travel, Salary)
    category = models.ForeignKey(
        'Ledger',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_expenses',
    )
    description = models.TextField(blank=True, default='')

    # Identity from the external expense system
    source_id = models.CharField(max_length=200, unique=True)
    source = models.CharField(max_length=100, default='external_app')

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Set once the expense is approved and a journal entry is created
    journal_entry = models.OneToOneField(
        'JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_expense',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'PendingExpense #{self.pk} – {self.employee_name} ({self.status})'


class JournalItemAttachment(models.Model):
    journal_item = models.ForeignKey(JournalItem, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='journal_receipts/%Y/%m/')
    name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Attachment {self.name} for item {self.journal_item_id}'


class Account(models.Model):
    class AccountType(models.TextChoices):
        BANK = 'bank', 'Bank'
        CASH = 'cash', 'Cash'
        WALLET = 'wallet', 'Wallet'

    name = models.CharField(max_length=120, unique=True)
    type = models.CharField(max_length=20, choices=AccountType.choices)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.type})'

    def get_or_create_ledger(self):
        ledger, created = Ledger.objects.get_or_create(
            name=f'{self.name} Account',
            defaults={'type': Ledger.LedgerType.ASSET}
        )
        return ledger


class Expense(models.Model):
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.ForeignKey(Ledger, on_delete=models.PROTECT, related_name='expenses')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='expenses')
    date = models.DateField()
    description = models.TextField()
    department = models.CharField(max_length=100, blank=True, null=True)
    receipt = models.FileField(upload_to='expenses/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    journal_entry = models.OneToOneField(JournalEntry, on_delete=models.CASCADE, null=True, blank=True, related_name='expense')

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'Expense #{self.pk} - {self.amount} on {self.date}'


class Income(models.Model):
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.ForeignKey(Ledger, on_delete=models.PROTECT, related_name='incomes')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='incomes')
    date = models.DateField()
    description = models.TextField()
    department = models.CharField(max_length=100, blank=True, null=True)
    receipt = models.FileField(upload_to='incomes/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    journal_entry = models.OneToOneField(
        JournalEntry, on_delete=models.CASCADE, null=True, blank=True, related_name='income'
    )

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'Income #{self.pk} - {self.amount} on {self.date}'


class Outstanding(models.Model):
    class OutstandingType(models.TextChoices):
        RECEIVABLE = 'receivable', 'Receivable'
        PAYABLE = 'payable', 'Payable'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'

    type = models.CharField(max_length=20, choices=OutstandingType.choices)
    party_name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    linked_journal = models.ForeignKey(
        JournalEntry, on_delete=models.PROTECT, related_name='outstandings', null=True, blank=True
    )
    settlement_journal = models.ForeignKey(
        JournalEntry, on_delete=models.PROTECT, related_name='settlements', null=True, blank=True
    )
    settlement_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='settled_outstandings'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    description = models.TextField(blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type.capitalize()} #{self.pk} - {self.party_name} ({self.amount})'


class OutstandingReceipt(models.Model):
    outstanding = models.ForeignKey(Outstanding, on_delete=models.CASCADE, related_name='receipts')
    file = models.FileField(upload_to='receipts/outstandings/')
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Receipt for {self.outstanding} - {self.filename}'


class Invoice(models.Model):
    class InvoiceType(models.TextChoices):
        SALES    = 'sales',    'Sales Invoice'
        PURCHASE = 'purchase', 'Purchase Bill'

    class Status(models.TextChoices):
        PENDING  = 'pending',  'Pending'
        SETTLED  = 'settled',  'Settled'

    type         = models.CharField(max_length=20, choices=InvoiceType.choices)
    party_name   = models.CharField(max_length=200)
    amount       = models.DecimalField(max_digits=14, decimal_places=2)
    department   = models.CharField(max_length=100, blank=True, default='')
    due_date     = models.DateField(blank=True, null=True)
    description  = models.TextField(blank=True, default='')
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Created immediately on invoice creation (receivable or payable)
    outstanding  = models.OneToOneField(
        Outstanding,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='invoice',
    )

    # Created only at settlement
    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='invoice',
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_type_display()} #{self.pk} – {self.party_name} ₹{self.amount} ({self.status})'

# ---------------------------------------------------------------------------
# Banking Module
# ---------------------------------------------------------------------------

class BankAccount(models.Model):
    name = models.CharField(max_length=120)
    bank_name = models.CharField(max_length=120, blank=True, default='')
    account_number = models.CharField(max_length=50, blank=True, default='')
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    # Optional link to a Ledger so journal entries auto-use it
    ledger = models.OneToOneField(
        'Ledger',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bank_account',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.bank_name})'


class BankTransaction(models.Model):
    class TxType(models.TextChoices):
        DEBIT = 'debit', 'Debit'
        CREDIT = 'credit', 'Credit'

    class Status(models.TextChoices):
        UNPROCESSED = 'unprocessed', 'Unprocessed'
        PROCESSED = 'processed', 'Processed'
        IGNORED = 'ignored', 'Ignored'

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    description = models.TextField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)  # always positive
    type = models.CharField(max_length=10, choices=TxType.choices)  # debit/credit
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPROCESSED)

    department = models.CharField(max_length=100, blank=True, null=True)
    suggested_ledger = models.ForeignKey(
        'Ledger',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_transactions',
    )
    journal_entry = models.OneToOneField(
        'JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bank_transaction',
    )

    unique_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'BankTx #{self.pk} [{self.type}] {self.amount} on {self.date}'
