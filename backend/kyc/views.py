from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import KYCRecord
from .serializers import KYCRecordSerializer


@extend_schema_view(
	list=extend_schema(summary='List KYC records', tags=['KYC']),
	retrieve=extend_schema(summary='Get KYC record details', tags=['KYC']),
	create=extend_schema(summary='Create KYC record', tags=['KYC']),
	update=extend_schema(summary='Update KYC record', tags=['KYC']),
	partial_update=extend_schema(summary='Partially update KYC record', tags=['KYC']),
	destroy=extend_schema(summary='Delete KYC record', tags=['KYC']),
)
class KYCRecordViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'kyc'
	queryset = KYCRecord.objects.all().order_by('-created_at')
	serializer_class = KYCRecordSerializer
	filterset_fields = ['member', 'status']
	search_fields = ['member__full_name', 'id_number']

	def perform_create(self, serializer):
		serializer.save(
			tenant=(getattr(self.request, 'tenant', None) or (getattr(self.request.user, 'tenant', None) if self.request.user and self.request.user.is_authenticated else None)),
			company=(getattr(self.request, 'company', None) or (getattr(self.request.user, 'active_company', None) if self.request.user and self.request.user.is_authenticated else None)),
		)
