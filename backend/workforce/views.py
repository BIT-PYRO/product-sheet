from rest_framework.viewsets import ModelViewSet

from .models import WorkforceMember
from .serializers import WorkforceMemberSerializer


class WorkforceMemberViewSet(ModelViewSet):
	queryset = WorkforceMember.objects.all().order_by('-created_at')
	serializer_class = WorkforceMemberSerializer
	filterset_fields = ['active']
	search_fields = ['full_name', 'phone']
