from django.db import models
from common.models import AuditModel


class Finding(AuditModel):
    """Master list of findings (clasps, hooks, connectors, etc.)."""

    finding_code = models.CharField(max_length=120, unique=True)
    die_number = models.CharField(max_length=120, blank=True, default='')
    size = models.CharField(max_length=60, blank=True, default='')
    quantity = models.CharField(max_length=60, blank=True, default='')
    weight = models.CharField(max_length=60, blank=True, default='')

    # Images (stored as URLs or base64 data URIs)
    primary_photo = models.TextField(blank=True, default='')
    reference_photo = models.TextField(blank=True, default='')
    image3 = models.TextField(blank=True, default='')

    # Detail fields
    finding_stage = models.CharField(max_length=120, blank=True, default='')
    material = models.CharField(max_length=120, blank=True, default='')
    polish = models.CharField(max_length=120, blank=True, default='')
    total_measurements = models.CharField(max_length=120, blank=True, default='')
    design_material = models.CharField(max_length=120, blank=True, default='')
    mold_qty_per_die = models.CharField(max_length=60, blank=True, default='')
    dead_weight = models.CharField(max_length=60, blank=True, default='')
    mechanism = models.CharField(max_length=120, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    # Related entries (structured JSON arrays)
    stone_entries = models.JSONField(default=list, blank=True)
    plating_entries = models.JSONField(default=list, blank=True)
    tracking_rows = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.finding_code
