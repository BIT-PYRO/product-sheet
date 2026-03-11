from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Order, OrderItem
from .serializers import OrderDetailSerializer, OrderListSerializer


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        """Filter orders by user"""
        return Order.objects.filter(created_by=self.request.user).prefetch_related('items')

    def create(self, request, *args, **kwargs):
        """Create a new order"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Automatically set created_by to current user
        serializer.save(created_by=request.user)

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
