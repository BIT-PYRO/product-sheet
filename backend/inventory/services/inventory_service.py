from django.db import transaction

from inventory.models import InventoryTransaction


@transaction.atomic
def create_stock_transaction(*, product, txn_type: str, quantity: int, remark: str = ''):
    if quantity <= 0:
        raise ValueError('Quantity must be greater than zero')

    return InventoryTransaction.objects.create(
        product=product,
        txn_type=txn_type,
        quantity=quantity,
        remark=remark,
    )
