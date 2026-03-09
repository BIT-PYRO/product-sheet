from drf_spectacular.utils import OpenApiExample, extend_schema_view, extend_schema
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import Product
from .serializers import ProductSerializer


@extend_schema_view(
	list=extend_schema(summary='List products', tags=['Products']),
	retrieve=extend_schema(summary='Get product details', tags=['Products']),
	create=extend_schema(
		summary='Create product',
		tags=['Products'],
		examples=[
			OpenApiExample(
				'Create product request',
				value={
					'sku': 'SKU-9001',
					'name': 'Gold Ring',
					'category': 'Jewellery',
					'selling_price': '1200.00',
					'cost_price': '1000.00',
					'is_active': True,
				},
				request_only=True,
			),
			OpenApiExample(
				'Create product validation error',
				value={
					'success': False,
					'error': {
						'code': 'validation_error',
						'message': 'Request could not be completed.',
						'details': ['Selling price cannot be lower than cost price.'],
					},
				},
				response_only=True,
			),
		],
	),
	update=extend_schema(summary='Update product', tags=['Products']),
	partial_update=extend_schema(summary='Partially update product', tags=['Products']),
	destroy=extend_schema(summary='Delete product', tags=['Products']),
)
class ProductViewSet(StandardizedSuccessResponseMixin, ModelViewSet):
	queryset = Product.objects.all().order_by('-created_at')
	serializer_class = ProductSerializer
	filterset_fields = ['is_active', 'category']
	search_fields = ['sku', 'name']
