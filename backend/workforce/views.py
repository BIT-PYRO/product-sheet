from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import WorkforceMember
from .serializers import WorkforceMemberSerializer


@extend_schema_view(
	list=extend_schema(summary='List workforce members', tags=['Workforce']),
	retrieve=extend_schema(summary='Get workforce member details', tags=['Workforce']),
	create=extend_schema(summary='Create workforce member', tags=['Workforce']),
	update=extend_schema(summary='Update workforce member', tags=['Workforce']),
	partial_update=extend_schema(summary='Partially update workforce member', tags=['Workforce']),
	destroy=extend_schema(summary='Delete workforce member', tags=['Workforce']),
)
class WorkforceMemberViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = WorkforceMember.objects.all().order_by('-created_at')
	serializer_class = WorkforceMemberSerializer
	filterset_fields = ['active']
	search_fields = ['full_name', 'phone']
