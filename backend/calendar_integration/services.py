import json
import datetime

from django.conf import settings
from django.utils import timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from .models import GoogleCalendarCredential

SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
]


def _client_config():
    return {
        'web': {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
            'redirect_uris': [settings.GOOGLE_CALENDAR_REDIRECT_URI],
        }
    }


def get_auth_url(state='', login_hint=''):
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    kwargs = {
        'access_type': 'offline',
        'include_granted_scopes': 'true',
        'prompt': 'consent',
        'state': state,
    }
    if login_hint:
        kwargs['login_hint'] = login_hint
    auth_url, _ = flow.authorization_url(**kwargs)
    return auth_url


def exchange_code(code):
    """Exchange auth code for credentials. Returns google.oauth2.credentials.Credentials."""
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    flow.fetch_token(code=code)
    return flow.credentials


def _load_credentials(cred_obj):
    """Load Credentials from DB model, refresh if expired."""
    creds = Credentials(
        token=cred_obj.token,
        refresh_token=cred_obj.refresh_token or None,
        token_uri=cred_obj.token_uri,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=cred_obj.scopes.split() if cred_obj.scopes else SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Persist refreshed token
        cred_obj.token = creds.token
        if creds.expiry:
            cred_obj.expiry = timezone.make_aware(creds.expiry, timezone.utc) if timezone.is_naive(creds.expiry) else creds.expiry
        cred_obj.save(update_fields=['token', 'expiry', 'updated_at'])
    return creds


def save_credentials(user, creds):
    """Persist google.oauth2.credentials.Credentials to DB for a user."""
    expiry = None
    if creds.expiry:
        expiry = timezone.make_aware(creds.expiry, datetime.timezone.utc) if timezone.is_naive(creds.expiry) else creds.expiry

    GoogleCalendarCredential.objects.update_or_create(
        user=user,
        defaults={
            'token': creds.token,
            'refresh_token': creds.refresh_token or '',
            'token_uri': creds.token_uri,
            'scopes': ' '.join(creds.scopes or SCOPES),
            'expiry': expiry,
        },
    )


def get_calendar_service(user):
    """Return an authorized Google Calendar API service for user, or None."""
    try:
        cred_obj = GoogleCalendarCredential.objects.get(user=user)
    except GoogleCalendarCredential.DoesNotExist:
        return None
    creds = _load_credentials(cred_obj)
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)


def list_events(user, start, end):
    """Return list of calendar events between start and end (ISO strings)."""
    service = get_calendar_service(user)
    if not service:
        return []
    result = service.events().list(
        calendarId='primary',
        timeMin=start,
        timeMax=end,
        singleEvents=True,
        orderBy='startTime',
        maxResults=200,
    ).execute()
    items = result.get('items', [])
    return [
        {
            'id': e.get('id'),
            'title': e.get('summary', '(No title)'),
            'start': e.get('start', {}).get('dateTime') or e.get('start', {}).get('date'),
            'end': e.get('end', {}).get('dateTime') or e.get('end', {}).get('date'),
            'allDay': 'date' in e.get('start', {}),
            'location': e.get('location', ''),
            'description': e.get('description', ''),
            'hangoutLink': e.get('hangoutLink', ''),
            'htmlLink': e.get('htmlLink', ''),
        }
        for e in items
    ]


def create_event(user, payload):
    service = get_calendar_service(user)
    if not service:
        raise ValueError('Google Calendar not connected.')
    event = service.events().insert(calendarId='primary', body=payload).execute()
    return event


def delete_event(user, event_id):
    service = get_calendar_service(user)
    if not service:
        raise ValueError('Google Calendar not connected.')
    service.events().delete(calendarId='primary', eventId=event_id).execute()
