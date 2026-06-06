from django.db import migrations


LIVE_STOCK_FIELD_KEYS = ('min', 'current', 'wip', 'location')


def has_stock_data(row):
    if not isinstance(row, dict):
        return False
    return any(str(row.get(key, '')).strip() for key in LIVE_STOCK_FIELD_KEYS)


def merge_stock_rows(primary, fallback):
    merged = dict(primary or {})
    for key in LIVE_STOCK_FIELD_KEYS:
        if str(merged.get(key, '')).strip():
            continue
        merged[key] = (fallback or {}).get(key, '')
    return merged


def sanitize_live_stock(live_stock):
    if not isinstance(live_stock, dict):
        return live_stock

    casting = live_stock.get('wipLiquidCasting', {})
    for legacy_key in ('postCasting', 'finalCasting', 'dustunuing'):
        legacy_value = live_stock.get(legacy_key, {})
        if has_stock_data(casting):
            break
        if has_stock_data(legacy_value):
            casting = merge_stock_rows(casting, legacy_value)

    sanitized = dict(live_stock)
    sanitized['wipLiquidCasting'] = casting
    sanitized.pop('postCasting', None)
    sanitized.pop('finalCasting', None)
    sanitized.pop('dustunuing', None)
    return sanitized


def sanitize_payload(payload):
    if isinstance(payload, dict):
        output = {}
        for key, value in payload.items():
            if key == 'liveStock':
                output[key] = sanitize_live_stock(value)
            else:
                output[key] = sanitize_payload(value)
        return output
    if isinstance(payload, list):
        return [sanitize_payload(item) for item in payload]
    return payload


def forwards(apps, schema_editor):
    Draft = apps.get_model('drafts', 'Draft')
    for draft in Draft.objects.all().only('id', 'payload'):
        payload = draft.payload or {}
        updated_payload = sanitize_payload(payload)
        if updated_payload != payload:
            draft.payload = updated_payload
            draft.save(update_fields=['payload'])


def noop_reverse(apps, schema_editor):
    # Data cleanup is irreversible by design.
    return


class Migration(migrations.Migration):

    dependencies = [
        ('drafts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, noop_reverse),
    ]
