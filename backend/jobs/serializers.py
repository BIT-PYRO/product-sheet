from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        # Ensure job_type has a default if not provided
        if not validated_data.get('job_type'):
            validated_data['job_type'] = 'Generic Job'
        return super().create(validated_data)

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class BulkVoucherRequestSerializer(serializers.Serializer):
    picklist_group_id = serializers.IntegerField(help_text='ID of the picklist group to generate vouchers for')
    approved_by = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)


class ApproveVouchersSerializer(serializers.Serializer):
    voucher_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='List of job/voucher IDs to approve',
    )
    approved_by = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
