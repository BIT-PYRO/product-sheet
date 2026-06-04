import logging
from django.db.models.signals import pre_save, post_save, post_delete
from django.db.models import FileField, ImageField
from django.dispatch import receiver
from django.apps import apps
from saas_billing.services.file_tracking import FileUploadTrackingService

logger = logging.getLogger(__name__)

def track_file_size_pre_save(sender, instance, **kwargs):
    """
    Caches the original file sizes before saving, so we can calculate the delta in post_save.
    """
    if not hasattr(instance, 'tenant_id') or not instance.tenant_id:
        return

    instance._original_file_sizes = {}
    
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            for field in sender._meta.fields:
                if isinstance(field, (FileField, ImageField)):
                    old_file = getattr(old_instance, field.name)
                    if old_file and old_file.name:
                        try:
                            instance._original_file_sizes[field.name] = old_file.size
                        except Exception:
                            # File might be missing on disk/S3
                            instance._original_file_sizes[field.name] = 0
        except sender.DoesNotExist:
            pass

def track_file_size_post_save(sender, instance, created, **kwargs):
    if not hasattr(instance, 'tenant') or not instance.tenant:
        return
        
    delta_bytes = 0
    original_sizes = getattr(instance, '_original_file_sizes', {})
    
    for field in sender._meta.fields:
        if isinstance(field, (FileField, ImageField)):
            new_file = getattr(instance, field.name)
            new_size = 0
            if new_file and new_file.name:
                try:
                    new_size = new_file.size
                except Exception:
                    pass
            
            old_size = original_sizes.get(field.name, 0)
            delta_bytes += (new_size - old_size)

    if delta_bytes != 0:
        FileUploadTrackingService.add_bytes(instance.tenant, delta_bytes)

def track_file_size_post_delete(sender, instance, **kwargs):
    if not hasattr(instance, 'tenant') or not instance.tenant:
        return
        
    deleted_bytes = 0
    for field in sender._meta.fields:
        if isinstance(field, (FileField, ImageField)):
            file_field = getattr(instance, field.name)
            if file_field and file_field.name:
                try:
                    deleted_bytes += file_field.size
                except Exception:
                    pass
                    
    if deleted_bytes > 0:
        FileUploadTrackingService.subtract_bytes(instance.tenant, deleted_bytes)

def register_file_tracking_signals():
    """
    Iterates through all registered models and attaches file tracking signals
    to models that have both a tenant and at least one FileField/ImageField.
    """
    for model in apps.get_models():
        has_tenant = hasattr(model, 'tenant')
        has_file_field = any(isinstance(f, (FileField, ImageField)) for f in model._meta.fields)
        
        if has_tenant and has_file_field:
            pre_save.connect(track_file_size_pre_save, sender=model, dispatch_uid=f"{model.__name__}_file_track_pre")
            post_save.connect(track_file_size_post_save, sender=model, dispatch_uid=f"{model.__name__}_file_track_post")
            post_delete.connect(track_file_size_post_delete, sender=model, dispatch_uid=f"{model.__name__}_file_track_del")
