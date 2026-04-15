from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api import api_success

from .models import Ledger
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
        return api_success(data, message='Journal entry created successfully.', status_code=201)
