from decimal import Decimal
from saas_billing.models import BillingCycle

class SaaSPricingService:
    @staticmethod
    def get_plan_price(plan, cycle=BillingCycle.MONTHLY):
        """Returns the base price for the plan given the cycle."""
        if cycle == BillingCycle.MONTHLY:
            return plan.base_price_monthly
        return plan.base_price_yearly

    @classmethod
    def calculate_proration(cls, current_subscription, new_plan, days_remaining, total_days_in_cycle):
        """
        Calculates the prorated difference for an upgrade/downgrade.
        Returns the amount the tenant needs to pay (or credit if negative).
        """
        current_daily_rate = Decimal(str(current_subscription.locked_price)) / Decimal(total_days_in_cycle)
        
        new_price = cls.get_plan_price(new_plan, current_subscription.billing_cycle)
        new_daily_rate = Decimal(str(new_price)) / Decimal(total_days_in_cycle)
        
        unused_value = current_daily_rate * Decimal(days_remaining)
        remaining_cost = new_daily_rate * Decimal(days_remaining)
        
        prorated_difference = remaining_cost - unused_value
        return prorated_difference.quantize(Decimal('0.01'))
