from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryTransactionViewSet, PicklistGroupViewSet


router = DefaultRouter()
router.register('picklist-groups', PicklistGroupViewSet, basename='picklist-groups')
router.register('', InventoryTransactionViewSet, basename='inventory-transactions')

urlpatterns = [
    path('', include(router.urls)),
]
