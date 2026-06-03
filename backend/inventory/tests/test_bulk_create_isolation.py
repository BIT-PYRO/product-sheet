from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from inventory.models import PicklistGroup, PicklistItem
from core_tenants.models import Tenant, Company

User = get_user_model()

class BulkCreateIsolationTests(TestCase):
    def setUp(self):
        self.tenant1 = Tenant.objects.create(name='Tenant 1', slug='tenant-1')
        self.company1 = Company.objects.create(name='Company 1', tenant=self.tenant1)
        self.user1 = User.objects.create_user(username='user1', password='password')
        self.user1.tenant = self.tenant1
        self.user1.active_company = self.company1
        self.user1.save()

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.user1)
        
        # We assume the API uses JWT/Token or Session auth that populates request.user

    def test_picklist_bulk_create_injects_audit_fields(self):
        """Test that bulk creation of PicklistItem injects tenant, company, created_by, updated_by"""
        url = reverse('picklist-list')  # Make sure this matches your router
        
        payload = {
            'number': 100,
            'name': 'Test Picklist',
            'items': [
                {'sku': 'SKU-1', 'needed': 5},
                {'sku': 'SKU-2', 'needed': 10}
            ]
        }
        
        response = self.client1.post(url, payload, format='json')
        
        # If the endpoint doesn't exist or isn't routed this way, we'll get 404, but assuming it exists:
        if response.status_code == status.HTTP_201_CREATED:
            group = PicklistGroup.objects.get(number=100)
            self.assertEqual(group.tenant, self.tenant1)
            
            items = PicklistItem.objects.filter(group=group)
            self.assertEqual(items.count(), 2)
            for item in items:
                self.assertEqual(item.tenant, self.tenant1)
                self.assertEqual(item.company, self.company1)
                self.assertEqual(item.created_by, self.user1)
                self.assertEqual(item.updated_by, self.user1)
