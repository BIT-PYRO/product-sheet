from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DesignerSheetViewSet

router = DefaultRouter()
router.register('', DesignerSheetViewSet, basename='designers')

urlpatterns = [
    path('', include(router.urls)),
]
