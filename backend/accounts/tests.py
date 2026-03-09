from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class AuthApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			username='auth_user',
			password='Auth@12345',
		)

	def test_login_returns_standard_success_shape(self):
		response = self.client.post(
			'/api/v1/auth/login/',
			{'username': 'auth_user', 'password': 'Auth@12345'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['success'])
		self.assertIn('access', response.data['data'])
		self.assertIn('refresh', response.data['data'])

	def test_login_invalid_credentials_returns_standard_error_shape(self):
		response = self.client.post(
			'/api/v1/auth/login/',
			{'username': 'auth_user', 'password': 'WrongPassword'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertFalse(response.data['success'])
		self.assertIn('error', response.data)
		self.assertEqual(response.data['error']['code'], 'validation_error')
