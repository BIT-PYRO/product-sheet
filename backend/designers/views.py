from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import DesignerSheet
from .serializers import DesignerSheetSerializer


@extend_schema_view(
    list=extend_schema(summary='List designer sheets', tags=['Designers']),
    retrieve=extend_schema(summary='Get designer sheet details', tags=['Designers']),
    create=extend_schema(summary='Create designer sheet', tags=['Designers']),
    update=extend_schema(summary='Update designer sheet', tags=['Designers']),
    partial_update=extend_schema(summary='Partially update designer sheet', tags=['Designers']),
    destroy=extend_schema(summary='Delete designer sheet', tags=['Designers']),
)
class DesignerSheetViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
    queryset = DesignerSheet.objects.all().order_by('-created_at')
    serializer_class = DesignerSheetSerializer
    filterset_fields = ['is_active', 'sku']
    search_fields = ['sku']
