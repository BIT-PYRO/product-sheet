from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WorkforceMemberViewSet

router = DefaultRouter()
router.register('', WorkforceMemberViewSet, basename='workforce-members')

urlpatterns = [
	path('', include(router.urls)),
]
