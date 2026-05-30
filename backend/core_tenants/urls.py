from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core_tenants.viewsets import TenantViewSet, CompanyViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'companies', CompanyViewSet, basename='company')

urlpatterns = [
    path('', include(router.urls)),
]
