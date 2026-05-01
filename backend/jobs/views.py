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
from .services.job_service import can_transition, DEPARTMENT_PIPELINE, DEPT_TO_STOCK_STAGE

logger = logging.getLogger(__name__)


_DONE_STATUSES = {VoucherApprovalStatus.COMPLETED, VoucherApprovalStatus.PARTIALLY_COMPLETED, VoucherApprovalStatus.REPLACED}


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
	"""
	from products.models import Product as _Product

	from_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_from, '')
	if not from_stage:
		return

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
	queryset = Job.objects.select_related('picklist_group').all().order_by('-created_at')
	serializer_class = JobSerializer
	filterset_fields = ['status', 'product', 'assignee', 'approval_status', 'batch_id', 'picklist_group']
	
	def create(self, request, *args, **kwargs):
		logger.info(f"Job creation request received: {request.data}")
		try:
			return super().create(request, *args, **kwargs)
		except Exception as e:
			logger.error(f"Job creation error: {str(e)}", exc_info=True)
			raise

	def perform_create(self, serializer):
		instance = serializer.save()
		# Single (non-batch) vouchers created directly as in_process need their
		# source stage current stock deducted immediately.
		if instance.approval_status == VoucherApprovalStatus.IN_PROCESS and not instance.batch_id:
			_deduct_source_current_stock(instance)

	search_fields = ['title']

	def perform_update(self, serializer):
		instance = self.get_object()
		next_status = serializer.validated_data.get('status', instance.status)
		if next_status != instance.status and not can_transition(instance.status, next_status):
			raise ValidationError({'status': f'Invalid transition: {instance.status} -> {next_status}'})
		serializer.save()

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
		active_jobs = Job.objects.filter(
			approval_status__in=active_statuses
		).only('dept_to', 'material_rows', 'received_rows')

		# Pre-load known master SKUs so we can distinguish master SKUs that contain
		# a slash (e.g. "AJE15/4") from variant suffixes (e.g. "KARTIK/G").
		from products.models import Product
		known_skus = set(
			s.upper() for s in
			Product.objects.values_list('master_sku', flat=True)
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

		# Get the current voucher counter from DB
		last_voucher = Job.objects.filter(voucher_no__startswith='JJ-').order_by('-id').first()
		counter = 1
		if last_voucher and last_voucher.voucher_no:
			try:
				counter = int(last_voucher.voucher_no.split('-')[1]) + 1
			except (ValueError, IndexError):
				counter = 1

		# ------------------------------------------------------------------
		# Phase 1: Collect each product's custom pipeline and qty
		# ------------------------------------------------------------------
		# transition_key (from_key, to_key) ΓåÆ list of {product, master_sku, qty}
		from collections import OrderedDict
		transition_buckets = OrderedDict()

		from products.models import Product

		for item in picklist_items:
			sku = item.sku.strip()
			if not sku:
				continue

			# Try exact match first (handles master SKUs with / like AJE15/4),
			# then fall back to prefix match for variant suffixes (e.g. KARTIK/G ΓåÆ KARTIK)
			product = Product.objects.filter(master_sku__iexact=sku).first()
			if not product and '/' in sku:
				product = Product.objects.filter(
					master_sku__iexact=sku.split('/')[0]
				).first()
			if not product:
				continue

			demand = item.needed or 0
			if demand <= 0:
				continue

			final_stock_agg = InventoryTransaction.objects.filter(
				product=product,
				stage='final_stock',
				stock_type='current',
			).aggregate(total=Sum('quantity'))
			final_stock = final_stock_agg['total'] or 0

			pieces_to_make = demand - final_stock
			if pieces_to_make <= 0:
				continue

			# Determine which setting stages this product needs
			raw_setting = (product.setting_type or '').lower()
			setting_tags = [s.strip() for s in raw_setting.split(',') if s.strip()]
			# '' | 'wax setting' | 'hand setting' | 'wax' | 'hand' | 'wax,hand' etc.
			wants_wax  = (not setting_tags) or any('wax'  in t for t in setting_tags)
			wants_hand = (not setting_tags) or any('hand' in t for t in setting_tags)

			# Build this product's pipeline by removing inapplicable stages
			product_pipeline = []
			for dept_key, dept_label in DEPARTMENT_PIPELINE:
				if dept_key == 'wax-setting' and not wants_wax:
					continue  # hand-only ΓåÆ skip wax-setting stage
				if dept_key == 'hand-setting' and not wants_hand:
					continue  # wax-only ΓåÆ skip hand-setting stage
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

				voucher = Job.objects.create(
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
					stone_rows=[],
					notes=f'Step {step_idx + 1}: {from_label} ΓåÆ {to_label}',
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
		"""Mark a voucher step as completed, activate the next one in the pipeline."""
		voucher = self.get_object()

		if voucher.approval_status not in (VoucherApprovalStatus.IN_PROCESS, VoucherApprovalStatus.PARTIALLY_COMPLETED):
			raise ValidationError({'approval_status': 'Only in-process or partially complete vouchers can be marked complete.'})

		with transaction.atomic():
			voucher.approval_status = VoucherApprovalStatus.COMPLETED
			voucher.status = 'completed'
			voucher.save(update_fields=['approval_status', 'status'])

			# Add remaining pieces (issued ΓêÆ already received) to Current Stock of
			# the destination stage.  WIP is computed live so no WIP transaction needed.
			from products.models import Product

			dest_stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')

			# Build already-received totals per SKU from previous receive events
			already_rcvd: dict = {}
			for event in (voucher.received_rows or []):
				for prev_row in (event.get('rows') or []):
					s = str(prev_row.get('sku', '') or '').strip().upper()
					already_rcvd[s] = (
						already_rcvd.get(s, 0)
						+ int(float(prev_row.get('received_qty', 0) or 0))
					)

			for row in (voucher.material_rows or []):
				issued = int(float(row.get('issued_qty', 0) or 0))
				if issued <= 0:
					continue
				sku = str(row.get('sku', '') or '').strip()
				sku_key = sku.upper()

				# Only create transaction for pieces not yet received
				remaining = max(0, issued - already_rcvd.get(sku_key, 0))
				if remaining <= 0:
					continue

				product = Product.objects.filter(
					Q(master_sku__iexact=sku)
				).first() or voucher.product
				if not product:
					continue

				if dest_stage_key:
					InventoryTransaction.objects.create(
						product=product,
						txn_type='adjust',
						quantity=remaining,
						stage=dest_stage_key,
						stock_type='current',
						remark=f'Completed: {voucher.voucher_no}',
					)

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

			# ΓöÇΓöÇ Build already-received totals per SKU (from previous partial events) ΓöÇΓöÇ
			already_received: dict = {}
			for event in (voucher.received_rows or []):
				for prev_row in (event.get('rows') or []):
					key = str(prev_row.get('sku', '') or '').strip().upper()
					already_received[key] = (
						already_received.get(key, 0)
						+ int(float(prev_row.get('received_qty', 0) or 0))
					)

			# ΓöÇΓöÇ Build issued totals per SKU from material_rows ΓöÇΓöÇ
			issued_map: dict = {}
			for mr in (voucher.material_rows or []):
				key = str(mr.get('sku', '') or '').strip().upper()
				issued_map[key] = issued_map.get(key, 0) + int(float(mr.get('issued_qty', 0) or 0))

			to_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')

			warnings = []
			total_received_this_batch = 0

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
						f'({remaining} = issued {issued} ΓêÆ already received {already}). Capped to {remaining}.'
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
						f'SKU {sku}: no matching product found in database ΓÇö '
						'inventory NOT updated for this row.'
					)
					continue

				# Add to Current Stock (dept_to stage).
				# Source deduction already happened when the voucher entered in_process.
				# WIP is computed live ΓÇö no WIP transaction needed.
				if to_stage:
					InventoryTransaction.objects.create(
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
				# Full receive ΓåÆ Completed
				voucher.approval_status = VoucherApprovalStatus.COMPLETED
				voucher.status = 'completed'
				voucher.save(update_fields=['approval_status', 'status', 'received_rows', 'received_by'])
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
			voucher = Job.objects.select_for_update().get(pk=pk)

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
			warnings_list: list = []

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
			last_voucher = Job.objects.filter(voucher_no__startswith='JJ-').order_by('-id').first()
			counter = 1
			if last_voucher and last_voucher.voucher_no:
				try:
					counter = int(last_voucher.voucher_no.split('-')[1]) + 1
				except (ValueError, IndexError):
					pass

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
			resolved = [make_absolute(img) for img in raw_images]
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
		Return die numbers for SKUs present in this job's material_rows only.
		Each entry: { sku, die_numbers: [{ value, quantity, location }] }
		"""
		from products.models import Product as ProductModel
		from django.db.models.functions import Upper

		job = self.get_object()
		material_rows = job.material_rows or []

		# Collect unique, non-empty SKUs while preserving order
		seen = set()
		ordered_skus = []
		for row in material_rows:
			sku = row.get('sku', '').strip()
			if sku and sku.upper() not in seen:
				seen.add(sku.upper())
				ordered_skus.append(sku)

		upper_skus = [s.upper() for s in ordered_skus]

		# Primary lookup by master_sku
		products_by_master = (
			ProductModel.objects
			.annotate(upper_sku=Upper('master_sku'))
			.filter(upper_sku__in=upper_skus)
			.only('master_sku', 'designer_sku', 'die_numbers')
		)
		product_map = {p.master_sku.upper(): p for p in products_by_master}

		# Fallback: try designer_sku for unmatched
		unmatched = [s for s in upper_skus if s not in product_map]
		if unmatched:
			products_by_designer = (
				ProductModel.objects
				.annotate(upper_designer=Upper('designer_sku'))
				.filter(upper_designer__in=unmatched)
				.only('master_sku', 'designer_sku', 'die_numbers')
			)
			for p in products_by_designer:
				key = p.designer_sku.upper()
				if key not in product_map:
					product_map[key] = p

		result = []
		for sku in ordered_skus:
			product = product_map.get(sku.upper())
			die_numbers = []
			if product and isinstance(product.die_numbers, list):
				for entry in product.die_numbers:
					if isinstance(entry, dict) and entry.get('value', '').strip():
						die_numbers.append({
							'value': entry.get('value', ''),
							'quantity': entry.get('quantity', ''),
							'location': entry.get('location', ''),
						})
			# Always include the SKU, even if no die numbers are recorded
			result.append({'sku': sku, 'die_numbers': die_numbers})

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

		# Next voucher counter
		last_voucher = Job.objects.filter(voucher_no__startswith='JJ-').order_by('-id').first()
		counter = 1
		if last_voucher and last_voucher.voucher_no:
			try:
				counter = int(last_voucher.voucher_no.split('-')[1]) + 1
			except (ValueError, IndexError):
				counter = 1

		now = timezone.now()

		with transaction.atomic():
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
