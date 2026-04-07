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

_DONE_STATUSES = {VoucherApprovalStatus.COMPLETED, VoucherApprovalStatus.PARTIALLY_COMPLETED}


def _activate_ready_batch_vouchers(batch_id):
	"""
	Activate every AWAITING voucher in the batch whose direct predecessors
	(all other batch vouchers with dept_to == this.dept_from) have all reached
	a done state (completed or partially_complete).

	Runs repeatedly until no more vouchers can be activated (handles chains).
	Returns the list of newly activated vouchers.
	"""
	activated = []
	while True:
		all_vouchers = list(Job.objects.filter(batch_id=batch_id))
		# Map: dept_key → list of vouchers whose output feeds that dept
		output_map = {}
		for v in all_vouchers:
			output_map.setdefault(v.dept_to, []).append(v)

		newly_activated = []
		for v in all_vouchers:
			if v.approval_status != VoucherApprovalStatus.AWAITING:
				continue
			# Predecessors: vouchers that send goods TO this voucher's dept_from
			preds = output_map.get(v.dept_from, [])
			if preds and all(p.approval_status in _DONE_STATUSES for p in preds):
				v.approval_status = VoucherApprovalStatus.IN_PROCESS
				v.status = 'in_progress'
				v.save(update_fields=['approval_status', 'status'])
				newly_activated.append(v)

		if not newly_activated:
			break
		activated.extend(newly_activated)
	return activated


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
		Returns remaining WIP quantities per master_sku per dept_to for all active vouchers.

		Active = approved | in_process | awaiting | partially_complete.
		WIP per row = issued_qty − already_received_qty (from received_rows log).
		Response: { success: true, data: { "SKU": { "dept_to_key": qty, ... }, ... } }
		"""
		active_statuses = {
			VoucherApprovalStatus.APPROVED,
			VoucherApprovalStatus.IN_PROCESS,
			VoucherApprovalStatus.AWAITING,
			VoucherApprovalStatus.PARTIALLY_COMPLETED,
		}
		active_jobs = Job.objects.filter(
			approval_status__in=active_statuses
		).only('dept_to', 'material_rows', 'received_rows')

		wip: dict = {}

		for job in active_jobs:
			dept_to = (job.dept_to or '').strip()
			if not dept_to:
				continue

			# Sum already-received quantities per SKU from all previous receive events
			already_rcvd: dict = {}
			for event in (job.received_rows or []):
				for row in (event.get('rows') or []):
					s = str(row.get('sku', '') or '').strip().upper()
					qty = int(float(row.get('received_qty', 0) or 0))
					already_rcvd[s] = already_rcvd.get(s, 0) + qty

			for row in (job.material_rows or []):
				raw_sku = str(row.get('sku', '') or '').strip()
				if not raw_sku:
					continue
				master_sku = (raw_sku.split('/')[0] if '/' in raw_sku else raw_sku).upper()
				issued = int(float(row.get('issued_qty', 0) or 0))
				received = already_rcvd.get(master_sku, 0)
				remaining = max(0, issued - received)
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
		(pieces go Wax Piece → Casting directly).  If only 'wax' setting,
		the 'hand-setting' stage is removed (Pre-Polish → Final Polish).
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
		# transition_key (from_key, to_key) → list of {product, master_sku, qty}
		from collections import OrderedDict
		transition_buckets = OrderedDict()

		from products.models import Product

		for item in picklist_items:
			sku = item.sku.strip()
			if not sku:
				continue

			master_sku = sku.split('/')[0] if '/' in sku else sku

			product = Product.objects.filter(
				Q(master_sku__iexact=master_sku) | Q(master_sku__iexact=sku)
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
					continue  # hand-only → skip wax-setting stage
				if dept_key == 'hand-setting' and not wants_hand:
					continue  # wax-only → skip hand-setting stage
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
					'master_sku': master_sku,
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
					notes=f'Step {step_idx + 1}: {from_label} → {to_label}',
				)
				created_vouchers.append(voucher)

				# Create WIP inventory transactions per product in this voucher
				stage_key = DEPT_TO_STOCK_STAGE.get(bucket['from_key'], '')
				if stage_key:
					for entry in products_in_voucher:
						InventoryTransaction.objects.create(
							product=entry['product'],
							txn_type='adjust',
							quantity=entry['qty'],
							stage=stage_key,
							stock_type='wip',
							remark=f'WIP: Voucher {voucher_no} ({from_label} → {to_label})',
						)

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
					total_approved += 1

			# Non-batched vouchers → approved directly
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

			# Move WIP to current stock for each product (SKU row) in this voucher
			from products.models import Product

			stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_from, '')
			dest_stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')

			for row in (voucher.material_rows or []):
				qty = int(float(row.get('issued_qty', 0) or 0))
				if qty <= 0:
					continue
				sku = str(row.get('sku', '') or '').strip()
				master_sku = sku.split('/')[0] if '/' in sku else sku
				product = Product.objects.filter(
					Q(master_sku__iexact=master_sku) | Q(master_sku__iexact=sku)
				).first() or voucher.product
				if not product:
					continue

				if stage_key:
					InventoryTransaction.objects.create(
						product=product,
						txn_type='adjust',
						quantity=-qty,
						stage=stage_key,
						stock_type='wip',
						remark=f'Completed: {voucher.voucher_no}',
					)
				if dest_stage_key:
					InventoryTransaction.objects.create(
						product=product,
						txn_type='adjust',
						quantity=qty,
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
		  - Deducts received_qty from WIP of the dept_from stage
		  - Adds received_qty to Current Stock of the dept_to stage

		If is_partial=False  → voucher becomes Completed; next awaiting step activated if not already.
		If is_partial=True   → voucher becomes Partially Completed; next awaiting step activated immediately.

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

			from_stage = DEPT_TO_STOCK_STAGE.get(voucher.dept_from, '')
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
						f'({remaining} = issued {issued} − already received {already}). Capped to {remaining}.'
					)
					received_qty = remaining
					if received_qty <= 0:
						continue

				# Resolve product (try SKU exact match, then strip variant suffix, then voucher FK)
				master_sku = sku.split('/')[0] if '/' in sku else sku
				product = Product.objects.filter(
					Q(master_sku__iexact=master_sku) | Q(master_sku__iexact=sku)
				).first() or voucher.product

				if not product:
					warnings.append(
						f'SKU {sku}: no matching product found in database — '
						'inventory NOT updated for this row.'
					)
					continue

				# Deduct from WIP (dept_from stage)
				if from_stage:
					InventoryTransaction.objects.create(
						product=product,
						txn_type='adjust',
						quantity=-received_qty,
						stage=from_stage,
						stock_type='wip',
						remark=(
							f'Received {received_qty} pcs — {voucher.voucher_no} '
							f'({voucher.dept_from} → {voucher.dept_to})'
						),
					)

				# Add to Current Stock (dept_to stage)
				if to_stage:
					InventoryTransaction.objects.create(
						product=product,
						txn_type='adjust',
						quantity=received_qty,
						stage=to_stage,
						stock_type='current',
						remark=(
							f'Received {received_qty} pcs — {voucher.voucher_no} '
							f'({voucher.dept_from} → {voucher.dept_to})'
						),
					)

				total_received_this_batch += received_qty

			if total_received_this_batch == 0 and not warnings:
				raise ValidationError({'rows': 'No valid received quantities provided.'})

			# ── Append to receive log ──
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
				# Activate any vouchers whose predecessors are now all done
				if voucher.batch_id:
					_activate_ready_batch_vouchers(voucher.batch_id)
			else:
				# Full receive → Completed
				voucher.approval_status = VoucherApprovalStatus.COMPLETED
				voucher.status = 'completed'
				voucher.save(update_fields=['approval_status', 'status', 'received_rows', 'received_by'])
				# Activate any vouchers whose predecessors are now all done
				if voucher.batch_id:
					_activate_ready_batch_vouchers(voucher.batch_id)

		serializer = JobSerializer(voucher)
		response_data = {**serializer.data}
		if warnings:
			response_data['warnings'] = warnings
		return Response({'success': True, 'data': response_data})

	@action(detail=True, methods=['get'], url_path='photo-guide')
	def photo_guide(self, request, pk=None):
		"""
		Return the material rows for this job with product images resolved.
		Each row: { sku, issued_qty, unit, images: [...] }
		Images are returned as absolute URLs.
		"""
		from products.models import Product as ProductModel

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
			result.append({
				'sku': sku,
				'issued_qty': row.get('issued_qty', ''),
				'unit': row.get('unit1', 'Pcs'),
				'images': resolved,
			})

		return Response({'success': True, 'data': result})
