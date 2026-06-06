from rest_framework import serializers

from .models import Draft


LIVE_STOCK_FIELD_KEYS = ('min', 'current', 'wip', 'location')


def _has_stock_data(row):
    return any(str(row.get(key, '')).strip() for key in LIVE_STOCK_FIELD_KEYS)


def _merge_stock_rows(primary, fallback):
    merged = dict(primary or {})
    for key in LIVE_STOCK_FIELD_KEYS:
        if str(merged.get(key, '')).strip():
            continue
        merged[key] = (fallback or {}).get(key, '')
    return merged


def _sanitize_live_stock(live_stock):
    if not isinstance(live_stock, dict):
        return live_stock

    casting = live_stock.get('wipLiquidCasting', {})
    for legacy_key in ('postCasting', 'finalCasting', 'dustunuing'):
        legacy_value = live_stock.get(legacy_key, {})
        if _has_stock_data(casting):
            break
        if _has_stock_data(legacy_value):
            casting = _merge_stock_rows(casting, legacy_value)

    sanitized = dict(live_stock)
    sanitized['wipLiquidCasting'] = casting
    sanitized.pop('postCasting', None)
    sanitized.pop('finalCasting', None)
    sanitized.pop('dustunuing', None)
    return sanitized


def _sanitize_payload(payload):
    if isinstance(payload, dict):
        sanitized = {}
        for key, value in payload.items():
            if key == 'liveStock':
                sanitized[key] = _sanitize_live_stock(value)
            else:
                sanitized[key] = _sanitize_payload(value)
        return sanitized
    if isinstance(payload, list):
        return [_sanitize_payload(item) for item in payload]
    return payload


class DraftSerializer(serializers.ModelSerializer):
    def validate_entity_type(self, value):
        clean_value = value.strip()
        if not clean_value:
            raise serializers.ValidationError('entity_type cannot be blank.')
        return clean_value

    def validate_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('payload must be a JSON object.')
        return _sanitize_payload(value)

    class Meta:
        model = Draft
        fields = "__all__"
        read_only_fields = ("id", "owner", "tenant", "company", "tenant_id", "company_id", "created_at", "updated_at")
