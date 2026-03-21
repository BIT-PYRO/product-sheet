from django.db import models
from common.models import AuditModel


class Finding(AuditModel):
    """Master list of findings (clasps, hooks, connectors, etc.)."""

    finding_code = models.CharField(max_length=120, unique=True)
    die_number = models.CharField(max_length=120, blank=True, default='')
    size = models.CharField(max_length=60, blank=True, default='')
    quantity = models.CharField(max_length=60, blank=True, default='')
    weight = models.CharField(max_length=60, blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.finding_code
