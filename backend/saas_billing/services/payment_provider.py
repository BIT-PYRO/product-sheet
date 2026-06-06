from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class PaymentProviderService(ABC):
    @abstractmethod
    def create_customer(self, tenant):
        pass

    @abstractmethod
    def create_checkout_session(self, subscription, success_url, cancel_url):
        pass

    @abstractmethod
    def create_subscription(self, tenant, plan, billing_cycle):
        pass

    @abstractmethod
    def cancel_subscription(self, subscription, at_period_end=True):
        pass

    @abstractmethod
    def resume_subscription(self, subscription):
        pass

    @abstractmethod
    def sync_subscription(self, subscription):
        pass


class StripeProvider(PaymentProviderService):
    def create_customer(self, tenant):
        # Implementation for Stripe customer creation
        return f"cus_stripe_{tenant.id}"

    def create_checkout_session(self, subscription, success_url, cancel_url):
        # Implementation for Stripe checkout session
        return {"url": "https://checkout.stripe.com/pay/cs_test_placeholder"}

    def create_subscription(self, tenant, plan, billing_cycle):
        # Implementation for Stripe subscription
        return {"id": "sub_stripe_placeholder", "status": "active"}

    def cancel_subscription(self, subscription, at_period_end=True):
        # Implementation for Stripe cancel
        return {"status": "cancelled" if not at_period_end else "active", "cancel_at_period_end": at_period_end}

    def resume_subscription(self, subscription):
        # Implementation for Stripe resume
        return {"status": "active"}

    def sync_subscription(self, subscription):
        # Implementation for Stripe sync
        return {"status": "active"}


class RazorpayProvider(PaymentProviderService):
    def create_customer(self, tenant):
        # Implementation for Razorpay customer creation
        return f"cust_rzp_{tenant.id}"

    def create_checkout_session(self, subscription, success_url, cancel_url):
        # Implementation for Razorpay checkout session
        return {"order_id": "order_placeholder", "amount": subscription.locked_price * 100}

    def create_subscription(self, tenant, plan, billing_cycle):
        # Implementation for Razorpay subscription
        return {"id": "sub_rzp_placeholder", "status": "active"}

    def cancel_subscription(self, subscription, at_period_end=True):
        # Implementation for Razorpay cancel
        return {"status": "cancelled" if not at_period_end else "active", "cancel_at_period_end": at_period_end}

    def resume_subscription(self, subscription):
        # Implementation for Razorpay resume
        return {"status": "active"}

    def sync_subscription(self, subscription):
        # Implementation for Razorpay sync
        return {"status": "active"}
