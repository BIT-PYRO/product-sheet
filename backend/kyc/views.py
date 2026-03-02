from rest_framework.viewsets import ModelViewSet

from .models import KYCRecord
from .serializers import KYCRecordSerializer


class KYCRecordViewSet(ModelViewSet):
	queryset = KYCRecord.objects.all().order_by('-created_at')
	serializer_class = KYCRecordSerializer
	filterset_fields = ['member', 'status']
	search_fields = ['member__full_name', 'id_number']
