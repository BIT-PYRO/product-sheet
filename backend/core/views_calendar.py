"""
Helper functions used by mydesk task sync to access Google Calendar credentials.
Centralised here so multiple views can import them without circular dependencies.
"""


def _get_credentials(user):
    """Return a valid google.oauth2.credentials.Credentials for user, or None."""
    try:
        from calendar_integration.models import GoogleCalendarCredential
        from calendar_integration.services import _load_credentials

        cred_obj = GoogleCalendarCredential.objects.get(user=user)
        return _load_credentials(cred_obj)
    except Exception:
        return None


def _invalidate_calendar_cache(org_id, user_id):
    """Invalidate any cached calendar data for the given user/org (no-op placeholder)."""
    pass
