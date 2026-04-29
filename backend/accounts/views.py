
from django.conf import settings
from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiExample, extend_schema
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import RoleDefaultPermissions

from common.api import api_success
from workforce.models import WorkforceMember

from .serializers import RoleDefaultPermissionsSerializer, UserSerializer


class LoginView(TokenObtainPairView):
	permission_classes = [AllowAny]
	@extend_schema(
		summary='Login and receive JWT tokens',
		tags=['Auth'],
		examples=[
			OpenApiExample(
				'Login request',
				value={'username': 'review_admin', 'password': 'Review@123'},
				request_only=True,
			),
			OpenApiExample(
				'Login success response',
				value={
					'success': True,
					'message': 'Login successful.',
					'data': {'access': '<jwt-access-token>', 'refresh': '<jwt-refresh-token>'},
				},
				response_only=True,
			),
		],
	)
	def post(self, request, *args, **kwargs):
		response = super().post(request, *args, **kwargs)
		if response.status_code >= 400:
			return response
		return api_success(response.data, message='Login successful.')


class RefreshTokenView(TokenRefreshView):
	permission_classes = [AllowAny]
	@extend_schema(
		summary='Refresh JWT access token',
		tags=['Auth'],
		examples=[
			OpenApiExample(
				'Refresh request',
				value={'refresh': '<jwt-refresh-token>'},
				request_only=True,
			),
			OpenApiExample(
				'Refresh success response',
				value={
					'success': True,
					'message': 'Token refreshed successfully.',
					'data': {'access': '<jwt-access-token>'},
				},
				response_only=True,
			),
		],
	)
	def post(self, request, *args, **kwargs):
		response = super().post(request, *args, **kwargs)
		if response.status_code >= 400:
			return response
		return api_success(response.data, message='Token refreshed successfully.')


class MeView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(summary='Get current user profile', tags=['Auth'])
	def get(self, request):
		serializer = UserSerializer(request.user)
		return api_success(serializer.data, message='Authenticated user profile fetched successfully.')

	@extend_schema(summary='Update current user profile', tags=['Auth'])
	def patch(self, request):
		allowed_fields = {'first_name', 'last_name'}
		data = {k: v for k, v in request.data.items() if k in allowed_fields}
		serializer = UserSerializer(request.user, data=data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return api_success(serializer.data, message='Profile updated successfully.')
		return api_success(serializer.errors, message='Invalid data.', status_code=400)


class GoogleLoginView(APIView):
	permission_classes = [AllowAny]

	@extend_schema(summary='Login via Google ID token (SSO)', tags=['Auth'])
	def post(self, request):
		token = request.data.get('id_token', '').strip()
		if not token:
			from rest_framework.response import Response
			return Response({'success': False, 'message': 'id_token is required.'}, status=400)

		try:
			idinfo = id_token.verify_oauth2_token(
				token,
				google_requests.Request(),
				settings.GOOGLE_CLIENT_ID,
			)
		except ValueError as e:
			from rest_framework.response import Response
			return Response({'success': False, 'message': f'Invalid Google token: {e}'}, status=401)

		email = idinfo.get('email', '')
		first_name = idinfo.get('given_name', '')
		last_name = idinfo.get('family_name', '')
		full_name = idinfo.get('name', f'{first_name} {last_name}'.strip())
		picture = idinfo.get('picture', '')

		if not email:
			from rest_framework.response import Response
			return Response({'success': False, 'message': 'Google account has no email.'}, status=400)

		User = get_user_model()
		# Look up by email field first so existing accounts (e.g. superusers) are matched.
		user = User.objects.filter(email=email).first()
		created = False
		if user is None:
			# Use filter+create instead of get_or_create to avoid MultipleObjectsReturned
			# when a duplicate username=email row exists alongside an email= row.
			existing_by_username = User.objects.filter(username=email).first()
			if existing_by_username:
				user = existing_by_username
			else:
				user = User(
					username=email,
					email=email,
					first_name=first_name,
					last_name=last_name,
				)
				user.set_unusable_password()
				user.save()
				created = True

		# Ensure the Django account is active (it may have been deactivated while a duplicate
		# workforce record existed; we re-check against the workforce record below).
		needs_save = False
		if not user.is_active:
			user.is_active = True
			needs_save = True
		if needs_save:
			user.save(update_fields=['is_active'])

		# Safe workforce member lookup — filter instead of get_or_create to avoid
		# MultipleObjectsReturned when duplicate enrollments share the same email.
		wf = WorkforceMember.objects.filter(email__iexact=email).first()
		if wf is None:
			wf = WorkforceMember.objects.create(email=email, full_name=full_name)

		# Block revoked members before issuing tokens.
		if wf.active is False:
			return Response(
				{
					'success': False,
					'message': (
						'Your access has been revoked. Please contact an administrator to restore access.'
					),
				},
				status=403,
			)

		# Re-sync is_active in case it was deactivated while workforce was also revoked
		# but both have since been restored independently.
		if not user.is_active:
			user.is_active = True
			user.save(update_fields=['is_active'])

		refresh = RefreshToken.for_user(user)
		return api_success(
			{
				'access': str(refresh.access_token),
				'refresh': str(refresh),
				'user': {
					'email': email,
					'full_name': full_name,
					'picture': picture,
					'is_new': created,
				},
			},
			message='Google login successful.',
		)





class ApproveUserView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(summary='Approve or revoke a user by email', tags=['Auth'])
	def post(self, request):
		is_privileged = (
			getattr(request.user, 'role', None) in ['admin', 'manager']
			or getattr(request.user, 'is_superuser', False)
		)
		if not is_privileged:
			return Response({'success': False, 'message': 'Not authorized.'}, status=403)

		email = str(request.data.get('email', '')).strip().lower()
		is_approved = request.data.get('is_approved')

		if not email or is_approved is None:
			return Response({'success': False, 'message': 'Email and is_approved are required.'}, status=400)

		User = get_user_model()
		user = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
		if not user:
			return Response({'success': False, 'message': 'User not found.'}, status=404)

		user.is_approved = bool(is_approved)
		user.save(update_fields=['is_approved'])
		return api_success({'email': email, 'is_approved': user.is_approved}, message='User approval updated.')


class SetCredentialsView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(summary='Set username and password for the authenticated user', tags=['Auth'])
	def post(self, request):
		new_username = str(request.data.get('username', '')).strip()
		new_password = str(request.data.get('password', '')).strip()

		if not new_username or not new_password:
			return Response({'success': False, 'message': 'Username and password are required.'}, status=400)

		if len(new_username) < 3:
			return Response({'success': False, 'message': 'Username must be at least 3 characters.'}, status=400)

		if len(new_password) < 6:
			return Response({'success': False, 'message': 'Password must be at least 6 characters.'}, status=400)

		User = get_user_model()
		if User.objects.filter(username=new_username).exclude(pk=request.user.pk).exists():
			return Response({'success': False, 'message': 'That username is already taken.'}, status=400)

		user = request.user
		old_email = user.email or user.username  # preserve email mapping

		user.username = new_username
		if not user.email:
			user.email = old_email
		user.set_password(new_password)
		user.save()

		return api_success({'username': new_username}, message='Credentials saved successfully.')


class RoleDefaultPermissionsListView(APIView):
	"""GET all three role permission templates (any authenticated user)."""
	permission_classes = [IsAuthenticated]

	@extend_schema(summary='List default permissions for all roles', tags=['Auth'])
	def get(self, request):
		objs = RoleDefaultPermissions.objects.all().order_by('role')
		serializer = RoleDefaultPermissionsSerializer(objs, many=True)
		return api_success(serializer.data, message='Role default permissions fetched.')


class RoleDefaultPermissionsDetailView(APIView):
	"""PATCH to update default permissions for a designation+department pair."""
	permission_classes = [IsAuthenticated]

	def _is_authorized(self, request):
		if request.user.is_superuser or getattr(request.user, 'role', None) == 'admin':
			return True
		try:
			from workforce.models import WorkforceMember
			member = WorkforceMember.objects.filter(user=request.user).first()
			if member and member.designation in ('CEO', 'Chairman', 'Director', 'General Manager'):
				return True
			if member and member.permissions and member.permissions.get('manage_members'):
				return True
		except Exception:
			pass
		return False

	@extend_schema(summary='Update default permissions for a designation+department', tags=['Auth'])
	def patch(self, request, role, department=''):
		if not self._is_authorized(request):
			return Response({'success': False, 'message': 'Not authorized.'}, status=403)

		obj, _ = RoleDefaultPermissions.objects.get_or_create(
			role=role, department=department, defaults={'permissions': {}}
		)
		serializer = RoleDefaultPermissionsSerializer(obj, data=request.data, partial=True)
		if serializer.is_valid():
			serializer.save()
			# Push updated defaults to all matching active workforce members
			from workforce.services.permission_sync import sync_all_members_for_role
			synced = sync_all_members_for_role(role, department)
			return api_success(
				serializer.data,
				message=f'Default permissions for {role}/{department} updated. {synced} member(s) synced.',
			)
		return Response({'success': False, 'errors': serializer.errors}, status=400)


class DeleteUserView(APIView):
	"""Permanently delete a user: removes both the WorkforceMember record and all
	matching Django User records (by email or username). Requires admin/manager/superuser."""

	permission_classes = [IsAuthenticated]

	@extend_schema(summary='Permanently delete a user by workforce_id or email', tags=['Auth'])
	def post(self, request):
		is_privileged = (
			getattr(request.user, 'role', None) in ['admin', 'manager']
			or getattr(request.user, 'is_superuser', False)
		)
		if not is_privileged:
			return Response({'success': False, 'message': 'Not authorized.'}, status=403)

		workforce_id = request.data.get('workforce_id')
		email_param = str(request.data.get('email', '')).strip().lower()

		if not workforce_id and not email_param:
			return Response(
				{'success': False, 'message': 'workforce_id or email is required.'},
				status=400,
			)

		# Resolve email from workforce_id if provided
		email = email_param
		if workforce_id:
			try:
				wf_target = WorkforceMember.objects.get(pk=workforce_id)
				email = (wf_target.email or '').strip().lower() or email
			except WorkforceMember.DoesNotExist:
				return Response({'success': False, 'message': 'Workforce member not found.'}, status=404)

		if not email:
			return Response(
				{'success': False, 'message': 'No email associated with this workforce member.'},
				status=400,
			)

		# Prevent self-deletion
		requester_email = (request.user.email or request.user.username or '').strip().lower()
		if email == requester_email:
			return Response(
				{'success': False, 'message': 'You cannot delete your own account.'},
				status=400,
			)

		User = get_user_model()

		# Delete all workforce members with this email
		wf_deleted, _ = WorkforceMember.objects.filter(email__iexact=email).delete()

		# Delete all Django users with this email (email field OR username field)
		from django.db.models import Q
		user_deleted, _ = User.objects.filter(
			Q(email__iexact=email) | Q(username__iexact=email)
		).delete()

		return api_success(
			{'email': email, 'workforce_deleted': wf_deleted, 'user_deleted': user_deleted},
			message=f'User {email} permanently deleted.',
		)


class MergeUsersView(APIView):
	"""Merge duplicate User and WorkforceMember records that share the same email.
	Keeps the most privileged User record and the most complete WorkforceMember record.
	Requires admin or superuser."""

	permission_classes = [IsAuthenticated]

	@extend_schema(summary='Merge duplicate records for an email address', tags=['Auth'])
	def post(self, request):
		is_privileged = (
			getattr(request.user, 'role', None) in ['admin', 'manager']
			or getattr(request.user, 'is_superuser', False)
		)
		if not is_privileged:
			return Response({'success': False, 'message': 'Not authorized.'}, status=403)

		email = str(request.data.get('email', '')).strip().lower()
		if not email:
			return Response({'success': False, 'message': 'email is required.'}, status=400)

		User = get_user_model()
		from django.db.models import Q

		# ── Merge Django User rows ────────────────────────────────────────────────
		users = list(
			User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
			.order_by('date_joined')
		)
		users_merged = 0
		if len(users) > 1:
			# Keep the most privileged: is_superuser first, then non-STAFF role, then oldest
			def user_priority(u):
				if u.is_superuser:
					return 0
				role = getattr(u, 'role', 'staff')
				if role == 'admin':
					return 1
				if role == 'manager':
					return 2
				return 3

			users.sort(key=user_priority)
			keeper = users[0]
			for dup in users[1:]:
				dup.delete()
				users_merged += 1

		# ── Merge WorkforceMember rows ────────────────────────────────────────────
		members = list(
			WorkforceMember.objects.filter(email__iexact=email).order_by('id')
		)
		members_merged = 0
		if len(members) > 1:
			# Keep the most complete record: prefer active, then most fields filled
			def member_score(m):
				score = 0
				if m.active is not False:
					score += 1000
				for field in ('designation', 'department', 'phone', 'dob', 'gender'):
					if getattr(m, field, None):
						score += 1
				# prefer the one with non-empty permissions
				if m.permissions:
					score += 100
				return score

			members.sort(key=member_score, reverse=True)
			keeper_wf = members[0]
			for dup in members[1:]:
				dup.delete()
				members_merged += 1

		return api_success(
			{'email': email, 'users_merged': users_merged, 'workforce_merged': members_merged},
			message=f'Merged {users_merged} duplicate user(s) and {members_merged} duplicate workforce record(s) for {email}.',
		)

