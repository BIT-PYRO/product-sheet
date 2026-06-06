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
from django.urls import include, path, re_path
from django.views.static import serve as media_serve
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
	path('api/v1/', include('core_tenants.urls')),
	path('api/v1/platform/', include('platform_admin.urls')),
	path('api/v1/products/', include('products.urls')),
	path('api/v1/inventory/', include('inventory.urls')),
	path('api/v1/jobs/', include('jobs.urls')),
	path('api/v1/workforce/', include('workforce.urls')),
	path('api/v1/kyc/', include('kyc.urls')),
	path('api/v1/drafts/', include('drafts.urls')),
	path('api/v1/orders/', include('orders.urls')),
	path('api/v1/billing/', include('saas_billing.urls')),
	path('api/v1/common/', include('common.urls')),
	path('api/accounting/', include('accounting.urls')),
	path('api/hr/', include('hr.urls')),
    path('api/v1/customers/', include('customers.urls')),
    path('api/v1/designers/', include('designers.urls')),
    path('api/v1/findings/', include('findings.urls')),
    path('api/v1/product-inventory/', include(_product_inventory_router.urls)),
    path('', include('core.mydesk.urls')),
    path('api/calendar/', include('calendar_integration.urls')),
    # Mock external shop repair queue APIs for direct simulation
    path('api/external/shops/<str:shop_id>/repair-queue/', include([
        path('', lambda req, shop_id: __import__('inventory.views').views.mock_external_repair_queue(req, shop_id)),
        path('complete/', lambda req, shop_id: __import__('inventory.views').views.mock_external_repair_queue(req, shop_id)),
    ])),
    # Always serve media (static() is a no-op when DEBUG=False)
    re_path(r'^media/(?P<path>.*)$', media_serve, {'document_root': settings.MEDIA_ROOT}),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Force reload cache
