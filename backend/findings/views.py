from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature

from .models import Finding
from .serializers import FindingSerializer


@extend_schema_view(
    list=extend_schema(summary='List findings', tags=['Findings']),
    retrieve=extend_schema(summary='Get finding details', tags=['Findings']),
    create=extend_schema(summary='Create finding', tags=['Findings']),
    update=extend_schema(summary='Update finding', tags=['Findings']),
    partial_update=extend_schema(summary='Partially update finding', tags=['Findings']),
    destroy=extend_schema(summary='Delete finding', tags=['Findings']),
)
class FindingViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
    audit_sheet = 'finding'
    queryset = Finding.objects.all().order_by('-created_at')
    serializer_class = FindingSerializer
    permission_classes = [IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'finding-sheet'
    filterset_fields = ['is_active', 'finding_code']
    search_fields = ['finding_code']
