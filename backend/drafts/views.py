from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Draft
from .serializers import DraftSerializer


class DraftViewSet(ModelViewSet):
    """CRUD for drafts — scoped to the authenticated owner."""

    serializer_class = DraftSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["entity_type", "is_submitted"]
    search_fields = ["entity_type"]

    def get_queryset(self):
        return Draft.objects.filter(owner=self.request.user).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # ---------- custom actions ----------

    @action(detail=True, methods=["post"], url_path="submit")
    def submit_draft(self, request, pk=None):
        """Mark a draft as submitted (no further edits expected)."""
        draft = self.get_object()
        draft.is_submitted = True
        draft.save(update_fields=["is_submitted"])
        return Response(DraftSerializer(draft).data)

    @action(detail=False, methods=["get"], url_path="resume/(?P<entity_type>[^/.]+)")
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
