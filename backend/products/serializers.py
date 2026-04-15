from rest_framework import serializers

from .models import Category, Channel, Collection, Material, Product, TableColumnConfig


class CollectionSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'name', 'created_at']


class MaterialSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'name', 'created_at']


class CategorySerializer(serializers.ModelSerializer):
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
        fields = ['id', 'name', 'created_at']


class ChannelSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'name', 'created_at']


class TableColumnConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TableColumnConfig
        fields = ['id', 'table_type', 'key', 'label', 'order']


class ProductSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = Product
        fields = '__all__'
