"""
Django signals that keep DieInventoryItem.designer_skus and .master_skus
in sync whenever a DesignerSheet or Product record is saved.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


def _do_sync():
    """Run the full die sync, swallowing errors so saves never fail."""
    try:
        from inventory.services.die_sync import sync_all_dies_from_sheets
        sync_all_dies_from_sheets()
    except Exception:
        # Never block a designer / product save due to a sync error.
        pass


def on_designer_sheet_saved(sender, instance, **kwargs):
    _do_sync()


def on_product_saved(sender, instance, **kwargs):
    _do_sync()


def connect_signals():
    """
    Called from InventoryConfig.ready() to wire signals lazily
    (avoids import issues at app-startup time).
    """
    from designers.models import DesignerSheet
    from products.models import Product

    post_save.connect(on_designer_sheet_saved, sender=DesignerSheet, dispatch_uid='inventory_die_sync_designer')
    post_save.connect(on_product_saved, sender=Product, dispatch_uid='inventory_die_sync_product')
