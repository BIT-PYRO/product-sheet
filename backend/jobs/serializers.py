from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    def validate_title(self, value):
        clean_title = value.strip()
        if not clean_title:
            raise serializers.ValidationError('Job title cannot be blank.')
        return clean_title

    class Meta:
        model = Job
        fields = '__all__'
