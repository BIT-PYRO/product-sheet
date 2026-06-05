from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature

from .models import Draft
from .serializers import DraftSerializer


@extend_schema_view(
    list=extend_schema(summary='List drafts', tags=['Drafts']),
    retrieve=extend_schema(summary='Get draft details', tags=['Drafts']),
    create=extend_schema(summary='Create draft', tags=['Drafts']),
    update=extend_schema(summary='Update draft', tags=['Drafts']),
    partial_update=extend_schema(summary='Partially update draft', tags=['Drafts']),
    destroy=extend_schema(summary='Delete draft', tags=['Drafts']),
)
class DraftViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
    """CRUD for drafts. Lists are team-visible for authenticated users."""

    serializer_class = DraftSerializer
    permission_classes = [IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'drafts'
    filterset_fields = ["entity_type", "is_submitted"]
    search_fields = ["entity_type"]

    def get_queryset(self):
        return Draft.objects.select_related("owner").order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            tenant=(getattr(self.request, 'tenant', None) or (getattr(self.request.user, 'tenant', None) if self.request.user and self.request.user.is_authenticated else None)),
            company=(getattr(self.request, 'company', None) or (getattr(self.request.user, 'active_company', None) if self.request.user and self.request.user.is_authenticated else None)),
        )

    def _assert_can_modify(self, draft):
        if draft.owner_id != self.request.user.id:
            raise PermissionDenied("You can only modify your own drafts.")

    def perform_update(self, serializer):
        self._assert_can_modify(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_can_modify(instance)
        instance.delete()

    # ---------- custom actions ----------

    @action(detail=True, methods=["post"], url_path="submit")
    @extend_schema(summary='Submit draft', tags=['Drafts'])
    def submit_draft(self, request, pk=None):
        """Mark a draft as submitted (no further edits expected)."""
        draft = self.get_object()
        draft.is_submitted = True
        draft.save(update_fields=["is_submitted"])
        return Response(DraftSerializer(draft).data)

    @action(detail=False, methods=["get"], url_path="resume/(?P<entity_type>[^/.]+)")
    @extend_schema(summary='Resume latest pending draft', tags=['Drafts'])
    def resume(self, request, entity_type=None):
        """Return the latest un-submitted draft for a given entity_type."""
        draft = (
            self.get_queryset()
            .filter(entity_type=entity_type, is_submitted=False)
            .first()
        )
        if draft is None:
            return Response({"detail": "No pending draft found."}, status=404)
        return Response(DraftSerializer(draft).data)
