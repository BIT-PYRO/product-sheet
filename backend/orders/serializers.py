from rest_framework import serializers
from .models import Order, OrderItem, OrderSource, OrderStatus


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'name',
            'sku',
            'quantity',
            'price',
            'taxable',
            'images',
            'note',
            'total_price',
        ]
        read_only_fields = ['id', 'total_price']


class OrderListSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_id',
            'customer_name',
            'customer_email',
            'customer_phone',
            'customer_address',
            'customer_city',
            'customer_state',
            'customer_zip',
            'status',
            'subtotal',
            'discount',
            'shipping',
            'tax',
            'total',
            'notes',
            'order_type',
            'units',
            'picklist_number',
            'order_source',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = [
            'id',
            'subtotal',
            'discount',
            'shipping',
            'tax',
            'total',
            'created_at',
            'updated_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_id',
            'customer_name',
            'customer_email',
            'customer_phone',
            'customer_address',
            'customer_city',
            'customer_state',
            'customer_zip',
            'status',
            'subtotal',
            'discount',
            'shipping',
            'tax',
            'total',
            'notes',
            'order_type',
            'units',
            'picklist_number',
            'order_source',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = [
            'id',
            'subtotal',
            'tax',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)

        order.calculate_total()
        order.save()

        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update order fields
        instance.customer_id = validated_data.get('customer_id', instance.customer_id)
        instance.status = validated_data.get('status', instance.status)
        instance.discount = validated_data.get('discount', instance.discount)
        instance.shipping = validated_data.get('shipping', instance.shipping)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.order_type = validated_data.get('order_type', instance.order_type)
        instance.units = validated_data.get('units', instance.units)

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)

        instance.calculate_total()
        instance.save()

        return instance
