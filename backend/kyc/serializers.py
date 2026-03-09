from rest_framework import serializers

from .models import KYCStatus
from .models import KYCRecord


class KYCRecordSerializer(serializers.ModelSerializer):
	def validate(self, attrs):
		status_value = attrs.get('status', getattr(self.instance, 'status', KYCStatus.PENDING))
		id_number = attrs.get('id_number', getattr(self.instance, 'id_number', ''))
		if status_value == KYCStatus.APPROVED and not str(id_number).strip():
			raise serializers.ValidationError('id_number is required when KYC status is approved.')
		return attrs

	def validate_id_number(self, value):
		return value.strip()

	class Meta:
		model = KYCRecord
		fields = '__all__'
