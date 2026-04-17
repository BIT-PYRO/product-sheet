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
