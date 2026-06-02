from rest_framework import serializers

from .models import Category, Channel, Collection, Material, Product, TableColumnConfig


# ---------------------------------------------------------------------------
# Lookup / Catalogue Serializers (tenant-scoped)
# ---------------------------------------------------------------------------

class CollectionSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be blank.')
        qs = Collection.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A collection with this name already exists.')
        return value

    class Meta:
        model = Collection
        fields = ['id', 'name', 'created_at', 'tenant_id']
        read_only_fields = ['id', 'created_at', 'tenant', 'tenant_id']


class MaterialSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be blank.')
        qs = Material.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A material with this name already exists.')
        return value

    class Meta:
        model = Material
        fields = ['id', 'name', 'created_at', 'tenant_id']
        read_only_fields = ['id', 'created_at', 'tenant', 'tenant_id']


class CategorySerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be blank.')
        qs = Category.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return value

    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at', 'tenant_id']
        read_only_fields = ['id', 'created_at', 'tenant', 'tenant_id']


class ChannelSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be blank.')
        qs = Channel.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A channel with this name already exists.')
        return value

    class Meta:
        model = Channel
        fields = ['id', 'name', 'created_at', 'tenant_id']
        read_only_fields = ['id', 'created_at', 'tenant', 'tenant_id']


class TableColumnConfigSerializer(serializers.ModelSerializer):
    tenant_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = TableColumnConfig
        fields = ['id', 'table_type', 'key', 'label', 'order', 'tenant_id']
        read_only_fields = ['id', 'tenant', 'tenant_id']


# ---------------------------------------------------------------------------
# Product Serializer
# ---------------------------------------------------------------------------

class ProductSerializer(serializers.ModelSerializer):
    # tenant and company are server-assigned — frontend must never modify them
    tenant_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)

    def validate(self, attrs):
        selling_price = attrs.get('selling_price', getattr(self.instance, 'selling_price', 0))
        cost_price = attrs.get('cost_price', getattr(self.instance, 'cost_price', 0))
        if selling_price < 0 or cost_price < 0:
            raise serializers.ValidationError('Selling and cost prices must be non-negative.')
        if selling_price < cost_price:
            raise serializers.ValidationError('Selling price cannot be lower than cost price.')
        return attrs

    def validate_name(self, value):
        return value.strip()

    def validate_master_sku(self, value):
        sku = value.strip()
        if not sku:
            raise serializers.ValidationError('Master SKU cannot be blank.')
        return sku

    def _process_images(self, validated_data, instance=None):
        """Upload any base64 data URIs in the images list to Cloudinary.
        Raw base64 is never stored in the database."""
        from common.image_upload import upload_image_base64

        images = validated_data.get('images')
        if not isinstance(images, list):
            return validated_data

        sku = (
            validated_data.get('master_sku')
            or (instance.master_sku if instance else '')
            or 'unknown'
        )
        safe_sku = sku.replace('/', '-').replace(' ', '-').strip('-') or 'unknown'
        folder = f'products/{safe_sku}'

        processed = []
        for idx, img in enumerate(images):
            if isinstance(img, str) and img.startswith('data:image/'):
                url = upload_image_base64(img, folder=folder, public_id=f'image_{idx + 1}')
                if url and not url.startswith('data:image/'):
                    processed.append(url)
                # upload failed or unsupported MIME — skip; never store raw base64
            elif isinstance(img, str) and img:
                processed.append(img)  # already a URL

        validated_data['images'] = processed
        return validated_data

    def create(self, validated_data):
        validated_data = self._process_images(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._process_images(validated_data, instance)
        return super().update(instance, validated_data)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id']
