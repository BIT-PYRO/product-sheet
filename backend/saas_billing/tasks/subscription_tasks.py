from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from saas_billing.models import Subscription, SubscriptionStatus
from saas_billing.services.subscription_lifecycle import SubscriptionLifecycleService
from saas_billing.services.payment_provider import StripeProvider

logger = logging.getLogger(__name__)

@shared_task(queue='default')
def process_trial_expiries():
    """
    Find subscriptions that are in TRIALING and their trial_ends_at is past.
    Mark them as EXPIRED.
    """
    now = timezone.now()
    expired_trials = Subscription.objects.filter(
        status=SubscriptionStatus.TRIALING,
        trial_ends_at__lte=now
    )
    for sub in expired_trials:
        logger.info(f"Expiring trial for subscription {sub.id}")
        SubscriptionLifecycleService.expire_subscription(sub)

@shared_task(queue='default')
def send_renewal_reminders():
    """
    Find subscriptions that will renew in 3 days and send an email reminder.
    """
    in_three_days = timezone.now() + timedelta(days=3)
    # Using range to capture subscriptions expiring around that day
    start_range = in_three_days.replace(hour=0, minute=0, second=0)
    end_range = in_three_days.replace(hour=23, minute=59, second=59)
    
    renewing_subs = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE,
        next_billing_date__range=(start_range, end_range),
        cancel_at_period_end=False
    )
    for sub in renewing_subs:
        logger.info(f"Sending renewal reminder for subscription {sub.id}")
        # Email sending logic goes here

@shared_task(queue='default')
def send_failed_payment_reminders():
    """
    Find subscriptions in GRACE_PERIOD and send reminders.
    If grace period has expired, mark as PAST_DUE.
    """
    now = timezone.now()
    grace_period_subs = Subscription.objects.filter(
        status=SubscriptionStatus.GRACE_PERIOD
    )
    for sub in grace_period_subs:
        if sub.grace_period_ends_at and sub.grace_period_ends_at <= now:
            logger.info(f"Grace period expired for subscription {sub.id}. Marking PAST_DUE.")
            SubscriptionLifecycleService.mark_past_due(sub)
        else:
            logger.info(f"Sending failed payment reminder for subscription {sub.id}")
            # Email sending logic goes here

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5, queue='billing_reconciliation')
def reconcile_subscriptions(self):
    """
    Periodically sync the local subscription status with the payment provider to catch any missed webhooks.
    """
    active_subs = Subscription.objects.exclude(
        status__in=[SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED]
    )
    provider = StripeProvider()
    for sub in active_subs:
        try:
            # Sync logic goes here. Abstract provider returns current status.
            status_data = provider.sync_subscription(sub)
            if status_data and status_data.get('status') == 'canceled' and sub.status != SubscriptionStatus.CANCELLED:
                SubscriptionLifecycleService.cancel_subscription(sub, at_period_end=False)
        except Exception as e:
            logger.error(f"Failed to reconcile subscription {sub.id}: {e}")
            raise e  # Re-raise to trigger Celery retry
