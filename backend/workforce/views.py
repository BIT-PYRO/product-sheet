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
		# Idempotent create: if a record with the same email or username already exists, return it
		email = (serializer.validated_data.get('email') or '').strip().lower()
		username = (serializer.validated_data.get('username') or '').strip().lower()
		existing = None
		if email:
			existing = WorkforceMember.objects.filter(email__iexact=email).first()
		if not existing and username:
			existing = WorkforceMember.objects.filter(username__iexact=username).first()
		if existing:
			# Raise to signal "already exists" — caller gets existing record via list API
			from rest_framework.exceptions import ValidationError
			raise ValidationError({'detail': 'already_exists', 'id': existing.id})
		instance = serializer.save()
		sync_member_permissions(instance)

	def perform_update(self, serializer):
		from django.contrib.auth import get_user_model
		old = self.get_object()
		old_designation = old.designation
		old_department = old.department
		old_active = old.active
		instance = serializer.save()
		# Re-sync permissions if designation or department changed — only for active members
		if instance.active and (instance.designation != old_designation or instance.department != old_department):
			sync_member_permissions(instance)
		# Sync Django User.is_active and permissions when workforce active flag changes
		if instance.active != old_active:
			if instance.email:
				User = get_user_model()
				email = instance.email.strip().lower()
				user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
				if user:
					user.is_active = bool(instance.active)
					user.save(update_fields=['is_active'])
			if not instance.active:
				# Revoke: wipe all permissions so no sheet access remains
				instance.permissions = {}
				instance.save(update_fields=['permissions'])
			else:
				# Restore: reload permissions from role defaults
				sync_member_permissions(instance)

	@extend_schema(summary='Upload or update profile photo for a workforce member', tags=['Workforce'])
	@action(detail=True, methods=['post'], url_path='upload-photo')
	def upload_photo(self, request, pk=None):
		try:
			from common.image_upload import upload_image_base64, upload_image_file
			member = self.get_object()
			photo_data = request.data.get('photo_data', '')
			if photo_data and str(photo_data).startswith('data:image/'):
				url = upload_image_base64(photo_data, folder=f'profiles/{member.id}', public_id='avatar')
			elif 'photo' in request.FILES:
				url = upload_image_file(request.FILES['photo'], folder=f'profiles/{member.id}', public_id='avatar')
			else:
				return Response({'success': False, 'message': 'No photo provided.'}, status=400)
			if not url:
				return Response({'success': False, 'message': 'Photo upload failed. Please try a different image (JPEG or PNG).'}, status=400)
			member.profile_photo_url = url
			member.save(update_fields=['profile_photo_url'])
			return Response({'success': True, 'data': {'profile_photo_url': url}, 'message': 'Photo uploaded successfully.'})
		except Exception as exc:
			logger.exception('upload_photo unexpected error for pk=%s', pk)
			return Response({'success': False, 'message': f'Server error: {exc}'}, status=500)

	@extend_schema(summary='Upload identity document (Aadhaar or PAN) for a workforce member', tags=['Workforce'])
	@action(detail=True, methods=['post'], url_path='upload-document')
	def upload_document(self, request, pk=None):
		try:
			from common.image_upload import upload_document_base64, upload_document_file
			member = self.get_object()
			doc_type = str(request.data.get('doc_type', '')).strip().lower()
			if doc_type not in ('aadhaar', 'pan'):
				return Response({'success': False, 'message': 'doc_type must be "aadhaar" or "pan".'}, status=400)
			photo_data = request.data.get('photo_data', '')
			folder = f'documents/{member.id}'
			if photo_data and str(photo_data).startswith('data:'):
				url, err = upload_document_base64(photo_data, folder=folder, public_id=doc_type)
			elif 'document' in request.FILES:
				url, err = upload_document_file(request.FILES['document'], folder=folder, public_id=doc_type)
			else:
				return Response({'success': False, 'message': 'No document provided.'}, status=400)
			if not url:
				return Response({'success': False, 'message': f'Upload failed: {err or "Unknown error"}'}, status=400)
			if doc_type == 'aadhaar':
				member.aadhaar_url = url
				member.save(update_fields=['aadhaar_url'])
			else:
				member.pan_url = url
				member.save(update_fields=['pan_url'])
			return Response({'success': True, 'data': {'url': url, 'doc_type': doc_type}, 'message': f'{doc_type.upper()} document uploaded successfully.'})
		except Exception as exc:
			logger.exception('upload_document unexpected error for pk=%s', pk)
			return Response({'success': False, 'message': f'Server error: {exc}'}, status=500)

	@extend_schema(summary='Delete identity document (Aadhaar or PAN) for a workforce member', tags=['Workforce'])
	@action(detail=True, methods=['post'], url_path='delete-document')
	def delete_document(self, request, pk=None):
		try:
			member = self.get_object()
			doc_type = str(request.data.get('doc_type', '')).strip().lower()
			if doc_type not in ('aadhaar', 'pan'):
				return Response({'success': False, 'message': 'doc_type must be "aadhaar" or "pan".'}, status=400)

			if doc_type == 'aadhaar':
				member.aadhaar_url = ''
				member.save(update_fields=['aadhaar_url'])
			else:
				member.pan_url = ''
				member.save(update_fields=['pan_url'])

			return Response({'success': True, 'data': {'doc_type': doc_type}, 'message': f'{doc_type.upper()} document deleted successfully.'})
		except Exception as exc:
			logger.exception('delete_document unexpected error for pk=%s', pk)
			return Response({'success': False, 'message': f'Server error: {exc}'}, status=500)

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

		def _ci_dedup(values):
			"""Return sorted unique values, case-insensitively deduplicated."""
			seen: dict[str, str] = {}
			for v in sorted(values):
				key = v.strip().lower()
				if key and key not in seen:
					seen[key] = v.strip()
			return sorted(seen.values(), key=lambda x: x.lower())

		all_depts = _ci_dedup(member_depts | perm_depts)
		all_roles = _ci_dedup(member_roles | perm_roles)

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
