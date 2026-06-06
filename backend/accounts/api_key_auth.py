"""
Custom DRF authentication and user proxy for API key-based access.

Usage:
    Pass the header  X-API-Key: <raw_key>  with any request.
    The key is matched against the stored SHA-256 hash and, if valid,
    the request proceeds as a VirtualAPIKeyUser (not a real DB User).

Regular JWT-authenticated users are unaffected — API key auth is only
attempted when the header is present, and falls through otherwise.
"""

import hashlib
import uuid
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class VirtualAPIKeyUser:
    """
    A lightweight, non-database user object returned when a request
    authenticates via an API key.  DRF checks .is_authenticated so this
    satisfies the IsAuthenticated permission class.
    """

    # Attributes expected by DRF / Django middleware
    is_authenticated = True
    is_anonymous = False
    is_active = True
    is_staff = False
    is_superuser = False
    pk = None
    id = None

    def __init__(self, api_key):
        self.api_key = api_key

    # Minimal interface so code that reads request.user.role doesn't crash
    @property
    def role(self):
        return None

    @property
    def tenant(self):
        return self.api_key.tenant

    @property
    def accessible_companies(self):
        if self.api_key.tenant:
            return self.api_key.tenant.companies.all()
        from core_tenants.models import Company
        return Company.objects.none()

    @property
    def active_company(self):
        if self.api_key.tenant:
            return self.api_key.tenant.companies.first()
        return None

    def __str__(self):
        return f'APIKeyUser({self.api_key.name})'


class APIKeyAuthentication(BaseAuthentication):
    """
    DRF authentication class that recognises the X-API-Key header.

    Returns (VirtualAPIKeyUser, api_key) on success.
    Returns None when the header is absent (defers to next authenticator).
    Raises AuthenticationFailed when the header is present but invalid.
    """

    HEADER = 'HTTP_X_API_KEY'

    def authenticate(self, request):
        raw_key = request.META.get(self.HEADER, '').strip()
        if not raw_key:
            return None  # Not our header — let JWTAuthentication try next

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        # Import here to avoid circular imports at module load time
        from .models import APIKey
        try:
            api_key = APIKey.objects.select_related('tenant').get(key_hash=key_hash, is_active=True)
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or inactive API key.')

        # Verify that the requested tenant matches the API Key's tenant
        requested_tenant_id = request.headers.get('X-Tenant-ID') or request.META.get('HTTP_X_TENANT_ID') or request.query_params.get('tenant_id')
        if requested_tenant_id and api_key.tenant:
            try:
                if str(api_key.tenant.id) != str(requested_tenant_id):
                    raise AuthenticationFailed('API Key tenant mismatch.')
            except ValueError:
                pass

        # Update last_used_at without triggering signals / auto_now fields
        APIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())
        api_key.last_used_at = timezone.now()

        user = VirtualAPIKeyUser(api_key)

        # Set request attributes and thread-local context variables for API Key user
        from core_tenants.context import set_tenant, set_company, set_current_user
        set_current_user(user)
        if api_key.tenant:
            set_tenant(api_key.tenant)
            request.tenant = api_key.tenant
            # Set default active company if none was set
            company = api_key.tenant.companies.first()
            if company:
                set_company(company)
                request.company = company

        return (user, api_key)

    def authenticate_header(self, request):
        return 'X-API-Key'
