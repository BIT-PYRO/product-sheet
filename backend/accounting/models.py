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

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'JournalEntry #{self.pk} - {self.date}'


class JournalItem(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='items')
    ledger = models.ForeignKey(Ledger, on_delete=models.PROTECT, related_name='journal_items')
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)

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
