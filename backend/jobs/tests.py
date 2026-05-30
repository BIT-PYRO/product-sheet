from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import Job
from products.models import Product


class JobApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(username='jobs_user', password='jobs_pass_123')
		self.client.force_authenticate(user=self.user)
		self.product = Product.objects.create(
			master_sku='SKU-JOB-1',
			name='Job Product',
			category='General',
			selling_price='300.00',
			cost_price='200.00',
			created_by=self.user,
			updated_by=self.user,
		)

	def test_create_job_returns_standard_success_shape(self):
		response = self.client.post(
			'/api/v1/jobs/',
			{
				'title': 'Inspect sample item',
				'product': self.product.id,
				'status': 'created',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(response.data['success'])
		self.assertIn('data', response.data)
		self.assertEqual(Job.objects.count(), 1)

	def test_invalid_job_status_transition_returns_standard_error_shape(self):
		job = Job.objects.create(
			title='Transition Case',
			product=self.product,
			status='created',
			created_by=self.user,
			updated_by=self.user,
		)

		response = self.client.patch(
			f'/api/v1/jobs/{job.id}/',
			{'status': 'completed'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertFalse(response.data['success'])
		self.assertEqual(response.data['error']['code'], 'validation_error')
		self.assertIn('details', response.data['error'])
