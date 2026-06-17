from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ApproveUserView, APIKeyViewSet, DeleteUserView, GoogleLoginView, LoginView, MeView, MergeUsersView, PublicCompaniesView, RefreshTokenView, RoleDefaultPermissionsDetailView, RoleDefaultPermissionsListView, SetCredentialsView, SignupView
from .views_roles import (
    RoleListCreateView, RoleDetailView,
    DepartmentModulesView,
    RoleTemplateListView, RoleTemplateDetailView,
    RoleTemplateApplyView, RoleTemplateCloneView,
    RoleTemplateSeedView, RoleHierarchyView,
)
from .views_onboarding import PublicIndustryListView, PublicPlanListView, SignupView, VerifyEmailView, ResendVerificationView

router = DefaultRouter()
router.register('api-keys', APIKeyViewSet, basename='api-keys')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('set-credentials/', SetCredentialsView.as_view(), name='set_credentials'),
    path('approve-user/', ApproveUserView.as_view(), name='approve_user'),
    path('delete-user/', DeleteUserView.as_view(), name='delete_user'),
    path('merge-user/', MergeUsersView.as_view(), name='merge_user'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('public-companies/', PublicCompaniesView.as_view(), name='public_companies'),
    path('role-permissions/', RoleDefaultPermissionsListView.as_view(), name='role_permissions_list'),
    path('role-permissions/<str:role>/<path:department>/', RoleDefaultPermissionsDetailView.as_view(), name='role_permissions_detail'),
    path('role-permissions/<str:role>/', RoleDefaultPermissionsDetailView.as_view(), name='role_permissions_detail_nodept'),
    # Legacy role CRUD
    path('roles/', RoleListCreateView.as_view(), name='roles_list_create'),
    path('roles/<int:pk>/', RoleDetailView.as_view(), name='roles_detail'),
    # New RBAC system
    path('departments/', DepartmentModulesView.as_view(), name='departments'),
    path('role-hierarchy/', RoleHierarchyView.as_view(), name='role_hierarchy'),
    path('role-templates/', RoleTemplateListView.as_view(), name='role_templates_list'),
    path('role-templates/seed/', RoleTemplateSeedView.as_view(), name='role_templates_seed'),
    path('role-templates/<int:pk>/', RoleTemplateDetailView.as_view(), name='role_templates_detail'),
    path('role-templates/<int:pk>/apply/', RoleTemplateApplyView.as_view(), name='role_templates_apply'),
    path('role-templates/<int:pk>/clone/', RoleTemplateCloneView.as_view(), name='role_templates_clone'),
    path('public-industries/', PublicIndustryListView.as_view(), name='public_industries'),
    path('public-plans/', PublicPlanListView.as_view(), name='public_plans'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('', include(router.urls)),
]
