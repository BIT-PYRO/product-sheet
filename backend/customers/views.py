from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import Customer
from .serializers import CustomerSerializer


@extend_schema_view(
    list=extend_schema(summary='List customers', tags=['Customers']),
    retrieve=extend_schema(summary='Get customer details', tags=['Customers']),
    create=extend_schema(summary='Create customer', tags=['Customers']),
    update=extend_schema(summary='Update customer', tags=['Customers']),
    partial_update=extend_schema(summary='Partially update customer', tags=['Customers']),
    destroy=extend_schema(summary='Delete customer', tags=['Customers']),
)
class CustomerViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
    audit_sheet = 'customer'
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    filterset_fields = ['status', 'business_type', 'city', 'state']
    search_fields = ['company_name', 'gst_number', 'pan_number', 'mobile', 'email', 'authorized_person_name']

    def perform_create(self, serializer):
        serializer.save(
            tenant=(getattr(self.request, 'tenant', None) or (getattr(self.request.user, 'tenant', None) if self.request.user and self.request.user.is_authenticated else None)),
            company=(getattr(self.request, 'company', None) or (getattr(self.request.user, 'active_company', None) if self.request.user and self.request.user.is_authenticated else None)),
        )
