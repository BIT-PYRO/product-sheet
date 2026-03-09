from rest_framework import serializers

from .models import Product


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
        if not value.strip():
            raise serializers.ValidationError('Product name cannot be blank.')
        return value.strip()

    def validate_sku(self, value):
        sku = value.strip()
        if not sku:
            raise serializers.ValidationError('SKU cannot be blank.')
        return sku

    class Meta:
        model = Product
        fields = '__all__'
