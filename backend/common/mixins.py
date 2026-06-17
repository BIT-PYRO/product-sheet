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

    def _audit_sheet(self):
        return getattr(self, 'audit_sheet', 'other')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        if getattr(self, 'bypass_standard_logging', False):
            return
        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(
                getattr(self, 'request', None),
                ActivityLog.ACTION_CREATE,
                self._audit_sheet(),
                serializer.instance,
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        if getattr(self, 'bypass_standard_logging', False):
            super().perform_update(serializer)
            return
        try:
            from common.audit import serialize_instance
            old_data = serialize_instance(serializer.instance)
        except Exception:
            old_data = None
        super().perform_update(serializer)
        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(
                getattr(self, 'request', None),
                ActivityLog.ACTION_UPDATE,
                self._audit_sheet(),
                serializer.instance,
                old_data=old_data,
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        """Log the deletion before removing the record."""
        if getattr(self, 'bypass_standard_logging', False):
            self._record_deletion(instance)
            super().perform_destroy(instance)
            return
        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(
                getattr(self, 'request', None),
                ActivityLog.ACTION_DELETE,
                self._audit_sheet(),
                instance,
            )
        except Exception:
            pass
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
            tenant = None
            company = None

            if hasattr(instance, 'tenant') and getattr(instance, 'tenant', None) is not None:
                tenant = instance.tenant
            if hasattr(instance, 'company') and getattr(instance, 'company', None) is not None:
                company = instance.company

            from core_tenants.context import get_current_tenant, get_current_company
            if not tenant:
                tenant = get_current_tenant()
            if not company:
                company = get_current_company()

            if not tenant and request is not None:
                tenant = getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if getattr(request, 'user', None) and request.user.is_authenticated else None)
            if not company and request is not None:
                company = getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if getattr(request, 'user', None) and request.user.is_authenticated else None)

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
                tenant=tenant,
                company=company,
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
