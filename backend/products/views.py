import django_filters
from django.db import transaction as db_transaction
from drf_spectacular.utils import OpenApiExample, extend_schema_view, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from common.mixins import StandardizedSuccessResponseMixin

from .models import Category, Channel, Collection, Material, Product, TableColumnConfig
from .serializers import CategorySerializer, ChannelSerializer, CollectionSerializer, MaterialSerializer, ProductSerializer, TableColumnConfigSerializer


class CollectionViewSet(ModelViewSet):
	queryset = Collection.objects.all().order_by('name')
	serializer_class = CollectionSerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		queryset = self.get_queryset()
		serializer = self.get_serializer(queryset, many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		instance = self.get_object()
		instance.delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class MaterialViewSet(ModelViewSet):
	queryset = Material.objects.all().order_by('name')
	serializer_class = MaterialSerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(ModelViewSet):
	queryset = Category.objects.all().order_by('name')
	serializer_class = CategorySerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class ChannelViewSet(ModelViewSet):
	queryset = Channel.objects.all().order_by('name')
	serializer_class = ChannelSerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class TableColumnConfigViewSet(ModelViewSet):
	"""CRUD for dynamic table column definitions (live_stock, stone_info, plating_info)."""
	queryset = TableColumnConfig.objects.all().order_by('table_type', 'order')
	serializer_class = TableColumnConfigSerializer
	http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

	def get_queryset(self):
		qs = super().get_queryset()
		table_type = self.request.query_params.get('table_type')
		if table_type:
			qs = qs.filter(table_type=table_type)
		return qs

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		from django.db import models as db_models
		table_type = request.data.get('table_type')
		insert_order = int(request.data.get('order', 0))
		# Shift all existing columns at or after the insertion point up by 1
		TableColumnConfig.objects.filter(
			table_type=table_type, order__gte=insert_order
		).update(order=db_models.F('order') + 1)
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def update(self, request, *args, **kwargs):
		partial = kwargs.pop('partial', False)
		instance = self.get_object()
		serializer = self.get_serializer(instance, data=request.data, partial=partial)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'success': True, 'data': serializer.data})

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


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
	class ProductFilter(django_filters.FilterSet):
		category = django_filters.CharFilter(lookup_expr='iexact')
		master_sku = django_filters.CharFilter(lookup_expr='iexact')
		designer_sku = django_filters.CharFilter(lookup_expr='iexact')
		is_active = django_filters.BooleanFilter()

		class Meta:
			from .models import Product as _Product
			model = _Product
			fields = ['is_active', 'category', 'master_sku', 'designer_sku']

	queryset = Product.objects.all().order_by('-created_at')
	serializer_class = ProductSerializer
	filterset_class = ProductFilter
	search_fields = ['master_sku', 'name', 'designer_sku']

	def create(self, request, *args, **kwargs):
		"""Override create to handle duplicate master_sku gracefully (upsert)."""
		master_sku = str(request.data.get('master_sku', '')).strip()
		if master_sku:
			existing = Product.objects.filter(master_sku__iexact=master_sku).first()
			if existing:
				# Upsert: update the existing product instead of failing
				serializer = self.get_serializer(existing, data=request.data, partial=True)
				serializer.is_valid(raise_exception=True)
				serializer.save()
				return Response(
					{'success': True, 'message': 'Product updated (existing SKU).', 'data': serializer.data},
					status=status.HTTP_200_OK,
				)
		return super().create(request, *args, **kwargs)

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
