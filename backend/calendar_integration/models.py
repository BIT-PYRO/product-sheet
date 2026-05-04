from django.db import models
from django.conf import settings


class GoogleCalendarCredential(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_calendar_credential',
    )
    token = models.TextField()
    refresh_token = models.TextField(blank=True, default='')
    token_uri = models.CharField(max_length=255, default='https://oauth2.googleapis.com/token')
    scopes = models.TextField(default='')
    expiry = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'calendar_integration'

    def __str__(self):
        return f'GoogleCalendarCredential({self.user_id})'
