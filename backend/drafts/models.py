from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Draft(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="drafts",
    )
    entity_type = models.CharField(max_length=50)
    payload = models.JSONField(default=dict)
    is_submitted = models.BooleanField(default=False)

    def __str__(self):
        return f"Draft({self.entity_type}) by {self.owner} [{'submitted' if self.is_submitted else 'pending'}]"
