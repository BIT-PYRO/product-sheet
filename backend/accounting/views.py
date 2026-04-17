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
