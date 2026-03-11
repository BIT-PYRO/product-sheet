from django.test import TestCase
from django.contrib.auth.models import User
from .models import Order, OrderItem, OrderStatus


class OrderModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )
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
