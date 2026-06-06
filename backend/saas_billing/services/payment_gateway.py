from abc import ABC, abstractmethod
from saas_billing.models import SubscriptionEvent

class PaymentGatewayStrategy(ABC):
    @abstractmethod
    def create_checkout_session(self, subscription, success_url, cancel_url):
        pass

    @abstractmethod
    def create_customer_portal(self, tenant, return_url):
        pass

    @abstractmethod
    def handle_webhook(self, payload, signature):
        pass

    def check_idempotency(self, event_id):
        """
        Check if an event with this ID has already been processed.
        Returns True if already processed (duplicate), False otherwise.
        """
        if SubscriptionEvent.objects.filter(idempotency_key=event_id).exists():
            return True
        return False


class StripeGateway(PaymentGatewayStrategy):
    def create_checkout_session(self, subscription, success_url, cancel_url):
        return {"url": "https://checkout.stripe.com/pay/cs_test_placeholder"}

    def create_customer_portal(self, tenant, return_url):
        return {"url": "https://billing.stripe.com/p/session/test_placeholder"}

    def handle_webhook(self, payload, signature):
        import stripe
        import logging
        from django.conf import settings
        from saas_billing.models import PlatformAuditRecord, AuditEventType
        
        logger = logging.getLogger(__name__)
        
        # Verify signature
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, getattr(settings, 'STRIPE_WEBHOOK_SECRET', 'whsec_test_secret')
            )
        except Exception as e:
            PlatformAuditRecord.objects.create(
                event_type=AuditEventType.WEBHOOK_FAILURE,
                message=f"Invalid payload or signature: {str(e)}"
            )
            logger.error(f"WEBHOOK_FAILURE: Invalid payload or signature: {str(e)}")
            raise ValueError(f"Invalid payload or signature: {str(e)}")

        event_id = event.get('id')
        if self.check_idempotency(event_id):
            return {"status": "duplicate", "message": "Event already processed"}

        # Process the event here based on event.type
        if event.type == 'invoice.payment_failed':
            PlatformAuditRecord.objects.create(
                event_type=AuditEventType.PAYMENT_FAILURE,
                message=f"Payment failed for event {event_id}",
                payload=event.data.object
            )
            logger.error(f"PAYMENT_FAILURE: event {event_id}")
            
        # Finally, mark as processed (Assuming a generic system subscription for the example)
        # In a real scenario, we find the specific subscription.
        # SubscriptionEvent.objects.create(
        #     subscription=subscription,
        #     event_type=event.type,
        #     idempotency_key=event_id,
        #     payload=event.data.object
        # )
        
        return {"status": "success", "event_id": event_id}


class RazorpayGateway(PaymentGatewayStrategy):
    def create_checkout_session(self, subscription, success_url, cancel_url):
        return {"order_id": "order_placeholder", "amount": subscription.locked_price * 100}

    def create_customer_portal(self, tenant, return_url):
        return {"url": "https://razorpay.com/docs/placeholder"}

    def handle_webhook(self, payload, signature):
        # Verification using razorpay SDK
        # client.utility.verify_webhook_signature(payload, signature, secret)
        
        event_id = payload.get('event_id', 'unknown')
        if self.check_idempotency(event_id):
            return {"status": "duplicate", "message": "Event already processed"}
            
        return {"status": "success", "event_id": event_id}
