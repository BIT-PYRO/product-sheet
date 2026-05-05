import json
import datetime
import secrets

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
    # Persisted by caller and required during token exchange when PKCE is used.
    code_verifier = secrets.token_urlsafe(64)
    flow.code_verifier = code_verifier
    kwargs = {
        'access_type': 'offline',
        'include_granted_scopes': 'true',
        'prompt': 'consent',
        'state': state,
    }
    if login_hint:
        kwargs['login_hint'] = login_hint
    auth_url, _ = flow.authorization_url(**kwargs)
    return auth_url, code_verifier


def exchange_code(code, code_verifier=None):
    """Exchange auth code for credentials. Returns google.oauth2.credentials.Credentials."""
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    if code_verifier:
        flow.fetch_token(code=code, code_verifier=code_verifier)
    else:
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
            cred_obj.expiry = timezone.make_aware(creds.expiry, datetime.timezone.utc) if timezone.is_naive(creds.expiry) else creds.expiry
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


def _to_rfc3339(value, *, is_end=False):
    """Normalize date/datetime input into RFC3339 for Google Calendar API."""
    raw = str(value or '').strip()
    if not raw:
        raise ValueError('start and end query params required.')

    parsed_dt = None
    parsed_date = None

    # Accept full ISO datetimes like 2026-05-01T00:00:00Z
    if 'T' in raw:
        iso_text = raw.replace('Z', '+00:00')
        parsed_dt = datetime.datetime.fromisoformat(iso_text)
    else:
        # Accept date-only keys like 2026-05-01 from the frontend.
        parsed_date = datetime.date.fromisoformat(raw)
        base_dt = datetime.datetime.combine(parsed_date, datetime.time.min)
        if is_end:
            # Google treats timeMax as exclusive; push one day for inclusive date ranges.
            base_dt = base_dt + datetime.timedelta(days=1)
        parsed_dt = base_dt

    if timezone.is_naive(parsed_dt):
        parsed_dt = timezone.make_aware(parsed_dt, timezone=datetime.timezone.utc)

    return parsed_dt.astimezone(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')


def list_events(user, start, end):
    """Return list of calendar events between start and end (ISO strings)."""
    service = get_calendar_service(user)
    if not service:
        return []

    time_min = _to_rfc3339(start, is_end=False)
    time_max = _to_rfc3339(end, is_end=True)

    result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
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
