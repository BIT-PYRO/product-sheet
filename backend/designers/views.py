from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature

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
    audit_sheet = 'designer'
    queryset = DesignerSheet.objects.all().order_by('-created_at')
    serializer_class = DesignerSheetSerializer
    permission_classes = [IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'designer-sheet'
    filterset_fields = ['is_active', 'sku']
    search_fields = ['sku', 'motive_code', 'motive_sku']

    def get_serializer_class(self):
        if self.action == 'list':
            from .serializers import DesignerSheetListSerializer
            return DesignerSheetListSerializer
        return DesignerSheetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            qs = qs.defer(
                'rendered_photo', 'technical_drawing', 'designer_image_2', 'designer_image_3',
                'image', 'tdm_file', 'stl_file', 'tdm_status', 'stl_status',
                'render_status', 'print_3d_status', 'die_entries',
            )
        return qs

    @extend_schema(summary='Upload photo for designer sheet', tags=['Designers'])
    @action(detail=True, methods=['post'], url_path='upload-photo', parser_classes=[MultiPartParser])
    def upload_photo(self, request, pk=None):
        from common.image_upload import upload_image_file

        designer = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'success': False, 'message': 'No image file provided.'}, status=400)

        allowed_types = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
        if image_file.content_type not in allowed_types:
            return Response({'success': False, 'message': 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.'}, status=400)

        field = request.query_params.get('field', 'rendered_photo')
        if field not in ('rendered_photo', 'technical_drawing', 'designer_image_3'):
            return Response({'success': False, 'message': 'Invalid field parameter.'}, status=400)

        try:
            sku_safe = (designer.sku or str(designer.pk)).replace('/', '-').replace(' ', '-').strip('-') or str(designer.pk)
            image_url = upload_image_file(image_file, folder=f'designers/{sku_safe}', public_id=field)
        except Exception as exc:
            return Response({'success': False, 'message': f'Upload failed: {exc}'}, status=500)

        setattr(designer, field, image_url)
        designer.save(update_fields=[field])

        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(request, ActivityLog.ACTION_UPLOAD, 'designer', designer, extra={'field': field, 'url': image_url})
        except Exception:
            pass

        return Response({'success': True, 'data': {'url': image_url, 'field': field}})
