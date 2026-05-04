"""
Notification stub for MyDesk.
The original platform had a unified notification service.
This stub is a no-op so MyDesk works without that service installed.
"""
import logging

LOGGER = logging.getLogger(__name__)


def push_unified_notification(user, title='', body='', data=None, **kwargs):
    """
    No-op stub. Replace with your real notification service if needed.
    """
    LOGGER.debug(
        'push_unified_notification (stub): user=%s title=%r body=%r',
        getattr(user, 'id', user), title, body,
    )
