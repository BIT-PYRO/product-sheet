from rest_framework import serializers
from django.db import transaction

from .models import (
    InventoryTransaction, PicklistGroup, PicklistItem,
    StoneItem, StoneStockEntry, ToolItem, OtherItem, MachineItem, ProductInventoryItem,
    StockTransaction, StoneTransaction,
    FindingInventoryItem, FindingInventoryTransaction,
    ProductInventoryTransaction, IssueRequest,
    DieInventoryItem, DieTransaction,
    RepairBatch, RepairItem,
)


class InventoryTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

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
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


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
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = PicklistGroup
        fields = ('id', 'db_id', 'number', 'name', 'uploadedBy', 'date', 'dateFormatted', 'total_items', 'items', 'tenant_id', 'company_id')

    def get_dateFormatted(self, obj):
        return obj.uploaded_at.astimezone().strftime('%Y-%m-%d %H:%M:%S')

    def get_total_items(self, obj):
        return obj.items.count()

    def _resolve_next_number(self, desired_number, tenant=None):
        qs = PicklistGroup.objects
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        if desired_number and not qs.filter(number=desired_number).exists():
            return desired_number
        last = qs.order_by('-number').first()
        return (last.number + 1) if last else 1

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        desired_number = validated_data.pop('number', None)
        # tenant is injected by .save(tenant=...) so it's already in validated_data
        tenant = validated_data.get('tenant')

        group = PicklistGroup.objects.create(
            number=self._resolve_next_number(desired_number, tenant=tenant),
            **validated_data,
        )

        PicklistItem.objects.bulk_create([
            PicklistItem(
                group=group,
                sku=item.get('sku', '').strip().upper(),
                listing_name=item.get('listing_name', '').strip(),
                needed=max(0, int(item.get('needed') or 0)),
                tenant=group.tenant,
                company=group.company,
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
                    tenant=instance.tenant,
                    company=instance.company,
                )
                for item in items_data
                if str(item.get('sku', '')).strip()
            ])

        return instance


class StoneItemSerializer(serializers.ModelSerializer):
    averageWeightStock = serializers.SerializerMethodField()
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    def get_averageWeightStock(self, obj):
        return obj.average_weight_stock

    class Meta:
        model = StoneItem
        fields = [
            'id', 'stone_type', 'species', 'variety', 'color', 'quality',
            'wax_setting', 'cut', 'dos', 'donts', 'shape', 'length', 'width', 'height',
            'qty', 'used_qty', 'weight_cts', 'min_level', 'averageWeightStock',
            'tenant_id', 'company_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class StoneStockEntrySerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = StoneStockEntry
        fields = ['id', 'stone', 'qty_added', 'weight_cts_added', 'price', 'price_by', 'amount', 'remark', 'tenant_id', 'company_id', 'created_at']
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']

    @transaction.atomic
    def create(self, validated_data):
        entry = super().create(validated_data)
        stone = entry.stone
        stone.qty = float(stone.qty or 0) + float(entry.qty_added)
        stone.weight_cts = float(stone.weight_cts or 0) + float(entry.weight_cts_added)
        stone.save(update_fields=['qty', 'weight_cts'])
        return entry


class ToolItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ToolItem
        fields = [
            'id', 'tool_name', 'particulars', 'department',
            'new_qty', 'new_unit', 'new_location',
            'used_qty', 'used_unit', 'used_location',
            'in_use_qty', 'in_use_unit',
            'min_required_stock',
            'tenant_id', 'company_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class OtherItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = OtherItem
        fields = ['id', 'item_name', 'category', 'quantity', 'used_qty', 'unit', 'min_level', 'notes', 'tenant_id', 'company_id', 'created_at', 'updated_at']
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class MachineItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = MachineItem
        fields = [
            'id', 'machine_name', 'particulars', 'department', 'min_required_stock',
            'running_qty', 'running_unit', 'running_location',
            'idle_qty', 'idle_unit', 'idle_location',
            'breakdown_qty', 'breakdown_unit', 'breakdown_location',
            'maintenance_qty', 'maintenance_unit', 'maintenance_location',
            'tenant_id', 'company_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class ProductInventoryItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    master_sku = serializers.CharField(source='product.master_sku', read_only=True)
    designer_sku = serializers.CharField(source='product.designer_sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    images = serializers.JSONField(source='product.images', read_only=True)
    # Alias for external API consumers — same value as `value`, using the expected field name
    actual_quantity = serializers.DecimalField(source='value', max_digits=14, decimal_places=3, read_only=True)

    class Meta:
        model = ProductInventoryItem
        fields = [
            'id', 'product', 'master_sku', 'designer_sku', 'product_name', 'images',
            'final_sku', 'value', 'actual_quantity', 'unit', 'location', 'total_in_demand',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'tenant', 'company', 'tenant_id', 'company_id']


class StockTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'txn_date', 'inventory_type', 'txn_type', 'item_name', 'particulars',
            'qty', 'qty_unit', 'weight', 'weight_unit', 'location', 'price', 'amount',
            'received_from', 'issued_to', 'usage', 'activity_status', 'remark',
            'tool', 'machine', 'other_item', 'created_at', 'updated_at',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class StoneTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = StoneTransaction
        fields = [
            'id', 'txn_date', 'txn_type', 'inventory_type', 'stone_name', 'variety',
            'stone_type', 'shape', 'color', 'species', 'quality', 'cut',
            'length', 'width', 'height', 'qty', 'weight', 'weight_unit',
            'location', 'price', 'amount', 'received_from', 'issued_to',
            'usage', 'remark', 'activity_status', 'stone', 'created_at', 'updated_at',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class FindingInventoryItemSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = FindingInventoryItem
        fields = [
            'id', 'finding_code', 'die_number', 'size', 'material', 'finding_stage',
            'mechanism', 'quantity', 'used_qty', 'weight', 'dead_weight', 'mold_qty_per_die',
            'polish', 'total_measurements', 'design_material', 'min_level', 'notes',
            'created_at', 'updated_at',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class FindingInventoryTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = FindingInventoryTransaction
        fields = [
            'id', 'txn_date', 'finding', 'finding_code', 'txn_type', 'inventory_type',
            'die_number', 'size', 'material', 'stage', 'qty', 'weight', 'dead_weight',
            'price', 'amount', 'received_from', 'issued_to', 'usage', 'remark', 'activity_status',
            'created_at', 'updated_at',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class ProductInventoryTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ProductInventoryTransaction
        fields = [
            'id', 'txn_date', 'product', 'master_sku', 'designer_sku', 'final_sku',
            'txn_type', 'inventory_type', 'metal', 'value', 'unit', 'location',
            'wip', 'total_in_demand', 'price', 'amount', 'received_from', 'issued_to',
            'remark', 'activity_status', 'created_at', 'updated_at',
            'tenant', 'company', 'tenant_id', 'company_id',
        ]
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']


class IssueRequestSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = IssueRequest
        fields = [
            'id', 'inventory_type', 'item_id', 'item_name', 'quantity',
            'issued_to', 'issued_by', 'reason', 'reference_id',
            'status', 'requested_at', 'reviewed_at', 'remark',
            'tenant_id', 'company_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['requested_at', 'tenant', 'company', 'tenant_id', 'company_id', 'created_at', 'updated_at']


# ── Die Inventory ─────────────────────────────────────────────────────────────

class DieInventoryItemSerializer(serializers.ModelSerializer):
    designer_images = serializers.SerializerMethodField()

    def get_designer_images(self, obj):
        """Return a deduplicated list of image URLs from all linked DesignerSheet records.

        For list actions the ViewSet injects a precomputed ``sku_images`` dict into
        the serializer context so this method performs zero extra DB queries.  For
        detail/other actions it falls back to a single filter query.
        """
        try:
            skus = [s for s in (obj.designer_skus or []) if s]
            if not skus:
                return []
            seen = set()
            images = []
            sku_images = self.context.get('sku_images')  # injected by ViewSet for list
            if sku_images is not None:
                for sku in skus:
                    for url in sku_images.get(sku, []):
                        if url not in seen:
                            seen.add(url)
                            images.append(url)
                return images
            # Fallback: single query (detail / other actions)
            from designers.models import DesignerSheet
            sheets = DesignerSheet.objects.filter(sku__in=skus).only(
                'sku', 'rendered_photo', 'image', 'designer_image_2', 'designer_image_3', 'technical_drawing'
            )
            for sheet in sheets:
                for url in (sheet.rendered_photo, sheet.image, sheet.designer_image_2, sheet.designer_image_3, sheet.technical_drawing):
                    if url and url not in seen:
                        seen.add(url)
                        images.append(url)
            return images
        except Exception:
            return []

    def _sync_images(self, instance):
        try:
            skus = [s for s in (instance.designer_skus or []) if s]
            if not skus:
                return
            from designers.models import DesignerSheet
            sheets = DesignerSheet.objects.filter(sku__in=skus).only(
                'sku', 'rendered_photo', 'image', 'designer_image_2', 'designer_image_3', 'technical_drawing'
            )
            design_imgs = []
            existing_image = instance.image or ''
            existing_imgs = []
            if existing_image:
                if existing_image.startswith('['):
                    try:
                        import json
                        parsed = json.loads(existing_image)
                        if isinstance(parsed, list):
                            existing_imgs = [str(x) for x in parsed]
                        else:
                            existing_imgs = [str(parsed)]
                    except Exception:
                        existing_imgs = [existing_image]
                elif ',' in existing_image:
                    existing_imgs = [x.strip() for x in existing_image.split(',') if x.strip()]
                else:
                    existing_imgs = [existing_image]

            seen = set(existing_imgs)
            for sheet in sheets:
                for url in (sheet.rendered_photo, sheet.image, sheet.designer_image_2, sheet.designer_image_3, sheet.technical_drawing):
                    if url and url not in seen:
                        seen.add(url)
                        design_imgs.append(url)

            if design_imgs:
                combined = existing_imgs + design_imgs
                import json
                instance.image = json.dumps(combined)
                instance.save(update_fields=['image', 'updated_at'])
        except Exception:
            pass

    @transaction.atomic
    def create(self, validated_data):
        instance = super().create(validated_data)
        self._sync_images(instance)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._sync_images(instance)
        return instance

    class Meta:
        model = DieInventoryItem
        fields = [
            'id', 'die_code', 'image', 'designer_images', 'master_skus', 'designer_skus',
            'sku_qty_per_piece', 'tenant_id', 'company_id',
            'location', 'quantity',
            'wax_piece_qty', 'wax_piece_location',
            'wax_piece_min', 'wax_piece_wip',
            'wax_setting_qty', 'wax_setting_location',
            'wax_setting_min', 'wax_setting_wip',
            'casting_qty', 'casting_location',
            'casting_min', 'casting_wip',
            'filling_min', 'filling_current', 'filling_wip', 'filling_location',
            'pre_polish_min', 'pre_polish_current', 'pre_polish_wip', 'pre_polish_location',
            'hand_setting_min', 'hand_setting_current', 'hand_setting_wip', 'hand_setting_location',
            'final_polish_min', 'final_polish_current', 'final_polish_wip', 'final_polish_location',
            'plating_min', 'plating_current', 'plating_wip', 'plating_location',
            'notes', 'used_qty', 'min_level',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'tenant', 'company', 'tenant_id', 'company_id']


class DieTransactionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = DieTransaction
        fields = [
            'id', 'txn_date', 'die', 'die_code', 'txn_type', 'inventory_type',
            'master_sku', 'designer_sku', 'location', 'qty',
            'wax_piece_qty', 'wax_piece_location',
            'wax_setting_qty', 'wax_setting_location',
            'casting_qty', 'casting_location',
            'price', 'amount',
            'received_from', 'issued_to', 'remark', 'activity_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class RepairBatchSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = RepairBatch
        fields = ['id', 'batch_no', 'date', 'confirmed', 'confirmed_at', 'voucher_created', 'items_count', 'tenant_id', 'company_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'confirmed_at', 'tenant', 'company', 'tenant_id', 'company_id', 'created_at', 'updated_at']


class RepairItemSerializer(serializers.ModelSerializer):
	batch_no = serializers.CharField(source='batch.batch_no', read_only=True, default='')

	class Meta:
		model = RepairItem
		fields = [
			'id', 'repair_item_id', 'product', 'sku', 'variant', 'quantity',
			'repair_stage', 'repair_stage_label', 'resolved_by', 'scanned_at',
			'confirmed', 'confirmed_at', 'sent_to_repair', 'batch', 'batch_no',
			'created_at', 'updated_at'
		]
		read_only_fields = ['id', 'confirmed_at', 'created_at', 'updated_at']

