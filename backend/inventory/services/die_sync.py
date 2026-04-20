"""
Die Inventory auto-sync service.

Pipeline:
  1. DesignerSheet.tracking_rows[*].dieCode  →  DieInventoryItem.designer_skus
  2. Product.designer_sku / .designer_skus   →  (find dies that have that designer SKU)
                                             →  DieInventoryItem.master_skus

Rules:
  - A DieInventoryItem is created automatically for any die code found in any
    DesignerSheet.tracking_rows that does not yet exist in the inventory.
  - Only `designer_skus` and `master_skus` are managed by this sync; all other
    fields (quantity, location, wax_*, casting_*, notes, image …) are untouched.
  - The Designer Sheet and Product Sheet are the SINGLE SOURCE OF TRUTH for these
    two JSON-list fields.  Stale entries are removed on every sync run.
"""

from django.db import transaction


def _build_mappings():
    """
    Returns two dicts built from the current DB state:
      die_to_designers : { die_code: set(designer_skus) }
      designer_to_masters : { designer_sku: set(master_skus) }
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

    for product in Product.objects.only('master_sku', 'designer_sku', 'designer_skus'):
        msku = (product.master_sku or '').strip()
        if not msku:
            continue
        all_dskus: set[str] = set()
        if product.designer_sku:
            all_dskus.add(product.designer_sku.strip())
        for ds in (product.designer_skus or []):
            if ds:
                all_dskus.add(str(ds).strip())
        for ds in all_dskus:
            designer_to_masters.setdefault(ds, set()).add(msku)

    return die_to_designers, designer_to_masters


def sync_all_dies_from_sheets() -> dict:
    """
    Full reconcile.  Rebuilds `designer_skus` and `master_skus` on every
    DieInventoryItem from the canonical data in DesignerSheet and Product.

    Returns a summary dict with keys: created, updated, total_die_codes.
    """
    from inventory.models import DieInventoryItem

    die_to_designers, designer_to_masters = _build_mappings()

    created_count = updated_count = 0

    with transaction.atomic():
        for die_code, d_skus in die_to_designers.items():
            # Master SKUs = union of all master SKUs for each designer SKU of this die
            m_skus: set[str] = set()
            for ds in d_skus:
                m_skus.update(designer_to_masters.get(ds, set()))

            new_d = sorted(d_skus)
            new_m = sorted(m_skus)

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

        # For die items that exist in inventory but are no longer referenced by
        # any designer sheet — clear auto-synced fields so stale data doesn't linger.
        all_synced_codes = set(die_to_designers.keys())
        stale_qs = DieInventoryItem.objects.exclude(die_code__in=all_synced_codes)
        for item in stale_qs:
            if item.designer_skus or item.master_skus:
                item.designer_skus = []
                item.master_skus = []
                item.save(update_fields=['designer_skus', 'master_skus', 'updated_at'])
                updated_count += 1

    return {
        'created': created_count,
        'updated': updated_count,
        'total_die_codes': len(die_to_designers),
    }
