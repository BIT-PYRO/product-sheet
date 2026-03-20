from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    def validate_title(self, value):
        if value:
            clean_title = value.strip()
            if not clean_title:
                raise serializers.ValidationError('Job title cannot be blank.')
            return clean_title
        return value
    
    def validate(self, data):
        # For jewelry jobs, product is required
        if not data.get('job_type') and not data.get('product'):
            # If it's a generic job, job_type should be set
            if not data.get('job_type'):
                raise serializers.ValidationError('Either product (for jewelry jobs) or job_type (for generic jobs) must be provided.')
        
        # For generic jobs with issued_by, validate required fields
        if data.get('issued_by'):
            # This is a generic job, issued_by is set
            if not data.get('job_type'):
                raise serializers.ValidationError('job_type is required for generic jobs.')
        
        return data

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
