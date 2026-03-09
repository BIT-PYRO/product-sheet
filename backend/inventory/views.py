from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import InventoryTransaction
from .serializers import InventoryTransactionSerializer


@extend_schema_view(
	list=extend_schema(summary='List inventory transactions', tags=['Inventory']),
	retrieve=extend_schema(summary='Get inventory transaction details', tags=['Inventory']),
	create=extend_schema(summary='Create inventory transaction', tags=['Inventory']),
	update=extend_schema(summary='Update inventory transaction', tags=['Inventory']),
	partial_update=extend_schema(summary='Partially update inventory transaction', tags=['Inventory']),
	destroy=extend_schema(summary='Delete inventory transaction', tags=['Inventory']),
)
class InventoryTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = InventoryTransaction.objects.all().order_by('-created_at')
	serializer_class = InventoryTransactionSerializer
	filterset_fields = ['product', 'txn_type']
	search_fields = ['remark']
