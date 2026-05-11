from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ApproveUserView, APIKeyViewSet, DeleteUserView, GoogleLoginView, LoginView, MeView, MergeUsersView, RefreshTokenView, RoleDefaultPermissionsDetailView, RoleDefaultPermissionsListView, SetCredentialsView
from .views_roles import RoleListCreateView, RoleDetailView

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
    path('role-permissions/', RoleDefaultPermissionsListView.as_view(), name='role_permissions_list'),
    path('role-permissions/<str:role>/<path:department>/', RoleDefaultPermissionsDetailView.as_view(), name='role_permissions_detail'),
    path('role-permissions/<str:role>/', RoleDefaultPermissionsDetailView.as_view(), name='role_permissions_detail_nodept'),
    path('roles/', RoleListCreateView.as_view(), name='roles_list_create'),
    path('roles/<int:pk>/', RoleDetailView.as_view(), name='roles_detail'),
    path('', include(router.urls)),
]
