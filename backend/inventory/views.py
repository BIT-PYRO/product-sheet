from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import InventoryTransaction, PicklistGroup, StoneItem, StoneStockEntry, ToolItem, OtherItem, MachineItem
from .serializers import InventoryTransactionSerializer, PicklistGroupSerializer, StoneItemSerializer, StoneStockEntrySerializer, ToolItemSerializer, OtherItemSerializer, MachineItemSerializer


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


@extend_schema_view(
	list=extend_schema(summary='List tool items', tags=['Tools Inventory']),
	retrieve=extend_schema(summary='Get tool item', tags=['Tools Inventory']),
	create=extend_schema(summary='Create tool item', tags=['Tools Inventory']),
	update=extend_schema(summary='Update tool item', tags=['Tools Inventory']),
	partial_update=extend_schema(summary='Partially update tool item', tags=['Tools Inventory']),
	destroy=extend_schema(summary='Delete tool item', tags=['Tools Inventory']),
)
class ToolItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = ToolItem.objects.all()
	serializer_class = ToolItemSerializer
	search_fields = ['tool_name', 'department', 'location']


@extend_schema_view(
	list=extend_schema(summary='List other items', tags=['Others Inventory']),
	retrieve=extend_schema(summary='Get other item', tags=['Others Inventory']),
	create=extend_schema(summary='Create other item', tags=['Others Inventory']),
	update=extend_schema(summary='Update other item', tags=['Others Inventory']),
	partial_update=extend_schema(summary='Partially update other item', tags=['Others Inventory']),
	destroy=extend_schema(summary='Delete other item', tags=['Others Inventory']),
)
class OtherItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = OtherItem.objects.all()
	serializer_class = OtherItemSerializer
	filterset_fields = ['category']
	search_fields = ['item_name', 'category', 'notes']


@extend_schema_view(
	list=extend_schema(summary='List machine items', tags=['Machines Inventory']),
	retrieve=extend_schema(summary='Get machine item', tags=['Machines Inventory']),
	create=extend_schema(summary='Create machine item', tags=['Machines Inventory']),
	update=extend_schema(summary='Update machine item', tags=['Machines Inventory']),
	partial_update=extend_schema(summary='Partially update machine item', tags=['Machines Inventory']),
	destroy=extend_schema(summary='Delete machine item', tags=['Machines Inventory']),
)
class MachineItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = MachineItem.objects.all()
	serializer_class = MachineItemSerializer
	search_fields = ['machine_name', 'department']
