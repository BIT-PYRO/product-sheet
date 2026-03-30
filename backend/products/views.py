from django.db import transaction as db_transaction
from drf_spectacular.utils import OpenApiExample, extend_schema_view, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
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
	filterset_fields = ['is_active', 'category', 'master_sku', 'designer_sku']
	search_fields = ['master_sku', 'name', 'designer_sku']

	def destroy(self, request, *args, **kwargs):
		instance = self.get_object()
		with db_transaction.atomic():
			# Nullable FK — detach jobs so the product can be deleted
			instance.jobs.update(product=None)
			# Protected FK — delete inventory transactions first
			instance.inventory_transactions.all().delete()
			instance.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)

	@extend_schema(summary='Upload image for product', tags=['Products'])
	@action(detail=True, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser])
	def upload_image(self, request, pk=None):
		import os
		import uuid
		from django.conf import settings

		product = self.get_object()
		image_file = request.FILES.get('image')
		if not image_file:
			return Response({'success': False, 'message': 'No image file provided.'}, status=400)

		allowed_types = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
		if image_file.content_type not in allowed_types:
			return Response({'success': False, 'message': 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.'}, status=400)

		ext = os.path.splitext(image_file.name)[1].lower() or '.jpg'
		filename = f'{uuid.uuid4().hex}{ext}'
		upload_dir = os.path.join(settings.MEDIA_ROOT, 'products', str(product.pk))
		os.makedirs(upload_dir, exist_ok=True)
		file_path = os.path.join(upload_dir, filename)

		with open(file_path, 'wb') as f:
			for chunk in image_file.chunks():
				f.write(chunk)

		image_url = f'{settings.MEDIA_URL}products/{product.pk}/{filename}'
		current_images = product.images if isinstance(product.images, list) else []
		current_images.append(image_url)
		product.images = current_images
		product.save(update_fields=['images'])

		return Response({'success': True, 'data': {'url': image_url, 'images': product.images}})
