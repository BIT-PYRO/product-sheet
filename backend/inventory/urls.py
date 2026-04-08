from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryTransactionViewSet, PicklistGroupViewSet, StoneItemViewSet, StoneStockEntryViewSet, ToolItemViewSet, OtherItemViewSet, MachineItemViewSet, ProductInventoryItemViewSet


router = DefaultRouter()
router.register('picklist-groups', PicklistGroupViewSet, basename='picklist-groups')
router.register('stone-items', StoneItemViewSet, basename='stone-items')
router.register('stone-transactions', StoneStockEntryViewSet, basename='stone-transactions')
router.register('tools', ToolItemViewSet, basename='tools')
router.register('others', OtherItemViewSet, basename='others')
router.register('machines', MachineItemViewSet, basename='machines')
router.register('', InventoryTransactionViewSet, basename='inventory-transactions')

urlpatterns = [
    path('', include(router.urls)),
]
