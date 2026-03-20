from django.db import models
from common.models import AuditModel


class DesignerSheet(AuditModel):
    """Stores designer data linked to a product SKU."""

    sku = models.CharField(max_length=60, unique=True)
    image = models.TextField(blank=True, default='')  # base64 or URL

    # File fields – stored as text (URL, path, or base64)
    tdm_file = models.TextField(blank=True, default='')   # 3DM file content/URL
    stl_file = models.TextField(blank=True, default='')    # STL file content/URL

    # Workflow tracking table – each key holds a text value
    tdm_status = models.CharField(max_length=255, blank=True, default='')
    stl_status = models.CharField(max_length=255, blank=True, default='')
    render_status = models.CharField(max_length=255, blank=True, default='')
    print_3d_status = models.CharField(max_length=255, blank=True, default='')
    # Multiple dies per product
    die_entries = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'Designer – {self.sku}'
