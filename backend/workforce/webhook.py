import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from drf_spectacular.utils import extend_schema

from .models import WorkforceMember
from .serializers import WorkforceMemberSerializer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supported event types sent by the external software in the webhook body
# ---------------------------------------------------------------------------
EVENT_CREATED = 'workforce.created'
EVENT_UPDATED = 'workforce.updated'
EVENT_DELETED = 'workforce.deleted'


def _verify_signature(request) -> bool:
    """
    Verify that the webhook request came from the trusted external software.
    The external software must sign the raw request body with the shared
    EXTERNAL_WORKFORCE_WEBHOOK_SECRET using HMAC-SHA256 and send it as:
        X-Webhook-Signature: <hex_digest>
    """
    secret = getattr(settings, 'EXTERNAL_WORKFORCE_WEBHOOK_SECRET', '')
    if not secret:
        # If no secret is configured, skip verification (dev/test mode only)
        logger.warning('[Workforce Webhook] EXTERNAL_WORKFORCE_WEBHOOK_SECRET is not set — skipping signature check.')
        return True

    signature = request.headers.get('X-Webhook-Signature', '')
    if not signature:
        logger.warning('[Workforce Webhook] Request missing X-Webhook-Signature header.')
        return False

    expected = hmac.new(
        secret.encode('utf-8'),
        request.body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def _map_fields(data: dict) -> dict:
    """
    Map incoming external payload fields to WorkforceMember model fields.
    Handles both snake_case and camelCase keys from the external software.
    """
    return {
        'full_name':         data.get('full_name')         or data.get('fullName', ''),
        'phone':             data.get('phone', ''),
        'whatsapp':          data.get('whatsapp', ''),
        'email':             data.get('email', ''),
        'dob':               data.get('dob')               or data.get('dateOfBirth') or None,
        'gender':            data.get('gender', ''),
        'department':        data.get('department', ''),
        'current_address':   data.get('current_address')   or data.get('currentAddress', {}),
        'permanent_address': data.get('permanent_address') or data.get('permanentAddress', {}),
        'designation':       data.get('designation', ''),
        'category':          data.get('category', ''),
        'working_style':     data.get('working_style')     or data.get('workingStyle', ''),
        'gst_number':        data.get('gst_number')        or data.get('gstNumber', ''),
        'account_name':      data.get('account_name')      or data.get('accountName', ''),
        'bank_name':         data.get('bank_name')         or data.get('bankName', ''),
        'account_number':    data.get('account_number')    or data.get('accountNumber', ''),
        'ifsc':              data.get('ifsc', ''),
        'current_location':  data.get('current_location')  or data.get('currentLocation', ''),
        'first_language':    data.get('first_language')    or data.get('firstLanguage', ''),
        'second_language':   data.get('second_language')   or data.get('secondLanguage', ''),
        'notes':             data.get('notes', ''),
        'active':            data.get('active', True),
        'permissions':       data.get('permissions', {}),
    }


@csrf_exempt
@require_POST
def workforce_webhook(request):
    """
    Webhook endpoint called by the external software whenever a workforce
    record is created, updated, or deleted on their side.

    Expected request body:
    {
        "event": "workforce.created" | "workforce.updated" | "workforce.deleted",
        "external_id": "<unique id used by the external software>",
        "member": { ...workforce fields... }
    }

    Header required:
        X-Webhook-Signature: <hmac_sha256_hex>
    """
    # ── 1. Verify signature ──────────────────────────────────────────────────
    if not _verify_signature(request):
        logger.warning('[Workforce Webhook] Rejected — invalid signature.')
        return JsonResponse({'success': False, 'error': 'Invalid signature.'}, status=401)

    # ── 2. Parse body ────────────────────────────────────────────────────────
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Invalid JSON body.'}, status=400)

    event       = payload.get('event', '')
    external_id = str(payload.get('external_id', '')).strip()
    member_data = payload.get('member', {})

    if not event:
        return JsonResponse({'success': False, 'error': 'Missing "event" field.'}, status=400)

    if not external_id:
        return JsonResponse({'success': False, 'error': 'Missing "external_id" field.'}, status=400)

    logger.info(f'[Workforce Webhook] Received event="{event}" external_id="{external_id}"')

    # ── 3. Handle delete ─────────────────────────────────────────────────────
    if event == EVENT_DELETED:
        deleted_count, _ = WorkforceMember.objects.filter(
            external_id=external_id
        ).delete()
        if deleted_count:
            logger.info(f'[Workforce Webhook] Deleted member external_id={external_id}')
            return JsonResponse({'success': True, 'message': 'Member deleted.'})
        return JsonResponse({'success': True, 'message': 'Member not found — nothing to delete.'})

    # ── 4. Handle create / update ────────────────────────────────────────────
    if event in (EVENT_CREATED, EVENT_UPDATED):
        if not member_data:
            return JsonResponse({'success': False, 'error': 'Missing "member" data.'}, status=400)

        mapped = _map_fields(member_data)

        existing = WorkforceMember.objects.filter(external_id=external_id).first()

        if existing:
            serializer = WorkforceMemberSerializer(existing, data=mapped, partial=True)
        else:
            serializer = WorkforceMemberSerializer(data=mapped)

        if serializer.is_valid():
            instance = serializer.save()
            # Store the external software's ID so we can match future updates
            WorkforceMember.objects.filter(pk=instance.pk).update(external_id=external_id)
            action = 'updated' if existing else 'created'
            logger.info(f'[Workforce Webhook] Member {action}: id={instance.pk}, external_id={external_id}')
            return JsonResponse({
                'success': True,
                'message': f'Member {action} successfully.',
                'id': instance.pk,
            })
        else:
            logger.error(f'[Workforce Webhook] Validation failed: {serializer.errors}')
            return JsonResponse({'success': False, 'error': serializer.errors}, status=422)

    # ── 5. Unknown event ─────────────────────────────────────────────────────
    logger.warning(f'[Workforce Webhook] Unknown event type: "{event}"')
    return JsonResponse({'success': False, 'error': f'Unknown event "{event}".'}, status=400)
