from django.db.models import Sum

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api import api_success

from .models import JournalItem, Ledger
from .serializers import JournalEntryCreateSerializer, JournalEntrySerializer, LedgerSerializer


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
