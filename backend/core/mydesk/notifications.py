"""
Notification stub for MyDesk.
The original platform had a unified notification service.
This stub is a no-op so MyDesk works without that service installed.
"""
import logging

LOGGER = logging.getLogger(__name__)


def push_unified_notification(*args, **kwargs):
    """
    No-op stub. Replace with your real notification service if needed.
    Accepts any positional/keyword arguments so callers don't need to match a
    specific signature (e.g. recipient=, actor=, title=, message=, ...).
    """
    # Resolve the recipient/user from whichever argument is provided
    recipient = kwargs.get('recipient') or kwargs.get('user') or (args[0] if args else None)
    title = kwargs.get('title', '')
    LOGGER.debug(
        'push_unified_notification (stub): recipient=%s title=%r',
        getattr(recipient, 'id', recipient), title,
    )
