from rest_framework import serializers

from .models import DesignerSheet


class DesignerSheetSerializer(serializers.ModelSerializer):
    def validate_sku(self, value):
        sku = value.strip()
        if not sku:
            raise serializers.ValidationError('SKU cannot be blank.')
        return sku

    class Meta:
        model = DesignerSheet
        fields = '__all__'
