from rest_framework import serializers

from .models import DesignerSheet


class DesignerSheetSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(required=False, allow_blank=True, default='', label='Designer SKU')

    def validate_sku(self, value):
        return value.strip() if value else ''

    class Meta:
        model = DesignerSheet
        fields = '__all__'
