from rest_framework import serializers

from common.models import DeletionLog


class DeletionLogSerializer(serializers.ModelSerializer):
    deleted_by_username = serializers.SerializerMethodField()

    class Meta:
        model = DeletionLog
        fields = [
            'id',
            'deleted_at',
            'deleted_by',
            'deleted_by_username',
            'app_label',
            'model_name',
            'object_id',
            'object_repr',
            'serialized_data',
        ]
        read_only_fields = fields

    def get_deleted_by_username(self, obj):
        if obj.deleted_by:
            full = f'{obj.deleted_by.first_name} {obj.deleted_by.last_name}'.strip()
            return full or obj.deleted_by.username
        return None
