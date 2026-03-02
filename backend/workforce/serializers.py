from rest_framework import serializers

from .models import WorkforceMember


class WorkforceMemberSerializer(serializers.ModelSerializer):
	class Meta:
		model = WorkforceMember
		fields = '__all__'
