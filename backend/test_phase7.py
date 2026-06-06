import os
import django
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from core_tenants.models import Tenant
from platform_admin.models import PlatformActionAudit

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

class Phase7APITest(TestCase):
    def setUp(self):
        self.client = Client()
        User = get_user_model()
        
        # Create SuperAdmin
        self.admin = User.objects.create_superuser('admin@miraee.app', 'password123', first_name="Super", last_name="Admin")
        
        # Create normal user
        self.user = User.objects.create_user('user@tenant.app', 'password123', first_name="Normal", last_name="User")
        
        # Create a tenant
        self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant", owner=self.user)

    def test_dashboard_api_access(self):
        # Unauthenticated
        response = self.client.get('/api/v1/platform/dashboard/')
        self.assertEqual(response.status_code, 401)
        
        # Normal User
        self.client.force_login(self.user)
        response = self.client.get('/api/v1/platform/dashboard/')
        self.assertEqual(response.status_code, 403)
        
        # SuperAdmin
        self.client.force_login(self.admin)
        response = self.client.get('/api/v1/platform/dashboard/')
        self.assertEqual(response.status_code, 200)

    def test_tenant_action_audit(self):
        self.client.force_login(self.admin)
        
        # Suspend tenant
        response = self.client.post(f'/api/v1/platform/tenants/{self.tenant.id}/action/', {
            'action': 'suspend',
            'reason': 'Test suspension'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.status, 'suspended')
        
        # Verify Audit Log
        audit = PlatformActionAudit.objects.first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action_type, 'suspend')
        self.assertEqual(audit.reason, 'Test suspension')

    def test_analytics_endpoints(self):
        self.client.force_login(self.admin)
        
        response = self.client.get('/api/v1/platform/analytics/upgrade-funnel/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('funnel', response.json())
        
        response = self.client.get('/api/v1/platform/analytics/feature-adoption/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(response.json(), list))

print("To run the tests: python manage.py test test_phase7")
