import logging
from datetime import date

from django.db import transaction
from django.db.models import Sum

from rest_framework import status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api import api_success

from .models import JournalEntry, JournalItem, Ledger, PendingExpense
from .serializers import (
    ApproveExpenseSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
    LedgerSerializer,
    PendingExpenseSerializer,
)

logger = logging.getLogger(__name__)


class LedgerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = LedgerSerializer(Ledger.objects.all(), many=True)
        return api_success(serializer.data, message='Ledgers fetched successfully.')


class JournalCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JournalEntryCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'message': 'Invalid journal entry data.',
                    'errors': serializer.errors,
                },
                status=400,
            )

        entry = serializer.save()
        data = JournalEntrySerializer(entry).data
        return api_success(
            {**data, 'entry_id': entry.pk},
            message='Journal entry created.',
            status_code=201,
        )


class LedgerSummaryView(APIView):
    """Aggregate debit/credit totals per ledger from all journal items."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        data = [
            {
                'ledger_id': row['ledger__id'],
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'total_debit': str(row['total_debit']),
                'total_credit': str(row['total_credit']),
            }
            for row in summary
        ]

        return api_success(data, message='Ledger summary fetched successfully.')


class TrialBalanceView(APIView):
    """
    GET /api/accounting/trial-balance/

    Computes the trial balance dynamically from JournalItems.
    Each ledger's net balance (total_debit - total_credit) is placed
    on the debit side when positive, credit side when negative.
    Validates that grand total debit == grand total credit.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Aggregate per ledger
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        entries = []
        grand_debit = 0
        grand_credit = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            balance = d - c

            # Positive balance → debit side; negative → credit side
            if balance >= 0:
                debit_val = round(balance, 2)
                credit_val = 0
            else:
                debit_val = 0
                credit_val = round(abs(balance), 2)

            grand_debit += debit_val
            grand_credit += credit_val

            entries.append({
                'ledger_id': row['ledger__id'],
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'debit': debit_val,
                'credit': credit_val,
            })

        grand_debit = round(grand_debit, 2)
        grand_credit = round(grand_credit, 2)
        is_balanced = grand_debit == grand_credit

        if not is_balanced:
            import logging
            logging.getLogger(__name__).warning(
                'Trial balance mismatch: debit=%s credit=%s', grand_debit, grand_credit
            )

        return api_success(
            {
                'entries': entries,
                'total_debit': grand_debit,
                'total_credit': grand_credit,
                'is_balanced': is_balanced,
            },
            message='Trial balance fetched successfully.',
        )


class ProfitLossView(APIView):
    """
    GET /api/accounting/profit-loss/

    Computes Profit & Loss from JournalItems.
    Income ledgers: balance = credit - debit
    Expense ledgers: balance = debit - credit
    Profit = total_income - total_expense
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        income_items = []
        expense_items = []
        total_income = 0
        total_expense = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']

            if ledger_type == 'income':
                # Income: credit side minus debit side
                balance = round(c - d, 2)
                income_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_income += balance

            elif ledger_type == 'expense':
                # Expense: debit side minus credit side
                balance = round(d - c, 2)
                expense_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_expense += balance

        total_income = round(total_income, 2)
        total_expense = round(total_expense, 2)
        profit = round(total_income - total_expense, 2)

        return api_success(
            {
                'income': income_items,
                'expenses': expense_items,
                'total_income': total_income,
                'total_expense': total_expense,
                'profit': profit,
            },
            message='Profit & Loss statement fetched successfully.',
        )


# ── Shared helper: aggregate JournalItems per ledger ──────────────
def _ledger_aggregates():
    """Return queryset of ledger-level debit/credit totals."""
    return (
        JournalItem.objects
        .values('ledger__id', 'ledger__name', 'ledger__type')
        .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
        .order_by('ledger__name')
    )


def _compute_profit():
    """Calculate net profit from income & expense ledgers (P&L logic)."""
    total_income = 0
    total_expense = 0
    for row in _ledger_aggregates():
        d = float(row['total_debit'] or 0)
        c = float(row['total_credit'] or 0)
        if row['ledger__type'] == 'income':
            total_income += c - d
        elif row['ledger__type'] == 'expense':
            total_expense += d - c
    return round(total_income - total_expense, 2)


class BalanceSheetView(APIView):
    """
    GET /api/accounting/balance-sheet/

    Assets  = debit - credit   (for asset-type ledgers)
    Liabilities = credit - debit (for liability-type ledgers)
    Equity  = net profit from P&L (income - expense)

    Verifies: total_assets == total_liabilities + equity
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = _ledger_aggregates()

        asset_items = []
        liability_items = []
        total_assets = 0
        total_liabilities = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']

            if ledger_type == 'asset':
                balance = round(d - c, 2)
                asset_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_assets += balance

            elif ledger_type == 'liability':
                balance = round(c - d, 2)
                liability_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_liabilities += balance

        total_assets = round(total_assets, 2)
        total_liabilities = round(total_liabilities, 2)

        # Equity = retained profit (income − expense)
        equity = _compute_profit()

        # Accounting equation check
        is_balanced = total_assets == round(total_liabilities + equity, 2)

        return api_success(
            {
                'assets': asset_items,
                'liabilities': liability_items,
                'equity': equity,
                'total_assets': total_assets,
                'total_liabilities': total_liabilities,
                'is_balanced': is_balanced,
            },
            message='Balance sheet fetched successfully.',
        )


# ═══════════════════════════════════════════════════════════════════
# PENDING EXPENSE SYSTEM
# ═══════════════════════════════════════════════════════════════════

# ── Mock external API data ──────────────────────────────────────────
# Replace EXTERNAL_API_URL with the real URL once the other team
# provides it. Keep MOCK_EXPENSES as a fallback / test dataset.
EXTERNAL_API_URL = None   # e.g. 'https://expense-app.example.com/api/expenses/'
MOCK_EXPENSES = [
    {'id': 'EXP001', 'employee': 'Rahul Sharma', 'amount': 1500, 'category': 'Travel', 'description': 'Client meeting travel'},
    {'id': 'EXP002', 'employee': 'Priya Verma', 'amount': 3200, 'category': 'Marketing', 'description': 'Digital ads campaign'},
    {'id': 'EXP003', 'employee': 'Amit Singh', 'amount': 800,  'category': 'Meals',     'description': 'Team lunch'},
    {'id': 'EXP004', 'employee': 'Neha Gupta', 'amount': 5000, 'category': 'Salary',    'description': 'Freelancer payment'},
    {'id': 'EXP005', 'employee': 'Rohit Das',  'amount': 1200, 'category': 'Rent',      'description': 'Office supplies'},
]


def _fetch_external_expenses():
    """
    Fetch raw expense dicts from the external system.
    Swap EXTERNAL_API_URL once the other team shares it.
    """
    if EXTERNAL_API_URL:
        import urllib.request, json as _json
        with urllib.request.urlopen(EXTERNAL_API_URL, timeout=10) as resp:
            return _json.loads(resp.read())
    # Fallback: use mock data for development / testing
    return MOCK_EXPENSES


class PendingExpenseListView(APIView):
    """
    GET /api/accounting/pending-expenses/
    Query params: status (optional), e.g. ?status=pending
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PendingExpense.objects.select_related('category').all()

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = PendingExpenseSerializer(qs, many=True)
        return api_success(serializer.data, message='Pending expenses fetched.')


class PendingExpenseSyncView(APIView):
    """
    POST /api/accounting/pending-expenses/sync/
    Pulls expenses from the external system and upserts them as pending.
    Source_id deduplication prevents double-imports.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            raw_expenses = _fetch_external_expenses()
        except Exception as exc:
            logger.error('Failed to fetch external expenses: %s', exc)
            return Response(
                {'success': False, 'message': f'External API error: {exc}'},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )

        created_count = 0
        skipped_count = 0

        for item in raw_expenses:
            source_id = str(item.get('id', ''))
            if not source_id:
                continue

            # Try to resolve category string → Ledger (best-effort)
            category_str = item.get('category', '')
            category = Ledger.objects.filter(
                name__iexact=category_str, type='expense'
            ).first()

            _, created = PendingExpense.objects.get_or_create(
                source_id=source_id,
                defaults={
                    'employee_name': item.get('employee', 'Unknown'),
                    'amount': item.get('amount', 0),
                    'category': category,
                    'description': item.get('description', ''),
                    'source': item.get('source', 'external_app'),
                    'status': PendingExpense.Status.PENDING,
                },
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        return api_success(
            {'created': created_count, 'skipped': skipped_count},
            message=f'Sync complete. {created_count} new, {skipped_count} already existed.',
        )


class PendingExpenseApproveView(APIView):
    """
    POST /api/accounting/pending-expenses/{id}/approve/
    Body: { "payment_ledger": <ledger_id> }
    Creates a double-entry journal and marks the expense approved.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            expense = PendingExpense.objects.select_related('category').get(pk=pk)
        except PendingExpense.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Expense not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if expense.status != PendingExpense.Status.PENDING:
            return Response(
                {'success': False, 'message': f'Expense is already {expense.status}.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        if not expense.category:
            return Response(
                {'success': False, 'message': 'Expense has no category ledger. Assign one before approving.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveExpenseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid input.', 'errors': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        payment_ledger = serializer.validated_data['payment_ledger']

        with transaction.atomic():
            # Create journal entry
            entry = JournalEntry.objects.create(
                date=date.today(),
                description=f'Expense by {expense.employee_name}: {expense.description or expense.category.name}',
            )
            # Debit the expense ledger (cost incurred)
            JournalItem.objects.create(
                entry=entry,
                ledger=expense.category,
                debit=expense.amount,
                credit=0,
            )
            # Credit the payment ledger (cash / bank / wallet going out)
            JournalItem.objects.create(
                entry=entry,
                ledger=payment_ledger,
                debit=0,
                credit=expense.amount,
            )
            # Mark approved
            expense.status = PendingExpense.Status.APPROVED
            expense.journal_entry = entry
            expense.save(update_fields=['status', 'journal_entry', 'updated_at'])

        logger.info(
            'Expense #%s approved → JournalEntry #%s (₹%s)',
            expense.pk, entry.pk, expense.amount,
        )
        return api_success(
            {'expense_id': expense.pk, 'journal_entry_id': entry.pk},
            message='Expense approved and journal entry created.',
        )


class PendingExpenseRejectView(APIView):
    """
    POST /api/accounting/pending-expenses/{id}/reject/
    Marks the expense as rejected. No journal entry is created.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            expense = PendingExpense.objects.get(pk=pk)
        except PendingExpense.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Expense not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if expense.status != PendingExpense.Status.PENDING:
            return Response(
                {'success': False, 'message': f'Expense is already {expense.status}.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        expense.status = PendingExpense.Status.REJECTED
        expense.save(update_fields=['status', 'updated_at'])

        return api_success(
            {'expense_id': expense.pk},
            message='Expense rejected.',
        )
