"""
Centralised audit-logging helpers.

Usage inside a ViewSet (or any request-aware context):

    from common.audit import log_activity
    from common.models import ActivityLog

    log_activity(request, ActivityLog.ACTION_CREATE, 'product', instance)
"""

from __future__ import annotations

import logging
from typing import Any

from django.db import models as _db_models

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# IP extraction
# ---------------------------------------------------------------------------

def get_client_ip(request) -> str | None:
    """Return the real client IP, honouring X-Forwarded-For if present."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


# ---------------------------------------------------------------------------
# Instance serialisation helpers
# ---------------------------------------------------------------------------

def _coerce_value(value: Any) -> Any:
    """Make a field value JSON-safe."""
    if hasattr(value, 'name'):
        # FileField / ImageField — store just the filename string
        return str(value.name) if value.name else None
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, (_db_models.Model,)):
        return value.pk
    return value


def serialize_instance(instance) -> dict:
    """
    Return a plain dict of all non-private fields from *instance*.
    Suitable for storing a snapshot before an update.
    """
    data = {}
    for field in instance._meta.get_fields():
        if not hasattr(field, 'attname'):
            continue  # skip reverse relations / M2M without attname
        attr = field.attname
        try:
            data[attr] = _coerce_value(getattr(instance, attr, None))
        except Exception:
            pass
    return data


def detect_file_fields(instance) -> list[str]:
    """Return a list of FileField / ImageField *attname* values on this instance."""
    file_fields = []
    for field in instance._meta.get_fields():
        if isinstance(field, (_db_models.FileField,)):  # ImageField is a subclass of FileField
            file_fields.append(field.attname)
    return file_fields


# ---------------------------------------------------------------------------
# Diff computation
# ---------------------------------------------------------------------------

def compute_diff(old_data: dict, new_data: dict) -> dict:
    """
    Return only the fields that changed between *old_data* and *new_data*.

    Format: {field_name: {"old": <old_value>, "new": <new_value>}}
    """
    diff = {}
    all_keys = set(old_data) | set(new_data)
    for key in all_keys:
        old_val = old_data.get(key)
        new_val = new_data.get(key)
        # Normalise to string for comparison to avoid int/str false-positives
        if str(old_val) != str(new_val):
            diff[key] = {'old': old_val, 'new': new_val}
    return diff


# ---------------------------------------------------------------------------
# Core logging function
# ---------------------------------------------------------------------------

def log_activity(
    request,
    action: str,
    sheet: str,
    instance,
    old_data: dict | None = None,
    rows_affected: int = 1,
    extra: dict | None = None,
) -> None:
    """
    Create one (or more) ActivityLog rows for *instance*.

    - action='update' with *old_data* provided → computes field-level diff.
    - If file fields changed during an update, an additional 'upload' log is
      created so file uploads are surfaced as their own log type.
    - Never raises; all errors are swallowed so audit logging never blocks
      the main request.
    """
    from common.models import ActivityLog  # local import to avoid circular deps

    try:
        # --- resolve user info ---
        user = None
        user_name = ''
        if request is not None:
            u = getattr(request, 'user', None)
            if u is not None and u.is_authenticated:
                user = u
                full = f'{u.first_name} {u.last_name}'.strip()
                user_name = full or u.username or ''

        # --- changes / diff ---
        changes: dict = {}
        upload_files: list = []

        if action == ActivityLog.ACTION_UPDATE and old_data is not None:
            new_data = serialize_instance(instance)
            changes = compute_diff(old_data, new_data)

            # Detect file fields that changed
            file_field_names = detect_file_fields(instance)
            for fname in file_field_names:
                if fname in changes:
                    new_val = changes[fname].get('new')
                    if new_val:
                        upload_files.append({
                            'field': fname,
                            'old': changes[fname].get('old'),
                            'new': new_val,
                        })

        ip = get_client_ip(request) if request is not None else None

        # --- resolve tenant and company context ---
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

        # --- primary log entry ---
        ActivityLog.objects.create(
            user=user,
            user_name=user_name,
            action=action,
            sheet=sheet,
            model_name=instance._meta.model_name,
            object_id=str(instance.pk),
            object_repr=str(instance)[:500],
            changes=changes,
            rows_affected=rows_affected,
            ip_address=ip,
            extra=extra or {},
            tenant=tenant,
            company=company,
        )

        # --- secondary upload entry (one per file that changed) ---
        for uf in upload_files:
            ActivityLog.objects.create(
                user=user,
                user_name=user_name,
                action=ActivityLog.ACTION_UPLOAD,
                sheet=sheet,
                model_name=instance._meta.model_name,
                object_id=str(instance.pk),
                object_repr=str(instance)[:500],
                changes={'files': [uf]},
                rows_affected=1,
                ip_address=ip,
                extra={'source_action': action},
                tenant=tenant,
                company=company,
            )

    except Exception:
        logger.exception('audit log_activity failed silently')
