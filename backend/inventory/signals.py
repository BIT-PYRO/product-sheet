"""
Django signals that keep DieInventoryItem.designer_skus and .master_skus
in sync whenever a DesignerSheet or Product record is saved,
and audit logs for all DieInventoryItem writes (creates, updates, and deletes).
"""

from django.db.models.signals import post_save, pre_save, post_delete
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


def on_die_inventory_item_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            from common.audit import serialize_instance
            # Retrieve from DB using filter().first() to avoid triggering any model/save side effects
            old_obj = sender.objects.filter(pk=instance.pk).first()
            if old_obj:
                instance._old_audit_data = serialize_instance(old_obj)
        except Exception:
            pass


def on_die_inventory_item_post_save(sender, instance, created, **kwargs):
    try:
        from common.audit import log_activity
        from common.models import ActivityLog
        
        action = ActivityLog.ACTION_CREATE if created else ActivityLog.ACTION_UPDATE
        old_data = getattr(instance, '_old_audit_data', None)
        
        log_activity(
            request=None,
            action=action,
            sheet=ActivityLog.SHEET_INVENTORY,
            instance=instance,
            old_data=old_data,
        )
    except Exception:
        pass


def on_die_inventory_item_post_delete(sender, instance, **kwargs):
    try:
        from common.audit import log_activity
        from common.models import ActivityLog
        log_activity(
            request=None,
            action=ActivityLog.ACTION_DELETE,
            sheet=ActivityLog.SHEET_INVENTORY,
            instance=instance,
        )
    except Exception:
        pass


def connect_signals():
    """
    Called from InventoryConfig.ready() to wire signals lazily
    (avoids import issues at app-startup time).
    """
    from designers.models import DesignerSheet
    from products.models import Product
    from inventory.models import DieInventoryItem

    post_save.connect(on_designer_sheet_saved, sender=DesignerSheet, dispatch_uid='inventory_die_sync_designer')
    post_save.connect(on_product_saved, sender=Product, dispatch_uid='inventory_die_sync_product')

    pre_save.connect(on_die_inventory_item_pre_save, sender=DieInventoryItem, dispatch_uid='inventory_die_audit_pre_save')
    post_save.connect(on_die_inventory_item_post_save, sender=DieInventoryItem, dispatch_uid='inventory_die_audit_post_save')
    post_delete.connect(on_die_inventory_item_post_delete, sender=DieInventoryItem, dispatch_uid='inventory_die_audit_post_delete')
