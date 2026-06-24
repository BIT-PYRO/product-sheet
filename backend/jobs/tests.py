from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import Job
from products.models import Product
from core_tenants.models import Tenant, Company
from core_tenants.context import set_tenant, set_company


class JobApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.tenant = Tenant.objects.create(name='Test Tenant', slug='test-tenant')
		self.company = Company.objects.create(tenant=self.tenant, name='Test Company')
		set_tenant(self.tenant)
		set_company(self.company)

		# Make user a superuser/super-admin to bypass RequiresFeature check in tests
		self.user = user_model.objects.create_superuser(
			username='jobs_user',
			email='jobs_user@test.com',
			password='jobs_pass_123',
			tenant=self.tenant,
			active_company=self.company,
		)
		self.user.accessible_companies.add(self.company)
		self.client.force_authenticate(user=self.user)

		self.product = Product.objects.create(
			master_sku='SKU-JOB-1',
			name='Job Product',
			category='General',
			selling_price='300.00',
			cost_price='200.00',
			stone_entries=[
				{
					'type': 'Diamond',
					'species': 'Natural',
					'variety': 'Diamond',
					'color': 'G',
					'cut': 'Excellent',
					'shape': 'Round',
					'length': '2.0',
					'width': '2.0',
					'height': '1.2',
					'qty': 3
				}
			],
			findings=[
				{
					'value': 'Clasp',
					'quantity': 2,
					'location': 'Box A'
				}
			],
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
				'material_rows': [
					{
						'sku': 'SKU-JOB-1',
						'issued_qty': '5',
						'unit1': 'Pcs'
					}
				]
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(response.data['success'])
		self.assertIn('data', response.data)
		self.assertEqual(Job.objects.count(), 1)

		# Verify stones and findings are auto-populated
		job = Job.objects.first()
		self.assertEqual(len(job.stone_rows), 1)
		self.assertEqual(job.stone_rows[0]['qty'], 15.0)  # 3 stones * 5 pieces

		self.assertEqual(len(job.die_weight_rows), 1)
		self.assertEqual(job.die_weight_rows[0]['quantity'], 10.0)  # 2 findings * 5 pieces
		self.assertEqual(job.die_weight_rows[0]['finding_code'], 'Clasp')

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
