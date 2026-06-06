from django.urls import path, include
from rest_framework.routers import DefaultRouter

from platform_admin.views_dashboard import PlatformDashboardMetricsView, PlatformDashboardActivityFeedView, SystemHealthView
from platform_admin.views_tenants import TenantManagementListView, TenantManagementDetailView, TenantActionView, PlatformAuditListView
from platform_admin.views_analytics import UpgradeFunnelAnalyticsView, FeatureAdoptionAnalyticsView
from platform_admin.views_plans import PlatformPlanManagementView, PlatformPlanFeatureToggleView
from platform_admin.views_industries import PlatformIndustryManagementView
from platform_admin.views import PlatformFeaturesView, UpgradeRequestEventView

urlpatterns = [
    # Dashboard & Health
    path('dashboard/', PlatformDashboardMetricsView.as_view(), name='platform-dashboard'),
    path('dashboard/activity/', PlatformDashboardActivityFeedView.as_view(), name='platform-dashboard-activity'),
    path('health/', SystemHealthView.as_view(), name='platform-health'),
    path('audit/', PlatformAuditListView.as_view(), name='platform-audit'),

    # Tenant Management
    path('tenants/', TenantManagementListView.as_view(), name='platform-tenants-list'),
    path('tenants/<str:tenant_id>/', TenantManagementDetailView.as_view(), name='platform-tenants-detail'),
    path('tenants/<str:tenant_id>/action/', TenantActionView.as_view(), name='platform-tenants-action'),

    # Analytics
    path('analytics/upgrade-funnel/', UpgradeFunnelAnalyticsView.as_view(), name='platform-analytics-upgrade'),
    path('analytics/feature-adoption/', FeatureAdoptionAnalyticsView.as_view(), name='platform-analytics-adoption'),

    # Plans & Industries
    path('plans/', PlatformPlanManagementView.as_view(), name='platform-plans'),
    path('plans/<int:plan_id>/features/<int:feature_id>/', PlatformPlanFeatureToggleView.as_view(), name='platform-plan-features'),
    path('industries/', PlatformIndustryManagementView.as_view(), name='platform-industries'),

    # Existing
    path('features/', PlatformFeaturesView.as_view(), name='platform-features'),
    path('upgrade-requests/', UpgradeRequestEventView.as_view(), name='platform-upgrade-requests'),
]
