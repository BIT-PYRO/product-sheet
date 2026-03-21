from rest_framework import serializers

from .models import Finding


class FindingSerializer(serializers.ModelSerializer):
    def validate_finding_code(self, value):
        code = value.strip()
        if not code:
            raise serializers.ValidationError('Finding code cannot be blank.')
        return code

    class Meta:
        model = Finding
        fields = '__all__'
