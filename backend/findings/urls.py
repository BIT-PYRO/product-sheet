from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FindingViewSet

router = DefaultRouter()
router.register('', FindingViewSet, basename='findings')

urlpatterns = [
    path('', include(router.urls)),
]
