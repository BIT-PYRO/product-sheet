from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.timezone import make_aware
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from rest_framework import status
from rest_framework.test import APITestCase

from inventory.models import RepairItem, RepairBatch
from jobs.models import Job
from products.models import Product


class RepairIntegrationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username='repair_tester', password='secure_password_123')
        self.client.force_authenticate(user=self.user)

        # Create a test product matching the SKU used in repairs
        self.product = Product.objects.create(
            master_sku='SKU-REP-1',
            name='Repair Test Product',
            category='Earrings',
            material='Gold 18k',
            selling_price='500.00',
            cost_price='350.00',
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
                    'qty': 4
                }
            ],
            created_by=self.user,
            updated_by=self.user,
        )

    @patch('requests.get')
    def test_sync_repair_queue_success(self, mock_get):
        # Mock successful external shop GET repair queue response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "items": [
                {
                    "repair_item_id": 5001,
                    "product": "Repair Test Earring",
                    "sku": "SKU-REP-1",
                    "variant": "Gold",
                    "quantity": 2,
                    "repair_stage": "hand_setting",
                    "repair_stage_label": "Hand Setting",
                    "resolved_by": "Deepak Vishwakarma"
                },
                {
                    "repair_item_id": 5002,
                    "product": "Repair Test Pendant",
                    "sku": "SKU-REP-2",
                    "variant": "Silver",
                    "quantity": 1,
                    "repair_stage": "final_polish",
                    "repair_stage_label": "Final Polish",
                    "resolved_by": "Deepak Vishwakarma"
                }
            ]
        }
        mock_get.return_value = mock_response

        response = self.client.get('/api/v1/inventory/repair-queue/', format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should populate local DB with two synced items
        self.assertEqual(RepairItem.objects.count(), 2)

        item1 = RepairItem.objects.get(repair_item_id=5001)
        self.assertEqual(item1.sku, "SKU-REP-1")
        self.assertEqual(item1.repair_stage, "hand_setting")
        self.assertFalse(item1.confirmed)

    def test_confirm_items_3day_aggregation_rule(self):
        # Create unconfirmed repair items with specific dates to test 3-day aggregation
        base_time = make_aware(datetime(2026, 5, 10, 10, 0, 0))

        # Day 1
        item1 = RepairItem.objects.create(
            repair_item_id=7001, product="P1", sku="SKU-REP-1", quantity=1,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            scanned_at=base_time, created_by=self.user, updated_by=self.user
        )
        # Day 2 (within 3 days from Day 1)
        item2 = RepairItem.objects.create(
            repair_item_id=7002, product="P2", sku="SKU-REP-1", quantity=1,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            scanned_at=base_time + timedelta(days=1), created_by=self.user, updated_by=self.user
        )
        # Day 3 (within 3-day window from Day 1: (Day 3 - Day 1).days <= 2 is true)
        item3 = RepairItem.objects.create(
            repair_item_id=7003, product="P3", sku="SKU-REP-1", quantity=1,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            scanned_at=base_time + timedelta(days=2), created_by=self.user, updated_by=self.user
        )
        # Day 4 (outside 3-day window from Day 1, should start a new batch)
        item4 = RepairItem.objects.create(
            repair_item_id=7004, product="P4", sku="SKU-REP-1", quantity=1,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            scanned_at=base_time + timedelta(days=3), created_by=self.user, updated_by=self.user
        )
        # Day 8 (way outside)
        item5 = RepairItem.objects.create(
            repair_item_id=7005, product="P5", sku="SKU-REP-1", quantity=1,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            scanned_at=base_time + timedelta(days=7), created_by=self.user, updated_by=self.user
        )

        response = self.client.post(
            '/api/v1/inventory/repair-queue/confirm/',
            {'repair_item_ids': [7001, 7002, 7003, 7004, 7005]},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should confirm the items and create 3 batches based on the 3-day window aggregation rule
        # Batch 1: item1, item2, item3 (latest scanned_at = 2026-05-12) -> Repair-2026-05-12
        # Batch 2: item4 (latest scanned_at = 2026-05-13) -> Repair-2026-05-13
        # Batch 3: item5 (latest scanned_at = 2026-05-17) -> Repair-2026-05-17
        self.assertEqual(RepairBatch.objects.count(), 3)

        # Check item1, item2, item3 are grouped into the same batch
        item1.refresh_from_db()
        item2.refresh_from_db()
        item3.refresh_from_db()
        item4.refresh_from_db()
        item5.refresh_from_db()

        self.assertTrue(item1.confirmed)
        self.assertEqual(item1.batch, item2.batch)
        self.assertEqual(item1.batch, item3.batch)
        self.assertNotEqual(item1.batch, item4.batch)
        self.assertNotEqual(item4.batch, item5.batch)

        batch1 = item1.batch
        self.assertEqual(batch1.batch_no, "Repair-2026-05-12")

    def test_confirm_batch(self):
        batch = RepairBatch.objects.create(
            batch_no="Repair-2026-05-15",
            date=timezone.now().date(),
            confirmed=False,
            created_by=self.user,
            updated_by=self.user
        )

        response = self.client.post(
            f'/api/v1/inventory/repair-batches/{batch.id}/confirm/',
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        batch.refresh_from_db()
        self.assertTrue(batch.confirmed)
        self.assertIsNotNone(batch.confirmed_at)

    def test_create_repair_vouchers_success(self):
        # Create a confirmed repair batch
        batch = RepairBatch.objects.create(
            batch_no="Repair-2026-05-20",
            date=timezone.now().date(),
            confirmed=True,
            created_by=self.user,
            updated_by=self.user
        )

        # Add two repair items linked to this batch in different stages
        item_hand = RepairItem.objects.create(
            repair_item_id=8001, product="Product A", sku="SKU-REP-1", quantity=3,
            repair_stage="hand_setting", repair_stage_label="Hand Setting",
            confirmed=True, batch=batch, created_by=self.user, updated_by=self.user
        )
        item_polish = RepairItem.objects.create(
            repair_item_id=8002, product="Product A", sku="SKU-REP-1", quantity=3,
            repair_stage="final_polish", repair_stage_label="Final Polish",
            confirmed=True, batch=batch, created_by=self.user, updated_by=self.user
        )

        # Call jobs bulk creation endpoint
        response = self.client.post(
            '/api/v1/jobs/create-repair-vouchers/',
            {
                'batch_no': batch.batch_no,
                'issued_to': 'Test Worker',
                'issued_by': 'Test Issuer',
                'notes': 'Create repair vouchers integration test'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

        # Since there are two unique stages (hand_setting and final_polish),
        # 2 Job vouchers should be created
        self.assertEqual(Job.objects.count(), 2)

        vouchers = Job.objects.filter(batch_id=batch.batch_no)
        self.assertEqual(vouchers.count(), 2)

        # Verify correct stages mapping
        hand_voucher = vouchers.filter(dept_to='hand-setting').first()
        self.assertIsNotNone(hand_voucher)
        self.assertEqual(hand_voucher.voucher_type, 'Repair')
        self.assertEqual(hand_voucher.dept_from, 'pre-polish')

        polish_voucher = vouchers.filter(dept_to='polishing').first()
        self.assertIsNotNone(polish_voucher)
        self.assertEqual(polish_voucher.voucher_type, 'Repair')
        self.assertEqual(polish_voucher.dept_from, 'hand-setting')

        # Check stones auto-populated and aggregated:
        # SKU-REP-1 product has 4 Diamonds per piece. Qty is 3, so total should be 12.
        self.assertEqual(len(hand_voucher.stone_rows), 1)
        self.assertEqual(hand_voucher.stone_rows[0]['qty'], 12.0)
        self.assertEqual(hand_voucher.stone_rows[0]['type'], 'Diamond')

        # Repair batch should be marked as voucher created
        batch.refresh_from_db()
        self.assertTrue(batch.voucher_created)

    @patch('requests.post')
    def test_sync_repair_completion_on_receive_voucher(self, mock_post):
        # Mock external post API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        # Create a confirmed repair batch and item
        batch = RepairBatch.objects.create(
            batch_no="Repair-2026-05-25",
            date=timezone.now().date(),
            confirmed=True,
            created_by=self.user,
            updated_by=self.user
        )
        item = RepairItem.objects.create(
            repair_item_id=9999, product="Product B", sku="SKU-REP-1", quantity=1,
            repair_stage="plating", repair_stage_label="Plating",
            confirmed=True, batch=batch, created_by=self.user, updated_by=self.user
        )

        # Create a Repair Job voucher
        voucher = Job.objects.create(
            title="JJ-99 - Repair plating",
            product=self.product,
            status='created',
            voucher_no="JJ-99",
            voucher_type="Repair",
            dept_from="polishing",
            dept_to="plating",
            batch_id=batch.batch_no,
            created_by=self.user,
            updated_by=self.user
        )

        # Transition voucher to received/completed status
        # Directly calling the view hook or transition path
        from jobs.views import _sync_repair_completion
        _sync_repair_completion(voucher)

        # Assert POST is called to the mock external shop complete URL with repair_item_id
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertIn('/repair-queue/complete/', args[0])
        self.assertEqual(kwargs['json'], {'repair_item_ids': [9999]})

        # Item should be deleted from the local cached list on success
        self.assertEqual(RepairItem.objects.filter(repair_item_id=9999).count(), 0)
