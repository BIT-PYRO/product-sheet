from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import WorkforceMember


class WorkforceMemberSerializer(serializers.ModelSerializer):
	user_is_approved = serializers.SerializerMethodField()
	user_is_superuser = serializers.SerializerMethodField()

	def _get_user_for_email(self, obj):
		email = (obj.email or '').strip().lower()
		if not email:
			return None
		User = get_user_model()
		return User.objects.filter(email=email).first() or User.objects.filter(username=email).first()

	def get_user_is_approved(self, obj):
		user = self._get_user_for_email(obj)
		if user is None:
			return None
		return user.is_approved

	def get_user_is_superuser(self, obj):
		user = self._get_user_for_email(obj)
		if user is None:
			return False
		return user.is_superuser

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
		if value == '' or value is None:
			return None
		return value

	class Meta:
		model = WorkforceMember
		fields = '__all__'
		read_only_fields = ['user_is_approved', 'user_is_superuser']
