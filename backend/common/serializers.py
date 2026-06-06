from rest_framework import serializers

from common.models import ActivityLog, DeletionLog


class DeletionLogSerializer(serializers.ModelSerializer):
    deleted_by_username = serializers.SerializerMethodField()

    class Meta:
        model = DeletionLog
        fields = [
            'id',
            'deleted_at',
            'deleted_by',
            'deleted_by_username',
            'deleted_by_name',
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


class ActivityLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    changes_count = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'timestamp',
            'user',
            'user_name',
            'user_display',
            'action',
            'sheet',
            'model_name',
            'object_id',
            'object_repr',
            'changes',
            'changes_count',
            'rows_affected',
            'ip_address',
            'extra',
        ]
        read_only_fields = fields

    def get_user_display(self, obj):
        if obj.user:
            full = f'{obj.user.first_name} {obj.user.last_name}'.strip()
            return full or obj.user.username
        return obj.user_name or 'Unknown'

    def get_changes_count(self, obj):
        if isinstance(obj.changes, dict):
            return len(obj.changes)
        return 0
