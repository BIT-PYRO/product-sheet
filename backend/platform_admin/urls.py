from django.urls import path, include
from rest_framework.routers import DefaultRouter
from platform_admin.viewsets import PlatformTenantViewSet, PlatformCompanyViewSet

router = DefaultRouter()
router.register(r'tenants', PlatformTenantViewSet, basename='platform-tenant')
router.register(r'companies', PlatformCompanyViewSet, basename='platform-company')

urlpatterns = [
    path('', include(router.urls)),
]
