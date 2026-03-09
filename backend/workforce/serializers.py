from rest_framework import serializers

from .models import WorkforceMember


class WorkforceMemberSerializer(serializers.ModelSerializer):
	def validate_full_name(self, value):
		clean_name = value.strip()
		if not clean_name:
			raise serializers.ValidationError('Full name cannot be blank.')
		return clean_name

	def validate_phone(self, value):
		return value.strip()

	class Meta:
		model = WorkforceMember
		fields = '__all__'
