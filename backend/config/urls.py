"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from inventory.views import ProductInventoryItemViewSet

_product_inventory_router = DefaultRouter()
_product_inventory_router.register('', ProductInventoryItemViewSet, basename='product-inventory')


def root_status(_request):
	return JsonResponse({
		'success': True,
		'message': 'Product Sheet backend is running.',
		'docs': '/api/docs/swagger/',
	})

urlpatterns = [
	path('', root_status, name='root-status'),
	path('admin/', admin.site.urls),
	path('api/schema/', SpectacularAPIView.as_view(), name='api-schema'),
	path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='api-schema'), name='swagger-ui'),
	path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='api-schema'), name='redoc'),
	path('api/v1/auth/', include('accounts.urls')),
	path('api/v1/products/', include('products.urls')),
	path('api/v1/inventory/', include('inventory.urls')),
	path('api/v1/jobs/', include('jobs.urls')),
	path('api/v1/workforce/', include('workforce.urls')),
	path('api/v1/kyc/', include('kyc.urls')),
	path('api/v1/drafts/', include('drafts.urls')),
	path('api/v1/orders/', include('orders.urls')),
	path('api/v1/common/', include('common.urls')),
    path('api/v1/customers/', include('customers.urls')),
    path('api/v1/designers/', include('designers.urls')),
    path('api/v1/findings/', include('findings.urls')),
    path('api/v1/product-inventory/', include(_product_inventory_router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
