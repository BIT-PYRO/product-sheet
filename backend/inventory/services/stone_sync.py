"""
Stone Inventory auto-sync service.

Directions:
  1. Sheets → Inventory  (sync_stones_from_sheets)
     Reads Product.stone_entries + DesignerSheet.stone_entries and
     creates / updates StoneItem records for every unique stone fingerprint
     found across all sheets.  Only *catalog* fields are written — physical
     qty / used_qty in StoneItem are NEVER overwritten by this sync.

  2. Inventory → Sheets  (sync_stone_to_sheets)
     When a StoneItem's catalog fields are edited, this pushes the updated
     descriptive values back to every Product / DesignerSheet whose
     stone_entries contain a matching fingerprint entry.
     Again, per-entry qty values in the sheet JSON are left untouched.

Fingerprint:
  (stone_type, variety, color, cut, shape, length, width, height)  — all lowercased / stripped.
  This is used to correlate sheet entries with StoneItem records without a
  formal FK relationship.
"""

from django.db import transaction


def _stone_fingerprint(entry: dict) -> tuple:
    """Return a normalised tuple that uniquely identifies a stone by its descriptors."""
    return (
        str(entry.get('type', '') or '').strip().lower(),
        str(entry.get('variety', '') or '').strip().lower(),
        str(entry.get('color', '') or '').strip().lower(),
        str(entry.get('cut', '') or '').strip().lower(),
        str(entry.get('shape', '') or '').strip().lower(),
        str(entry.get('length', '') or '').strip().lower(),
        str(entry.get('width', '') or '').strip().lower(),
        str(entry.get('height', '') or '').strip().lower(),
    )


def _item_fingerprint(stone_item) -> tuple:
    """Return the same fingerprint tuple from a StoneItem model instance."""
    return (
        str(stone_item.stone_type or '').strip().lower(),
        str(stone_item.variety or '').strip().lower(),
        str(stone_item.color or '').strip().lower(),
        str(stone_item.cut or '').strip().lower(),
        str(stone_item.shape or '').strip().lower(),
        str(stone_item.length or '').strip().lower(),
        str(stone_item.width or '').strip().lower(),
        str(stone_item.height or '').strip().lower(),
    )


def _is_empty_fingerprint(fp: tuple) -> bool:
    """True when the fingerprint carries no useful data."""
    return all(v == '' for v in fp)


def sync_stones_from_sheets() -> dict:
    """
    Scan every Product and DesignerSheet for stone_entries and
    ensure a corresponding StoneItem exists in the inventory.

    Only catalog fields are touched — qty / used_qty / weight_cts / min_level
    on existing StoneItem records are never modified.

    Returns a summary dict: { 'created': int, 'updated': int, 'skipped': int }
    """
    from inventory.models import StoneItem
    from products.models import Product
    from designers.models import DesignerSheet

    # Collect all unique stone fingerprints with their best-known catalog data.
    # Later entries can overwrite earlier ones if they carry richer data.
    catalog: dict[tuple, dict] = {}

    for product in Product.objects.only('stone_entries'):
        for se in (product.stone_entries or []):
            fp = _stone_fingerprint(se)
            if _is_empty_fingerprint(fp):
                continue
            if fp not in catalog:
                catalog[fp] = {
                    'stone_type': str(se.get('type', '') or '').strip(),
                    'species': str(se.get('species', '') or '').strip(),
                    'variety': str(se.get('variety', '') or '').strip(),
                    'color': str(se.get('color', '') or '').strip(),
                    'cut': str(se.get('cut', '') or '').strip(),
                    'shape': str(se.get('shape', '') or '').strip(),
                    'length': str(se.get('length', '') or '').strip(),
                    'width': str(se.get('width', '') or '').strip(),
                    'height': str(se.get('height', '') or '').strip(),
                }

    for designer in DesignerSheet.objects.only('stone_entries'):
        for se in (designer.stone_entries or []):
            fp = _stone_fingerprint(se)
            if _is_empty_fingerprint(fp):
                continue
            if fp not in catalog:
                catalog[fp] = {
                    'stone_type': str(se.get('type', '') or '').strip(),
                    'species': str(se.get('species', '') or '').strip(),
                    'variety': str(se.get('variety', '') or '').strip(),
                    'color': str(se.get('color', '') or '').strip(),
                    'cut': str(se.get('cut', '') or '').strip(),
                    'shape': str(se.get('shape', '') or '').strip(),
                    'length': str(se.get('length', '') or '').strip(),
                    'width': str(se.get('width', '') or '').strip(),
                    'height': str(se.get('height', '') or '').strip(),
                }

    if not catalog:
        return {'created': 0, 'updated': 0, 'skipped': 0}

    # Load existing StoneItems and key them by fingerprint for fast lookup
    existing: dict[tuple, StoneItem] = {
        _item_fingerprint(si): si
        for si in StoneItem.objects.all()
    }

    created = updated = skipped = 0

    with transaction.atomic():
        for fp, data in catalog.items():
            if fp in existing:
                si = existing[fp]
                # Only update catalog fields if they have changed
                changed_fields = []
                for field, value in [
                    ('stone_type', data['stone_type']),
                    ('species', data['species']),
                    ('variety', data['variety']),
                    ('color', data['color']),
                    ('cut', data['cut']),
                    ('shape', data['shape']),
                    ('length', data['length']),
                    ('width', data['width']),
                    ('height', data['height']),
                ]:
                    if value and getattr(si, field) != value:
                        setattr(si, field, value)
                        changed_fields.append(field)
                if changed_fields:
                    si.save(update_fields=changed_fields)
                    updated += 1
                else:
                    skipped += 1
            else:
                StoneItem.objects.create(
                    stone_type=data['stone_type'],
                    species=data['species'],
                    variety=data['variety'],
                    color=data['color'],
                    cut=data['cut'],
                    shape=data['shape'],
                    length=data['length'],
                    width=data['width'],
                    height=data['height'],
                )
                created += 1

    return {'created': created, 'updated': updated, 'skipped': skipped}


def sync_stone_to_sheets(stone_item) -> dict:
    """
    Push catalog field updates from a single StoneItem to every Product and
    DesignerSheet that has a matching stone_entries entry (matched by fingerprint).

    The qty field in each sheet entry is left untouched.

    Returns: { 'products_updated': int, 'designers_updated': int }
    """
    from products.models import Product
    from designers.models import DesignerSheet

    target_fp = _item_fingerprint(stone_item)
    if _is_empty_fingerprint(target_fp):
        return {'products_updated': 0, 'designers_updated': 0}

    new_vals = {
        'type': stone_item.stone_type or '',
        'species': stone_item.species or '',
        'variety': stone_item.variety or '',
        'color': stone_item.color or '',
        'cut': stone_item.cut or '',
        'shape': stone_item.shape or '',
        'length': stone_item.length or '',
        'width': stone_item.width or '',
        'height': stone_item.height or '',
    }

    products_updated = 0
    designers_updated = 0

    with transaction.atomic():
        for product in Product.objects.only('id', 'stone_entries'):
            if not isinstance(product.stone_entries, list):
                continue
            changed = False
            new_entries = []
            for se in product.stone_entries:
                fp = _stone_fingerprint(se)
                if fp == target_fp:
                    updated_entry = dict(se)
                    for k, v in new_vals.items():
                        if v:  # only overwrite if new value is non-empty
                            updated_entry[k] = v
                    new_entries.append(updated_entry)
                    changed = True
                else:
                    new_entries.append(se)
            if changed:
                product.stone_entries = new_entries
                product.save(update_fields=['stone_entries'])
                products_updated += 1

        for designer in DesignerSheet.objects.only('id', 'stone_entries'):
            if not isinstance(designer.stone_entries, list):
                continue
            changed = False
            new_entries = []
            for se in designer.stone_entries:
                fp = _stone_fingerprint(se)
                if fp == target_fp:
                    updated_entry = dict(se)
                    for k, v in new_vals.items():
                        if v:
                            updated_entry[k] = v
                    new_entries.append(updated_entry)
                    changed = True
                else:
                    new_entries.append(se)
            if changed:
                designer.stone_entries = new_entries
                designer.save(update_fields=['stone_entries'])
                designers_updated += 1

    return {'products_updated': products_updated, 'designers_updated': designers_updated}
