from rest_framework import serializers

from .models import Draft


class DraftSerializer(serializers.ModelSerializer):
    def validate_entity_type(self, value):
        clean_value = value.strip()
        if not clean_value:
            raise serializers.ValidationError('entity_type cannot be blank.')
        return clean_value

    def validate_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('payload must be a JSON object.')
        return value

    class Meta:
        model = Draft
        fields = "__all__"
        read_only_fields = ("id", "owner", "created_at", "updated_at")
