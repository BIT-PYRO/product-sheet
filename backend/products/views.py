from rest_framework import permissions
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_tenant(request):
    return (getattr(request, 'tenant', None) or (getattr(request.user, 'tenant', None) if request.user and request.user.is_authenticated else None))

def _get_company(request):
    return (getattr(request, 'company', None) or (getattr(request.user, 'active_company', None) if request.user and request.user.is_authenticated else None))


# ---------------------------------------------------------------------------
# Lookup / Catalogue ViewSets (tenant-scoped)
# ---------------------------------------------------------------------------

class CollectionViewSet(ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

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
		serializer.save(tenant=_get_tenant(request))
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		instance = self.get_object()
		instance.delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class MaterialViewSet(ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

	queryset = Material.objects.all().order_by('name')
	serializer_class = MaterialSerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(tenant=_get_tenant(request))
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

	queryset = Category.objects.all().order_by('name')
	serializer_class = CategorySerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(tenant=_get_tenant(request))
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class ChannelViewSet(ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

	queryset = Channel.objects.all().order_by('name')
	serializer_class = ChannelSerializer
	http_method_names = ['get', 'post', 'delete', 'head', 'options']

	def list(self, request, *args, **kwargs):
		serializer = self.get_serializer(self.get_queryset(), many=True)
		return Response({'success': True, 'data': serializer.data})

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(tenant=_get_tenant(request))
		return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)

	def destroy(self, request, *args, **kwargs):
		self.get_object().delete()
		return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class TableColumnConfigViewSet(ModelViewSet):
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

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
		serializer.save(tenant=_get_tenant(request))
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


# ---------------------------------------------------------------------------
# Product ViewSet
# ---------------------------------------------------------------------------

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
	permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
	required_feature_code = 'product-sheet'

	audit_sheet = 'product'

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

	def perform_create(self, serializer):
		"""Auto-assign tenant and company from request context."""
		serializer.save(
			tenant=_get_tenant(self.request),
			company=_get_company(self.request),
		)

	def perform_update(self, serializer):
		"""Preserve tenant/company on update — never allow override."""
		serializer.save()

	def create(self, request, *args, **kwargs):
		"""Override create to reject duplicate master_sku with a clear error."""
		master_sku = str(request.data.get('master_sku', '')).strip()
		if master_sku and Product.objects.filter(master_sku__iexact=master_sku).exists():
			return Response(
				{'success': False, 'message': f'A product with Master SKU "{master_sku}" already exists.'},
				status=status.HTTP_409_CONFLICT,
			)
		return super().create(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		instance = self.get_object()
		try:
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(request, ActivityLog.ACTION_DELETE, 'product', instance)
		except Exception:
			pass
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
		from common.image_upload import upload_image_file

		product = self.get_object()
		image_file = request.FILES.get('image')
		if not image_file:
			return Response({'success': False, 'message': 'No image file provided.'}, status=400)

		allowed_types = {
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'image/bmp', 'image/tiff', 'image/avif',
			'image/heic', 'image/heif', 'image/x-heic', 'image/x-heif',
			'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon',
			'image/svg+xml',
		}
		if image_file.content_type not in allowed_types:
			return Response({'success': False, 'message': 'Unsupported image type.'}, status=400)

		try:
			image_url = upload_image_file(image_file, folder=f'products/{product.pk}')
		except Exception as exc:
			return Response({'success': False, 'message': f'Upload failed: {exc}'}, status=500)

		current_images = product.images if isinstance(product.images, list) else []
		current_images.append(image_url)
		product.images = current_images
		product.save(update_fields=['images'])

		try:
			from common.audit import log_activity
			from common.models import ActivityLog
			log_activity(request, ActivityLog.ACTION_UPLOAD, 'product', product, extra={'url': image_url})
		except Exception:
			pass

		return Response({'success': True, 'data': {'url': image_url, 'images': product.images}})
