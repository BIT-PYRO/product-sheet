"""
Die Inventory auto-sync service.

Pipeline:
  1. DesignerSheet.tracking_rows[*].dieCode  →  DieInventoryItem.designer_skus
  2. Product.designer_sku / .designer_skus   →  (find dies that have that designer SKU)
                                             →  DieInventoryItem.master_skus
  3. Product.die_numbers[*].value            →  DieInventoryItem (created if missing)
                                             →  DieInventoryItem.master_skus (direct link)

Rules:
  - A DieInventoryItem is created automatically for any die code found in either
    DesignerSheet.tracking_rows OR Product.die_numbers that does not yet exist.
  - Only `designer_skus` and `master_skus` are managed by this sync; all other
    fields (quantity, location, wax_*, casting_*, notes, image …) are untouched.
  - The Designer Sheet and Product Sheet are the SINGLE SOURCE OF TRUTH for these
    two JSON-list fields.  Stale entries are removed on every sync run.
"""

import re
from django.db import transaction


def _parse_die_legacy_value(value: str) -> str:
    """Extract the plain die code from legacy combined values like 'code[qty][loc]'."""
    value = (value or '').strip()
    m = re.match(r'^(.+?)\[', value)
    return m.group(1).strip() if m else value


def _build_mappings():
    """
    Returns three dicts built from the current DB state:
      die_to_designers  : { die_code: set(designer_skus) }
      designer_to_masters : { designer_sku: set(master_skus) }
      die_to_masters_direct : { die_code: set(master_skus) }  — from Product.die_numbers
    """
    from designers.models import DesignerSheet
    from products.models import Product

    die_to_designers: dict[str, set] = {}

    for designer in DesignerSheet.objects.only('sku', 'tracking_rows'):
        dsku = (designer.sku or '').strip()
        if not dsku:
            continue
        for row in (designer.tracking_rows or []):
            dc = str(row.get('dieCode') or '').strip()
            if dc:
                die_to_designers.setdefault(dc, set()).add(dsku)

    designer_to_masters: dict[str, set] = {}

    die_to_masters_direct: dict[str, set] = {}

    for product in Product.objects.only('master_sku', 'designer_sku', 'designer_skus', 'die_numbers'):
        msku = (product.master_sku or '').strip()
        if not msku:
            continue

        # Build designer → master mapping (unchanged logic)
        all_dskus: set[str] = set()
        if product.designer_sku:
            all_dskus.add(product.designer_sku.strip())
        for ds in (product.designer_skus or []):
            if ds:
                all_dskus.add(str(ds).strip())
        for ds in all_dskus:
            designer_to_masters.setdefault(ds, set()).add(msku)

        # NEW: also collect die codes from Product.die_numbers directly
        for entry in (product.die_numbers or []):
            raw = str(entry.get('value') or '').strip() if isinstance(entry, dict) else str(entry or '').strip()
            dc = _parse_die_legacy_value(raw)
            if dc:
                die_to_masters_direct.setdefault(dc, set()).add(msku)

    return die_to_designers, designer_to_masters, die_to_masters_direct


def sync_all_dies_from_sheets() -> dict:
    """
    Full reconcile.  Rebuilds `designer_skus` and `master_skus` on every
    DieInventoryItem from the canonical data in DesignerSheet and Product.

    Returns a summary dict with keys: created, updated, total_die_codes.
    """
    from inventory.models import DieInventoryItem

    die_to_designers, designer_to_masters, die_to_masters_direct = _build_mappings()

    # Union of all die codes from both sources
    all_die_codes = set(die_to_designers.keys()) | set(die_to_masters_direct.keys())

    created_count = updated_count = 0

    with transaction.atomic():
        for die_code in all_die_codes:
            d_skus = die_to_designers.get(die_code, set())

            # Master SKUs from designer-sheet chain
            m_skus_from_designer: set[str] = set()
            for ds in d_skus:
                m_skus_from_designer.update(designer_to_masters.get(ds, set()))

            # Master SKUs directly from Product.die_numbers
            m_skus_direct = die_to_masters_direct.get(die_code, set())

            new_d = sorted(d_skus)
            new_m = sorted(m_skus_from_designer | m_skus_direct)

            obj, was_created = DieInventoryItem.objects.get_or_create(
                die_code=die_code,
                defaults={
                    'designer_skus': new_d,
                    'master_skus': new_m,
                },
            )
            if was_created:
                created_count += 1
            else:
                if sorted(obj.designer_skus or []) != new_d or sorted(obj.master_skus or []) != new_m:
                    obj.designer_skus = new_d
                    obj.master_skus = new_m
                    obj.save(update_fields=['designer_skus', 'master_skus', 'updated_at'])
                    updated_count += 1

        # Clear auto-synced fields from items no longer referenced by any source.
        stale_qs = DieInventoryItem.objects.exclude(die_code__in=all_die_codes)
        for item in stale_qs:
            if item.designer_skus or item.master_skus:
                item.designer_skus = []
                item.master_skus = []
                item.save(update_fields=['designer_skus', 'master_skus', 'updated_at'])
                updated_count += 1

    return {
        'created': created_count,
        'updated': updated_count,
        'total_die_codes': len(all_die_codes),
    }
