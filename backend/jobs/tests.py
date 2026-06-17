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

		self.user = user_model.objects.create_user(
			username='jobs_user',
			password='jobs_pass_123',
			tenant=self.tenant,
			active_company=self.company,
			is_approved=True,
			role='TENANT_OWNER',
		)
		self.user.accessible_companies.add(self.company)
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

	def test_die_inventory_updates_and_partial_voucher(self):
		from inventory.models import DieInventoryItem, DieTransaction
		from jobs.models import VoucherApprovalStatus
		
		# Create a DieInventoryItem
		die_item = DieInventoryItem.objects.create(
			tenant=self.tenant,
			company=self.company,
			die_code='DIE-A101',
			quantity=20,
			wax_piece_qty=0,
			wax_setting_qty=0,
			casting_qty=0,
			created_by=self.user,
			updated_by=self.user,
		)
		
		# Create a pre-casting voucher (die -> wax-pieces)
		job = Job.objects.create(
			tenant=self.tenant,
			company=self.company,
			title='V1',
			product=self.product,
			status='created',
			approval_status=VoucherApprovalStatus.IN_PROCESS,
			dept_from='die',
			dept_to='wax-pieces',
			die_rows=[{
				'die_code': 'DIE-A101',
				'master_sku': 'SKU-JOB-1',
				'qty_per_piece': 1,
				'issued_qty': '10',
			}],
			material_rows=[{
				'sku': 'DIE-A101',
				'issued_qty': '10',
			}],
			created_by=self.user,
			updated_by=self.user,
		)
		
		# Trigger source deduction (enters in_process)
		from jobs.views import _deduct_source_current_stock
		_deduct_source_current_stock(job)
		
		# Verify source quantity is decremented (quantity went from 20 to 10)
		die_item.refresh_from_db()
		self.assertEqual(float(die_item.quantity), 10.0)
		self.assertEqual(float(die_item.wax_piece_qty), 0.0)
		
		# Now, receive 6 partially
		response = self.client.post(
			f'/api/v1/jobs/{job.id}/receive-voucher/',
			{
				'rows': [{
					'die_code': 'DIE-A101',
					'received_qty': 6,
					'loss_qty': 0,
				}],
				'is_partial': True,
				'received_by': 'Tester',
			},
			format='json',
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['success'])
		
		# Verify status is PARTIALLY_COMPLETED
		job.refresh_from_db()
		self.assertEqual(job.approval_status, VoucherApprovalStatus.PARTIALLY_COMPLETED)
		
		# Verify remaining issued_qty is updated to 4 (10 - 6)
		self.assertEqual(job.die_rows[0]['issued_qty'], '4')
		self.assertEqual(job.material_rows[0]['issued_qty'], '4')
		
		# Verify destination qty (wax_piece_qty) is incremented by 6
		die_item.refresh_from_db()
		self.assertEqual(float(die_item.wax_piece_qty), 6.0)
		
		# Now receive the remaining 4
		response2 = self.client.post(
			f'/api/v1/jobs/{job.id}/receive-voucher/',
			{
				'rows': [{
					'die_code': 'DIE-A101',
					'received_qty': 4,
					'loss_qty': 0,
				}],
				'is_partial': False,
				'received_by': 'Tester',
			},
			format='json',
		)
		
		self.assertEqual(response2.status_code, status.HTTP_200_OK)
		
		# Verify status becomes COMPLETED
		job.refresh_from_db()
		self.assertEqual(job.approval_status, VoucherApprovalStatus.COMPLETED)
		
		# Verify remaining issued_qty is now 0
		self.assertEqual(job.die_rows[0]['issued_qty'], '0')
		self.assertEqual(job.material_rows[0]['issued_qty'], '0')
		
		# Verify destination qty (wax_piece_qty) is now 10
		die_item.refresh_from_db()
		self.assertEqual(float(die_item.wax_piece_qty), 10.0)
