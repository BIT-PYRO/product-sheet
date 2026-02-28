from rest_framework.viewsets import ModelViewSet

from .models import InventoryTransaction
from .serializers import InventoryTransactionSerializer


class InventoryTransactionViewSet(ModelViewSet):
	queryset = InventoryTransaction.objects.all().order_by('-created_at')
	serializer_class = InventoryTransactionSerializer
	filterset_fields = ['product', 'txn_type']
	search_fields = ['remark']
