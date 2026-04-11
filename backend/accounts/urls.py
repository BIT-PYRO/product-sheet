from django.urls import path

from .views import ApproveUserView, GoogleLoginView, LoginView, MeView, RefreshTokenView, RoleDefaultPermissionsDetailView, RoleDefaultPermissionsListView, SendOTPView, SetCredentialsView, VerifyOTPView


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('set-credentials/', SetCredentialsView.as_view(), name='set_credentials'),
    path('approve-user/', ApproveUserView.as_view(), name='approve_user'),
    path('role-permissions/', RoleDefaultPermissionsListView.as_view(), name='role_permissions_list'),
    path('role-permissions/<str:role>/', RoleDefaultPermissionsDetailView.as_view(), name='role_permissions_detail'),
]
