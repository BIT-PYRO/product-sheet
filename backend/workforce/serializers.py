from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import WorkforceMember


class WorkforceMemberSerializer(serializers.ModelSerializer):
	user_is_approved = serializers.SerializerMethodField()

	def get_user_is_approved(self, obj):
		email = (obj.email or '').strip().lower()
		if not email:
			return None
		User = get_user_model()
		user = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
		if user is None:
			return None
		return user.is_approved

	def validate_full_name(self, value):
		clean_name = value.strip()
		if not clean_name:
			raise serializers.ValidationError('Full name cannot be blank.')
		return clean_name

	def validate_phone(self, value):
		return value.strip()

	def validate_email(self, value):
		return value.strip()

	def validate_dob(self, value):
		# Accept empty string as None
		return value

	class Meta:
		model = WorkforceMember
		fields = '__all__'
		read_only_fields = ['user_is_approved']
