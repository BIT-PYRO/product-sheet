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
	queryset = Job.objects.all().order_by('-created_at')
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

	@action(detail=False, methods=['post'], url_path='bulk-create-from-picklist')
	def bulk_create_from_picklist(self, request):
		"""Create vouchers for all Master SKUs in a picklist based on demand vs stock."""
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
		created_vouchers = []

		# Get the current localStorage-style voucher counter from DB or start fresh
		last_voucher = Job.objects.filter(voucher_no__startswith='JJ-').order_by('-id').first()
		counter = 1
		if last_voucher and last_voucher.voucher_no:
			try:
				counter = int(last_voucher.voucher_no.split('-')[1]) + 1
			except (ValueError, IndexError):
				counter = 1

		with transaction.atomic():
			for item in picklist_items:
				sku = item.sku.strip()
				if not sku:
					continue

				# Find the product by looking at Master SKU
				# Picklist SKUs may be Final Stock SKUs (e.g. AJE55/G), derive master SKU
				master_sku = sku.split('/')[0] if '/' in sku else sku

				from products.models import Product
				product = Product.objects.filter(
					Q(master_sku__iexact=master_sku) | Q(master_sku__iexact=sku)
				).first()

				if not product:
					continue

				# Calculate demand (needed from picklist)
				demand = item.needed or 0
				if demand <= 0:
					continue

				# Calculate current final stock from inventory transactions
				final_stock_agg = InventoryTransaction.objects.filter(
					product=product,
					stage='final_stock',
					stock_type='current',
				).aggregate(total=Sum('quantity'))
				final_stock = final_stock_agg['total'] or 0

				# Calculate pieces to make
				pieces_to_make = demand - final_stock
				if pieces_to_make <= 0:
					continue

				# Check what's already in each stage (current stock)
				stage_stock = {}
				for dept_key, stage_key in DEPT_TO_STOCK_STAGE.items():
					agg = InventoryTransaction.objects.filter(
						product=product,
						stage=stage_key,
						stock_type='current',
					).aggregate(total=Sum('quantity'))
					stage_stock[dept_key] = agg['total'] or 0

				# Create a voucher for each department transition in the pipeline
				for dept_idx in range(len(DEPARTMENT_PIPELINE) - 1):
					from_dept_key, from_dept_label = DEPARTMENT_PIPELINE[dept_idx]
					to_dept_key, to_dept_label = DEPARTMENT_PIPELINE[dept_idx + 1]

					# Only create voucher if this stage has no stock (needs pieces)
					current_stage_stock = stage_stock.get(from_dept_key, 0)
					qty_for_voucher = pieces_to_make  # All pieces need to flow through

					voucher_no = f'JJ-{str(counter).zfill(2)}'
					counter += 1

					title = f'{voucher_no} - {master_sku} - {from_dept_label} to {to_dept_label}'

					voucher = Job.objects.create(
						title=title,
						product=product,
						status='created',
						voucher_no=voucher_no,
						voucher_type='New',
						dept_from=from_dept_key,
						dept_to=to_dept_key,
						work_type='In-House',
						approval_status=VoucherApprovalStatus.PENDING,
						picklist_group=picklist_group,
						batch_id=batch_id,
						department_order=dept_idx,
						material_rows=[{
							'sku': master_sku,
							'category': product.category or '',
							'metal': product.material or '',
							'issued_qty': str(qty_for_voucher),
							'unit1': 'Pcs',
							'issued_weight': '',
							'unit2': '',
						}],
						stone_rows=product.stone_entries or [],
						notes=f'Auto-generated from Picklist #{picklist_group.number} for {master_sku}',
					)
					created_vouchers.append(voucher)

					# Create WIP inventory transaction for each stage
					stage_key = DEPT_TO_STOCK_STAGE.get(from_dept_key, '')
					if stage_key:
						InventoryTransaction.objects.create(
							product=product,
							txn_type='adjust',
							quantity=qty_for_voucher,
							stage=stage_key,
							stock_type='wip',
							remark=f'WIP: Voucher {voucher_no} ({from_dept_label} → {to_dept_label})',
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
		"""Approve pending vouchers (mark them as approved with timestamp)."""
		ser = ApproveVouchersSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		voucher_ids = ser.validated_data['voucher_ids']
		approved_by = ser.validated_data.get('approved_by', '')
		now = timezone.now()

		with transaction.atomic():
			vouchers = list(Job.objects.filter(
				id__in=voucher_ids,
				approval_status=VoucherApprovalStatus.PENDING,
			))

			if not vouchers:
				raise ValidationError({'voucher_ids': 'No pending vouchers found with given IDs.'})

			# Group vouchers by batch_id to handle pipeline ordering
			batches = {}
			no_batch = []
			for v in vouchers:
				if v.batch_id:
					batches.setdefault(v.batch_id, []).append(v)
				else:
					no_batch.append(v)

			# For batched vouchers: first step (lowest department_order) → in_process, rest → awaiting
			for batch_id, batch_vouchers in batches.items():
				sorted_batch = sorted(batch_vouchers, key=lambda x: x.department_order)
				for idx, v in enumerate(sorted_batch):
					if idx == 0:
						v.approval_status = VoucherApprovalStatus.IN_PROCESS
					else:
						v.approval_status = VoucherApprovalStatus.AWAITING
					v.approved_by = approved_by
					v.approved_at = now
					v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])

			# Non-batched vouchers: just approve them directly
			for v in no_batch:
				v.approval_status = VoucherApprovalStatus.APPROVED
				v.approved_by = approved_by
				v.approved_at = now
				v.save(update_fields=['approval_status', 'approved_by', 'approved_at'])

		serializer = JobSerializer(Job.objects.filter(id__in=voucher_ids), many=True)
		return Response({
			'success': True,
			'data': {
				'approved_count': len(vouchers),
				'vouchers': serializer.data,
			},
		})

	@action(detail=True, methods=['post'], url_path='mark-voucher-complete')
	def mark_voucher_complete(self, request, pk=None):
		"""Mark a voucher step as completed, activate the next one in the pipeline."""
		voucher = self.get_object()

		if voucher.approval_status != VoucherApprovalStatus.IN_PROCESS:
			raise ValidationError({'approval_status': 'Only in-process vouchers can be marked complete.'})

		with transaction.atomic():
			voucher.approval_status = VoucherApprovalStatus.COMPLETED
			voucher.status = 'completed'
			voucher.save(update_fields=['approval_status', 'status'])

			# Move WIP to current stock for the completed stage
			stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_from, '')
			if stage_key and voucher.product:
				qty = 0
				for row in (voucher.material_rows or []):
					qty += int(float(row.get('issued_qty', 0) or 0))
				if qty > 0:
					# Remove from WIP
					InventoryTransaction.objects.create(
						product=voucher.product,
						txn_type='adjust',
						quantity=-qty,
						stage=stage_key,
						stock_type='wip',
						remark=f'Completed: {voucher.voucher_no}',
					)
					# Add to current stock of destination stage
					dest_stage_key = DEPT_TO_STOCK_STAGE.get(voucher.dept_to, '')
					if dest_stage_key:
						InventoryTransaction.objects.create(
							product=voucher.product,
							txn_type='adjust',
							quantity=qty,
							stage=dest_stage_key,
							stock_type='current',
							remark=f'Completed: {voucher.voucher_no}',
						)

			# Check if this is the last stage (Ready for Plating) — update Final Stock
			if voucher.dept_to == 'plating' and voucher.product:
				qty = 0
				for row in (voucher.material_rows or []):
					qty += int(float(row.get('issued_qty', 0) or 0))
				if qty > 0:
					InventoryTransaction.objects.create(
						product=voucher.product,
						txn_type='adjust',
						quantity=qty,
						stage='final_stock',
						stock_type='current',
						remark=f'Ready for Plating completed: {voucher.voucher_no}',
					)

			# Activate the next voucher in the pipeline for this product + batch
			if voucher.batch_id and voucher.product:
				next_voucher = Job.objects.filter(
					batch_id=voucher.batch_id,
					product=voucher.product,
					approval_status=VoucherApprovalStatus.AWAITING,
					department_order=voucher.department_order + 1,
				).first()

				if next_voucher:
					next_voucher.approval_status = VoucherApprovalStatus.IN_PROCESS
					next_voucher.status = 'in_progress'
					next_voucher.save(update_fields=['approval_status', 'status'])

		serializer = JobSerializer(voucher)
		return Response({
			'success': True,
			'data': serializer.data,
		})
