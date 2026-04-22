import json

from django.core import serializers as django_serializers
from rest_framework.response import Response


class StandardizedSuccessResponseMixin:
    action_messages = {
        "list": "Records fetched successfully.",
        "retrieve": "Record fetched successfully.",
        "create": "Record created successfully.",
        "update": "Record updated successfully.",
        "partial_update": "Record updated successfully.",
        "destroy": "Record deleted successfully.",
    }

    def perform_destroy(self, instance):
        """Log the deletion before removing the record."""
        self._record_deletion(instance)
        super().perform_destroy(instance)

    def _record_deletion(self, instance):
        from common.models import DeletionLog
        try:
            request = getattr(self, 'request', None)
            user = None
            deleted_by_name = ''
            if request is not None:
                u = getattr(request, 'user', None)
                if u is not None and u.is_authenticated:
                    user = u
                    full = f'{u.first_name} {u.last_name}'.strip()
                    deleted_by_name = full or u.username or ''
            raw = json.loads(django_serializers.serialize('json', [instance]))
            fields = raw[0].get('fields', {}) if raw else {}
            DeletionLog.objects.create(
                deleted_by=user,
                deleted_by_name=deleted_by_name,
                app_label=instance._meta.app_label,
                model_name=instance._meta.model_name,
                object_id=str(instance.pk),
                object_repr=str(instance)[:500],
                serialized_data=fields,
            )
        except Exception:
            pass  # Never block a deletion

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)

        if not isinstance(response, Response):
            return response

        if not (200 <= response.status_code < 300):
            return response

        if isinstance(response.data, dict) and "success" in response.data:
            return response

        message = self.action_messages.get(getattr(self, "action", None), "Request completed successfully.")
        response.data = {
            "success": True,
            "message": message,
            "data": response.data,
        }
        return response
