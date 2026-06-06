from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(
	CELERY_TASK_ALWAYS_EAGER=True,
	CELERY_TASK_EAGER_PROPAGATES=True,
	CELERY_TASK_STORE_EAGER_RESULT=True,
	CELERY_BROKER_URL='memory://',
	CELERY_RESULT_BACKEND='cache+memory://',
)
class AsyncTaskApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(username='async_user', password='Async@12345')
		self.client.force_authenticate(user=self.user)

	def test_trigger_ping_task_returns_standard_success_shape(self):
		response = self.client.post('/api/v1/common/tasks/ping/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
		self.assertTrue(response.data['success'])
		self.assertIn('task_id', response.data['data'])
		self.assertIn(response.data['data']['status'], {'PENDING', 'STARTED', 'SUCCESS'})

	def test_task_status_returns_successful_task_result(self):
		trigger_response = self.client.post('/api/v1/common/tasks/ping/', {}, format='json')
		task_id = trigger_response.data['data']['task_id']

		response = self.client.get(f'/api/v1/common/tasks/{task_id}/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['success'])
		self.assertEqual(response.data['data']['task_id'], task_id)
		self.assertEqual(response.data['data']['status'], 'SUCCESS')
		self.assertEqual(response.data['data']['result'], 'pong')

	def test_trigger_operations_summary_task_and_read_result(self):
		trigger_response = self.client.post('/api/v1/common/tasks/operations-summary/', {}, format='json')
		self.assertEqual(trigger_response.status_code, status.HTTP_202_ACCEPTED)
		self.assertTrue(trigger_response.data['success'])

		task_id = trigger_response.data['data']['task_id']
		status_response = self.client.get(f'/api/v1/common/tasks/{task_id}/')

		self.assertEqual(status_response.status_code, status.HTTP_200_OK)
		self.assertTrue(status_response.data['success'])
		self.assertEqual(status_response.data['data']['status'], 'SUCCESS')
		result = status_response.data['data']['result']
		self.assertIn('products_total', result)
		self.assertIn('jobs_total', result)
		self.assertIn('inventory_transactions_total', result)
		self.assertIn('workforce_total', result)
		self.assertIn('kyc_total', result)
		self.assertIn('drafts_total', result)
