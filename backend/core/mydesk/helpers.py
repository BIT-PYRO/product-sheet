"""
Helpers for MyDesk views.
`_get_org_id_or_none` is a no-op stub for this project (no multi-tenancy).
All MyDesk queries will fall back to filtering by request.user only.
"""


def _get_org_id_or_none(request):
    """
    Return the org_id for the current request.
    In the original platform this came from a JWT claim or profile field.
    This project is single-tenant, so always return None (→ user-scoped queries).
    """
    return None
