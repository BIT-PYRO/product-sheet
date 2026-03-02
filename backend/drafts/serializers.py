from rest_framework import serializers

from .models import Draft


class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draft
        fields = "__all__"
        read_only_fields = ("id", "owner", "created_at", "updated_at")
