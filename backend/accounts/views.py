from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from common.api import api_success

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
