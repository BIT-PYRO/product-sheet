import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Order, OrderItem
from .serializers import OrderDetailSerializer, OrderListSerializer

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    audit_sheet = 'order'
    queryset = Order.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        """Return all orders, optionally filtered by order_source and picklist_number."""
        qs = Order.objects.all().prefetch_related('items')
        source = self.request.query_params.get('order_source')
        if source:
            qs = qs.filter(order_source=source)
        picklist_num = self.request.query_params.get('picklist_number')
        if picklist_num:
            qs = qs.filter(picklist_number=picklist_num)
        return qs

    def create(self, request, *args, **kwargs):
        """Create a new order"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Auto-assign tenant and company from request context
        tenant = (getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None))
        company = (getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None))
        # Server-side proxy calls don't carry X-Company-ID — fall back to tenant's first company
        if company is None and tenant is not None:
            from core_tenants.models import Company
            company = Company.objects.filter(tenant=tenant).first()

        # Set created_by to current user if authenticated
        if request.user and request.user.is_authenticated:
            serializer.save(tenant=tenant, company=company, created_by=request.user)
        else:
            serializer.save(tenant=tenant, company=company)

        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(request, ActivityLog.ACTION_CREATE, 'order', serializer.instance)
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update order — capture old state for diff."""
        instance = self.get_object()
        try:
            from common.audit import serialize_instance
            old_data = serialize_instance(instance)
        except Exception:
            old_data = None

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(request, ActivityLog.ACTION_UPDATE, 'order', serializer.instance, old_data=old_data)
        except Exception:
            pass

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            log_activity(request, ActivityLog.ACTION_DELETE, 'order', instance)
        except Exception:
            pass
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='from-picklist')
    def from_picklist(self, request):
        """Idempotently create or replace a picklist order."""
        picklist_number = request.data.get('picklist_number')
        if not picklist_number:
            return Response(
                {'detail': 'picklist_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = (getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None))
        company = (getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None))
        # Server-side proxy calls don't carry X-Company-ID — fall back to tenant's first company
        if company is None and tenant is not None:
            from core_tenants.models import Company
            company = Company.objects.filter(tenant=tenant).first()

        # Delete any existing order(s) for this picklist number (scoped to tenant+company)
        Order.objects.filter(order_source='picklist', picklist_number=picklist_number).delete()

        serializer = OrderDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Determine the source: 'auto-sync' if triggered by server-side sync or payload uploaded_by, else the authenticated user
        is_auto_sync = (
            not (request.user and request.user.is_authenticated)
            or getattr(request, 'is_picklist_auto_sync', False)
            or request.data.get('uploaded_by') == 'auto-sync'
        )

        if request.user and request.user.is_authenticated and not is_auto_sync:
            serializer.save(order_source='picklist', tenant=tenant, company=company, created_by=request.user)
        else:
            serializer.save(order_source='picklist', tenant=tenant, company=company)

        # ── Activity log for this picklist sync ───────────────────────────────
        try:
            from common.audit import log_activity
            from common.models import ActivityLog
            instance = serializer.instance
            item_count = instance.items.count() if hasattr(instance, 'items') else len(request.data.get('items', []))
            log_activity(
                request,
                ActivityLog.ACTION_CREATE,
                'order',
                instance,
                extra={
                    'action_detail': 'Picklist auto-synced' if is_auto_sync else 'Picklist registered',
                    'picklist_number': picklist_number,
                    'order_name': str(instance),
                    'item_count': item_count,
                    'source': 'auto-sync' if is_auto_sync else 'manual',
                    'synced_at': timezone.now().isoformat(),
                },
            )
        except Exception:
            pass  # Never block the main response

        logger.info(
            'Picklist #%s registered as order #%s (%s, %d items)',
            picklist_number,
            serializer.instance.pk,
            'auto-sync' if is_auto_sync else 'manual',
            len(request.data.get('items', [])),
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm an order (change status from DRAFT to CONFIRMED)"""
        order = self.get_object()

        if order.status != 'draft':
            return Response(
                {'detail': 'Only draft orders can be confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'confirmed'
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order"""
        order = self.get_object()

        if order.status == 'delivered' or order.status == 'cancelled':
            return Response(
                {'detail': f'Cannot cancel {order.status} orders'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'cancelled'
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get order summary"""
        order = self.get_object()
        return Response({
            'id': order.id,
            'status': order.status,
            'subtotal': order.subtotal,
            'discount': order.discount,
            'shipping': order.shipping,
            'tax': order.tax,
            'total': order.total,
            'items_count': order.items.count(),
        })
