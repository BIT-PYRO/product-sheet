from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import KYCRecordViewSet

router = DefaultRouter()
router.register('', KYCRecordViewSet, basename='kyc-records')

urlpatterns = [
	path('', include(router.urls)),
]
