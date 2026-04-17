from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone

from common.mixins import StandardizedSuccessResponseMixin

from .models import (
    InventoryTransaction, PicklistGroup,
    StoneItem, StoneStockEntry, ToolItem, OtherItem, MachineItem, ProductInventoryItem,
    StockTransaction, StoneTransaction,
    FindingInventoryItem, FindingInventoryTransaction,
    ProductInventoryTransaction, IssueRequest,
)
from .serializers import (
    InventoryTransactionSerializer, PicklistGroupSerializer,
    StoneItemSerializer, StoneStockEntrySerializer,
    ToolItemSerializer, OtherItemSerializer, MachineItemSerializer, ProductInventoryItemSerializer,
    StockTransactionSerializer, StoneTransactionSerializer,
    FindingInventoryItemSerializer, FindingInventoryTransactionSerializer,
    ProductInventoryTransactionSerializer, IssueRequestSerializer,
)


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


@extend_schema_view(
	list=extend_schema(summary='List product inventory items', tags=['Product Inventory']),
	retrieve=extend_schema(summary='Get product inventory item', tags=['Product Inventory']),
	create=extend_schema(summary='Create product inventory item', tags=['Product Inventory']),
	update=extend_schema(summary='Update product inventory item', tags=['Product Inventory']),
	partial_update=extend_schema(summary='Partially update product inventory item', tags=['Product Inventory']),
	destroy=extend_schema(summary='Delete product inventory item', tags=['Product Inventory']),
)
class ProductInventoryItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = ProductInventoryItem.objects.select_related('product').all().order_by('-created_at')
	serializer_class = ProductInventoryItemSerializer
	filterset_fields = ['product', 'final_sku', 'unit']
	search_fields = ['final_sku', 'location', 'product__master_sku', 'product__designer_sku']

	def perform_create(self, serializer):
		serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)

	def perform_update(self, serializer):
		serializer.save(updated_by=self.request.user if self.request.user.is_authenticated else None)

	@extend_schema(summary='Bulk upload product inventory items', tags=['Product Inventory'])
	@action(detail=False, methods=['post'], url_path='bulk-upload')
	def bulk_upload(self, request):
		items = request.data if isinstance(request.data, list) else request.data.get('items', [])
		if not isinstance(items, list) or len(items) == 0:
			return Response({'success': False, 'message': 'No items provided.'}, status=status.HTTP_400_BAD_REQUEST)

		from products.models import Product
		created = 0
		errors = []

		for idx, item in enumerate(items):
			master_sku = str(item.get('master_sku', '')).strip()
			if not master_sku:
				errors.append(f'Row {idx + 1}: master_sku is required.')
				continue

			product = Product.objects.filter(master_sku__iexact=master_sku).first()
			if not product:
				errors.append(f'Row {idx + 1}: Product with SKU "{master_sku}" not found.')
				continue

			ProductInventoryItem.objects.create(
				product=product,
				final_sku=str(item.get('final_sku', '')).strip(),
				value=item.get('value', 0),
				unit=str(item.get('unit', 'PCS')).strip().upper() or 'PCS',
				location=str(item.get('location', '')).strip(),
				total_in_demand=item.get('total_in_demand', 0),
				created_by=request.user if request.user.is_authenticated else None,
			)
			created += 1

		msg = f'{created} item(s) created.'
		if errors:
			msg += f' {len(errors)} error(s): ' + '; '.join(errors[:5])

		return Response({'success': True, 'message': msg, 'created': created, 'errors': errors}, status=status.HTTP_201_CREATED)


# ── Stock Transaction ────────────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List stock transactions', tags=['Stock Log']),
	retrieve=extend_schema(summary='Get stock transaction', tags=['Stock Log']),
	create=extend_schema(summary='Create stock transaction', tags=['Stock Log']),
	update=extend_schema(summary='Update stock transaction', tags=['Stock Log']),
	partial_update=extend_schema(summary='Partially update stock transaction', tags=['Stock Log']),
	destroy=extend_schema(summary='Delete stock transaction', tags=['Stock Log']),
)
class StockTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = StockTransaction.objects.all().order_by('-txn_date', '-created_at')
	serializer_class = StockTransactionSerializer
	filterset_fields = ['inventory_type', 'txn_type', 'tool', 'machine', 'other_item']
	search_fields = ['item_name', 'particulars', 'received_from', 'issued_to', 'remark']


# ── Stone Transaction ────────────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List stone transactions', tags=['Stone Log']),
	retrieve=extend_schema(summary='Get stone transaction', tags=['Stone Log']),
	create=extend_schema(summary='Create stone transaction', tags=['Stone Log']),
	update=extend_schema(summary='Update stone transaction', tags=['Stone Log']),
	partial_update=extend_schema(summary='Partially update stone transaction', tags=['Stone Log']),
	destroy=extend_schema(summary='Delete stone transaction', tags=['Stone Log']),
)
class StoneTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = StoneTransaction.objects.select_related('stone').all().order_by('-txn_date', '-created_at')
	serializer_class = StoneTransactionSerializer
	filterset_fields = ['txn_type', 'stone']
	search_fields = ['stone_name', 'variety', 'stone_type', 'species', 'issued_to', 'received_from', 'remark']


# ── Finding Inventory Item ───────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List finding inventory items', tags=['Finding Inventory']),
	retrieve=extend_schema(summary='Get finding inventory item', tags=['Finding Inventory']),
	create=extend_schema(summary='Create finding inventory item', tags=['Finding Inventory']),
	update=extend_schema(summary='Update finding inventory item', tags=['Finding Inventory']),
	partial_update=extend_schema(summary='Partially update finding inventory item', tags=['Finding Inventory']),
	destroy=extend_schema(summary='Delete finding inventory item', tags=['Finding Inventory']),
)
class FindingInventoryItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = FindingInventoryItem.objects.all().order_by('-created_at')
	serializer_class = FindingInventoryItemSerializer
	filterset_fields = ['material', 'finding_stage', 'mechanism']
	search_fields = ['finding_code', 'die_number', 'material', 'mechanism', 'notes']


# ── Finding Inventory Transaction ────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List finding transactions', tags=['Finding Log']),
	retrieve=extend_schema(summary='Get finding transaction', tags=['Finding Log']),
	create=extend_schema(summary='Create finding transaction', tags=['Finding Log']),
	update=extend_schema(summary='Update finding transaction', tags=['Finding Log']),
	partial_update=extend_schema(summary='Partially update finding transaction', tags=['Finding Log']),
	destroy=extend_schema(summary='Delete finding transaction', tags=['Finding Log']),
)
class FindingInventoryTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = FindingInventoryTransaction.objects.select_related('finding').all().order_by('-txn_date', '-created_at')
	serializer_class = FindingInventoryTransactionSerializer
	filterset_fields = ['txn_type', 'finding']
	search_fields = ['finding_code', 'material', 'stage', 'issued_to', 'received_from', 'remark']


# ── Product Inventory Transaction ────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List product inventory transactions', tags=['Product Log']),
	retrieve=extend_schema(summary='Get product inventory transaction', tags=['Product Log']),
	create=extend_schema(summary='Create product inventory transaction', tags=['Product Log']),
	update=extend_schema(summary='Update product inventory transaction', tags=['Product Log']),
	partial_update=extend_schema(summary='Partially update product inventory transaction', tags=['Product Log']),
	destroy=extend_schema(summary='Delete product inventory transaction', tags=['Product Log']),
)
class ProductInventoryTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = ProductInventoryTransaction.objects.select_related('product').all().order_by('-txn_date', '-created_at')
	serializer_class = ProductInventoryTransactionSerializer
	filterset_fields = ['txn_type', 'product']
	search_fields = ['master_sku', 'designer_sku', 'final_sku', 'metal', 'issued_to', 'received_from', 'remark']


# ── Issue Request ────────────────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List issue requests', tags=['Issue Requests']),
	retrieve=extend_schema(summary='Get issue request', tags=['Issue Requests']),
	create=extend_schema(summary='Create issue request', tags=['Issue Requests']),
	update=extend_schema(summary='Update issue request', tags=['Issue Requests']),
	partial_update=extend_schema(summary='Partially update issue request', tags=['Issue Requests']),
	destroy=extend_schema(summary='Delete issue request', tags=['Issue Requests']),
)
class IssueRequestViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = IssueRequest.objects.all().order_by('-requested_at')
	serializer_class = IssueRequestSerializer
	filterset_fields = ['inventory_type', 'status']
	search_fields = ['item_name', 'issued_to', 'issued_by', 'reason', 'reference_id']

	@extend_schema(summary='Review an issue request (approve/reject)', tags=['Issue Requests'])
	@action(detail=True, methods=['post'], url_path='review')
	def review(self, request, pk=None):
		obj = self.get_object()
		new_status = str(request.data.get('status', '')).lower()
		if new_status not in ('approved', 'rejected'):
			return Response({'success': False, 'message': 'status must be "approved" or "rejected".'}, status=status.HTTP_400_BAD_REQUEST)
		obj.status = new_status
		obj.reviewed_at = timezone.now()
		if request.data.get('remark'):
			obj.remark = str(request.data['remark'])[:255]
		obj.save(update_fields=['status', 'reviewed_at', 'remark'])
		return Response({'success': True, 'message': f'Request {new_status}.', 'data': IssueRequestSerializer(obj).data})
