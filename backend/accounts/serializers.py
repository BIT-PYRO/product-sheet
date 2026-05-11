from rest_framework import serializers

from .models import APIKey, RoleDefaultPermissions, SCOPE_CHOICES, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_approved', 'is_superuser')


class RoleDefaultPermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleDefaultPermissions
        fields = ('role', 'department', 'permissions')


# ---------------------------------------------------------------------------
# API Key serializers
# ---------------------------------------------------------------------------

class APIKeyListSerializer(serializers.ModelSerializer):
    """Used for list and retrieve responses — never exposes the raw key."""
    created_by_name = serializers.SerializerMethodField()
    scope_labels = serializers.SerializerMethodField()

    class Meta:
        model = APIKey
        fields = (
            'id', 'name', 'description', 'given_to',
            'key_prefix',
            'page_scopes', 'scope_labels',
            'can_read', 'can_write', 'can_comment',
            'is_active', 'last_used_at',
            'created_at', 'updated_at', 'created_by_name',
        )
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_scope_labels(self, obj):
        return [SCOPE_CHOICES.get(s, s) for s in (obj.page_scopes or [])]


class APIKeyCreateSerializer(serializers.Serializer):
    """Validates the payload when creating a new key."""
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(allow_blank=True, default='')
    given_to = serializers.CharField(max_length=150, allow_blank=True, default='')
    page_scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=list(SCOPE_CHOICES.keys())),
        min_length=1,
    )
    can_read = serializers.BooleanField(default=True)
    can_write = serializers.BooleanField(default=False)
    can_comment = serializers.BooleanField(default=False)

    def validate_page_scopes(self, value):
        invalid = [s for s in value if s not in SCOPE_CHOICES]
        if invalid:
            raise serializers.ValidationError(f'Unknown scope(s): {invalid}')
        return list(set(value))  # deduplicate


class APIKeyUpdateSerializer(serializers.ModelSerializer):
    """Used for partial updates (PATCH)."""
    page_scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=list(SCOPE_CHOICES.keys())),
        required=False,
        min_length=1,
    )

    class Meta:
        model = APIKey
        fields = (
            'name', 'description', 'given_to',
            'page_scopes', 'can_read', 'can_write', 'can_comment',
            'is_active',
        )

    def validate_page_scopes(self, value):
        invalid = [s for s in value if s not in SCOPE_CHOICES]
        if invalid:
            raise serializers.ValidationError(f'Unknown scope(s): {invalid}')
        return list(set(value))
