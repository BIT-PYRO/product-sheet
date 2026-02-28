from decimal import Decimal


def calculate_margin(selling_price: Decimal, cost_price: Decimal) -> Decimal:
    if cost_price <= 0:
        return Decimal('0')
    return ((selling_price - cost_price) / cost_price) * Decimal('100')
