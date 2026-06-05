from django.urls import path, include
from rest_framework.routers import DefaultRouter
from platform_admin.viewsets import PlatformTenantViewSet, PlatformCompanyViewSet

router = DefaultRouter()
router.register(r'tenants', PlatformTenantViewSet, basename='platform-tenant')
router.register(r'companies', PlatformCompanyViewSet, basename='platform-company')

from platform_admin.viewsets import PlatformDashboardView
from platform_admin.views import PlatformFeaturesView, UpgradeRequestEventView

urlpatterns = [
    path('dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('features/', PlatformFeaturesView.as_view(), name='platform-features'),
    path('upgrade-requests/', UpgradeRequestEventView.as_view(), name='platform-upgrade-requests'),
    path('', include(router.urls)),
]
