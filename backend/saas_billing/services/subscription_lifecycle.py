from datetime import timedelta
from django.utils import timezone
from saas_billing.models import Subscription, SubscriptionStatus, SubscriptionHistory, SubscriptionEvent, BillingCycle, PlatformAuditRecord, AuditEventType

class SubscriptionLifecycleService:
    @staticmethod
    def create_subscription(tenant, plan, billing_cycle=BillingCycle.MONTHLY):
        # Calculate trial end date
        trial_end_date = None
        status = SubscriptionStatus.ACTIVE
        if plan.trial_days > 0:
            trial_end_date = timezone.now() + timedelta(days=plan.trial_days)
            status = SubscriptionStatus.TRIALING

        # Snapshot pricing
        locked_price = plan.base_price_monthly if billing_cycle == BillingCycle.MONTHLY else plan.base_price_yearly
        locked_currency = plan.currency

        subscription = Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            status=status,
            trial_end_date=trial_end_date,
            billing_cycle=billing_cycle,
            locked_price=locked_price,
            locked_currency=locked_currency
        )
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            new_plan=plan,
            new_status=status,
            reason="Subscription created"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.created",
            payload={"plan_code": plan.code, "status": status}
        )
        return subscription

    @staticmethod
    def activate_subscription(subscription):
        old_status = subscription.status
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.trial_end_date = None
        subscription.save()
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Subscription activated manually or via payment"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.activated",
            payload={"old_status": old_status, "new_status": subscription.status}
        )
        return subscription

    @staticmethod
    def suspend_subscription(subscription):
        old_status = subscription.status
        subscription.status = SubscriptionStatus.SUSPENDED
        subscription.save()
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Subscription suspended due to non-payment or violation"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.suspended"
        )
        return subscription

    @staticmethod
    def cancel_subscription(subscription, at_period_end=True, actor=None):
        if at_period_end:
            subscription.cancel_at_period_end = True
            subscription.save()
            SubscriptionEvent.objects.create(
                subscription=subscription,
                event_type="subscription.cancellation_scheduled"
            )
        else:
            old_status = subscription.status
            subscription.status = SubscriptionStatus.CANCELED
            subscription.cancel_at_period_end = False
            subscription.save()
            
            SubscriptionHistory.objects.create(
                subscription=subscription,
                old_plan=subscription.plan,
                new_plan=subscription.plan,
                old_status=old_status,
                new_status=subscription.status,
                reason="Subscription canceled immediately"
            )
            
            SubscriptionEvent.objects.create(
                subscription=subscription,
                event_type="subscription.canceled"
            )
            PlatformAuditRecord.objects.create(
                tenant=subscription.tenant,
                subscription=subscription,
                actor=actor,
                old_plan=subscription.plan,
                new_plan=subscription.plan,
                event_type=AuditEventType.SUBSCRIPTION_CANCELLED,
                message=f"Subscription cancelled immediately",
                payload={"old_plan": subscription.plan.code}
            )
        return subscription

    @staticmethod
    def expire_subscription(subscription):
        old_status = subscription.status
        subscription.status = SubscriptionStatus.EXPIRED
        subscription.save()
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Subscription expired"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.expired"
        )
        return subscription

    @staticmethod
    def upgrade_subscription(subscription, new_plan, actor=None):
        old_plan = subscription.plan
        old_status = subscription.status
        
        subscription.plan = new_plan
        # Snapshot new pricing
        subscription.locked_price = new_plan.base_price_monthly if subscription.billing_cycle == BillingCycle.MONTHLY else new_plan.base_price_yearly
        subscription.locked_currency = new_plan.currency
        subscription.status = SubscriptionStatus.ACTIVE # Typically active immediately
        subscription.save()
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=old_plan,
            new_plan=new_plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Upgraded plan"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.upgraded",
            payload={"old_plan": old_plan.code, "new_plan": new_plan.code}
        )
        PlatformAuditRecord.objects.create(
            tenant=subscription.tenant,
            subscription=subscription,
            actor=actor,
            old_plan=old_plan,
            new_plan=new_plan,
            event_type=AuditEventType.SUBSCRIPTION_UPGRADE,
            message=f"Subscription upgraded from {old_plan.code} to {new_plan.code}",
            payload={"old_plan": old_plan.code, "new_plan": new_plan.code}
        )
        return subscription

    @staticmethod
    def downgrade_subscription(subscription, new_plan, at_period_end=True, actor=None):
        if at_period_end:
            # We would typically schedule this for the end of the period
            # For simplicity, we just trigger an event. A cron job would apply it later.
            SubscriptionEvent.objects.create(
                subscription=subscription,
                event_type="subscription.downgrade_scheduled",
                payload={"target_plan": new_plan.code}
            )
        else:
            old_plan = subscription.plan
            old_status = subscription.status
            subscription.plan = new_plan
            subscription.locked_price = new_plan.base_price_monthly if subscription.billing_cycle == BillingCycle.MONTHLY else new_plan.base_price_yearly
            subscription.locked_currency = new_plan.currency
            subscription.save()
            
            SubscriptionHistory.objects.create(
                subscription=subscription,
                old_plan=old_plan,
                new_plan=new_plan,
                old_status=old_status,
                new_status=subscription.status,
                reason="Downgraded plan immediately"
            )
            SubscriptionEvent.objects.create(
                subscription=subscription,
                event_type="subscription.downgraded",
                payload={"old_plan": old_plan.code, "new_plan": new_plan.code}
            )
            PlatformAuditRecord.objects.create(
                tenant=subscription.tenant,
                subscription=subscription,
                actor=actor,
                old_plan=old_plan,
                new_plan=new_plan,
                event_type=AuditEventType.SUBSCRIPTION_DOWNGRADE,
                message=f"Subscription downgraded from {old_plan.code} to {new_plan.code}",
                payload={"old_plan": old_plan.code, "new_plan": new_plan.code}
            )
        return subscription

    @staticmethod
    def renew_subscription(subscription, actor=None):
        old_status = subscription.status
        subscription.status = SubscriptionStatus.ACTIVE
        
        # Determine new end date based on billing cycle
        if subscription.end_date:
            from dateutil.relativedelta import relativedelta
            if subscription.billing_cycle == BillingCycle.YEARLY:
                subscription.end_date = subscription.end_date + relativedelta(years=1)
            else:
                subscription.end_date = subscription.end_date + relativedelta(months=1)
                
        subscription.save()

        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Subscription renewed"
        )

        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.renewed"
        )
        
        PlatformAuditRecord.objects.create(
            tenant=subscription.tenant,
            subscription=subscription,
            actor=actor,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            event_type=AuditEventType.SUBSCRIPTION_RENEWED,
            message=f"Subscription renewed",
            payload={"plan": subscription.plan.code}
        )
        return subscription

    @staticmethod
    def apply_grace_period(subscription):
        old_status = subscription.status
        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.save()
        
        SubscriptionHistory.objects.create(
            subscription=subscription,
            old_plan=subscription.plan,
            new_plan=subscription.plan,
            old_status=old_status,
            new_status=subscription.status,
            reason="Entered grace period due to failed payment"
        )
        
        SubscriptionEvent.objects.create(
            subscription=subscription,
            event_type="subscription.past_due"
        )
        return subscription
