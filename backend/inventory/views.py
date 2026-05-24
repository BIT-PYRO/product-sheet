from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.db import transaction as db_transaction
from django.utils import timezone

from common.mixins import StandardizedSuccessResponseMixin

from .models import (
    InventoryTransaction, PicklistGroup,
    StoneItem, StoneStockEntry, ToolItem, OtherItem, MachineItem, ProductInventoryItem,
    StockTransaction, StoneTransaction,
    FindingInventoryItem, FindingInventoryTransaction,
    ProductInventoryTransaction, IssueRequest,
    DieInventoryItem, DieTransaction,
)
from .serializers import (
    InventoryTransactionSerializer, PicklistGroupSerializer,
    StoneItemSerializer, StoneStockEntrySerializer,
    ToolItemSerializer, OtherItemSerializer, MachineItemSerializer, ProductInventoryItemSerializer,
    StockTransactionSerializer, StoneTransactionSerializer,
    FindingInventoryItemSerializer, FindingInventoryTransactionSerializer,
    ProductInventoryTransactionSerializer, IssueRequestSerializer,
    DieInventoryItemSerializer, DieTransactionSerializer,
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
	audit_sheet = 'inventory'
	queryset = InventoryTransaction.objects.all().order_by('-created_at')
	serializer_class = InventoryTransactionSerializer
	filterset_fields = ['product', 'txn_type']
	search_fields = ['remark']

	def _cross_log_product(self, instance, action_type, old_data=None):
		"""Also write an ActivityLog entry for the parent product sheet so inventory
		changes appear in the product's activity log panel."""
		try:
			product = getattr(instance, 'product', None)
			if product is None:
				return
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(
				getattr(self, 'request', None),
				action_type,
				'product',
				product,
				old_data=old_data,
			)
		except Exception:
			pass

	def perform_create(self, serializer):
		super().perform_create(serializer)
		self._cross_log_product(serializer.instance, 'create')

	def perform_update(self, serializer):
		try:
			from common.audit import serialize_instance
			old_product_data = serialize_instance(serializer.instance.product) if getattr(serializer.instance, 'product', None) else None
		except Exception:
			old_product_data = None
		super().perform_update(serializer)
		self._cross_log_product(serializer.instance, 'update', old_data=old_product_data)


@extend_schema_view(
	list=extend_schema(summary='List picklist groups', tags=['Inventory']),
	retrieve=extend_schema(summary='Get picklist group details', tags=['Inventory']),
	create=extend_schema(summary='Create picklist group', tags=['Inventory']),
	update=extend_schema(summary='Update picklist group', tags=['Inventory']),
	partial_update=extend_schema(summary='Partially update picklist group', tags=['Inventory']),
	destroy=extend_schema(summary='Delete picklist group', tags=['Inventory']),
)
class PicklistGroupViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
	queryset = StoneItem.objects.all().order_by('-created_at')
	serializer_class = StoneItemSerializer
	filterset_fields = ['stone_type', 'species', 'variety', 'color', 'quality', 'shape', 'wax_setting']
	search_fields = ['stone_type', 'species', 'variety', 'color', 'quality', 'shape']

	def perform_update(self, serializer):
		"""After saving a StoneItem, push catalog changes back to all sheets."""
		instance = serializer.save()
		try:
			from inventory.services.stone_sync import sync_stone_to_sheets
			sync_stone_to_sheets(instance)
		except Exception:
			pass

	@extend_schema(summary='Sync stones from all sheets into Stone Inventory', tags=['Stone Inventory'])
	@action(detail=False, methods=['post'], url_path='sync-from-sheets')
	def sync_from_sheets(self, request):
		"""Pull unique stone entries from Product Sheet and Designer Sheet into StoneItem inventory."""
		from inventory.services.stone_sync import sync_stones_from_sheets
		result = sync_stones_from_sheets()
		return Response({
			'success': True,
			'message': (
				f"Sync complete. {result['created']} stone(s) created, "
				f"{result['updated']} updated, {result['skipped']} unchanged."
			),
			'data': result,
		})

	@extend_schema(summary='Sync Stone Inventory catalog fields back to all sheets', tags=['Stone Inventory'])
	@action(detail=False, methods=['post'], url_path='sync-to-sheets')
	def sync_to_sheets(self, request):
		"""Push catalog field updates from every StoneItem back to matching Product / DesignerSheet entries."""
		from inventory.services.stone_sync import sync_stone_to_sheets
		stones = StoneItem.objects.all()
		total_products = 0
		total_designers = 0
		for stone in stones:
			result = sync_stone_to_sheets(stone)
			total_products += result.get('products_updated', 0)
			total_designers += result.get('designers_updated', 0)
		return Response({
			'success': True,
			'message': f"Sync complete. {total_products} product sheet(s) updated, {total_designers} designer sheet(s) updated.",
			'data': {'products_updated': total_products, 'designers_updated': total_designers},
		})


@extend_schema_view(
	list=extend_schema(summary='List stone stock entries', tags=['Stone Inventory']),
	create=extend_schema(summary='Add stone stock', tags=['Stone Inventory']),
)
class StoneStockEntryViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
	queryset = ToolItem.objects.all()
	serializer_class = ToolItemSerializer
	search_fields = ['tool_name', 'department', 'new_location', 'particulars']


@extend_schema_view(
	list=extend_schema(summary='List other items', tags=['Others Inventory']),
	retrieve=extend_schema(summary='Get other item', tags=['Others Inventory']),
	create=extend_schema(summary='Create other item', tags=['Others Inventory']),
	update=extend_schema(summary='Update other item', tags=['Others Inventory']),
	partial_update=extend_schema(summary='Partially update other item', tags=['Others Inventory']),
	destroy=extend_schema(summary='Delete other item', tags=['Others Inventory']),
)
class OtherItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
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
	audit_sheet = 'inventory'
	queryset = IssueRequest.objects.all().order_by('-requested_at')
	serializer_class = IssueRequestSerializer
	filterset_fields = ['inventory_type', 'status', 'reference_id']
	search_fields = ['item_name', 'issued_to', 'issued_by', 'reason', 'reference_id']

	@extend_schema(summary='Review an issue request (approve/reject)', tags=['Issue Requests'])
	@action(detail=True, methods=['post'], url_path='review')
	def review(self, request, pk=None):
		obj = self.get_object()
		new_status = str(request.data.get('status', '')).lower()
		if new_status not in ('approved', 'rejected'):
			return Response({'success': False, 'message': 'status must be "approved" or "rejected".'}, status=status.HTTP_400_BAD_REQUEST)

		# ── Tools ────────────────────────────────────────────────────────────
		if new_status == 'approved' and obj.inventory_type == 'tools' and obj.item_id:
			with db_transaction.atomic():
				try:
					tool = ToolItem.objects.select_for_update().get(id=obj.item_id)
				except ToolItem.DoesNotExist:
					return Response({'success': False, 'message': 'Tool not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if tool.new_qty < requested_qty:
					return Response({'success': False, 'message': f'Insufficient stock. Available: {float(tool.new_qty)}, Requested: {float(requested_qty)}.', 'available': float(tool.new_qty), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				tool.new_qty = tool.new_qty - requested_qty
				tool.save(update_fields=['new_qty'])
				StockTransaction.objects.create(txn_date=timezone.now().date(), inventory_type='tools', txn_type='issued', item_name=obj.item_name or '', qty=requested_qty, qty_unit=tool.new_unit or 'PCS', issued_to=obj.issued_to or '', remark=obj.reason or '', tool=tool)

		# ── Others ───────────────────────────────────────────────────────────
		elif new_status == 'approved' and obj.inventory_type == 'others' and obj.item_id:
			with db_transaction.atomic():
				try:
					other = OtherItem.objects.select_for_update().get(id=obj.item_id)
				except OtherItem.DoesNotExist:
					return Response({'success': False, 'message': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if other.quantity < requested_qty:
					return Response({'success': False, 'message': f'Insufficient stock. Available: {float(other.quantity)}, Requested: {float(requested_qty)}.', 'available': float(other.quantity), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				other.quantity = other.quantity - requested_qty
				other.save(update_fields=['quantity'])
				StockTransaction.objects.create(txn_date=timezone.now().date(), inventory_type='others', txn_type='issued', item_name=obj.item_name or '', qty=requested_qty, qty_unit=other.unit or 'PCS', issued_to=obj.issued_to or '', remark=obj.reason or '', other_item=other)

		# ── Machines ─────────────────────────────────────────────────────────
		elif new_status == 'approved' and obj.inventory_type == 'machines' and obj.item_id:
			with db_transaction.atomic():
				try:
					machine = MachineItem.objects.select_for_update().get(id=obj.item_id)
				except MachineItem.DoesNotExist:
					return Response({'success': False, 'message': 'Machine not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if machine.running_qty < requested_qty:
					return Response({'success': False, 'message': f'Insufficient running stock. Available: {float(machine.running_qty)}, Requested: {float(requested_qty)}.', 'available': float(machine.running_qty), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				machine.running_qty = machine.running_qty - requested_qty
				machine.save(update_fields=['running_qty'])
				StockTransaction.objects.create(txn_date=timezone.now().date(), inventory_type='machines', txn_type='issued', item_name=obj.item_name or '', qty=requested_qty, issued_to=obj.issued_to or '', remark=obj.reason or '', machine=machine)

		# ── Stone ─────────────────────────────────────────────────────────────
		elif new_status == 'approved' and obj.inventory_type == 'stone' and obj.item_id:
			with db_transaction.atomic():
				try:
					stone = StoneItem.objects.select_for_update().get(id=obj.item_id)
				except StoneItem.DoesNotExist:
					return Response({'success': False, 'message': 'Stone not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if stone.qty < requested_qty:
					return Response({'success': False, 'message': f'Insufficient stock. Available: {float(stone.qty)}, Requested: {float(requested_qty)}.', 'available': float(stone.qty), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				stone.qty = stone.qty - requested_qty
				stone.save(update_fields=['qty'])
				StoneTransaction.objects.create(txn_date=timezone.now().date(), txn_type='issued', stone_name=obj.item_name or '', variety=stone.variety or '', stone_type=stone.stone_type or '', qty=requested_qty, issued_to=obj.issued_to or '', remark=obj.reason or '', stone=stone)

		# ── Finding ───────────────────────────────────────────────────────────
		elif new_status == 'approved' and obj.inventory_type == 'finding' and obj.item_id:
			with db_transaction.atomic():
				try:
					finding = FindingInventoryItem.objects.select_for_update().get(id=obj.item_id)
				except FindingInventoryItem.DoesNotExist:
					return Response({'success': False, 'message': 'Finding not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if finding.quantity < requested_qty:
					return Response({'success': False, 'message': f'Insufficient stock. Available: {float(finding.quantity)}, Requested: {float(requested_qty)}.', 'available': float(finding.quantity), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				finding.quantity = finding.quantity - requested_qty
				finding.save(update_fields=['quantity'])
				FindingInventoryTransaction.objects.create(txn_date=timezone.now().date(), txn_type='issued', finding=finding, finding_code=finding.finding_code or '', qty=requested_qty, issued_to=obj.issued_to or '', remark=obj.reason or '')

		# ── Die ───────────────────────────────────────────────────────────────
		elif new_status == 'approved' and obj.inventory_type == 'die' and obj.item_id:
			with db_transaction.atomic():
				try:
					die = DieInventoryItem.objects.select_for_update().get(id=obj.item_id)
				except DieInventoryItem.DoesNotExist:
					return Response({'success': False, 'message': 'Die not found.'}, status=status.HTTP_404_NOT_FOUND)
				requested_qty = obj.quantity or 0
				if die.quantity < requested_qty:
					return Response({'success': False, 'message': f'Insufficient stock. Available: {float(die.quantity)}, Requested: {float(requested_qty)}.', 'available': float(die.quantity), 'requested': float(requested_qty)}, status=status.HTTP_400_BAD_REQUEST)
				die.quantity = die.quantity - requested_qty
				die.save(update_fields=['quantity'])
				DieTransaction.objects.create(txn_date=timezone.now().date(), txn_type='issued', die=die, die_code=die.die_code or '', qty=requested_qty, issued_to=obj.issued_to or '', remark=obj.reason or '')

		obj.status = new_status
		obj.reviewed_at = timezone.now()
		if request.data.get('remark'):
			obj.remark = str(request.data['remark'])[:255]
		obj.save(update_fields=['status', 'reviewed_at', 'remark'])
		# Log stone issue request approvals/rejections to activity log
		try:
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(
				request,
				ActivityLog.ACTION_UPDATE,
				'inventory',
				obj,
				extra={
					'action_detail': f'Stone issue request {new_status}',
					'item_name': obj.item_name,
					'quantity': float(obj.quantity),
					'issued_to': obj.issued_to,
					'inventory_type': obj.inventory_type,
					'reference_id': obj.reference_id,
					'new_status': new_status,
				},
			)
		except Exception:
			pass
		return Response({'success': True, 'message': f'Request {new_status}.', 'data': IssueRequestSerializer(obj).data})


# ── Die Inventory Item ────────────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List die inventory items', tags=['Die Inventory']),
	retrieve=extend_schema(summary='Get die inventory item', tags=['Die Inventory']),
	create=extend_schema(summary='Create die inventory item', tags=['Die Inventory']),
	update=extend_schema(summary='Update die inventory item', tags=['Die Inventory']),
	partial_update=extend_schema(summary='Partially update die inventory item', tags=['Die Inventory']),
	destroy=extend_schema(summary='Delete die inventory item', tags=['Die Inventory']),
)
class DieInventoryItemViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'inventory'
	queryset = DieInventoryItem.objects.all().order_by('-created_at')
	serializer_class = DieInventoryItemSerializer
	search_fields = ['die_code', 'location', 'notes']

	def get_serializer_context(self):
		"""For list actions, precompute a sku→images map in a single query so the
		serializer's get_designer_images never fires per-object DB queries."""
		context = super().get_serializer_context()
		if getattr(self, 'action', None) == 'list':
			try:
				from designers.models import DesignerSheet
				sku_images: dict = {}
				for sheet in DesignerSheet.objects.only('sku', 'image', 'designer_image_2', 'designer_image_3'):
					urls = [u for u in (sheet.image, sheet.designer_image_2, sheet.designer_image_3) if u]
					if urls:
						sku_images[sheet.sku] = urls
				context['sku_images'] = sku_images
			except Exception:
				context['sku_images'] = {}
		return context

	@extend_schema(summary='Bulk upload die inventory items', tags=['Die Inventory'])
	@action(detail=False, methods=['post'], url_path='bulk-upload')
	def bulk_upload(self, request):
		items = request.data if isinstance(request.data, list) else request.data.get('items', [])
		if not isinstance(items, list) or len(items) == 0:
			return Response({'success': False, 'message': 'No items provided.'}, status=status.HTTP_400_BAD_REQUEST)

		created = updated = 0
		errors = []

		for idx, item in enumerate(items):
			die_code = str(item.get('die_code', '')).strip()
			if not die_code:
				errors.append(f'Row {idx + 1}: die_code is required.')
				continue

			defaults = {
				'location': str(item.get('location', '')).strip(),
				'quantity': item.get('quantity', 0),
				'wax_setting': str(item.get('wax_setting', '')).strip(),
				'casting': str(item.get('casting', '')).strip(),
				'notes': str(item.get('notes', '')).strip(),
			}
			master_skus = item.get('master_skus', [])
			if isinstance(master_skus, str):
				master_skus = [s.strip() for s in master_skus.split(',') if s.strip()]
			designer_skus = item.get('designer_skus', [])
			if isinstance(designer_skus, str):
				designer_skus = [s.strip() for s in designer_skus.split(',') if s.strip()]
			# sku_qty_per_piece: accept dict {"SKU": qty} or list of [{sku, qty_per_piece}]
			raw_sqpp = item.get('sku_qty_per_piece', {})
			if isinstance(raw_sqpp, list):
				sku_qty_per_piece = {
					str(e.get('sku', '')).strip().upper(): int(e.get('qty_per_piece', 1) or 1)
					for e in raw_sqpp if isinstance(e, dict) and e.get('sku')
				}
			elif isinstance(raw_sqpp, dict):
				sku_qty_per_piece = {str(k).strip().upper(): int(v or 1) for k, v in raw_sqpp.items() if k}
			else:
				sku_qty_per_piece = {}

			obj, was_created = DieInventoryItem.objects.update_or_create(
				die_code=die_code,
				defaults={**defaults, 'master_skus': master_skus, 'designer_skus': designer_skus, 'sku_qty_per_piece': sku_qty_per_piece},
			)
			if was_created:
				created += 1
			else:
				updated += 1

		msg = f'{created} created, {updated} updated.'
		if errors:
			msg += f' {len(errors)} error(s): ' + '; '.join(errors[:5])

		return Response({'success': True, 'message': msg, 'created': created, 'updated': updated, 'errors': errors}, status=status.HTTP_201_CREATED)

	@extend_schema(summary='Fetch die inventory items by a comma-separated list of die codes', tags=['Die Inventory'])
	@action(detail=False, methods=['get'], url_path='by-codes')
	def by_codes(self, request):
		raw = request.query_params.get('codes', '')
		codes = [c.strip() for c in raw.split(',') if c.strip()]
		if not codes:
			return Response([])
		items = DieInventoryItem.objects.filter(die_code__in=codes)
		serializer = self.get_serializer(items, many=True)
		return Response(serializer.data)

	@extend_schema(summary='Fetch die inventory items linked to a master SKU', tags=['Die Inventory'])
	@action(detail=False, methods=['get'], url_path='by-sku')
	def by_sku(self, request):
		"""
		GET /api/die-inventory/by-sku/?sku=AJE23
		Returns all DieInventoryItems that list the given master SKU, augmented
		with qty_per_piece from their sku_qty_per_piece map.
		"""
		sku = request.query_params.get('sku', '').strip()
		if not sku:
			return Response([])
		sku_upper = sku.upper()
		# Use icontains as a cheap pre-filter; Python validates exact match
		candidates = DieInventoryItem.objects.filter(master_skus__icontains=sku)
		result = []
		for item in candidates:
			skus_list = item.master_skus if isinstance(item.master_skus, list) else []
			if not any(str(s).strip().upper() == sku_upper for s in skus_list):
				continue
			qty_map = item.sku_qty_per_piece if isinstance(item.sku_qty_per_piece, dict) else {}
			# Try exact upper key, then case-insensitive scan
			qty_per_piece = qty_map.get(sku_upper, None)
			if qty_per_piece is None:
				for k, v in qty_map.items():
					if k.upper() == sku_upper:
						qty_per_piece = v
						break
			if qty_per_piece is None:
				qty_per_piece = 1
			data = self.get_serializer(item).data
			data['qty_per_piece'] = int(qty_per_piece) if qty_per_piece else 1
			result.append(data)
		return Response(result)

	@extend_schema(summary='Sync designer_skus and master_skus from Designer Sheet and Product Sheet', tags=['Die Inventory'])
	@action(detail=False, methods=['post'], url_path='sync-from-sheets')
	def sync_from_sheets(self, request):
		from inventory.services.die_sync import sync_all_dies_from_sheets
		result = sync_all_dies_from_sheets()
		return Response({
			'success': True,
			'message': f"Sync complete. {result['created']} die(s) created, {result['updated']} updated.",
			'data': result,
		})


# ── Die Transaction ────────────────────────────────────────────────────────────

@extend_schema_view(
	list=extend_schema(summary='List die transactions', tags=['Die Log']),
	retrieve=extend_schema(summary='Get die transaction', tags=['Die Log']),
	create=extend_schema(summary='Create die transaction', tags=['Die Log']),
	update=extend_schema(summary='Update die transaction', tags=['Die Log']),
	partial_update=extend_schema(summary='Partially update die transaction', tags=['Die Log']),
	destroy=extend_schema(summary='Delete die transaction', tags=['Die Log']),
)
class DieTransactionViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'inventory'
	queryset = DieTransaction.objects.select_related('die').all().order_by('-txn_date', '-created_at')
	serializer_class = DieTransactionSerializer
	filterset_fields = ['txn_type', 'die']
	search_fields = ['die_code', 'master_sku', 'designer_sku', 'issued_to', 'received_from', 'remark']
