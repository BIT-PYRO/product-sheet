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
