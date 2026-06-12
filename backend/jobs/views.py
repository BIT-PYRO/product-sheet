import uuid
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, extend_schema_view, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
import logging

from common.mixins import StandardizedSuccessResponseMixin
from inventory.models import InventoryTransaction, PicklistGroup, PicklistItem

from .models import Job, VoucherApprovalStatus
from .serializers import JobSerializer, BulkVoucherRequestSerializer, ApproveVouchersSerializer
from .services.job_service import (
	can_transition, DEPARTMENT_PIPELINE, DEPT_TO_STOCK_STAGE,
	PRE_CASTING_DEPT_TOS, PRE_CASTING_STAGE_QTY_FIELD,
)

logger = logging.getLogger(__name__)


_DONE_STATUSES = {VoucherApprovalStatus.COMPLETED, VoucherApprovalStatus.PARTIALLY_COMPLETED, VoucherApprovalStatus.REPLACED}


def _sync_repair_completion(voucher):
	"""
	If a completed/received voucher is of voucher_type 'Repair',
	synchronize completion of the corresponding repair items to the external shop.
	"""
	if voucher.voucher_type != 'Repair':
		return

	DEPT_TO_REPAIR_STAGE = {
		'hand-setting': 'hand_setting',
		'polishing': 'final_polish',
		'plating': 'plating'
	}

	stage_key = DEPT_TO_REPAIR_STAGE.get(voucher.dept_to)
	if not stage_key:
		return

	from inventory.models import RepairItem
	items = list(RepairItem.objects.filter(batch__batch_no=voucher.batch_id, repair_stage=stage_key))
	if not items:
		return

	item_ids = [item.repair_item_id for item in items]
	import os
	import requests

	from django.conf import settings

	api_key = os.environ.get('EXTERNAL_SHOP_API_KEY', '')
	shop_id = os.environ.get('EXTERNAL_SHOP_ID', '')
	base_url = os.environ.get('EXTERNAL_SHOP_BASE_URL', '')

	tenant = getattr(voucher, 'tenant', None)
	if not tenant:
		from core_tenants.context import get_current_tenant
		tenant = get_current_tenant()
	if tenant and getattr(tenant, 'external_shop_id', None):
		shop_id = tenant.external_shop_id

	is_production = not settings.DEBUG or os.environ.get('RENDER_EXTERNAL_HOSTNAME', '')

	if is_production:
		if not base_url:
			base_url = 'https://unify-8ba1.onrender.com'
		if not shop_id:
			shop_id = 'janki-jewels'
		if not api_key:
			api_key = os.environ.get('EXTERNAL_PICKLIST_API_KEY', 'mock-api-key')
	else:
		if not base_url:
			base_url = 'http://127.0.0.1:8000'
		if not shop_id:
			shop_id = 'mock-shop-id'
		if not api_key:
			api_key = 'mock-api-key'

	url = f"{base_url.rstrip('/')}/api/external/shops/{shop_id}/repair-queue/complete/"
	# Use the key directly — if the key already starts with 'Bearer ', don't double-prefix it
	auth_value = api_key if api_key.lower().startswith('bearer ') else f'Bearer {api_key}'
	headers = {
		'Authorization': auth_value,
		'Content-Type': 'application/json'
	}

	try:
		logger.info(f"Syncing completion for repair items to external shop: {url} -> {item_ids}")
		res = requests.post(url, headers=headers, json={"repair_item_ids": item_ids}, timeout=5)
		if res.status_code == 200:
			logger.info(f"Successfully completed external repair items: {item_ids}")
			# Delete completed items from local database cache
			RepairItem.objects.filter(repair_item_id__in=item_ids).delete()
		else:
			logger.warning(f"External complete API returned status {res.status_code}")
	except Exception as ext_err:
		logger.error(f"Failed to call external repair complete API: {str(ext_err)}")



def _activate_ready_batch_vouchers(batch_id):
	"""
	Activate every AWAITING voucher in the batch whose direct predecessors
	(all other batch vouchers with dept_to == this.dept_from) have all reached
	a done state (completed or partially_complete).

	When a voucher is activated (ΓåÆ in_process), pieces are deducted from the
	Current Stock of its dept_from stage (they leave the source department).

	Runs repeatedly until no more vouchers can be activated (handles chains).
	Returns the list of newly activated vouchers.
	"""
	from products.models import Product as _Product

	activated = []
	while True:
		all_vouchers = list(Job.objects.filter(batch_id=batch_id))
		# Map: dept_key ΓåÆ list of vouchers whose output feeds that dept
		output_map = {}
		for v in all_vouchers:
			output_map.setdefault(v.dept_to, []).append(v)

		newly_activated = []
		for v in all_vouchers:
			if v.approval_status != VoucherApprovalStatus.AWAITING:
				continue
			# Predecessors: vouchers that send goods TO this voucher's dept_from.
			# Filter by same voucher_type so New and Re-Issue chains activate independently.
			preds = [
				p for p in output_map.get(v.dept_from, [])
				if p.voucher_type == v.voucher_type
			]
			if preds and all(p.approval_status in _DONE_STATUSES for p in preds):
				# ΓöÇΓöÇ Propagate actual received qty from predecessors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
				# Only the pieces that physically arrived at this stage should move
				# forward. Sum all received_rows across every predecessor per SKU.
				actual_received: dict = {}
				for pred in preds:
					for event in (pred.received_rows or []):
						for row in (event.get('rows') or []):
							s = str(row.get('sku', '') or '').strip().upper()
							qty = int(float(row.get('received_qty', 0) or 0))
							if s:
								actual_received[s] = actual_received.get(s, 0) + qty

				if actual_received:
					updated_rows = []
					for mr in (v.material_rows or []):
						sku_key = str(mr.get('sku', '') or '').strip().upper()
						if sku_key in actual_received:
							mr = dict(mr)
							# Preserve the original planned qty before we change issued_qty,
							# so future top-ups can never exceed the original demand.
							original_planned = int(float(mr.get('planned_qty') or mr.get('issued_qty', 0) or 0))
							mr['planned_qty'] = str(original_planned)
							# Cap at planned: if upstream over-produced (amplification stage)
							# the surplus stays in the previous stage's current stock.
							mr['issued_qty'] = str(min(original_planned, actual_received[sku_key]))
						updated_rows.append(mr)
					v.material_rows = updated_rows

				v.approval_status = VoucherApprovalStatus.IN_PROCESS
				v.status = 'in_progress'
				v.save(update_fields=['approval_status', 'status', 'material_rows'])
				_deduct_source_current_stock(v)
				newly_activated.append(v)

		if not newly_activated:
			break
		activated.extend(newly_activated)
	return activated


def _propagate_qty_to_active_downstream(batch_id, voucher):
	"""
	When additional pieces are received on `voucher` and its direct downstream
	neighbour is already IN_PROCESS or PARTIALLY_COMPLETED (activated after an
	earlier partial receive), update that neighbour's issued_qty to reflect the
	new running total and deduct the delta from its dept_from Current Stock.

	This is distinct from _activate_ready_batch_vouchers which only handles
	AWAITING vouchers.  This handles the case where the next stage is already
	active with a lower qty and needs to be topped up.
	"""
	from products.models import Product as _Product

	if not batch_id:
		return

	active_statuses = {VoucherApprovalStatus.IN_PROCESS, VoucherApprovalStatus.PARTIALLY_COMPLETED}

	# Direct downstream: vouchers whose dept_from == this voucher's dept_to that
	# are already active (not awaiting — those are handled by _activate_ready_batch_vouchers).
	# Filter by same voucher_type so Re-Issue completions don't top-up New chain vouchers.
	downstream = list(Job.objects.filter(
		batch_id=batch_id,
		dept_from=voucher.dept_to,
		voucher_type=voucher.voucher_type,
		approval_status__in=active_statuses,
	))
	if not downstream:
		return

	# Calculate total physically received so far across predecessors of the same
	# voucher_type feeding the downstream stage (dept_to == voucher.dept_to).
	all_preds = list(Job.objects.filter(batch_id=batch_id, dept_to=voucher.dept_to, voucher_type=voucher.voucher_type))
	total_received: dict = {}
	for pred in all_preds:
		for event in (pred.received_rows or []):
			for row in (event.get('rows') or []):
				s = str(row.get('sku', '') or '').strip().upper()
				qty = int(float(row.get('received_qty', 0) or 0))
				if s:
					total_received[s] = total_received.get(s, 0) + qty

	if not total_received:
		return

	# The stage key for the downstream's dept_from (= this voucher's dept_to)
	from_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')

	for ds in downstream:
		changed = False
		updated_rows = []
		for mr in (ds.material_rows or []):
			sku_key = str(mr.get('sku', '') or '').strip().upper()
			if sku_key in total_received:
				new_total = total_received[sku_key]
				old_qty = int(float(mr.get('issued_qty', 0) or 0))
				# Never exceed the original planned qty — surplus stays in prev-stage current stock.
				planned_qty = int(float(mr.get('planned_qty') or mr.get('issued_qty', 0) or 0))
				new_issue = min(planned_qty, new_total)
				delta = new_issue - old_qty
				if delta > 0:
					# Deduct the additional pieces moving into WIP of the downstream voucher.
					if from_stage:
						product = _Product.objects.filter(
							Q(master_sku__iexact=mr.get('sku', ''))
						).first() or ds.product
						if product:
							InventoryTransaction.objects.create(
								tenant=ds.tenant,
								company=ds.company,
								product=product,
								txn_type='adjust',
								quantity=-delta,
								stage=from_stage,
								stock_type='current',
								remark=(
									f'Additional {delta} pcs issued to {ds.dept_to}: '
									f'{ds.voucher_no}'
								),
							)
					mr = dict(mr)
					mr['issued_qty'] = str(new_issue)
					changed = True
			updated_rows.append(mr)
		if changed:
			ds.material_rows = updated_rows
			ds.save(update_fields=['material_rows'])


def _deduct_source_current_stock(voucher):
	"""
	When a voucher becomes in_process, deduct issued_qty from the Current Stock
	of its dept_from stage.  This represents pieces leaving the source department
	to be processed by the destination department.

	For pre-casting stages (wax-pieces, wax-setting, casting) the die_rows are
	also processed: a DieTransaction(issued) is created per die code row and the
	relevant stage qty on DieInventoryItem is decremented.
	"""
	from products.models import Product as _Product

	from_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_from, '')
	if not from_stage:
		return

	# ── Die-level deduction for pre-casting stages ─────────────────────────────
	if voucher.dept_to in PRE_CASTING_DEPT_TOS:
		from inventory.models import DieInventoryItem, DieTransaction
		stage_qty_field = PRE_CASTING_STAGE_QTY_FIELD.get(voucher.dept_to, '')
		for row in (voucher.die_rows or []):
			qty = int(float(row.get('issued_qty', 0) or 0))
			if qty <= 0:
				continue
			die_code = str(row.get('die_code', '') or '').strip()
			if not die_code:
				continue
			try:
				die_item = DieInventoryItem.objects.get(die_code=die_code)
				DieTransaction.objects.create(
					tenant=voucher.tenant,
					company=voucher.company,
					txn_date=timezone.now().date(),
					die=die_item,
					die_code=die_code,
					txn_type='issued',
					master_sku=str(row.get('master_sku', '') or ''),
					qty=qty,
					remark=f'Issued to {voucher.dept_to}: {voucher.voucher_no}',
					activity_status='issued',
				)
				if stage_qty_field:
					current = float(getattr(die_item, stage_qty_field, 0) or 0)
					setattr(die_item, stage_qty_field, max(0, current - qty))
					die_item.save(update_fields=[stage_qty_field])
			except DieInventoryItem.DoesNotExist:
				pass

	# ── Master-SKU level deduction (non-pre-casting stages only) ─────────────────
	# For pre-casting stages the die_rows block above already handles all physical
	# deductions via DieInventoryItem, so material_rows (now die code rows) must
	# not be processed here to avoid corrupting master-SKU inventory records.
	if voucher.dept_to not in PRE_CASTING_DEPT_TOS:
		for row in (voucher.material_rows or []):
			qty = int(float(row.get('issued_qty', 0) or 0))
			if qty <= 0:
				continue
			sku = str(row.get('sku', '') or '').strip()
			if not sku:
				continue
			product = _Product.objects.filter(
				Q(master_sku__iexact=sku)
			).first() or voucher.product
			if not product:
				continue

			InventoryTransaction.objects.create(
				tenant=voucher.tenant,
				company=voucher.company,
				product=product,
				txn_type='adjust',
				quantity=-qty,
				stage=from_stage,
				stock_type='current',
				remark=f'Issued to {voucher.dept_to}: {voucher.voucher_no}',
			)


@extend_schema_view(
	list=extend_schema(summary='List jobs', tags=['Jobs']),
	retrieve=extend_schema(summary='Get job details', tags=['Jobs']),
	create=extend_schema(
		summary='Create job',
		tags=['Jobs'],
		examples=[
			OpenApiExample(
				'Create job request',
				value={
					'title': 'Polish gold ring',
					'product': 1,
					'assignee': 1,
					'status': 'created',
				},
				request_only=True,
			),
			OpenApiExample(
				'Invalid transition error',
				value={
					'success': False,
					'error': {
						'code': 'validation_error',
						'message': 'Request could not be completed.',
						'details': {'status': 'Invalid transition: created -> completed'},
					},
				},
				response_only=True,
			),
		],
	),
	update=extend_schema(summary='Update job', tags=['Jobs']),
	partial_update=extend_schema(summary='Partially update job', tags=['Jobs']),
	destroy=extend_schema(summary='Delete job', tags=['Jobs']),
)
class JobViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	audit_sheet = 'job'
	queryset = Job.objects.all()
	serializer_class = JobSerializer
	filterset_fields = ['status', 'product', 'assignee', 'approval_status', 'batch_id', 'picklist_group']

	def get_queryset(self):
		return Job.objects.select_related('picklist_group').all().order_by('-created_at')

	def dispatch(self, request, *args, **kwargs):
		try:
			return super().dispatch(request, *args, **kwargs)
		except Exception as e:
			import traceback
			with open(r'd:\Janki\product-sheet-design\backend\err_view.txt', 'a') as f:
				f.write(f"ERROR in {request.path}:\n")
				f.write(traceback.format_exc() + "\n")
			raise e
	
	def create(self, request, *args, **kwargs):
		logger.info(f"Job creation request received: {request.data}")
		try:
			return super().create(request, *args, **kwargs)
		except Exception as e:
			logger.error(f"Job creation error: {str(e)}", exc_info=True)
			raise

	def perform_create(self, serializer):
		instance = serializer.save(
			tenant=(getattr(self.request, 'tenant', None) or (getattr(self.request.user, 'tenant', None) if self.request.user and self.request.user.is_authenticated else None)),
			company=(getattr(self.request, 'company', None) or (getattr(self.request.user, 'active_company', None) if self.request.user and self.request.user.is_authenticated else None)),
		)
		# Single (non-batch) vouchers created directly as in_process need their
		# source stage current stock deducted immediately.
		if instance.approval_status == VoucherApprovalStatus.IN_PROCESS and not instance.batch_id:
			_deduct_source_current_stock(instance)
		try:
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(getattr(self, 'request', None), ActivityLog.ACTION_CREATE, 'job', instance)
		except Exception:
			pass

	search_fields = ['title']

	def perform_update(self, serializer):
		instance = self.get_object()
		next_status = serializer.validated_data.get('status', instance.status)
		if next_status != instance.status and not can_transition(instance.status, next_status):
			raise ValidationError({'status': f'Invalid transition: {instance.status} -> {next_status}'})
		try:
			from common.audit import serialize_instance
			old_data = serialize_instance(instance)
		except Exception:
			old_data = None
		serializer.save()
		try:
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(getattr(self, 'request', None), ActivityLog.ACTION_UPDATE, 'job', serializer.instance, old_data=old_data)
		except Exception:
			pass

	@action(detail=False, methods=['get'], url_path='wip-summary')
	def wip_summary(self, request):
		"""
		Returns remaining WIP quantities per master_sku per dept_to for
		vouchers that are actively being worked on.

		Only in_process and partially_complete vouchers count as WIP.
		Awaiting / approved vouchers haven't started work yet so their
		quantities must NOT appear.

		WIP per row = issued_qty ΓêÆ already_received_qty.
		Response: { success: true, data: { "SKU": { "dept_to_key": qty, ... }, ... } }
		"""
		active_statuses = {
			VoucherApprovalStatus.IN_PROCESS,
			VoucherApprovalStatus.PARTIALLY_COMPLETED,
		}
		active_jobs = self.filter_queryset(self.get_queryset()).filter(
			approval_status__in=active_statuses
		).only('dept_to', 'material_rows', 'die_rows', 'received_rows')

		# Pre-load known master SKUs so we can distinguish master SKUs that contain
		# a slash (e.g. "AJE15/4") from variant suffixes (e.g. "KARTIK/G").
		from products.models import Product
		from core_permissions.filters import SaaSIsolationFilterBackend
		products_qs = SaaSIsolationFilterBackend().filter_queryset(request, Product.objects.all(), self)
		known_skus = set(
			s.upper() for s in
			products_qs.values_list('master_sku', flat=True)
		)

		def resolve_sku(raw: str) -> str:
			"""Return the master SKU for a raw material-row SKU."""
			upper = raw.upper()
			if upper in known_skus:
				return upper
			if '/' in raw:
				prefix = raw.split('/')[0].upper()
				if prefix in known_skus:
					return prefix
			return upper

		wip: dict = {}

		for job in active_jobs:
			dept_to = (job.dept_to or '').strip()
			if not dept_to:
				continue

			# Sum already-received AND already-lost quantities per SKU from all
			# previous receive events.  Loss pieces leave the pipeline at this
			# stage (they go into a Re-Issue chain), so they must not count as WIP.
			already_rcvd: dict = {}
			already_lost: dict = {}
			for event in (job.received_rows or []):
				for row in (event.get('rows') or []):
					s = resolve_sku(str(row.get('sku', '') or '').strip())
					qty = int(float(row.get('received_qty', 0) or 0))
					loss = int(float(row.get('loss_qty', 0) or 0))
					already_rcvd[s] = already_rcvd.get(s, 0) + qty
					already_lost[s] = already_lost.get(s, 0) + loss

			# For pre-casting stages (wax-pieces, wax-setting, casting) material_rows
			# now contains die code rows, not master SKUs.  Derive master-SKU WIP from
			# die_rows instead so the inventory sheet WIP columns remain accurate.
			# received_rows for these stages use die codes as sku, already in already_rcvd.
			if dept_to in PRE_CASTING_DEPT_TOS and (job.die_rows or []):
				for die_row in (job.die_rows or []):
					master_sku = str(die_row.get('master_sku', '') or '').strip().upper()
					die_code = str(die_row.get('die_code', '') or '').strip().upper()
					die_issued = int(float(die_row.get('issued_qty', 0) or 0))
					qty_per_piece = int(float(die_row.get('qty_per_piece', 1) or 1)) or 1
					if not master_sku or not die_code:
						continue
					master_issued = die_issued // qty_per_piece
					# already_rcvd keyed by die_code (resolve_sku just uppercases non-product strings)
					die_received = already_rcvd.get(die_code, 0)
					die_lost = already_lost.get(die_code, 0)
					master_received = (die_received + die_lost) // qty_per_piece
					remaining = max(0, master_issued - master_received)
					if remaining == 0:
						continue
					wip.setdefault(master_sku, {})
					wip[master_sku][dept_to] = wip[master_sku].get(dept_to, 0) + remaining
			else:
				for row in (job.material_rows or []):
					raw_sku = str(row.get('sku', '') or '').strip()
					if not raw_sku:
						continue
					master_sku = resolve_sku(raw_sku)
					issued = int(float(row.get('issued_qty', 0) or 0))
					received = already_rcvd.get(master_sku, 0)
					lost = already_lost.get(master_sku, 0)
					# WIP = issued − received − lost  (lost pieces are handled by Re-Issue chain)
					remaining = max(0, issued - received - lost)
					if remaining == 0:
						continue
					wip.setdefault(master_sku, {})
					wip[master_sku][dept_to] = wip[master_sku].get(dept_to, 0) + remaining

		return Response({'success': True, 'data': wip})

	@action(detail=False, methods=['post'], url_path='bulk-create-from-picklist')
	@transaction.atomic
	def bulk_create_from_picklist(self, request):
		"""Create vouchers for all Master SKUs in a picklist based on demand vs stock.

		Products are grouped by stage transition.  If a product only has
		'hand' setting, the 'wax-setting' stage is removed from its pipeline
		(pieces go Wax Piece ΓåÆ Casting directly).  If only 'wax' setting,
		the 'hand-setting' stage is removed (Pre-Polish ΓåÆ Final Polish).
		If both or unset, all stages are included.
		"""
		ser = BulkVoucherRequestSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		picklist_group_id = ser.validated_data['picklist_group_id']
		approved_by = ser.validated_data.get('approved_by', '')

		try:
			picklist_group = PicklistGroup.objects.get(id=picklist_group_id)
		except PicklistGroup.DoesNotExist:
			raise ValidationError({'picklist_group_id': 'Picklist group not found.'})

		picklist_items = PicklistItem.objects.filter(group=picklist_group)
		if not picklist_items.exists():
			raise ValidationError({'picklist_group_id': 'Picklist has no items.'})

		batch_id = f'batch-{uuid.uuid4().hex[:12]}'

		# Concurrency-safe voucher generation by locking the active company record
		company = getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)
		if company:
			from core_tenants.models import Company
			Company.objects.select_for_update().get(id=company.id)

		# Get the current voucher counter from DB by finding the max counter number of today
		today = timezone.now().date()
		locked_vouchers = list(Job.objects.select_for_update().filter(
			voucher_no__startswith='JJ-',
			created_at__date=today
		))
		max_num = 0
		for v in locked_vouchers:
			if v.voucher_no:
				try:
					num = int(v.voucher_no.split('-')[1])
					if num > max_num:
						max_num = num
				except (ValueError, IndexError):
					pass
		counter = max_num + 1

		# ------------------------------------------------------------------
		# Phase 1: Collect each product's custom pipeline and qty
		# ------------------------------------------------------------------
		# transition_key (from_key, to_key) -> list of {product, master_sku, qty}
		from collections import OrderedDict
		transition_buckets = OrderedDict()

		from products.models import Product
		from inventory.models import DieInventoryItem as _DieItem
		from designers.models import DesignerSheet as _DesignerSheet

		# ── Preload data to avoid N+1 queries ──
		skus = [item.sku.strip() for item in picklist_items if item.sku.strip()]
		tenant = getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None)

		# 1. Preload Products
		products_list = list(Product.objects.filter(
			Q(master_sku__in=skus) | Q(master_sku__in=[s.split('/')[0] for s in skus if '/' in s]),
			tenant=tenant
		))
		product_map = {}
		for p in products_list:
			product_map[p.master_sku.strip().upper()] = p

		# 2. Preload Stock counts
		stock_qs = InventoryTransaction.objects.filter(
			product__in=products_list,
			stage='final_stock',
			stock_type='current'
		).values('product_id').annotate(total=Sum('quantity'))
		stock_map = {item['product_id']: item['total'] or 0 for item in stock_qs}

		# 3. Preload Die items using contains check for GIN index
		die_query = Q()
		for s in skus:
			die_query |= Q(master_skus__contains=[s]) | Q(master_skus__contains=[s.upper()])
		die_items = list(_DieItem.objects.filter(die_query, tenant=tenant)) if skus else []
		
		sku_to_dies = {}
		for die in die_items:
			die_skus = die.master_skus if isinstance(die.master_skus, list) else []
			for ds in die_skus:
				ds_upper = str(ds).strip().upper()
				sku_to_dies.setdefault(ds_upper, []).append(die)

		# 4. Preload Designer Sheets
		designer_skus_set = set()
		for p in products_list:
			if p.designer_sku:
				designer_skus_set.add(p.designer_sku.strip())
			for ds in (p.designer_skus or []):
				if ds and str(ds).strip():
					designer_skus_set.add(str(ds).strip())
		designer_sheets = list(_DesignerSheet.objects.filter(sku__in=list(designer_skus_set)).only('sku', 'stone_entries')) if designer_skus_set else []
		designer_map = {ds.sku.strip(): ds for ds in designer_sheets}

		# ── Build transition buckets ──
		for item in picklist_items:
			sku = item.sku.strip()
			if not sku:
				continue

			sku_upper = sku.upper()
			product = product_map.get(sku_upper)
			if not product and '/' in sku:
				product = product_map.get(sku.split('/')[0].upper())
			if not product:
				continue

			demand = item.needed or 0
			if demand <= 0:
				continue

			final_stock = stock_map.get(product.id, 0)

			pieces_to_make = demand - final_stock
			if pieces_to_make <= 0:
				continue

			# Determine which setting stages this product needs
			raw_setting = (product.setting_type or '').lower()
			setting_tags = [s.strip() for s in raw_setting.split(',') if s.strip()]
			wants_wax  = (not setting_tags) or any('wax'  in t for t in setting_tags)
			wants_hand = (not setting_tags) or any('hand' in t for t in setting_tags)

			# Build this product's pipeline by removing inapplicable stages
			product_pipeline = []
			for dept_key, dept_label in DEPARTMENT_PIPELINE:
				if dept_key == 'wax-setting' and not wants_wax:
					continue
				if dept_key == 'hand-setting' and not wants_hand:
					continue
				product_pipeline.append((dept_key, dept_label))

			# Create transitions from consecutive stages
			for i in range(len(product_pipeline) - 1):
				from_key, from_label = product_pipeline[i]
				to_key, to_label = product_pipeline[i + 1]
				tkey = (from_key, to_key)
				if tkey not in transition_buckets:
					transition_buckets[tkey] = {
						'from_key': from_key,
						'from_label': from_label,
						'to_key': to_key,
						'to_label': to_label,
						'items': [],
					}
				transition_buckets[tkey]['items'].append({
					'product': product,
					'master_sku': product.master_sku,
					'qty': pieces_to_make,
				})

		# ------------------------------------------------------------------
		# Phase 2: Create one voucher per unique transition
		# ------------------------------------------------------------------
		created_vouchers = []

		with transaction.atomic():
			# Stable order: follow DEPARTMENT_PIPELINE order for from_key
			dept_order = {key: idx for idx, (key, _) in enumerate(DEPARTMENT_PIPELINE)}

			sorted_transitions = sorted(
				transition_buckets.values(),
				key=lambda b: (dept_order.get(b['from_key'], 99), dept_order.get(b['to_key'], 99)),
			)

			for step_idx, bucket in enumerate(sorted_transitions):
				material_rows = []
				total_qty = 0
				products_in_voucher = []

				for entry in bucket['items']:
					material_rows.append({
						'sku': entry['master_sku'],
						'category': entry['product'].category or '',
						'metal': entry['product'].material or '',
						'issued_qty': str(entry['qty']),
						'unit1': 'Pcs',
						'issued_weight': '',
						'unit2': '',
					})
					total_qty += entry['qty']
					products_in_voucher.append(entry)

				voucher_no = f'JJ-{str(counter).zfill(2)}'
				counter += 1

				from_label = bucket['from_label']
				to_label = bucket['to_label']
				title = f'{voucher_no} - {from_label} to {to_label}'

				# ── Build die_rows for pre-casting stages ─────────────────────
				die_rows = []
				if bucket['to_key'] in PRE_CASTING_DEPT_TOS:
					for entry in bucket['items']:
						sku_upper = entry['master_sku'].strip().upper()
						pieces_needed = entry['qty']
						# Find all dies linked to this master SKU
						die_candidates = sku_to_dies.get(sku_upper, [])
						for die in die_candidates:
							skus_list = die.master_skus if isinstance(die.master_skus, list) else []
							if not any(str(s).strip().upper() == sku_upper for s in skus_list):
								continue
							qty_map = die.sku_qty_per_piece if isinstance(die.sku_qty_per_piece, dict) else {}
							qpp = qty_map.get(sku_upper) or next(
								(v for k, v in qty_map.items() if k.upper() == sku_upper), 1
							)
							die_rows.append({
								'master_sku': entry['master_sku'],
								'die_code': die.die_code,
								'qty_per_piece': int(qpp) if qpp else 1,
								'issued_qty': str(pieces_needed * (int(qpp) if qpp else 1)),
							})

				# ── Build stone_rows aggregated across all master SKUs in this voucher ──
				stone_agg: dict = {}  # fingerprint -> aggregated stone data

				for entry in bucket['items']:
					product = entry['product']
					master_sku = entry['master_sku']
					pieces = entry['qty']

					# Collect stone entries from the product itself
					all_stone_sources = list(product.stone_entries or []) if isinstance(product.stone_entries, list) else []

					# Also pull from any linked designer sheets
					d_skus = []
					if product.designer_sku:
						d_skus.append(product.designer_sku.strip())
					for ds in (product.designer_skus or []):
						if ds and str(ds).strip():
							d_skus.append(str(ds).strip())
					if d_skus:
						for d_sku in d_skus:
							designer = designer_map.get(d_sku)
							if designer and isinstance(designer.stone_entries, list):
								all_stone_sources.extend(designer.stone_entries)

					for se in all_stone_sources:
						s_type = str(se.get('type', '') or '').strip()
						s_species = str(se.get('species', '') or '').strip()
						s_variety = str(se.get('variety', '') or '').strip()
						s_color = str(se.get('color', '') or '').strip()
						s_cut = str(se.get('cut', '') or '').strip()
						s_shape = str(se.get('shape', '') or '').strip()
						s_length = str(se.get('length', '') or '').strip()
						s_width = str(se.get('width', '') or '').strip()
						s_height = str(se.get('height', '') or '').strip()
						try:
							s_qty_per_piece = float(se.get('qty', 0) or 0)
						except (TypeError, ValueError):
							s_qty_per_piece = 0

						# Skip completely empty rows
						if s_qty_per_piece <= 0 and not (s_variety or s_type or s_shape):
							continue

						fingerprint = (
							s_type.lower(), s_variety.lower(), s_color.lower(),
							s_cut.lower(), s_shape.lower(), s_length, s_width, s_height,
						)
						# Total stones for this master SKU = qty-per-piece × pieces-to-make
						stones_for_sku = s_qty_per_piece * pieces

						if fingerprint not in stone_agg:
							stone_agg[fingerprint] = {
								'type': s_type,
								'species': s_species,
								'variety': s_variety,
								'color': s_color,
								'cut': s_cut,
								'shape': s_shape,
								'length': s_length,
								'width': s_width,
								'height': s_height,
								'qty': 0,
								'master_sku_breakdown': [],
							}
						stone_agg[fingerprint]['qty'] += stones_for_sku
						stone_agg[fingerprint]['master_sku_breakdown'].append({
							'master_sku': master_sku,
							'qty': stones_for_sku,
						})

				stone_rows = [
					{
						'type': d['type'],
						'species': d['species'],
						'variety': d['variety'],
						'color': d['color'],
						'cut': d['cut'],
						'shape': d['shape'],
						'length': d['length'],
						'width': d['width'],
						'height': d['height'],
						'qty': d['qty'],
						'master_sku_breakdown': d['master_sku_breakdown'],
					}
					for d in stone_agg.values()
				]

				voucher = Job.objects.create(
					tenant=(getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None)),
					company=(getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)),
					title=title,
					product=products_in_voucher[0]['product'],  # primary product
					status='created',
					voucher_no=voucher_no,
					voucher_type='New',
					dept_from=bucket['from_key'],
					dept_to=bucket['to_key'],
					work_type='In-House',
					approval_status=VoucherApprovalStatus.PENDING,
					picklist_group=picklist_group,
					batch_id=batch_id,
					department_order=step_idx,
					material_rows=material_rows,
					stone_rows=stone_rows,
					die_rows=die_rows,
					notes=f'Step {step_idx + 1}: {from_label} \u2192 {to_label}',
				)
				created_vouchers.append(voucher)

				# NOTE: No inventory transactions here ΓÇö WIP is computed live from
				# in_process vouchers, and source deduction happens at activation.

		serializer = JobSerializer(created_vouchers, many=True)
		return Response({
			'success': True,
			'data': {
				'batch_id': batch_id,
				'vouchers_created': len(created_vouchers),
				'vouchers': serializer.data,
			},
		}, status=status.HTTP_201_CREATED)

	@action(detail=False, methods=['post'], url_path='create-repair-vouchers')
	def create_repair_vouchers(self, request):
		"""
		Create repair vouchers for all products in a confirmed Repair Batch,
		grouped by their repair stage.
		"""
		batch_no = request.data.get('batch_no', '')
		issued_to = request.data.get('issued_to', '')
		issued_by = request.data.get('issued_by', '')
		contact = request.data.get('contact', '')
		work_type = request.data.get('work_type', 'In-House')
		schedule = request.data.get('schedule', None)
		notes = request.data.get('notes', '')

		if not batch_no:
			raise ValidationError({'batch_no': 'Batch number is required.'})

		from inventory.models import RepairBatch, RepairItem
		try:
			batch = RepairBatch.objects.get(batch_no=batch_no)
		except RepairBatch.DoesNotExist:
			raise ValidationError({'batch_no': 'Repair batch not found.'})

		if batch.voucher_created:
			raise ValidationError({'batch_no': 'Vouchers have already been generated for this repair batch.'})

		items = list(batch.items.all())
		if not items:
			raise ValidationError({'batch_no': 'This repair batch has no products.'})

		from collections import defaultdict
		stage_buckets = defaultdict(list)
		for item in items:
			stage_buckets[item.repair_stage].append(item)

		STAGE_MAPPING = {
			'hand_setting': {
				'from_key': 'pre-polish',
				'to_key': 'hand-setting',
				'from_label': 'Pre-Polish',
				'to_label': 'Hand Setting'
			},
			'final_polish': {
				'from_key': 'hand-setting',
				'to_key': 'polishing',
				'from_label': 'Hand Setting',
				'to_label': 'Final Polish'
			},
			'plating': {
				'from_key': 'polishing',
				'to_key': 'plating',
				'from_label': 'Final Polish',
				'to_label': 'Plating'
			}
		}

		created_vouchers = []
		from products.models import Product
		from designers.models import DesignerSheet

		with transaction.atomic():
			# Lock the active company to serialize repair voucher numbering
			company = getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)
			if company:
				from core_tenants.models import Company
				Company.objects.select_for_update().get(id=company.id)

			# Stable voucher numbering counter with select_for_update, finding the max counter number of today
			today = timezone.now().date()
			locked_vouchers = list(Job.objects.select_for_update().filter(
				voucher_no__startswith='JJ-',
				created_at__date=today
			))
			max_num = 0
			for v in locked_vouchers:
				if v.voucher_no:
					try:
						num = int(v.voucher_no.split('-')[1])
						if num > max_num:
							max_num = num
					except (ValueError, IndexError):
						pass
			counter = max_num + 1

			for stage_key, bucket_items in stage_buckets.items():
				mapping = STAGE_MAPPING.get(stage_key)
				if not mapping:
					logger.warning(f"Skipping unknown stage {stage_key} in repair batch.")
					continue

				material_rows = []
				stone_agg = {}

				for entry in bucket_items:
					product = Product.objects.filter(master_sku__iexact=entry.sku).first()
					
					material_rows.append({
						'sku': entry.sku,
						'category': product.category if product else '',
						'metal': product.material if product else '',
						'issued_qty': str(entry.quantity),
						'unit1': 'Pcs',
						'issued_weight': '',
						'unit2': ''
					})

					# Stone rows aggregation logic
					if product:
						all_stone_sources = list(product.stone_entries or []) if isinstance(product.stone_entries, list) else []
						d_skus = []
						if product.designer_sku:
							d_skus.append(product.designer_sku.strip())
						for ds in (product.designer_skus or []):
							if ds and str(ds).strip():
								d_skus.append(str(ds).strip())
						if d_skus:
							for designer in DesignerSheet.objects.filter(sku__in=d_skus).only('stone_entries'):
								if isinstance(designer.stone_entries, list):
									all_stone_sources.extend(designer.stone_entries)

						for se in all_stone_sources:
							s_type = str(se.get('type', '') or '').strip()
							s_species = str(se.get('species', '') or '').strip()
							s_variety = str(se.get('variety', '') or '').strip()
							s_color = str(se.get('color', '') or '').strip()
							s_cut = str(se.get('cut', '') or '').strip()
							s_shape = str(se.get('shape', '') or '').strip()
							s_length = str(se.get('length', '') or '').strip()
							s_width = str(se.get('width', '') or '').strip()
							s_height = str(se.get('height', '') or '').strip()
							try:
								s_qty_per_piece = float(se.get('qty', 0) or 0)
							except (TypeError, ValueError):
								s_qty_per_piece = 0

							if s_qty_per_piece <= 0 and not (s_variety or s_type or s_shape):
								continue

							fingerprint = (
								s_type.lower(), s_variety.lower(), s_color.lower(),
								s_cut.lower(), s_shape.lower(), s_length, s_width, s_height
							)
							stones_for_sku = s_qty_per_piece * entry.quantity

							if fingerprint not in stone_agg:
								stone_agg[fingerprint] = {
									'type': s_type,
									'species': s_species,
									'variety': s_variety,
									'color': s_color,
									'cut': s_cut,
									'shape': s_shape,
									'length': s_length,
									'width': s_width,
									'height': s_height,
									'qty': 0,
									'master_sku_breakdown': []
								}
							stone_agg[fingerprint]['qty'] += stones_for_sku
							stone_agg[fingerprint]['master_sku_breakdown'].append({
								'master_sku': entry.sku,
								'qty': stones_for_sku
							})

				stone_rows = [
					{
						'type': d['type'],
						'species': d['species'],
						'variety': d['variety'],
						'color': d['color'],
						'cut': d['cut'],
						'shape': d['shape'],
						'length': d['length'],
						'width': d['width'],
						'height': d['height'],
						'qty': d['qty'],
						'master_sku_breakdown': d['master_sku_breakdown']
					}
					for d in stone_agg.values()
				]

				voucher_no = f'JJ-{str(counter).zfill(2)}'
				counter += 1

				title = f"{voucher_no} - Repair: {mapping['from_label']} to {mapping['to_label']}"

				primary_product = Product.objects.filter(master_sku__iexact=bucket_items[0].sku).first()

				voucher = Job.objects.create(
					tenant=(getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None)),
					company=(getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)),
					title=title,
					product=primary_product,
					status='created',
					approval_status=VoucherApprovalStatus.IN_PROCESS, # Start in_process directly so it does deductions
					voucher_no=voucher_no,
					voucher_type='Repair',
					dept_from=mapping['from_key'],
					dept_to=mapping['to_key'],
					issued_to=issued_to,
					issued_by=issued_by,
					contact=contact,
					work_type=work_type,
					schedule=schedule,
					batch_id=batch.batch_no,
					material_rows=material_rows,
					stone_rows=stone_rows,
					notes=notes or f"Repair batch: {batch.batch_no} — stage: {mapping['to_label']}"
				)
				created_vouchers.append(voucher)

				# Single vouchers created directly in_process need their stock deducted immediately
				_deduct_source_current_stock(voucher)

				for entry in bucket_items:
					entry.sent_to_repair = True
					entry.save()

			batch.voucher_created = True
			batch.save()

		serializer = JobSerializer(created_vouchers, many=True)
		return Response({
			'success': True,
			'data': {
				'batch_id': batch.batch_no,
				'vouchers_created': len(created_vouchers),
				'vouchers': serializer.data,
			}
		}, status=status.HTTP_201_CREATED)

	@action(detail=False, methods=['post'], url_path='approve-vouchers')
	def approve_vouchers(self, request):
		"""Approve only the explicitly submitted pending vouchers.

		For batched vouchers: only the submitted IDs are approved.
		The lowest department_order among the submitted batch members becomes
		in_process; all others become awaiting.  Vouchers in the same batch that
		were NOT submitted are left untouched.
		"""
		ser = ApproveVouchersSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		voucher_ids = ser.validated_data['voucher_ids']
		approved_by = ser.validated_data.get('approved_by', '')
		now = timezone.now()

		with transaction.atomic():
			# Only load the exact submitted vouchers that are still pending
			submitted = list(Job.objects.filter(
				id__in=voucher_ids,
				approval_status=VoucherApprovalStatus.PENDING,
			))

			if not submitted:
				raise ValidationError({'voucher_ids': 'No pending vouchers found with given IDs.'})

			# Group submitted vouchers by batch_id
			batches: dict = {}
			no_batch = []
			for v in submitted:
				if v.batch_id:
					batches.setdefault(v.batch_id, []).append(v)
				else:
					no_batch.append(v)

			total_approved = 0

			# For each batch group (only submitted members), apply pipeline ordering
			for bid, batch_vouchers in batches.items():
				sorted_batch = sorted(batch_vouchers, key=lambda x: x.department_order)
				# Within the submitted set, root = dept_from not a dept_to of any sibling
				dest_depts = {v.dept_to for v in sorted_batch}
				for v in sorted_batch:
					is_root = v.dept_from not in dest_depts
					v.approval_status = (
						VoucherApprovalStatus.IN_PROCESS if is_root
						else VoucherApprovalStatus.AWAITING
					)
					v.approved_by = approved_by
					v.approved_at = now
					v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])
					# Root vouchers start working immediately ΓÇö deduct from source stage
					if is_root:
						_deduct_source_current_stock(v)
					total_approved += 1

			# Non-batched vouchers ΓåÆ approved directly
			for v in no_batch:
				v.approval_status = VoucherApprovalStatus.APPROVED
				v.approved_by = approved_by
				v.approved_at = now
				v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])
				total_approved += 1

		all_affected_ids = {v.id for v in submitted}
		serializer = JobSerializer(Job.objects.filter(id__in=all_affected_ids), many=True)
		return Response({
			'success': True,
			'data': {
				'approved_count': total_approved,
				'vouchers': serializer.data,
			},
		})

	@action(detail=True, methods=['post'], url_path='mark-voucher-complete')
	def mark_voucher_complete(self, request, pk=None):
		"""Mark a voucher step as completed, activate the next one in the pipeline.

		Checks actual received quantities from prior receive events.
		- If all SKUs are fully received → COMPLETED (auto-fills any tiny remainder)
		- If any SKU has received < issued (or received is 0/empty) → PARTIALLY_COMPLETED
		"""
		voucher = self.get_object()

		if voucher.approval_status not in (VoucherApprovalStatus.IN_PROCESS, VoucherApprovalStatus.PARTIALLY_COMPLETED):
			raise ValidationError({'approval_status': 'Only in-process or partially complete vouchers can be marked complete.'})

		with transaction.atomic():
			_sync_repair_completion(voucher)

			from products.models import Product

			dest_stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')

			# Build already-received totals per SKU from previous receive events
			already_rcvd: dict = {}
			already_loss: dict = {}
			for event in (voucher.received_rows or []):
				for prev_row in (event.get('rows') or []):
					s = str(prev_row.get('sku', '') or '').strip().upper()
					already_rcvd[s] = (
						already_rcvd.get(s, 0)
						+ int(float(prev_row.get('received_qty', 0) or 0))
					)
					already_loss[s] = (
						already_loss.get(s, 0)
						+ int(float(prev_row.get('loss_qty', 0) or 0))
					)

			# ── Determine if all SKUs are fully accounted for ──────────────────
			all_fully_received = True
			synthetic_received_rows = []

			if voucher.dept_to in PRE_CASTING_DEPT_TOS:
				from inventory.models import DieInventoryItem, DieTransaction

				stage_qty_field = PRE_CASTING_STAGE_QTY_FIELD.get(voucher.dept_to, '')

				die_already_received: dict = {}
				die_already_loss: dict = {}
				for event in (voucher.received_rows or []):
					for prev_row in (event.get('rows') or []):
						dc = str(prev_row.get('die_code', '') or prev_row.get('sku', '') or '').strip().upper()
						if dc:
							die_already_received[dc] = (
								die_already_received.get(dc, 0)
								+ int(float(prev_row.get('received_qty', 0) or 0))
							)
							die_already_loss[dc] = (
								die_already_loss.get(dc, 0)
								+ int(float(prev_row.get('loss_qty', 0) or 0))
							)

				for dr in (voucher.die_rows or []):
					dc = str(dr.get('die_code', '') or '').strip()
					issued = int(float(dr.get('issued_qty', 0) or 0))
					if issued <= 0 or not dc:
						continue
					
					dc_upper = dc.upper()
					received_so_far = die_already_received.get(dc_upper, 0)
					loss_so_far = die_already_loss.get(dc_upper, 0)
					remaining = max(0, issued - received_so_far - loss_so_far)

					if remaining > 0:
						# This SKU is NOT fully accounted for
						all_fully_received = False

				# Only auto-fill and create inventory transactions if fully received
				if all_fully_received:
					for dr in (voucher.die_rows or []):
						dc = str(dr.get('die_code', '') or '').strip()
						issued = int(float(dr.get('issued_qty', 0) or 0))
						if issued <= 0 or not dc:
							continue
						
						# Any tiny remainder (received without loss accounting)
						remaining_recv = max(0, issued - die_already_received.get(dc.upper(), 0))
						if remaining_recv <= 0:
							continue

						try:
							die_item = DieInventoryItem.objects.get(die_code__iexact=dc)
							DieTransaction.objects.create(
								tenant=voucher.tenant,
								company=voucher.company,
								txn_date=timezone.now().date(),
								die=die_item,
								die_code=die_item.die_code,
								txn_type='received',
								master_sku=str(dr.get('master_sku', '') or '').strip(),
								qty=remaining_recv,
								remark=f'Completed (Auto-receive remaining): {voucher.voucher_no}',
								activity_status='received',
							)
							if stage_qty_field:
								current_qty = float(getattr(die_item, stage_qty_field, 0) or 0)
								setattr(die_item, stage_qty_field, current_qty + remaining_recv)
								die_item.save(update_fields=[stage_qty_field])
						except DieInventoryItem.DoesNotExist:
							pass

						synthetic_received_rows.append({
							'die_code': dc,
							'sku': str(dr.get('master_sku', '') or '').strip(),
							'received_qty': str(remaining_recv),
							'loss_qty': '0',
						})

			else:
				for row in (voucher.material_rows or []):
					issued = int(float(row.get('issued_qty', 0) or 0))
					if issued <= 0:
						continue
					sku = str(row.get('sku', '') or '').strip()
					sku_key = sku.upper()

					received_so_far = already_rcvd.get(sku_key, 0)
					loss_so_far = already_loss.get(sku_key, 0)
					remaining = max(0, issued - received_so_far - loss_so_far)

					if remaining > 0:
						# Check if received is 0 or empty — means not received at all
						if received_so_far <= 0:
							all_fully_received = False
						else:
							# Received something but not everything — still not fully received
							all_fully_received = False

				# Only auto-fill and create inventory transactions if fully received
				if all_fully_received:
					for row in (voucher.material_rows or []):
						issued = int(float(row.get('issued_qty', 0) or 0))
						if issued <= 0:
							continue
						sku = str(row.get('sku', '') or '').strip()
						sku_key = sku.upper()

						# Any tiny remainder
						remaining_recv = max(0, issued - already_rcvd.get(sku_key, 0))
						if remaining_recv <= 0:
							continue

						product = Product.objects.filter(
							Q(master_sku__iexact=sku)
						).first() or voucher.product
						if not product:
							continue

						if dest_stage_key:
							InventoryTransaction.objects.create(
								tenant=voucher.tenant,
								company=voucher.company,
								product=product,
								txn_type='adjust',
								quantity=remaining_recv,
								stage=dest_stage_key,
								stock_type='current',
								remark=f'Completed: {voucher.voucher_no}',
							)

						synthetic_received_rows.append({
							'sku': sku,
							'received_qty': str(remaining_recv),
							'loss_qty': '0',
						})

			# Set status based on whether all material has been received
			if all_fully_received:
				voucher.approval_status = VoucherApprovalStatus.COMPLETED
				voucher.status = 'completed'
			else:
				voucher.approval_status = VoucherApprovalStatus.PARTIALLY_COMPLETED
				# Status stays as-is (not 'completed')

			if synthetic_received_rows:
				receive_log = list(voucher.received_rows or [])
				receive_log.append({
					'timestamp': timezone.now().isoformat(),
					'received_by': 'system (mark-complete)',
					'is_partial': not all_fully_received,
					'total_received': sum(int(float(r['received_qty'])) for r in synthetic_received_rows),
					'rows': synthetic_received_rows,
				})
				voucher.received_rows = receive_log

			voucher.save(update_fields=['approval_status', 'status', 'received_rows'])

			# Activate all vouchers in the batch whose predecessors are now done
			if voucher.batch_id:
				_activate_ready_batch_vouchers(voucher.batch_id)

		serializer = JobSerializer(voucher)
		return Response({
			'success': True,
			'data': serializer.data,
		})

	@action(detail=True, methods=['post'], url_path='receive-voucher')
	def receive_voucher(self, request, pk=None):
		"""
		Receive an in-process (or partially complete) voucher.

		For each SKU row submitted:
		  - Adds received_qty to Current Stock of the dept_to stage

		Source deduction happened when the voucher entered in_process.
		WIP is computed live from active vouchers ΓÇö no WIP transactions needed.

		If is_partial=False  ΓåÆ voucher becomes Completed; next awaiting step activated if not already.
		If is_partial=True   ΓåÆ voucher becomes Partially Completed; next awaiting step activated immediately.

		Subsequent receives on a Partially Completed voucher complete it when is_partial=False,
		or log another partial batch if is_partial=True.
		"""
		from products.models import Product

		with transaction.atomic():
			voucher = Job.objects.select_for_update().get(pk=pk)

			if voucher.approval_status not in [
				VoucherApprovalStatus.IN_PROCESS,
				VoucherApprovalStatus.PARTIALLY_COMPLETED,
			]:
				# Allow pending single (non-batch) vouchers ΓÇö auto-transition to in_process
				if voucher.approval_status == VoucherApprovalStatus.PENDING and not voucher.batch_id:
					voucher.approval_status = VoucherApprovalStatus.IN_PROCESS
					voucher.save(update_fields=['approval_status'])
					_deduct_source_current_stock(voucher)
				else:
					raise ValidationError({
						'approval_status': (
							f'Cannot receive a voucher with status "{voucher.approval_status}". '
							'Only in-process or partially complete vouchers can be received.'
						)
					})

			is_partial = bool(request.data.get('is_partial', False))
			received_by = str(request.data.get('received_by', '') or '').strip()
			rows = request.data.get('rows', [])

			if not rows:
				raise ValidationError({'rows': 'At least one row with a received quantity is required.'})

			to_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')
			warnings = []
			total_received_this_batch = 0

			# ── Pre-casting (die-level) receive logic ──────────────────────────────
			if voucher.dept_to in PRE_CASTING_DEPT_TOS:
				from inventory.models import DieInventoryItem, DieTransaction

				stage_qty_field = PRE_CASTING_STAGE_QTY_FIELD.get(voucher.dept_to, '')

				# Build die issued map from die_rows
				die_issued_map: dict = {}
				die_info_map: dict = {}  # die_code_upper -> {master_sku, qty_per_piece}
				for dr in (voucher.die_rows or []):
					dc = str(dr.get('die_code', '') or '').strip().upper()
					if dc:
						die_issued_map[dc] = die_issued_map.get(dc, 0) + int(float(dr.get('issued_qty', 0) or 0))
						die_info_map[dc] = {
							'master_sku': str(dr.get('master_sku', '') or '').strip(),
							'qty_per_piece': float(dr.get('qty_per_piece', 1) or 1) or 1.0,
						}

				# Build already-received totals from prior die events
				die_already_received: dict = {}
				for event in (voucher.received_rows or []):
					for prev_row in (event.get('rows') or []):
						dc = str(prev_row.get('die_code', '') or prev_row.get('sku', '') or '').strip().upper()
						if dc:
							die_already_received[dc] = (
								die_already_received.get(dc, 0)
								+ int(float(prev_row.get('received_qty', 0) or 0))
							)

				master_sku_received: dict = {}  # master_sku_upper -> master pieces received this batch
				die_receive_log_rows: list = []
				any_loss_die = False

				for row_data in rows:
					die_code_raw = str(row_data.get('die_code', '') or row_data.get('sku', '') or '').strip()
					if not die_code_raw:
						continue
					dc_upper = die_code_raw.upper()
					received_qty = max(0, int(float(row_data.get('received_qty', 0) or 0)))
					loss_qty = max(0, int(float(row_data.get('loss_qty', 0) or 0)))
					if received_qty <= 0 and loss_qty <= 0:
						continue

					info = die_info_map.get(dc_upper, {})
					master_sku = info.get('master_sku', '')
					qty_per_piece = info.get('qty_per_piece', 1) or 1.0

					if loss_qty > 0:
						any_loss_die = True

					# DieTransaction + DieInventoryItem stage qty update
					try:
						die_item = DieInventoryItem.objects.get(die_code__iexact=die_code_raw)
						if received_qty > 0:
							DieTransaction.objects.create(
								tenant=voucher.tenant,
								company=voucher.company,
								txn_date=timezone.now().date(),
								die=die_item,
								die_code=die_item.die_code,
								txn_type='received',
								master_sku=master_sku,
								qty=received_qty,
								remark=f'Received from {voucher.dept_from}: {voucher.voucher_no}',
								activity_status='received',
							)
						if stage_qty_field and received_qty > 0:
							current_qty = float(getattr(die_item, stage_qty_field, 0) or 0)
							setattr(die_item, stage_qty_field, current_qty + received_qty)
							die_item.save(update_fields=[stage_qty_field])
					except DieInventoryItem.DoesNotExist:
						warnings.append(f'Die {die_code_raw}: not found in die inventory — DieTransaction skipped.')

					# Convert die qty to master SKU pieces for InventoryTransaction
					master_pieces = round(received_qty / qty_per_piece)
					if master_sku and master_pieces > 0:
						key = master_sku.upper()
						master_sku_received[key] = master_sku_received.get(key, 0) + master_pieces

					die_receive_log_rows.append({
						'die_code': die_code_raw,
						'master_sku': master_sku,
						'sku': master_sku,  # backward-compat for downstream propagation
						'received_qty': str(received_qty),
						'loss_qty': str(loss_qty),
					})

				# Create InventoryTransactions per master SKU
				for sku_upper, master_pieces in master_sku_received.items():
					product = Product.objects.filter(
						Q(master_sku__iexact=sku_upper)
					).first() or voucher.product
					if not product:
						warnings.append(f'Master SKU {sku_upper}: product not found — inventory not updated.')
						continue
					if to_stage:
						InventoryTransaction.objects.create(
							tenant=voucher.tenant,
							company=voucher.company,
							product=product,
							txn_type='adjust',
							quantity=master_pieces,
							stage=to_stage,
							stock_type='current',
							remark=f'Received {master_pieces} pcs — {voucher.voucher_no} ({voucher.dept_from} \u2192 {voucher.dept_to})',
						)
					total_received_this_batch += master_pieces

				if total_received_this_batch == 0 and not warnings:
					raise ValidationError({'rows': 'No valid received quantities provided.'})

				# Check all-accounted at die level
				all_die_accounted = True
				for dr in (voucher.die_rows or []):
					dc = str(dr.get('die_code', '') or '').strip().upper()
					issued = int(float(dr.get('issued_qty', 0) or 0))
					already = die_already_received.get(dc, 0)
					batch_recv = sum(
						int(float(r.get('received_qty', 0) or 0))
						for r in die_receive_log_rows
						if str(r.get('die_code', '') or '').upper() == dc
					)
					batch_loss = sum(
						int(float(r.get('loss_qty', 0) or 0))
						for r in die_receive_log_rows
						if str(r.get('die_code', '') or '').upper() == dc
					)
					if already + batch_recv + batch_loss < issued:
						all_die_accounted = False

				receive_log = list(voucher.received_rows or [])
				receive_log.append({
					'timestamp': timezone.now().isoformat(),
					'received_by': received_by,
					'is_partial': is_partial or not all_die_accounted or any_loss_die,
					'total_received': total_received_this_batch,
					'rows': die_receive_log_rows,
				})
				voucher.received_rows = receive_log
				voucher.received_by = received_by

				if not any_loss_die and all_die_accounted and not is_partial:
					voucher.approval_status = VoucherApprovalStatus.COMPLETED
					voucher.status = 'completed'
					voucher.save(update_fields=['approval_status', 'status', 'received_rows', 'received_by'])
					_sync_repair_completion(voucher)
				else:
					voucher.approval_status = VoucherApprovalStatus.PARTIALLY_COMPLETED
					voucher.save(update_fields=['approval_status', 'received_rows', 'received_by'])

				if voucher.batch_id:
					_activate_ready_batch_vouchers(voucher.batch_id)
					_propagate_qty_to_active_downstream(voucher.batch_id, voucher)

				serializer = JobSerializer(voucher)
				response_data = {**serializer.data}
				if warnings:
					response_data['warnings'] = warnings
				return Response({'success': True, 'data': response_data})

			# ── Standard (master-SKU level) receive logic ──────────────────────────

			# ── Build already-received totals per SKU (from previous partial events) ──
			already_received: dict = {}
			for event in (voucher.received_rows or []):
				for prev_row in (event.get('rows') or []):
					key = str(prev_row.get('sku', '') or '').strip().upper()
					already_received[key] = (
						already_received.get(key, 0)
						+ int(float(prev_row.get('received_qty', 0) or 0))
					)

			# ── Build issued totals per SKU from material_rows ──
			issued_map: dict = {}
			for mr in (voucher.material_rows or []):
				key = str(mr.get('sku', '') or '').strip().upper()
				issued_map[key] = issued_map.get(key, 0) + int(float(mr.get('issued_qty', 0) or 0))

			for row_data in rows:
				sku = str(row_data.get('sku', '') or '').strip()
				if not sku:
					continue

				received_qty = int(float(row_data.get('received_qty', 0) or 0))
				if received_qty <= 0:
					continue

				sku_key = sku.upper()
				issued = issued_map.get(sku_key, 0)
				already = already_received.get(sku_key, 0)
				remaining = issued - already

				# Guard: cannot receive more than remaining
				if received_qty > remaining:
					warnings.append(
						f'SKU {sku}: received qty ({received_qty}) exceeds remaining '
						f'({remaining} = issued {issued} \u2192 already received {already}). Capped to {remaining}.'
					)
					received_qty = remaining
					if received_qty <= 0:
						continue

				# Resolve product (try exact SKU match, then fall back to voucher FK)
				product = Product.objects.filter(
					Q(master_sku__iexact=sku)
				).first() or voucher.product

				if not product:
					warnings.append(
						f'SKU {sku}: no matching product found in database \u2014 '
						'inventory NOT updated for this row.'
					)
					continue

				# Add to Current Stock (dept_to stage).
				# Source deduction already happened when the voucher entered in_process.
				# WIP is computed live ΓÇö no WIP transaction needed.
				if to_stage:
					InventoryTransaction.objects.create(
						tenant=voucher.tenant,
						company=voucher.company,
						product=product,
						txn_type='adjust',
						quantity=received_qty,
						stage=to_stage,
						stock_type='current',
						remark=(
							f'Received {received_qty} pcs ΓÇö {voucher.voucher_no} '
							f'({voucher.dept_from} ΓåÆ {voucher.dept_to})'
						),
					)

				total_received_this_batch += received_qty

			if total_received_this_batch == 0 and not warnings:
				raise ValidationError({'rows': 'No valid received quantities provided.'})

			# ΓöÇΓöÇ Append to receive log ΓöÇΓöÇ
			receive_log = list(voucher.received_rows or [])
			receive_log.append({
				'timestamp': timezone.now().isoformat(),
				'received_by': received_by,
				'is_partial': is_partial,
				'total_received': total_received_this_batch,
				'rows': rows,
			})
			voucher.received_rows = receive_log
			voucher.received_by = received_by

			if is_partial:
				voucher.approval_status = VoucherApprovalStatus.PARTIALLY_COMPLETED
				voucher.save(update_fields=['approval_status', 'received_rows', 'received_by'])
				if voucher.batch_id:
					# Activate AWAITING next-stage vouchers (first-time activation)
					_activate_ready_batch_vouchers(voucher.batch_id)
					# Update already-active next-stage vouchers with new total qty
					_propagate_qty_to_active_downstream(voucher.batch_id, voucher)
			else:
				# Full receive → Completed
				voucher.approval_status = VoucherApprovalStatus.COMPLETED
				voucher.status = 'completed'
				voucher.save(update_fields=['approval_status', 'status', 'received_rows', 'received_by'])
				_sync_repair_completion(voucher)
				if voucher.batch_id:
					# Activate AWAITING next-stage vouchers
					_activate_ready_batch_vouchers(voucher.batch_id)
					# Update already-active next-stage vouchers with new total qty
					_propagate_qty_to_active_downstream(voucher.batch_id, voucher)

		serializer = JobSerializer(voucher)
		response_data = {**serializer.data}
		if warnings:
			response_data['warnings'] = warnings
		return Response({'success': True, 'data': response_data})

	@action(detail=True, methods=['post'], url_path='send-for-next-stage')
	def send_for_next_stage(self, request, pk=None):
		"""
		Single combined action replacing "Update Inventory", "Partial Update",
		and "Re-Issue for Improvement".

		Request body:
		  {
		    "rows": [{"sku": "X", "received_qty": 2, "loss_qty": 3}],
		    "received_by": "Kartik",
		    "note": "optional"
		  }

		Per-SKU math (loss pieces auto-become reissue pieces):
		  reissue_qty  = loss_qty
		  carry_fwd    = received_qty   (pieces going forward)
		  must satisfy: received_qty + loss_qty <= issued_qty - already_received

		Status determination (per SKU):
		  if sum(received + loss) == issued  → fully accounted for
		  if any SKU still has pieces unaccounted → PARTIALLY_COMPLETED

		If ANY loss_qty > 0  → full reissue pipeline triggered for those pieces
		  (current voucher marked REPLACED; Re-Issue chain created for all stages)
		If NO loss at all    → standard receive:
		  fully accounted    → COMPLETED
		  not yet            → PARTIALLY_COMPLETED
		"""
		from collections import OrderedDict as _OD
		from products.models import Product as _Product

		with transaction.atomic():
			try:
				voucher = Job.objects.select_for_update().get(pk=pk)
			except Job.DoesNotExist:
				return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

			if voucher.approval_status not in [
				VoucherApprovalStatus.IN_PROCESS,
				VoucherApprovalStatus.PARTIALLY_COMPLETED,
			]:
				if voucher.approval_status == VoucherApprovalStatus.PENDING and not voucher.batch_id:
					voucher.approval_status = VoucherApprovalStatus.IN_PROCESS
					voucher.save(update_fields=['approval_status'])
					_deduct_source_current_stock(voucher)
				else:
					raise ValidationError({
						'approval_status': (
							f'Cannot process a voucher with status "{voucher.approval_status}". '
							'Only in-process or partially complete vouchers can be sent for the next stage.'
						)
					})

			rows_data = request.data.get('rows', [])
			received_by = str(request.data.get('received_by', '') or '').strip()
			note = str(request.data.get('note', '') or '').strip()

			if not rows_data:
				raise ValidationError({'rows': 'At least one row is required.'})

			# ── Pre-casting: die-level tracking pre-processing ──────────────────
			# For pre-casting stages the frontend sends rows with die_code as 'sku'
			# plus master_sku and qty_per_piece.  We create DieTransactions here,
			# then convert the die quantities to master-SKU aggregates so the
			# downstream reissue pipeline logic (which works on master SKUs) is
			# unchanged.
			if voucher.dept_to in PRE_CASTING_DEPT_TOS:
				from inventory.models import DieInventoryItem, DieTransaction as _DieTransaction

				stage_qty_field = PRE_CASTING_STAGE_QTY_FIELD.get(voucher.dept_to, '')
				die_info_map_pre: dict = {}  # die_code_upper → {master_sku, qty_per_piece}
				for dr in (voucher.die_rows or []):
					dc = str(dr.get('die_code', '') or '').strip().upper()
					if dc:
						die_info_map_pre[dc] = {
							'master_sku': str(dr.get('master_sku', '') or '').strip(),
							'qty_per_piece': float(dr.get('qty_per_piece', 1) or 1) or 1.0,
						}

				master_sku_received_pre: dict = {}  # master_sku_upper → received pieces
				master_sku_loss_pre: dict = {}       # master_sku_upper → loss pieces
				warnings_list = []

				for row_data in rows_data:
					die_code_raw = str(row_data.get('die_code', '') or row_data.get('sku', '') or '').strip()
					if not die_code_raw:
						continue
					dc_upper = die_code_raw.upper()
					recv = max(0, int(float(row_data.get('received_qty', 0) or 0)))
					loss = max(0, int(float(row_data.get('loss_qty', 0) or 0)))
					if recv <= 0 and loss <= 0:
						continue

					info = die_info_map_pre.get(dc_upper, {})
					master_sku = str(info.get('master_sku', '') or dc_upper).strip()
					qpp = float(info.get('qty_per_piece', 1) or 1.0)
					if qpp <= 0:
						qpp = 1.0

					try:
						die_item = DieInventoryItem.objects.get(die_code__iexact=die_code_raw)
						if recv > 0:
							_DieTransaction.objects.create(
								tenant=voucher.tenant,
								company=voucher.company,
								txn_date=timezone.now().date(),
								die=die_item,
								die_code=die_item.die_code,
								txn_type='received',
								master_sku=master_sku,
								qty=recv,
								remark=f'Received from {voucher.dept_from}: {voucher.voucher_no}',
								activity_status='received',
							)
						if stage_qty_field and recv > 0:
							cur = float(getattr(die_item, stage_qty_field, 0) or 0)
							setattr(die_item, stage_qty_field, cur + recv)
							die_item.save(update_fields=[stage_qty_field])
					except DieInventoryItem.DoesNotExist:
						warnings_list.append(f'Die {die_code_raw}: not found — DieTransaction skipped.')

					if master_sku:
						mku = master_sku.upper()
						master_sku_received_pre[mku] = master_sku_received_pre.get(mku, 0) + round(recv / qpp)
						master_sku_loss_pre[mku] = master_sku_loss_pre.get(mku, 0) + round(loss / qpp)

				# Replace rows_data with master-SKU form so the existing pipeline logic works
				rows_data = [
					{
						'sku': mku,
						'received_qty': master_sku_received_pre.get(mku, 0),
						'loss_qty': master_sku_loss_pre.get(mku, 0),
					}
					for mku in set(list(master_sku_received_pre.keys()) + list(master_sku_loss_pre.keys()))
					if master_sku_received_pre.get(mku, 0) + master_sku_loss_pre.get(mku, 0) > 0
				]

			# ── Build existing received totals ──────────────────────────────────
			# Count both received_qty AND loss_qty from prior events — lost pieces
			# are accounted for and must not be counted as still-remaining.
			already_received: dict = {}
			for event in (voucher.received_rows or []):
				for prev_row in (event.get('rows') or []):
					key = str(prev_row.get('sku', '') or '').strip().upper()
					already_received[key] = (
						already_received.get(key, 0)
						+ int(float(prev_row.get('received_qty', 0) or 0))
						+ int(float(prev_row.get('loss_qty', 0) or 0))
					)

			# ── Build issued map ────────────────────────────────────────────────
			issued_map: dict = {}
			for mr in (voucher.material_rows or []):
				key = str(mr.get('sku', '') or '').strip().upper()
				issued_map[key] = issued_map.get(key, 0) + int(float(mr.get('issued_qty', 0) or 0))

			# ── Parse & validate incoming rows ──────────────────────────────────
			parsed: list = []
			any_loss = False
			if voucher.dept_to not in PRE_CASTING_DEPT_TOS:
				warnings_list = []

			for row_data in rows_data:
				sku = str(row_data.get('sku', '') or '').strip()
				if not sku:
					continue
				sku_key = sku.upper()
				received_qty = max(0, int(float(row_data.get('received_qty', 0) or 0)))
				loss_qty = max(0, int(float(row_data.get('loss_qty', 0) or 0)))
				# loss auto-becomes reissue
				reissue_qty = loss_qty

				issued = issued_map.get(sku_key, 0)
				already = already_received.get(sku_key, 0)
				remaining = issued - already

				# NOTE: received_qty CAN exceed issued_qty for amplification stages
				# (e.g. Die → Wax Piece: 2 dies may yield 4 wax pieces). There is
				# no upper-bound validation on received qty.

				if loss_qty > 0:
					any_loss = True

				parsed.append({
					'sku': sku,
					'sku_key': sku_key,
					'received_qty': received_qty,
					'loss_qty': loss_qty,
					'reissue_qty': reissue_qty,
					'issued': issued,
					'already': already,
					'remaining': remaining,
				})

			if not parsed:
				raise ValidationError({'rows': 'No valid rows provided.'})

			# ── Check if fully accounted ────────────────────────────────────────
			# A SKU is fully accounted when:
			#   already_received + received_qty + loss_qty >= issued_qty
			all_accounted = all(
				p['already'] + p['received_qty'] + p['loss_qty'] >= p['issued']
				for p in parsed
			)

			to_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')
			now = timezone.now()

			# ── Credit received pieces to dest-stage current stock ──────────────
			total_received_this_batch = 0
			for p in parsed:
				if p['received_qty'] <= 0:
					continue
				product = _Product.objects.filter(
					Q(master_sku__iexact=p['sku'])
				).first() or voucher.product
				if not product:
					warnings_list.append(
						f"SKU {p['sku']}: no matching product found — inventory NOT updated for this row."
					)
					continue
				if to_stage:
					InventoryTransaction.objects.create(
						tenant=voucher.tenant,
						company=voucher.company,
						product=product,
						txn_type='adjust',
						quantity=p['received_qty'],
						stage=to_stage,
						stock_type='current',
						remark=(
							f"Received {p['received_qty']} pcs — {voucher.voucher_no} "
							f"({voucher.dept_from} → {voucher.dept_to})"
						),
					)
				total_received_this_batch += p['received_qty']

			# ── Append receive event ────────────────────────────────────────────
			# ── Log receive event (includes loss_qty for accurate WIP) ────────
			receive_log = list(voucher.received_rows or [])
			receive_log.append({
				'timestamp': now.isoformat(),
				'received_by': received_by,
				'is_partial': not all_accounted,
				'total_received': total_received_this_batch,
				'rows': [
					{
						'sku': p['sku'],
						'received_qty': str(p['received_qty']),
						'loss_qty': str(p['loss_qty']),
					}
					for p in parsed
				],
			})
			voucher.received_rows = receive_log
			voucher.received_by = received_by

			# ── Set voucher status ──────────────────────────────────────────────
			# "received" = pieces that physically arrived at the destination.
			# Loss pieces are tracked separately; they go into Re-Issue chain.
			# COMPLETED   → all issued pieces actually received (no loss)
			# PARTIALLY_COMPLETE → anything else (loss present OR pieces still outstanding)
			if not any_loss and all_accounted:
				voucher.approval_status = VoucherApprovalStatus.COMPLETED
				voucher.status = 'completed'
				voucher.save(update_fields=['approval_status', 'status', 'received_rows', 'received_by'])
			else:
				# Loss present OR still outstanding pieces → PARTIALLY_COMPLETE.
				# The voucher stays open so the remaining in-transit pieces can
				# be received in a later submission.
				voucher.approval_status = VoucherApprovalStatus.PARTIALLY_COMPLETED
				voucher.save(update_fields=['approval_status', 'received_rows', 'received_by'])

			# ── Always activate downstream carry-forward chain ──────────────────
			# Received pieces must flow immediately to the next awaiting stage
			# regardless of whether there is loss or not.
			if voucher.batch_id:
				_activate_ready_batch_vouchers(voucher.batch_id)
				_propagate_qty_to_active_downstream(voucher.batch_id, voucher)

			if not any_loss:
				# Pure receive (no losses) — done after activating downstream.
				serializer = JobSerializer(voucher)
				response_data = {**serializer.data}
				if warnings_list:
					response_data['warnings'] = warnings_list
				return Response({'success': True, 'data': response_data})

			# ── Reissue path (losses present) ───────────────────────────────────

			# Build reissue_map from loss quantities
			reissue_map: dict = {
				p['sku_key']: p['reissue_qty']
				for p in parsed
				if p['reissue_qty'] > 0
			}

			# Carry-forward = received qty per SKU (already credited above)
			carry_forward: dict = {
				p['sku_key']: p['received_qty']
				for p in parsed
				if p['received_qty'] > 0
			}

			batch_id = voucher.batch_id
			dept_order_map = {key: idx for idx, (key, _) in enumerate(DEPARTMENT_PIPELINE)}
			v_dest_idx = dept_order_map.get(voucher.dept_to, 999)
			dept_label_map = {key: lbl for key, lbl in DEPARTMENT_PIPELINE}

			all_batch = list(
				Job.objects.filter(batch_id=batch_id).order_by('department_order', 'id')
				if batch_id else []
			)

			# ── Return reissue pieces to origin stage (inventory credit) ─────────
			transition_map: dict = _OD()
			for bv in sorted(all_batch, key=lambda x: (dept_order_map.get(x.dept_to, 999), x.id)):
				key = (bv.dept_from, bv.dept_to)
				if key not in transition_map:
					transition_map[key] = bv
				elif bv.voucher_type == 'New' and transition_map[key].voucher_type != 'New':
					transition_map[key] = bv

			stages_to_redo = sorted(
				transition_map.values(),
				key=lambda bv: dept_order_map.get(bv.dept_to, 999)
			)

			if stages_to_redo:
				origin_stage = DEPT_TO_STOCK_STAGE.get(stages_to_redo[0].dept_from, '')
				if origin_stage:
					prod_cache: dict = {}
					for sku_key, ri_qty in reissue_map.items():
						if ri_qty <= 0:
							continue
						prod = prod_cache.get(sku_key) or (
							_Product.objects.filter(Q(master_sku__iexact=sku_key)).first()
							or voucher.product
						)
						prod_cache[sku_key] = prod
						if prod:
							InventoryTransaction.objects.create(
								tenant=voucher.tenant,
								company=voucher.company,
								product=prod,
								txn_type='adjust',
								quantity=ri_qty,
								stage=origin_stage,
								stock_type='current',
								remark=(
									f'{ri_qty} pcs returned to {stages_to_redo[0].dept_from} '
									f'for re-issue of {voucher.voucher_no}'
								),
							)

			# ── Create Re-Issue vouchers for ALL pipeline stages ─────────────────
			# Lock the active company to serialize repair voucher numbering
			company = getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)
			if company:
				from core_tenants.models import Company
				Company.objects.select_for_update().get(id=company.id)

			# stable voucher counter incrementing from max counter number of today
			today = timezone.now().date()
			locked_vouchers = list(Job.objects.select_for_update().filter(
				voucher_no__startswith='JJ-',
				created_at__date=today
			))
			max_num = 0
			for v in locked_vouchers:
				if v.voucher_no:
					try:
						num = int(v.voucher_no.split('-')[1])
						if num > max_num:
							max_num = num
					except (ValueError, IndexError):
						pass
			counter = max_num + 1

			new_vouchers = []
			for stage_v in stages_to_redo:
				new_material_rows = []
				for mr in (stage_v.material_rows or []):
					sku = str(mr.get('sku', '') or '').strip()
					sku_key = sku.upper()
					ri_qty = reissue_map.get(sku_key, 0)
					if ri_qty <= 0:
						continue
					new_material_rows.append({
						'sku': sku,
						'category': mr.get('category', ''),
						'metal': mr.get('metal', ''),
						'issued_qty': str(ri_qty),
						'unit1': mr.get('unit1', 'Pcs'),
						'issued_weight': '',
						'unit2': mr.get('unit2', ''),
					})

				if not new_material_rows:
					continue

				voucher_no_new = f'JJ-{str(counter).zfill(2)}'
				counter += 1
				from_label = dept_label_map.get(stage_v.dept_from, stage_v.dept_from)
				to_label = dept_label_map.get(stage_v.dept_to, stage_v.dept_to)
				notes_text = f'Re-Issue for Improvement of {voucher.voucher_no}.'
				if note:
					notes_text += f' {note}'

				new_v = Job.objects.create(
					tenant=voucher.tenant,
					company=voucher.company,
					title=f'RE-ISSUE {voucher_no_new} - {from_label} to {to_label}',
					product=stage_v.product,
					status='created',
					voucher_no=voucher_no_new,
					voucher_type='Re-Issue',
					dept_from=stage_v.dept_from,
					dept_to=stage_v.dept_to,
					work_type=stage_v.work_type or voucher.work_type,
					issued_to=stage_v.issued_to or voucher.issued_to,
					issued_by=stage_v.issued_by or voucher.issued_by,
					contact=stage_v.contact or voucher.contact,
					approval_status=VoucherApprovalStatus.PENDING,
					picklist_group=voucher.picklist_group,
					batch_id=batch_id,
					department_order=dept_order_map.get(stage_v.dept_to, 99),
					material_rows=new_material_rows,
					stone_rows=stage_v.stone_rows or [],
					notes=notes_text,
				)
				new_vouchers.append(new_v)

			# ── Auto-approve re-issue chain ──────────────────────────────────────
			dest_depts_ri = {v.dept_to for v in new_vouchers}
			for new_v in sorted(new_vouchers, key=lambda x: x.department_order):
				is_root = new_v.dept_from not in dest_depts_ri
				new_v.approval_status = (
					VoucherApprovalStatus.IN_PROCESS if is_root
					else VoucherApprovalStatus.AWAITING
				)
				new_v.approved_by = 'auto-approved (send-for-next-stage reissue)'
				new_v.approved_at = now
				new_v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])
				if is_root:
					_deduct_source_current_stock(new_v)

			# Downstream New chain was already activated above via
			# _activate_ready_batch_vouchers before entering the reissue path.

		total_carry_fwd = sum(carry_forward.values()) if any_loss else 0
		serializer = JobSerializer(voucher)
		response_data = {**serializer.data}
		response_data['reissue_vouchers_created'] = len(new_vouchers) if any_loss else 0
		response_data['carry_forward'] = carry_forward if any_loss else {}
		if warnings_list:
			response_data['warnings'] = warnings_list
		return Response({
			'success': True,
			'message': (
				(
					f'{len(new_vouchers)} re-issue voucher(s) created for all pipeline stages. '
					f'{total_carry_fwd} carry-forward piece(s) continue in the New voucher chain.'
				) if any_loss else (
					'Inventory updated successfully.'
				)
			),
			'data': response_data,
		})

	@action(detail=True, methods=['get'], url_path='photo-guide')
	def photo_guide(self, request, pk=None):
		"""
		Return the material rows for this job with product images resolved.
		Each row: { sku, issued_qty, unit, images: [...], location: {wax_piece, wax_setting, ...} }
		Images are returned as absolute URLs.
		"""
		from products.models import Product as ProductModel
		from inventory.models import InventoryTransaction

		job = self.get_object()
		material_rows = job.material_rows or []

		# Collect unique, non-empty SKUs
		skus = list({
			row.get('sku', '').strip()
			for row in material_rows
			if row.get('sku', '').strip()
		})

		upper_skus = [s.upper() for s in skus]

		from django.db.models.functions import Upper

		# Primary lookup: match by master_sku (case-insensitive)
		products_by_master = (
			ProductModel.objects
			.annotate(upper_sku=Upper('master_sku'))
			.filter(upper_sku__in=upper_skus)
			.only('master_sku', 'designer_sku', 'images')
		)
		product_map = {p.master_sku.upper(): p for p in products_by_master}

		# Fallback: for SKUs not matched by master_sku, try designer_sku
		unmatched = [s for s in upper_skus if s not in product_map]
		if unmatched:
			products_by_designer = (
				ProductModel.objects
				.annotate(upper_designer=Upper('designer_sku'))
				.filter(upper_designer__in=unmatched)
				.only('master_sku', 'designer_sku', 'images')
			)
			for p in products_by_designer:
				key = p.designer_sku.upper()
				if key not in product_map:
					product_map[key] = p

		# Build per-product stage ΓåÆ latest location from inventory transactions
		product_ids = [p.id for p in product_map.values()]
		STAGE_LABELS = {
			'wax_piece':        'Wax Piece',
			'wax_setting':      'Wax Setting',
			'casting':          'Casting',
			'filling':          'Filling',
			'pre_polish':       'Pre Polish',
			'setting':          'Hand Setting',
			'final_polish':     'Final Polish',
			'ready_for_plating':'Plating',
		}
		# Fetch only transactions that have a non-empty location
		txns = (
			InventoryTransaction.objects
			.filter(product_id__in=product_ids)
			.exclude(location='')
			.values('product_id', 'stage', 'location', 'created_at')
			.order_by('product_id', 'stage', 'created_at')  # last one wins via iteration
		)
		# product_id ΓåÆ stage ΓåÆ latest location
		location_map = {}  # product_id ΓåÆ {stage_key: location_str}
		for txn in txns:
			pid = txn['product_id']
			stage = txn['stage']
			loc = txn['location'] or ''
			if loc:
				if pid not in location_map:
					location_map[pid] = {}
				location_map[pid][stage] = loc  # later rows overwrite earlier (ordered by created_at)

		def make_absolute(url):
			"""Turn a relative /media/... path into an absolute URL."""
			if not url:
				return None
			if isinstance(url, dict):
				# Handle images stored as {url: "..."} objects
				url = url.get('url') or url.get('src') or ''
			url = str(url).strip()
			if not url:
				return None
			if url.startswith('http://') or url.startswith('https://') or url.startswith('data:'):
				return url
			return request.build_absolute_uri(url)

		result = []
		for row in material_rows:
			sku = row.get('sku', '').strip()
			if not sku:
				continue
			product = product_map.get(sku.upper())
			raw_images = product.images if product and isinstance(product.images, list) else []
			from common.image_upload import sign_cloudinary_url
			resolved = [sign_cloudinary_url(make_absolute(img)) for img in raw_images]
			resolved = [img for img in resolved if img]  # filter None/empty

			# Build location dict for this product
			stage_locs = location_map.get(product.id, {}) if product else {}
			location = {label: stage_locs.get(key, '') for key, label in STAGE_LABELS.items()}

			result.append({
				'sku': sku,
				'quantity': row.get('issued_qty', ''),
				'unit': row.get('unit1', 'Pcs'),
				'images': resolved,
				'location': location,
			})

		return Response({'success': True, 'data': result})

	@action(detail=True, methods=['get'], url_path='die-guide')
	def die_guide(self, request, pk=None):
		"""
		Return a flat, deduplicated list of die codes for all SKUs in the picklist
		this voucher belongs to (falls back to material_rows if no picklist linked).

		qty_needed = sum(Product.die_numbers[i].quantity  ×  picklist_item.needed)
		             for each product that uses that die code.

		Image and location come from DieInventoryItem (looked up by die_code).
		Each entry: { die_code, image, location, qty_needed }
		"""
		from products.models import Product as ProductModel
		from inventory.models import DieInventoryItem, PicklistItem
		from django.db.models.functions import Upper

		job = self.get_object()

		# ── 1. Build sku_needed_map: UPPER_SKU → qty needed ─────────────────
		sku_needed_map = {}
		if job.picklist_group_id:
			for item in PicklistItem.objects.filter(group_id=job.picklist_group_id).only('sku', 'needed'):
				sku = item.sku.strip()
				if sku:
					sku_needed_map[sku.upper()] = sku_needed_map.get(sku.upper(), 0) + (item.needed or 0)

		if not sku_needed_map:
			# Fallback: collect from this voucher's material_rows
			for row in (job.material_rows or []):
				sku = row.get('sku', '').strip()
				if sku:
					try:
						qty = int(row.get('issued_qty') or row.get('qty') or 1)
					except (ValueError, TypeError):
						qty = 1
					sku_needed_map[sku.upper()] = sku_needed_map.get(sku.upper(), 0) + qty

		if not sku_needed_map:
			return Response({'success': True, 'data': []})

		upper_skus = list(sku_needed_map.keys())

		# ── 2. Fetch Products (exact match, then variant-prefix fallback) ────
		exact_prods = (
			ProductModel.objects
			.annotate(upper_sku=Upper('master_sku'))
			.filter(upper_sku__in=upper_skus)
			.only('master_sku', 'die_numbers')
		)
		products_map = {p.master_sku.upper(): p for p in exact_prods}

		# e.g. picklist has "AJS1/G" but product master_sku is "AJS1"
		unmatched = [s for s in upper_skus if s not in products_map and '/' in s]
		if unmatched:
			prefix_to_variants: dict = {}
			for s in unmatched:
				prefix_to_variants.setdefault(s.split('/')[0], []).append(s)
			prefix_prods = (
				ProductModel.objects
				.annotate(upper_sku=Upper('master_sku'))
				.filter(upper_sku__in=prefix_to_variants.keys())
				.only('master_sku', 'die_numbers')
			)
			for p in prefix_prods:
				for variant in prefix_to_variants.get(p.master_sku.upper(), []):
					if variant not in products_map:
						products_map[variant] = p

		# ── 3. Aggregate die qty: die_code → total_qty_needed ───────────────
		# Source of truth: Product.die_numbers[i].quantity = qty_per_piece for that SKU
		die_qty_map: dict[str, float] = {}

		for upper_sku, needed_qty in sku_needed_map.items():
			if needed_qty <= 0:
				continue
			product = products_map.get(upper_sku)
			if not product or not isinstance(product.die_numbers, list):
				continue
			for entry in product.die_numbers:
				if not isinstance(entry, dict):
					continue
				die_code = str(entry.get('value') or '').strip()
				if not die_code:
					continue
				try:
					qty_per_piece = float(entry.get('quantity') or 0)
				except (ValueError, TypeError):
					qty_per_piece = 0.0
				if qty_per_piece <= 0:
					continue
				die_qty_map[die_code] = die_qty_map.get(die_code, 0.0) + qty_per_piece * needed_qty

		if not die_qty_map:
			return Response({'success': True, 'data': []})

		# ── 4. Fetch DieInventoryItem for image + location ───────────────────
		die_inv_map = {
			d.die_code: d
			for d in DieInventoryItem.objects
			.filter(die_code__in=die_qty_map.keys())
			.only('die_code', 'image', 'location', 'designer_skus', 'wax_piece_location', 'wax_setting_location', 'casting_location')
		}

		def make_absolute(url):
			"""Turn a relative /media/... path into an absolute URL."""
			if not url:
				return None
			if isinstance(url, dict):
				# Handle images stored as {url: "..."} objects
				url = url.get('url') or url.get('src') or ''
			url = str(url).strip()
			if not url:
				return None
			if url.startswith('http://') or url.startswith('https://') or url.startswith('data:'):
				return url
			return request.build_absolute_uri(url)

		result = []
		for die_code, total_qty in die_qty_map.items():
			inv = die_inv_map.get(die_code)
			qty = int(total_qty) if total_qty == int(total_qty) else round(total_qty, 2)
			
			raw_img = (inv.image or '') if inv else ''
			imgs = []
			if raw_img:
				if raw_img.startswith('['):
					try:
						import json
						parsed = json.loads(raw_img)
						if isinstance(parsed, list):
							imgs = [str(x) for x in parsed]
						else:
							imgs = [str(parsed)]
					except Exception:
						imgs = [raw_img]
				elif ',' in raw_img:
					imgs = [x.strip() for x in raw_img.split(',') if x.strip()]
				else:
					imgs = [raw_img]

			# Resolve image URLs to absolute URLs
			resolved_imgs = []
			for img in imgs:
				abs_img = make_absolute(img)
				if abs_img:
					from common.image_upload import sign_cloudinary_url
					resolved_imgs.append(sign_cloudinary_url(abs_img))

			# If no custom photos uploaded, fetch from Master Designer Sheet & Product Sheet (fallback)
			if not resolved_imgs and inv:
				from designers.models import DesignerSheet
				from products.models import Product
				skus = [s for s in (inv.designer_skus or []) if s]
				master_skus = [s for s in (inv.master_skus or []) if s]
				seen = set()
				
				# 1. Fetch from DesignerSheet
				if skus:
					sheets = DesignerSheet.objects.filter(sku__in=skus).only(
						'sku', 'rendered_photo', 'image', 'designer_image_2', 'designer_image_3', 'technical_drawing'
					)
					for sheet in sheets:
						for url in (sheet.rendered_photo, sheet.image, sheet.designer_image_2, sheet.designer_image_3, sheet.technical_drawing):
							if url:
								abs_url = make_absolute(url)
								if abs_url and abs_url not in seen:
									seen.add(abs_url)
									from common.image_upload import sign_cloudinary_url
									resolved_imgs.append(sign_cloudinary_url(abs_url))

				# 2. Fetch from Product (Master product sheet)
				if master_skus:
					products = Product.objects.filter(master_sku__in=master_skus).only('images')
					for prod in products:
						raw_imgs = prod.images if isinstance(prod.images, list) else []
						for url in raw_imgs:
							if isinstance(url, dict):
								url = url.get('url') or url.get('src') or ''
							if url:
								abs_url = make_absolute(url)
								if abs_url and abs_url not in seen:
									seen.add(abs_url)
									from common.image_upload import sign_cloudinary_url
									resolved_imgs.append(sign_cloudinary_url(abs_url))

			result.append({
				'die_code': die_code,
				'image': resolved_imgs[0] if resolved_imgs else '',
				'images': resolved_imgs,
				'location': (inv.location or '') if inv else '',
				'wax_piece_location': (inv.wax_piece_location or '') if inv else '',
				'wax_setting_location': (inv.wax_setting_location or '') if inv else '',
				'casting_location': (inv.casting_location or '') if inv else '',
				'qty_needed': qty,
			})

		return Response({'success': True, 'data': result})

	@action(detail=True, methods=['post'], url_path='reissue-for-improvement')
	def reissue_for_improvement(self, request, pk=None):
		"""
		Mark the current in-process (or partially complete) voucher as REPLACED and
		create Re-Issue type vouchers for ALL pipeline stages — carrying the reissue qty
		through the full pipeline from Die to Final Stock.

		Simultaneously the carry-forward pieces (issued − already_received − reissue_qty)
		continue through the remaining downstream "New" vouchers so both chains run in
		parallel:
		  • Re-Issue chain (destroyed pcs): Die → … → Final Stock, 15 pcs
		  • New carry-fwd chain (surviving pcs): picks up at the stage AFTER the destroyed
		    voucher's destination and continues to Final Stock, 5 pcs

		Full-destroy case: reissue_qty == issued_qty − already_received for each SKU.
		Carry-forward = 0 → all downstream "New" AWAITING vouchers are marked Replaced.

		Request body:
		  { "rows": [{"sku": "AJE23", "reissue_qty": 10}], "note": "optional text" }

		After creation the re-issue vouchers are auto-approved:
		  - The first stage (root) becomes in_process immediately.
		  - All later stages become awaiting (activated as each predecessor completes).
		  - _activate_ready_batch_vouchers is called at the end so the carry-forward New
		    downstream voucher is activated immediately with the correct carry-fwd qty.
		"""
		from collections import OrderedDict as _OD
		from products.models import Product as _Product

		voucher = self.get_object()

		if voucher.approval_status not in [
			VoucherApprovalStatus.IN_PROCESS,
			VoucherApprovalStatus.PARTIALLY_COMPLETED,
		]:
			raise ValidationError({
				'approval_status': (
					f'Cannot re-issue a voucher with status "{voucher.approval_status}". '
					'Only in-process or partially complete vouchers support re-issue for improvement.'
				)
			})

		if not voucher.batch_id:
			raise ValidationError({
				'batch_id': 'Only pipeline vouchers (with a batch_id) support re-issue for improvement.'
			})

		rows = request.data.get('rows', [])
		note = str(request.data.get('note', '') or '').strip()

		# Build per-SKU reissue qty map
		reissue_map: dict = {}
		for row in rows:
			sku = str(row.get('sku', '') or '').strip()
			qty = int(float(row.get('reissue_qty', 0) or 0))
			if sku and qty > 0:
				reissue_map[sku.upper()] = qty

		if not reissue_map:
			raise ValidationError({'rows': 'No valid reissue quantities provided.'})

		# Validate reissue qty does not exceed remaining (issued − already received) per SKU
		already_received: dict = {}
		for event in (voucher.received_rows or []):
			for rr in (event.get('rows') or []):
				s = str(rr.get('sku', '') or '').strip().upper()
				already_received[s] = already_received.get(s, 0) + int(float(rr.get('received_qty', 0) or 0))
		for mr in (voucher.material_rows or []):
			sku_key = str(mr.get('sku', '') or '').strip().upper()
			issued = int(float(mr.get('issued_qty', 0) or 0))
			already = already_received.get(sku_key, 0)
			remaining = issued - already
			req_qty = reissue_map.get(sku_key, 0)
			if req_qty > remaining:
				raise ValidationError({
					'rows': (
						f'SKU {sku_key}: reissue_qty ({req_qty}) exceeds remaining pieces '
						f'({remaining} = issued {issued} − already received {already}).'
					)
				})

		# Compute carry-forward qty per SKU: pieces that survived and continue downstream
		carry_forward: dict = {}
		for mr in (voucher.material_rows or []):
			sku_key = str(mr.get('sku', '') or '').strip().upper()
			if not sku_key:
				continue
			issued = int(float(mr.get('issued_qty', 0) or 0))
			already = already_received.get(sku_key, 0)
			reissue_qty = reissue_map.get(sku_key, 0)
			cf = max(0, issued - already - reissue_qty)
			if cf > 0:
				carry_forward[sku_key] = cf

		batch_id = voucher.batch_id
		dept_order_map = {key: idx for idx, (key, _) in enumerate(DEPARTMENT_PIPELINE)}
		v_dest_idx = dept_order_map.get(voucher.dept_to, 999)
		dept_label_map = {key: lbl for key, lbl in DEPARTMENT_PIPELINE}

		all_batch = list(Job.objects.filter(batch_id=batch_id).order_by('department_order', 'id'))

		# Collect unique (dept_from, dept_to) transitions for ALL pipeline stages.
		# Prefer 'New' templates over old re-issue ones so we always clone from the
		# original pipeline definition.
		transition_map: dict = _OD()
		for bv in sorted(all_batch, key=lambda x: (dept_order_map.get(x.dept_to, 999), x.id)):
			key = (bv.dept_from, bv.dept_to)
			if key not in transition_map:
				transition_map[key] = bv
			elif bv.voucher_type == 'New' and transition_map[key].voucher_type != 'New':
				transition_map[key] = bv  # prefer the original 'New' template

		stages_to_redo = sorted(transition_map.values(), key=lambda bv: dept_order_map.get(bv.dept_to, 999))

		if not stages_to_redo:
			raise ValidationError({'error': 'No pipeline stages found to re-issue. Ensure the voucher belongs to a valid batch.'})

		now = timezone.now()

		with transaction.atomic():
			# Lock the active company to serialize repair voucher numbering
			company = getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None)
			if company:
				from core_tenants.models import Company
				Company.objects.select_for_update().get(id=company.id)

			# Next voucher counter, finding the max counter number of today
			today = timezone.now().date()
			locked_vouchers = list(Job.objects.select_for_update().filter(
				voucher_no__startswith='JJ-',
				created_at__date=today
			))
			max_num = 0
			for v in locked_vouchers:
				if v.voucher_no:
					try:
						num = int(v.voucher_no.split('-')[1])
						if num > max_num:
							max_num = num
					except (ValueError, IndexError):
						pass
			counter = max_num + 1
			# ΓöÇΓöÇ Mark the current voucher as Replaced ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
			voucher.approval_status = VoucherApprovalStatus.REPLACED
			voucher.save(update_fields=['approval_status'])

			# ΓöÇΓöÇ Mark earlier completed / partially-complete batch vouchers as Replaced ΓöÇΓöÇ
			# All completed (or partially-complete) vouchers in the same batch whose
			# destination stage is Γëñ the current stage are now superseded by the
			# re-issue chain.  They should appear as "Replaced" on the dashboard,
			# not "Completed", so managers can see the full re-issue trail.
			earlier_ids_to_replace = [
				bv.pk for bv in all_batch
				if bv.pk != voucher.pk
				and bv.approval_status in (
					VoucherApprovalStatus.COMPLETED,
					VoucherApprovalStatus.PARTIALLY_COMPLETED,
				)
				and dept_order_map.get(bv.dept_to, 999) <= v_dest_idx
			]
			if earlier_ids_to_replace:
				Job.objects.filter(pk__in=earlier_ids_to_replace).update(
					approval_status=VoucherApprovalStatus.REPLACED
				)

			# ΓöÇΓöÇ Return pieces to origin stage (inventory) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
			# The re-issue root will call _deduct_source_current_stock, debiting the
			# origin stage again.  The original pipeline already debited it when the
			# first batch started.  To avoid double-counting we first credit the
			# origin stage with the reissue qty, representing the pieces physically
			# returning to the start of the pipeline for rework.
			origin_stage = (
				DEPT_TO_STOCK_STAGE.get(stages_to_redo[0].dept_from, '')
				if stages_to_redo else ''
			)
			if origin_stage:
				_product_cache: dict = {}
				for sku_key, ri_qty in reissue_map.items():
					if ri_qty <= 0:
						continue
					prod = _product_cache.get(sku_key)
					if prod is None:
						prod = _Product.objects.filter(
							Q(master_sku__iexact=sku_key)
						).first() or voucher.product
						_product_cache[sku_key] = prod
					if prod:
						InventoryTransaction.objects.create(
							tenant=voucher.tenant,
							company=voucher.company,
							product=prod,
							txn_type='adjust',
							quantity=ri_qty,
							stage=origin_stage,
							stock_type='current',
							remark=(
								f'{ri_qty} pcs returned to {stages_to_redo[0].dept_from} '
								f'for re-issue of {voucher.voucher_no}'
							),
						)

			# ΓöÇΓöÇ Create Re-Issue vouchers for each stage ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
			new_vouchers = []
			for stage_v in stages_to_redo:
				new_material_rows = []
				for mr in (stage_v.material_rows or []):
					sku = str(mr.get('sku', '') or '').strip()
					sku_key = sku.upper()
					reissue_qty = reissue_map.get(sku_key, 0)
					if reissue_qty <= 0:
						continue
					new_material_rows.append({
						'sku': sku,
						'category': mr.get('category', ''),
						'metal': mr.get('metal', ''),
						'issued_qty': str(reissue_qty),
						'unit1': mr.get('unit1', 'Pcs'),
						'issued_weight': '',
						'unit2': mr.get('unit2', ''),
					})

				if not new_material_rows:
					continue  # no matching SKUs in this stage, skip

				voucher_no = f'JJ-{str(counter).zfill(2)}'
				counter += 1

				from_label = dept_label_map.get(stage_v.dept_from, stage_v.dept_from)
				to_label = dept_label_map.get(stage_v.dept_to, stage_v.dept_to)
				title = f'RE-ISSUE {voucher_no} - {from_label} to {to_label}'
				notes_text = f'Re-Issue for Improvement of {voucher.voucher_no}.'
				if note:
					notes_text += f' {note}'

				new_v = Job.objects.create(
					tenant=voucher.tenant,
					company=voucher.company,
					title=title,
					product=stage_v.product,
					status='created',
					voucher_no=voucher_no,
					voucher_type='Re-Issue',
					dept_from=stage_v.dept_from,
					dept_to=stage_v.dept_to,
					work_type=stage_v.work_type or voucher.work_type,
					issued_to=stage_v.issued_to or voucher.issued_to,
					issued_by=stage_v.issued_by or voucher.issued_by,
					contact=stage_v.contact or voucher.contact,
					approval_status=VoucherApprovalStatus.PENDING,
					picklist_group=voucher.picklist_group,
					batch_id=batch_id,
					department_order=dept_order_map.get(stage_v.dept_to, 99),
					material_rows=new_material_rows,
					stone_rows=stage_v.stone_rows or [],
					notes=notes_text,
				)
				new_vouchers.append(new_v)

			if not new_vouchers:
				raise ValidationError({
					'rows': 'No re-issue vouchers could be created. Ensure the SKUs in the rows match those in the voucher.'
				})

			# ════ Auto-approve: root → in_process, others → awaiting ════
			dest_depts_ri = {v.dept_to for v in new_vouchers}
			for new_v in sorted(new_vouchers, key=lambda x: x.department_order):
				is_root = new_v.dept_from not in dest_depts_ri
				new_v.approval_status = (
					VoucherApprovalStatus.IN_PROCESS if is_root
					else VoucherApprovalStatus.AWAITING
				)
				new_v.approved_by = 'auto-approved (re-issue for improvement)'
				new_v.approved_at = now
				new_v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])
				if is_root:
					_deduct_source_current_stock(new_v)

			# ════ Handle carry-forward pieces (e.g. 5 pcs that survived casting) ════
			# These pieces have physically passed the destroyed stage and should
			# continue through the downstream "New" vouchers.
			dest_stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')
			if dest_stage_key:
				# Credit carry-forward qty back to the current stage's output stock
				# so the downstream New voucher's activation can deduct from it.
				cf_product_cache: dict = {}
				for sku_key, cf_qty in carry_forward.items():
					if cf_qty <= 0:
						continue
					prod = cf_product_cache.get(sku_key)
					if prod is None:
						prod = _Product.objects.filter(
							Q(master_sku__iexact=sku_key)
						).first() or voucher.product
						cf_product_cache[sku_key] = prod
					if prod:
						InventoryTransaction.objects.create(
							tenant=voucher.tenant,
							company=voucher.company,
							product=prod,
							txn_type='adjust',
							quantity=cf_qty,
							stage=dest_stage_key,
							stock_type='current',
							remark=(
								f'{cf_qty} carry-forward pcs at {voucher.dept_to} '
								f'continuing after re-issue of {voucher.voucher_no}'
							),
						)

				# Record a synthetic receive event on the destroyed voucher covering
				# ALL SKUs (carry-forward qty, or 0 for fully re-issued ones).
				# This ensures _activate_ready_batch_vouchers sets the correct qty
				# on the downstream New voucher — including zeroing out SKUs where
				# all pieces were re-issued.
				synthetic_rows = []
				for mr in (voucher.material_rows or []):
					sku_key = str(mr.get('sku', '') or '').strip().upper()
					if not sku_key:
						continue
					cf_qty = carry_forward.get(sku_key, 0)
					synthetic_rows.append({'sku': sku_key, 'received_qty': str(cf_qty)})

				if synthetic_rows:
					existing_received = list(voucher.received_rows or [])
					existing_received.append({
						'timestamp': now.isoformat(),
						'received_by': 'system (carry-forward)',
						'is_partial': False,
						'rows': synthetic_rows,
					})
					voucher.received_rows = existing_received
					voucher.save(update_fields=['received_rows'])

			if not carry_forward:
				# Full destruction — cancel all downstream "New" AWAITING vouchers
				# (they have no pieces to carry forward). Mark as Replaced for audit trail.
				Job.objects.filter(
					batch_id=batch_id,
					voucher_type='New',
					approval_status=VoucherApprovalStatus.AWAITING,
					department_order__gt=v_dest_idx,
				).update(approval_status=VoucherApprovalStatus.REPLACED)

			# ════ Activate carry-forward New chain and Re-Issue chain downstream ════
			# This call respects voucher_type filtering (fixed above), so:
			#  - New Filing activates using the synthetic receive event (carry-fwd pcs)
			#  - Re-Issue Filing stays AWAITING until Re-Issue Casting completes
			_activate_ready_batch_vouchers(batch_id)

		total_carry_fwd = sum(carry_forward.values())
		serializer = JobSerializer(new_vouchers, many=True)
		return Response(
			{
				'success': True,
				'message': (
					f'{len(new_vouchers)} re-issue voucher(s) created for all pipeline stages. '
					f'Original voucher {voucher.voucher_no} is now marked as Replaced. '
					f'{total_carry_fwd} carry-forward piece(s) continue in the existing New voucher chain.'
				),
				'data': {
					'replaced_voucher_no': voucher.voucher_no,
					'replaced_voucher_id': voucher.id,
					'carry_forward': carry_forward,
					'new_vouchers': serializer.data,
				},
			},
			status=status.HTTP_201_CREATED,
		)

	@action(detail=True, methods=['post'], url_path='recalculate-stone-rows')
	def recalculate_stone_rows(self, request, pk=None):
		"""
		Re-derive stone_rows for this voucher from the current product/designer-sheet
		stone_entries.  Useful for fixing vouchers created before stone_rows was
		populated or before master_sku_breakdown was tracked.
		"""
		from designers.models import DesignerSheet as _DS
		from products.models import Product as _Product

		voucher = self.get_object()
		stone_agg: dict = {}

		for row in (voucher.material_rows or []):
			raw_sku = str(row.get('sku', '') or '').strip()
			if not raw_sku:
				continue
			try:
				issued_qty = float(row.get('issued_qty', 0) or 0)
			except (TypeError, ValueError):
				issued_qty = 0
			if issued_qty <= 0:
				continue

			product = _Product.objects.filter(master_sku__iexact=raw_sku).first()
			if not product:
				continue

			all_sources = list(product.stone_entries or []) if isinstance(product.stone_entries, list) else []

			d_skus = []
			if product.designer_sku:
				d_skus.append(product.designer_sku.strip())
			for ds in (product.designer_skus or []):
				if ds and str(ds).strip():
					d_skus.append(str(ds).strip())
			if d_skus:
				for designer in _DS.objects.filter(sku__in=d_skus).only('stone_entries'):
					if isinstance(designer.stone_entries, list):
						all_sources.extend(designer.stone_entries)

			for se in all_sources:
				s_type = str(se.get('type', '') or '').strip()
				s_species = str(se.get('species', '') or '').strip()
				s_variety = str(se.get('variety', '') or '').strip()
				s_color = str(se.get('color', '') or '').strip()
				s_cut = str(se.get('cut', '') or '').strip()
				s_shape = str(se.get('shape', '') or '').strip()
				s_length = str(se.get('length', '') or '').strip()
				s_width = str(se.get('width', '') or '').strip()
				s_height = str(se.get('height', '') or '').strip()
				try:
					s_qty_per_piece = float(se.get('qty', 0) or 0)
				except (TypeError, ValueError):
					s_qty_per_piece = 0

				if s_qty_per_piece <= 0 and not (s_variety or s_type or s_shape):
					continue

				fp = (
					s_type.lower(), s_variety.lower(), s_color.lower(),
					s_cut.lower(), s_shape.lower(), s_length.lower(), s_width.lower(), s_height.lower(),
				)
				stones_total = s_qty_per_piece * issued_qty

				if fp not in stone_agg:
					stone_agg[fp] = {
						'type': s_type, 'species': s_species, 'variety': s_variety,
						'color': s_color, 'cut': s_cut, 'shape': s_shape,
						'length': s_length, 'width': s_width, 'height': s_height,
						'qty': 0, 'master_sku_breakdown': [],
					}
				stone_agg[fp]['qty'] += stones_total
				stone_agg[fp]['master_sku_breakdown'].append({
					'master_sku': product.master_sku,
					'qty': stones_total,
				})

		stone_rows = [
			{
				'type': d['type'], 'species': d['species'], 'variety': d['variety'],
				'color': d['color'], 'cut': d['cut'], 'shape': d['shape'],
				'length': d['length'], 'width': d['width'], 'height': d['height'],
				'qty': d['qty'], 'master_sku_breakdown': d['master_sku_breakdown'],
			}
			for d in stone_agg.values()
		]

		voucher.stone_rows = stone_rows
		voucher.save(update_fields=['stone_rows'])

		return Response({
			'success': True,
			'message': f'Recalculated {len(stone_rows)} stone row(s) for voucher {voucher.voucher_no}.',
			'data': {'stone_rows': stone_rows},
		})
