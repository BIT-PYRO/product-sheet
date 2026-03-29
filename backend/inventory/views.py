from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import InventoryTransaction, PicklistGroup, StoneItem, StoneStockEntry
from .serializers import InventoryTransactionSerializer, PicklistGroupSerializer, StoneItemSerializer, StoneStockEntrySerializer


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


@extend_schema_view(
	list=extend_schema(summary='List stone items', tags=['Stone Inventory']),
	retrieve=extend_schema(summary='Get stone item details', tags=['Stone Inventory']),
	create=extend_schema(summary='Create stone item', tags=['Stone Inventory']),
	update=extend_schema(summary='Update stone item', tags=['Stone Inventory']),
	partial_update=extend_schema(summary='Partially update stone item', tags=['Stone Inventory']),
	destroy=extend_schema(summary='Delete stone item', tags=['Stone Inventory']),
)
class StoneItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = StoneItem.objects.all().order_by('-created_at')
	serializer_class = StoneItemSerializer
	filterset_fields = ['stone_type', 'species', 'variety', 'color', 'quality', 'shape', 'wax_setting']
	search_fields = ['stone_type', 'species', 'variety', 'color', 'quality', 'shape']


@extend_schema_view(
	list=extend_schema(summary='List stone stock entries', tags=['Stone Inventory']),
	create=extend_schema(summary='Add stone stock', tags=['Stone Inventory']),
)
class StoneStockEntryViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = StoneStockEntry.objects.select_related('stone').all().order_by('-created_at')
	serializer_class = StoneStockEntrySerializer
	filterset_fields = ['stone']
	http_method_names = ['get', 'post', 'head', 'options']
