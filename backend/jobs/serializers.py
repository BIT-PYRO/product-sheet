from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):

    def get_picklist_name(self, obj):
        if obj.picklist_group_id and hasattr(obj, 'picklist_group') and obj.picklist_group:
            return obj.picklist_group.name or ''
        return ''

    def get_order_name(self, obj):
        if obj.picklist_group_id and hasattr(obj, 'picklist_group') and obj.picklist_group:
            return f"PICKLIST-{obj.picklist_group.number}"
        return ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['picklist_name'] = self.get_picklist_name(instance)
        data['order_name'] = self.get_order_name(instance)
        return data

    def create(self, validated_data):
        # Ensure job_type has a default if not provided
        if not validated_data.get('job_type'):
            validated_data['job_type'] = 'Generic Job'
        return super().create(validated_data)

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'company', 'tenant_id', 'company_id', 'created_at', 'updated_at')


class BulkVoucherRequestSerializer(serializers.Serializer):
    picklist_group_id = serializers.IntegerField(help_text='ID of the picklist group to generate vouchers for')
    approved_by = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)


class ApproveVouchersSerializer(serializers.Serializer):
    voucher_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='List of job/voucher IDs to approve',
    )
    approved_by = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
