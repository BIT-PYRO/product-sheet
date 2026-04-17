from rest_framework import serializers
from django.db import transaction

from .models import InventoryTransaction, PicklistGroup, PicklistItem, StoneItem, StoneStockEntry, ToolItem, OtherItem, MachineItem, ProductInventoryItem


class InventoryTransactionSerializer(serializers.ModelSerializer):
    def validate_quantity(self, value):
        # Allow quantity=0 for location-only updates (location stored on the txn)
        if value == 0:
            return value
        return value

    def validate_remark(self, value):
        return value.strip()

    class Meta:
        model = InventoryTransaction
        fields = '__all__'


class PicklistItemSerializer(serializers.ModelSerializer):
    listingName = serializers.CharField(source='listing_name', required=False, allow_blank=True)

    class Meta:
        model = PicklistItem
        fields = ('sku', 'listingName', 'needed')


class PicklistGroupSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='group_id', required=False, allow_blank=True)
    db_id = serializers.IntegerField(source='pk', read_only=True)
    uploadedBy = serializers.CharField(source='uploaded_by', required=False, allow_blank=True)
    date = serializers.DateTimeField(source='uploaded_at', required=False)
    dateFormatted = serializers.SerializerMethodField()
    items = PicklistItemSerializer(many=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = PicklistGroup
        fields = ('id', 'db_id', 'number', 'name', 'uploadedBy', 'date', 'dateFormatted', 'total_items', 'items')

    def get_dateFormatted(self, obj):
        return obj.uploaded_at.astimezone().strftime('%Y-%m-%d %H:%M:%S')

    def get_total_items(self, obj):
        return obj.items.count()

    def _resolve_next_number(self, desired_number):
        if desired_number and not PicklistGroup.objects.filter(number=desired_number).exists():
            return desired_number
        last = PicklistGroup.objects.order_by('-number').first()
        return (last.number + 1) if last else 1

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        desired_number = validated_data.pop('number', None)

        group = PicklistGroup.objects.create(
            number=self._resolve_next_number(desired_number),
            **validated_data,
        )

        PicklistItem.objects.bulk_create([
            PicklistItem(
                group=group,
                sku=item.get('sku', '').strip().upper(),
                listing_name=item.get('listing_name', '').strip(),
                needed=max(0, int(item.get('needed') or 0)),
            )
            for item in items_data
            if str(item.get('sku', '')).strip()
        ])

        return group

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            PicklistItem.objects.bulk_create([
                PicklistItem(
                    group=instance,
                    sku=item.get('sku', '').strip().upper(),
                    listing_name=item.get('listing_name', '').strip(),
                    needed=max(0, int(item.get('needed') or 0)),
                )
                for item in items_data
                if str(item.get('sku', '')).strip()
            ])

        return instance


class StoneItemSerializer(serializers.ModelSerializer):
    averageWeightStock = serializers.SerializerMethodField()

    def get_averageWeightStock(self, obj):
        return obj.average_weight_stock

    class Meta:
        model = StoneItem
        fields = [
            'id', 'stone_type', 'species', 'variety', 'color', 'quality',
            'wax_setting', 'cut', 'dos', 'donts', 'shape', 'length', 'width', 'height',
            'qty', 'weight_cts', 'averageWeightStock', 'created_at', 'updated_at',
        ]


class StoneStockEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = StoneStockEntry
        fields = ['id', 'stone', 'qty_added', 'weight_cts_added', 'price', 'price_by', 'amount', 'remark', 'created_at']

    @transaction.atomic
    def create(self, validated_data):
        entry = super().create(validated_data)
        stone = entry.stone
        stone.qty = float(stone.qty or 0) + float(entry.qty_added)
        stone.weight_cts = float(stone.weight_cts or 0) + float(entry.weight_cts_added)
        stone.save(update_fields=['qty', 'weight_cts'])
        return entry


class ToolItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToolItem
        fields = ['id', 'tool_name', 'particulars', 'department', 'quantity', 'unit', 'location', 'created_at', 'updated_at']


class OtherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherItem
        fields = ['id', 'item_name', 'category', 'quantity', 'unit', 'min_level', 'notes', 'created_at', 'updated_at']


class MachineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineItem
        fields = [
            'id', 'machine_name', 'particulars', 'department', 'min_required_stock',
            'running_qty', 'running_unit', 'running_location',
            'idle_qty', 'idle_unit', 'idle_location',
            'breakdown_qty', 'breakdown_unit', 'breakdown_location',
            'maintenance_qty', 'maintenance_unit', 'maintenance_location',
            'created_at', 'updated_at',
        ]


class ProductInventoryItemSerializer(serializers.ModelSerializer):
    master_sku = serializers.CharField(source='product.master_sku', read_only=True)
    designer_sku = serializers.CharField(source='product.designer_sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    images = serializers.JSONField(source='product.images', read_only=True)

    class Meta:
        model = ProductInventoryItem
        fields = [
            'id', 'product', 'master_sku', 'designer_sku', 'product_name', 'images',
            'final_sku', 'value', 'unit', 'location', 'total_in_demand',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
