from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product


class ProductApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			username='day4_user',
			password='day4_pass_123',
		)
		self.client.force_authenticate(user=self.user)

	def test_create_product(self):
		response = self.client.post(
			'/api/v1/products/',
			{
				'sku': 'SKU-1001',
				'name': 'Demo Product',
				'category': 'General',
				'selling_price': '120.00',
				'cost_price': '100.00',
				'is_active': True,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(response.data['success'])
		self.assertIn('data', response.data)
		self.assertEqual(Product.objects.count(), 1)
		self.assertEqual(Product.objects.first().sku, 'SKU-1001')

	def test_create_product_validation_error_has_standard_shape(self):
		response = self.client.post(
			'/api/v1/products/',
			{
				'sku': 'SKU-ERR-1',
				'name': 'Invalid Product',
				'category': 'General',
				'selling_price': '100.00',
				'cost_price': '150.00',
				'is_active': True,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertFalse(response.data['success'])
		self.assertEqual(response.data['error']['code'], 'validation_error')
		self.assertIn('details', response.data['error'])

	def test_list_products(self):
		Product.objects.create(
			sku='SKU-2001',
			name='Product A',
			category='General',
			selling_price='99.00',
			cost_price='80.00',
			created_by=self.user,
			updated_by=self.user,
		)

		response = self.client.get('/api/v1/products/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['success'])
		self.assertEqual(len(response.data['data']), 1)
		self.assertEqual(response.data['data'][0]['sku'], 'SKU-2001')
