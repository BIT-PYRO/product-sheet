import os
import re as _re
from urllib.parse import urlparse as _urlparse

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import WorkforceMember


def _sign_cloudinary_url(url: str) -> str:
    """
    Sign a Cloudinary delivery URL using the backend SDK credentials.
    Required when the account has 'Require Signed URLs' enabled.
    Returns the original URL unchanged if signing fails.
    """
    try:
        import cloudinary.utils as _cld_utils
        parsed = _urlparse(url)
        parts = [p for p in (parsed.path or '').strip('/').split('/') if p]
        upload_idx = next((i for i, p in enumerate(parts) if p == 'upload'), None)
        if upload_idx is None:
            return url
        resource_type = parts[upload_idx - 1] if upload_idx > 0 else 'raw'
        after = parts[upload_idx + 1:]
        # Strip existing signature token (s--...--) and version (v1234567890)
        if after and _re.match(r'^s--[A-Za-z0-9_-]+--$', after[0]):
            after = after[1:]
        if after and _re.match(r'^v\d+$', after[0]):
            after = after[1:]
        public_id = '/'.join(after)
        if not public_id:
            return url
        signed, _ = _cld_utils.cloudinary_url(public_id, resource_type=resource_type, sign_url=True)
        return signed or url
    except Exception:
        return url


class WorkforceMemberSerializer(serializers.ModelSerializer):
	user_is_approved = serializers.SerializerMethodField()
	user_is_superuser = serializers.SerializerMethodField()
	user_is_active = serializers.SerializerMethodField()

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

	def get_user_is_active(self, obj):
		user = self._get_user_for_email(obj)
		if user is None:
			return None
		return user.is_active

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

	def to_representation(self, instance):
		data = super().to_representation(instance)
		# Sign Cloudinary document URLs at the API boundary so the frontend always
		# receives a deliverable signed URL, regardless of "Require Signed URLs" setting.
		if os.environ.get('CLOUDINARY_URL'):
			for field in ('aadhaar_url', 'pan_url'):
				url = data.get(field) or ''
				if url and 'cloudinary.com' in url:
					data[field] = _sign_cloudinary_url(url)
		return data

	class Meta:
		model = WorkforceMember
		fields = '__all__'
		read_only_fields = ['tenant', 'company', 'tenant_id', 'company_id', 'user_is_approved', 'user_is_superuser', 'user_is_active']
