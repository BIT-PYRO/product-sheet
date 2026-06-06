"""
Helpers for MyDesk views.
`_get_org_id_or_none` is a no-op stub for this project (no multi-tenancy).
All MyDesk queries will fall back to filtering by request.user only.
"""


def _get_org_id_or_none(request):
    """
    Return the org_id for the current request.
    Scopes MyDesk data to the user's active tenant.
    """
    if request.user and request.user.is_authenticated and getattr(request.user, 'tenant', None):
        return str(request.user.tenant.id)
    return None
