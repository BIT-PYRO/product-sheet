from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import InventoryTransaction, PicklistGroup
from .serializers import InventoryTransactionSerializer, PicklistGroupSerializer


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


@extend_schema_view(
	list=extend_schema(summary='List picklist groups', tags=['Inventory']),
	retrieve=extend_schema(summary='Get picklist group details', tags=['Inventory']),
	create=extend_schema(summary='Create picklist group', tags=['Inventory']),
	update=extend_schema(summary='Update picklist group', tags=['Inventory']),
	partial_update=extend_schema(summary='Partially update picklist group', tags=['Inventory']),
	destroy=extend_schema(summary='Delete picklist group', tags=['Inventory']),
)
class PicklistGroupViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = PicklistGroup.objects.prefetch_related('items').all().order_by('-number', '-uploaded_at')
	serializer_class = PicklistGroupSerializer
	lookup_field = 'group_id'
	filterset_fields = ['number', 'group_id']
	search_fields = ['name', 'uploaded_by', 'group_id', 'items__sku', 'items__listing_name']
