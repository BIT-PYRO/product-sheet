from rest_framework import serializers
from .models import Feature
from core_tenants.serializers import TenantSerializer, CompanySerializer

class FeatureSerializer(serializers.ModelSerializer):
    feature_code = serializers.CharField(source='code')
    
    class Meta:
        model = Feature
        fields = ('id', 'name', 'feature_code', 'description', 'category', 'is_active', 'is_deprecated', 'is_beta', 'min_plan_name', 'route', 'icon')

# Expose serializers to platform_admin package
__all__ = ['TenantSerializer', 'CompanySerializer', 'FeatureSerializer']
