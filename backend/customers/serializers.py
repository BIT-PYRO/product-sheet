from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    def validate_company_name(self, value):
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError('Company name cannot be blank.')
        return clean

    def validate_gst_number(self, value):
        return value.strip()

    def validate_pan_number(self, value):
        return value.strip()

    def validate_mobile(self, value):
        return value.strip()

    def validate_ifsc(self, value):
        return value.strip().upper()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by', 'updated_by')
