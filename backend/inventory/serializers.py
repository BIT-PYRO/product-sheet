from rest_framework import serializers

from .models import InventoryTransaction


class InventoryTransactionSerializer(serializers.ModelSerializer):
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError('Quantity cannot be zero.')
        return value

    def validate_remark(self, value):
        return value.strip()

    class Meta:
        model = InventoryTransaction
        fields = '__all__'
