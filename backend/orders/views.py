from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from .models import Order, OrderItem
from .serializers import OrderDetailSerializer, OrderListSerializer


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
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

        # Set created_by to current user if authenticated
        if request.user and request.user.is_authenticated:
            serializer.save(created_by=request.user)
        else:
            serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='from-picklist')
    def from_picklist(self, request):
        """Idempotently create or replace a picklist order."""
        picklist_number = request.data.get('picklist_number')
        if not picklist_number:
            return Response(
                {'detail': 'picklist_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete any existing order(s) for this picklist number
        Order.objects.filter(order_source='picklist', picklist_number=picklist_number).delete()

        serializer = OrderDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if request.user and request.user.is_authenticated:
            serializer.save(order_source='picklist', created_by=request.user)
        else:
            serializer.save(order_source='picklist')

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
