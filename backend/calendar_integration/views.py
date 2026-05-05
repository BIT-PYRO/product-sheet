import json
import logging
import secrets
import traceback

from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from . import services

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_status(request):
    """Return whether user has a connected Google Calendar."""
    from .models import GoogleCalendarCredential
    connected = GoogleCalendarCredential.objects.filter(user=request.user).exists()
    return Response({'connected': connected})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_auth(request):
    """Return the Google OAuth2 authorization URL."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return Response(
            {'error': 'Google Calendar integration is not configured on this server.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    # Pass login_hint so Google skips the account-chooser for users already signed in
    login_hint = getattr(request.user, 'email', '') or ''
    oauth_state = secrets.token_urlsafe(24)
    auth_url, code_verifier = services.get_auth_url(state=oauth_state, login_hint=login_hint)
    cache.set(
        f'calendar_oauth_verifier:{request.user.pk}:{oauth_state}',
        code_verifier,
        timeout=600,
    )
    return Response({'auth_url': auth_url})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_callback(request):
    """Handle OAuth2 redirect from Google."""
    code = request.query_params.get('code')
    oauth_state = request.query_params.get('state')
    error = request.query_params.get('error')

    if error or not code:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return Response(
            {'error': error or 'No authorization code received.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    code_verifier = None
    if oauth_state:
        cache_key = f'calendar_oauth_verifier:{request.user.pk}:{oauth_state}'
        code_verifier = cache.get(cache_key)
        cache.delete(cache_key)

    if not code_verifier:
        return Response(
            {'error': 'OAuth session expired or invalid. Please connect Google Calendar again.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        creds = services.exchange_code(code, code_verifier=code_verifier)
        services.save_credentials(request.user, creds)
    except Exception as exc:
        logger.error(
            "calendar_callback exchange_code failed for user %s: %s\n%s",
            request.user.pk,
            exc,
            traceback.format_exc(),
        )
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    # Redirect back to the frontend mydesk page
    from django.shortcuts import redirect
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return redirect(f'{frontend_url}/mydesk?calendar=connected')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_events(request):
    """List calendar events for a given date range."""
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    if not start or not end:
        return Response({'error': 'start and end query params required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        events = services.list_events(request.user, start, end)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(events)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calendar_events_create(request):
    """Create a Google Calendar event."""
    try:
        event = services.create_event(request.user, request.data)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(event, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def calendar_event_delete(request, event_id):
    """Delete a Google Calendar event."""
    try:
        services.delete_event(request.user, event_id)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calendar_schedule(request):
    """Schedule a meeting — alias for event create with meet link."""
    payload = dict(request.data)
    payload.setdefault('conferenceData', {
        'createRequest': {'requestId': 'mydesk-meet', 'conferenceSolutionKey': {'type': 'hangoutsMeet'}}
    })
    try:
        event = services.create_event(request.user, payload)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(event, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calendar_sync(request):
    """No-op sync endpoint — events are always fetched live."""
    return Response({'synced': True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def calendar_disconnect(request):
    """Remove stored credentials."""
    from .models import GoogleCalendarCredential
    GoogleCalendarCredential.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
