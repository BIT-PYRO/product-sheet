from rest_framework import serializers
from .models import Order, OrderItem, OrderSource, OrderStatus


class OrderItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

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
            'tenant_id',
            'company_id',
        ]
        read_only_fields = ['id', 'total_price', 'tenant', 'company', 'tenant_id', 'company_id']


class OrderListSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    order_name = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._picklist_groups_cache = None

    def _get_picklist_group(self, obj):
        if not obj.picklist_number:
            return None
        
        if self._picklist_groups_cache is None:
            if isinstance(self.instance, (list, tuple)):
                instances = self.instance
            elif hasattr(self, 'parent') and self.parent and isinstance(self.parent.instance, (list, tuple)):
                instances = self.parent.instance
            elif hasattr(self, 'parent') and self.parent and hasattr(self.parent, 'iterable'):
                instances = list(self.parent.instance) if self.parent.instance else []
            else:
                instances = [self.instance] if self.instance else []
            
            picklist_numbers = [i.picklist_number for i in instances if i and getattr(i, 'picklist_number', None)]
            if picklist_numbers:
                from inventory.models import PicklistGroup
                pgs = PicklistGroup.objects.filter(tenant=obj.tenant, number__in=picklist_numbers)
                self._picklist_groups_cache = {pg.number: pg for pg in pgs}
            else:
                self._picklist_groups_cache = {}
        
        return self._picklist_groups_cache.get(obj.picklist_number)

    def get_order_name(self, obj):
        if obj.picklist_number:
            pg = self._get_picklist_group(obj)
            if pg:
                batch_no = getattr(pg, 'group_id', '') or ''
                if batch_no.startswith('ext-'):
                    batch_no = batch_no[4:]
                elif batch_no.startswith('sync-'):
                    batch_no = f"Sync #{pg.number}"
                
                uploaded_at = getattr(pg, 'uploaded_at', None)
                date_str = uploaded_at.strftime('%d-%m-%Y') if uploaded_at else ''
                
                parts = []
                if batch_no:
                    parts.append(f"Batch: {batch_no}")
                if date_str:
                    parts.append(f"Date: {date_str}")
                
                if parts:
                    return f"PICKLIST-{pg.number} ({', '.join(parts)})"
                return f"PICKLIST-{pg.number}"
            return f"PICKLIST-{obj.picklist_number}"
        return f"CUSTOM-{obj.id}"

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
            'order_name',
            'order_source',
            'tenant_id',
            'company_id',
            'created_at',
            'updated_at',
            'total_items',
            'items',
        ]
        read_only_fields = [
            'id',
            'subtotal',
            'discount',
            'shipping',
            'tax',
            'total',
            'tenant_id',
            'company_id',
            'created_at',
            'updated_at',
        ]

    def get_total_items(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    total_items = serializers.SerializerMethodField()
    order_name = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._picklist_groups_cache = None

    def _get_picklist_group(self, obj):
        if not obj.picklist_number:
            return None
        
        if self._picklist_groups_cache is None:
            if isinstance(self.instance, (list, tuple)):
                instances = self.instance
            elif hasattr(self, 'parent') and self.parent and isinstance(self.parent.instance, (list, tuple)):
                instances = self.parent.instance
            elif hasattr(self, 'parent') and self.parent and hasattr(self.parent, 'iterable'):
                instances = list(self.parent.instance) if self.parent.instance else []
            else:
                instances = [self.instance] if self.instance else []
            
            picklist_numbers = [i.picklist_number for i in instances if i and getattr(i, 'picklist_number', None)]
            if picklist_numbers:
                from inventory.models import PicklistGroup
                pgs = PicklistGroup.objects.filter(tenant=obj.tenant, number__in=picklist_numbers)
                self._picklist_groups_cache = {pg.number: pg for pg in pgs}
            else:
                self._picklist_groups_cache = {}
        
        return self._picklist_groups_cache.get(obj.picklist_number)

    def get_order_name(self, obj):
        if obj.picklist_number:
            pg = self._get_picklist_group(obj)
            if pg:
                batch_no = getattr(pg, 'group_id', '') or ''
                if batch_no.startswith('ext-'):
                    batch_no = batch_no[4:]
                elif batch_no.startswith('sync-'):
                    batch_no = f"Sync #{pg.number}"
                
                uploaded_at = getattr(pg, 'uploaded_at', None)
                date_str = uploaded_at.strftime('%d-%m-%Y') if uploaded_at else ''
                
                parts = []
                if batch_no:
                    parts.append(f"Batch: {batch_no}")
                if date_str:
                    parts.append(f"Date: {date_str}")
                
                if parts:
                    return f"PICKLIST-{pg.number} ({', '.join(parts)})"
                return f"PICKLIST-{pg.number}"
            return f"PICKLIST-{obj.picklist_number}"
        return f"CUSTOM-{obj.id}"

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
            'order_name',
            'order_source',
            'created_at',
            'updated_at',
            'total_items',
            'items',
        ]
        read_only_fields = [
            'id',
            'subtotal',
            'tax',
            'created_at',
            'updated_at',
        ]

    def get_total_items(self, obj):
        return obj.items.count()

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            OrderItem.objects.create(
                order=order,
                # Propagate tenant/company from the parent Order so the NOT NULL
                # constraint on OrderItem.company_id is always satisfied, even when
                # the request comes through the server-side Next.js proxy (no X-Company-ID header).
                tenant=order.tenant,
                company=order.company,
                **item_data,
            )

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
                OrderItem.objects.create(
                    order=instance,
                    tenant=instance.tenant,
                    company=instance.company,
                    **item_data,
                )

        instance.calculate_total()
        instance.save()

        return instance

