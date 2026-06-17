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

        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None

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
                created_by=user,
                updated_by=user,
            )
            for item in items_data
            if str(item.get('sku', '')).strip()
        ])

        return group


    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None

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
                    created_by=user,
                    updated_by=user,
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
        """Return a deduplicated list of image URLs from both DesignerSheet and Product records.

        For list actions the ViewSet injects precomputed ``sku_images`` and ``product_images``
        dicts into the serializer context so this method performs zero extra DB queries. For
        detail/other actions it falls back to single filter queries.
        """
        try:
            skus = [s for s in (obj.designer_skus or []) if s]
            master_skus = [s for s in (obj.master_skus or []) if s]
            if not skus and not master_skus:
                return []
            seen = set()
            images = []
            
            # Check context optimization
            sku_images = self.context.get('sku_images')
            product_images = self.context.get('product_images')
            
            if sku_images is not None or product_images is not None:
                if sku_images is not None:
                    for sku in skus:
                        for url in sku_images.get(sku, []):
                            if url not in seen:
                                seen.add(url)
                                images.append(url)
                if product_images is not None:
                    for sku in master_skus:
                        for url in product_images.get(sku, []):
                            if url not in seen:
                                seen.add(url)
                                images.append(url)
                from common.image_upload import sign_cloudinary_url
                return [sign_cloudinary_url(url) for url in images]
                
            # Fallback: single query (detail / other actions)
            from designers.models import DesignerSheet
            from products.models import Product
            
            if skus:
                sheets = DesignerSheet.objects.filter(sku__in=skus).only(
                    'sku', 'rendered_photo', 'image', 'designer_image_2', 'designer_image_3', 'technical_drawing'
                )
                for sheet in sheets:
                    for url in (sheet.rendered_photo, sheet.image, sheet.designer_image_2, sheet.designer_image_3, sheet.technical_drawing):
                        if url and url not in seen:
                            seen.add(url)
                            images.append(url)
                            
            if master_skus:
                products = Product.objects.filter(master_sku__in=master_skus).only('images')
                for prod in products:
                    raw_imgs = prod.images if isinstance(prod.images, list) else []
                    for url in raw_imgs:
                        if isinstance(url, dict):
                            url = url.get('url') or url.get('src') or ''
                        if url and url not in seen:
                            seen.add(url)
                            images.append(url)
                            
            from common.image_upload import sign_cloudinary_url
            return [sign_cloudinary_url(url) for url in images]
        except Exception:
            return []

    def _process_images(self, validated_data, instance=None):
        from common.image_upload import upload_image_base64, unsign_cloudinary_url
        import uuid

        die_code = (
            validated_data.get('die_code')
            or (instance.die_code if instance else '')
            or 'unknown'
        )
        safe_die_code = die_code.replace('/', '-').replace(' ', '-').strip('-') or 'unknown'
        folder = f'dies/{safe_die_code}'

        raw_image = validated_data.get('image') or ''

        # Parse raw_image into a list of image items
        imgs = []
        if raw_image:
            raw_image = raw_image.strip()
            if raw_image.startswith('['):
                try:
                    import json
                    parsed = json.loads(raw_image)
                    if isinstance(parsed, list):
                        imgs = [str(x) for x in parsed]
                    else:
                        imgs = [str(parsed)]
                except Exception:
                    imgs = [raw_image]
            elif ',' in raw_image:
                imgs = [x.strip() for x in raw_image.split(',') if x.strip()]
            else:
                imgs = [raw_image]

        processed = []
        for idx, img in enumerate(imgs):
            img = img.strip()
            if not img:
                continue
            if img.startswith('data:image/'):
                # Upload to cloudinary
                url = upload_image_base64(img, folder=folder, public_id=f'image_{idx + 1}_{uuid.uuid4().hex[:6]}')
                if url and not url.startswith('data:image/'):
                    processed.append(unsign_cloudinary_url(url))
            else:
                processed.append(unsign_cloudinary_url(img))

        # Store as JSON list string (unsigned URLs)
        import json
        validated_data['image'] = json.dumps(processed)
        return validated_data

    def _sync_images(self, instance):
        try:
            skus = [s for s in (instance.designer_skus or []) if s]
            master_skus = [s for s in (instance.master_skus or []) if s]
            if not skus and not master_skus:
                return
            from designers.models import DesignerSheet
            from products.models import Product
            from common.image_upload import unsign_cloudinary_url
            
            design_imgs = []
            seen = set()

            # 1. Fetch from DesignerSheet
            if skus:
                sheets = DesignerSheet.objects.filter(sku__in=skus).only(
                    'sku', 'rendered_photo', 'image', 'designer_image_2', 'designer_image_3', 'technical_drawing'
                )
                for sheet in sheets:
                    for url in (sheet.rendered_photo, sheet.image, sheet.designer_image_2, sheet.designer_image_3, sheet.technical_drawing):
                        if url:
                            clean_url = unsign_cloudinary_url(url)
                            if clean_url not in seen:
                                seen.add(clean_url)
                                design_imgs.append(clean_url)

            # 2. Fetch from Product (Master product sheet)
            if master_skus:
                products = Product.objects.filter(master_sku__in=master_skus).only('images')
                for prod in products:
                    raw_imgs = prod.images if isinstance(prod.images, list) else []
                    for url in raw_imgs:
                        if isinstance(url, dict):
                            url = url.get('url') or url.get('src') or ''
                        if url:
                            clean_url = unsign_cloudinary_url(url)
                            if clean_url not in seen:
                                seen.add(clean_url)
                                design_imgs.append(clean_url)

            # Gather custom images from instance.image
            existing_image = instance.image or ''
            existing_imgs = []
            if existing_image:
                if existing_image.startswith('['):
                    try:
                        import json
                        parsed = json.loads(existing_image)
                        if isinstance(parsed, list):
                            existing_imgs = [unsign_cloudinary_url(str(x)) for x in parsed]
                        else:
                            existing_imgs = [unsign_cloudinary_url(str(parsed))]
                    except Exception:
                        existing_imgs = [unsign_cloudinary_url(existing_image)]
                elif ',' in existing_image:
                    existing_imgs = [unsign_cloudinary_url(x.strip()) for x in existing_image.split(',') if x.strip()]
                else:
                    existing_imgs = [unsign_cloudinary_url(existing_image)]

            # Combine custom images (taking priority) with fallback images
            final_seen = set(existing_imgs)
            fallback_to_add = [url for url in design_imgs if url not in final_seen]

            combined = existing_imgs + fallback_to_add
            import json
            instance.image = json.dumps(combined)
            instance.save(update_fields=['image', 'updated_at'])
        except Exception:
            pass

    @transaction.atomic
    def create(self, validated_data):
        validated_data = self._process_images(validated_data)
        instance = super().create(validated_data)
        self._sync_images(instance)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        validated_data = self._process_images(validated_data, instance)
        instance = super().update(instance, validated_data)
        self._sync_images(instance)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_img = data.get('image') or ''
        if raw_img:
            from common.image_upload import sign_cloudinary_url
            if raw_img.startswith('['):
                try:
                    import json
                    parsed = json.loads(raw_img)
                    if isinstance(parsed, list):
                        signed_imgs = [sign_cloudinary_url(str(x)) for x in parsed]
                        data['image'] = json.dumps(signed_imgs)
                    else:
                        data['image'] = sign_cloudinary_url(str(parsed))
                except Exception:
                    data['image'] = sign_cloudinary_url(raw_img)
            elif ',' in raw_img:
                parts = [x.strip() for x in raw_img.split(',') if x.strip()]
                signed_parts = [sign_cloudinary_url(x) for x in parts]
                data['image'] = ', '.join(signed_parts)
            else:
                data['image'] = sign_cloudinary_url(raw_img)
        return data

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

