from django.db import models
from common.models import AuditModel

class Industry(AuditModel):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=60, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Industries'

    def __str__(self):
        return self.name

class IndustryTemplate(AuditModel):
    industry = models.OneToOneField(Industry, on_delete=models.CASCADE, related_name='template')
    default_sku_format = models.CharField(max_length=255, blank=True, default='', help_text="e.g. {CATEGORY}-{ATTR:Color}-{ATTR:Size}")
    # Other default configs for the industry can go here in JSON
    config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.industry.name} Template"

class IndustryWorkflow(AuditModel):
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE, related_name='workflows')
    workflow_type = models.CharField(max_length=60, help_text="e.g. 'order_fulfillment', 'manufacturing'")
    stages = models.JSONField(default=list, help_text="List of stage objects [{'code': 'stage1', 'label': 'Stage 1'}]")

    class Meta:
        unique_together = [('industry', 'workflow_type')]

    def __str__(self):
        return f"{self.industry.name} - {self.workflow_type}"


class InventoryDefinition(AuditModel):
    """
    Defines what dimensions an industry uses to track its inventory.
    For example:
    - Jewellery might track by 'Purity', 'Weight', 'Location'
    - Perfume might track by 'Batch', 'Expiry'
    """
    industry = models.ForeignKey(Industry, on_delete=models.CASCADE, related_name='inventory_definitions')
    name = models.CharField(max_length=120, help_text="e.g. 'Raw Material', 'Finished Goods'")
    code = models.CharField(max_length=120)
    tracking_dimensions = models.JSONField(default=list, help_text="e.g. [{'code': 'batch', 'label': 'Batch Number', 'type': 'string'}]")
    
    class Meta:
        unique_together = [('industry', 'code')]

    def __str__(self):
        return f"{self.industry.name} - {self.name}"
