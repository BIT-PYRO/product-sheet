from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import WorkforceMember
from .serializers import WorkforceMemberSerializer
from .services.permission_sync import sync_member_permissions


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
	search_fields = ['full_name', 'phone', 'email', 'department']

	def perform_create(self, serializer):
		instance = serializer.save()
		sync_member_permissions(instance)

	def perform_update(self, serializer):
		old = self.get_object()
		old_designation = old.designation
		old_department = old.department
		instance = serializer.save()
		# Re-sync permissions if designation or department changed
		if instance.designation != old_designation or instance.department != old_department:
			sync_member_permissions(instance)

	@extend_schema(summary='Get unique departments, designations and role-dept pairs', tags=['Workforce'])
	@action(detail=False, methods=['get'], url_path='meta')
	def meta(self, request):
		"""Return all unique departments and designations present in the data.

		Combines values from WorkforceMember records and RoleDefaultPermissions
		so that custom "Other" entries are always returned.
		"""
		from accounts.models import RoleDefaultPermissions

		member_depts = set(
			WorkforceMember.objects.exclude(department='')
			.values_list('department', flat=True)
			.distinct()
		)
		member_roles = set(
			WorkforceMember.objects.exclude(designation='')
			.values_list('designation', flat=True)
			.distinct()
		)

		perm_pairs = list(RoleDefaultPermissions.objects.values_list('role', 'department'))
		perm_depts = {d for _, d in perm_pairs if d}
		perm_roles = {r for r, _ in perm_pairs if r}

		all_depts = sorted(member_depts | perm_depts)
		all_roles = sorted(member_roles | perm_roles)

		return Response({
			'success': True,
			'data': {
				'departments': all_depts,
				'designations': all_roles,
				'role_dept_pairs': [{'role': r, 'department': d} for r, d in perm_pairs],
			},
		})

	@extend_schema(summary='Add a custom department', tags=['Workforce'])
	@action(detail=False, methods=['post'], url_path='departments')
	def add_department(self, request):
		from accounts.models import RoleDefaultPermissions
		name = str(request.data.get('name', '')).strip()
		if not name:
			return Response({'success': False, 'message': 'Department name is required.'}, status=400)
		_, created = RoleDefaultPermissions.objects.get_or_create(role='', department=name)
		return Response({'success': True, 'message': 'Department saved.', 'data': {'name': name, 'created': created}})
