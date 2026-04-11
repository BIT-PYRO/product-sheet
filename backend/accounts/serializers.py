from rest_framework import serializers

from .models import RoleDefaultPermissions, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_approved', 'is_superuser')


class RoleDefaultPermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleDefaultPermissions
        fields = ('role', 'department', 'permissions')
