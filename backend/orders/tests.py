from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Order, OrderItem, OrderStatus
from .serializers import OrderListSerializer
from core_tenants.models import Tenant, Company
from core_tenants.context import set_tenant, set_company

User = get_user_model()


class OrderModelTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name='Test Tenant', slug='test-tenant')
        self.company = Company.objects.create(tenant=self.tenant, name='Test Company')
        set_tenant(self.tenant)
        set_company(self.company)

        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            tenant=self.tenant,
            active_company=self.company,
        )
        self.user.accessible_companies.add(self.company)

        self.order = Order.objects.create(
            created_by=self.user,
            status=OrderStatus.DRAFT,
            discount=100,
            shipping=50
        )

    def test_order_creation(self):
        self.assertEqual(self.order.status, OrderStatus.DRAFT)
        self.assertEqual(self.order.created_by, self.user)

    def test_order_item_total_calculation(self):
        item = OrderItem.objects.create(
            order=self.order,
            name='Test Item',
            quantity=5,
            price=100.00,
            taxable=True
        )
        self.assertEqual(item.total_price, 500.00)

    def test_order_calculate_total(self):
        OrderItem.objects.create(
            order=self.order,
            name='Item 1',
            quantity=2,
            price=100.00,
            taxable=True
        )
        OrderItem.objects.create(
            order=self.order,
            name='Item 2',
            quantity=1,
            price=50.00,
            taxable=False
        )
        self.order.calculate_total()
        self.assertEqual(self.order.subtotal, 250.00)
        self.assertEqual(self.order.total, 200.00)  # 250 + 50 - 100


class OrderSerializerTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name='Test Tenant', slug='test-tenant')
        self.company = Company.objects.create(tenant=self.tenant, name='Test Company')
        set_tenant(self.tenant)
        set_company(self.company)

    def test_custom_order_name(self):
        order = Order.objects.create(
            tenant=self.tenant,
            company=self.company,
            order_source='custom',
        )
        serializer = OrderListSerializer(order)
        self.assertEqual(serializer.data['order_name'], f"CUSTOM-{order.id}")

    def test_picklist_order_name_without_group(self):
        order = Order.objects.create(
            tenant=self.tenant,
            company=self.company,
            order_source='picklist',
            picklist_number=99,
        )
        serializer = OrderListSerializer(order)
        self.assertEqual(serializer.data['order_name'], "PICKLIST-99")

    def test_picklist_order_name_with_group(self):
        from inventory.models import PicklistGroup
        import datetime
        pg = PicklistGroup.objects.create(
            tenant=self.tenant,
            company=self.company,
            number=99,
            group_id='ext-198',
            name='Test Batch',
            uploaded_at=datetime.datetime(2026, 6, 15, tzinfo=datetime.timezone.utc),
        )
        order = Order.objects.create(
            tenant=self.tenant,
            company=self.company,
            order_source='picklist',
            picklist_number=99,
        )
        serializer = OrderListSerializer(order)
        self.assertEqual(serializer.data['order_name'], "PICKLIST-99 (Batch: 198, Date: 15-06-2026)")

