from django.conf import settings
from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiExample, extend_schema
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from common.api import api_success
from workforce.models import WorkforceMember

from .serializers import UserSerializer


class LoginView(TokenObtainPairView):
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
		user, created = User.objects.get_or_create(
			username=email,
			defaults={
				'email': email,
				'first_name': first_name,
				'last_name': last_name,
			},
		)
		if created:
			user.set_unusable_password()
			user.save()

		WorkforceMember.objects.get_or_create(
			email=email,
			defaults={'full_name': full_name},
		)

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
