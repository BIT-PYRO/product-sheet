from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryTransactionViewSet


router = DefaultRouter()
router.register('', InventoryTransactionViewSet, basename='inventory-transactions')

urlpatterns = [
    path('', include(router.urls)),
]
