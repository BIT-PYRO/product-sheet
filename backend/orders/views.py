from rest_framework import permissions
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from .models import Order, OrderItem
from .serializers import OrderDetailSerializer, OrderListSerializer


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'orders'

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

        # Delete any existing order(s) for this picklist number (scoped to tenant+company)
        Order.objects.filter(order_source='picklist', picklist_number=picklist_number).delete()

        serializer = OrderDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if request.user and request.user.is_authenticated:
            serializer.save(order_source='picklist', tenant=tenant, company=company, created_by=request.user)
        else:
            serializer.save(order_source='picklist', tenant=tenant, company=company)

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
