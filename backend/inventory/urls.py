from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryTransactionViewSet, PicklistGroupViewSet,
    StoneItemViewSet, StoneStockEntryViewSet,
    ToolItemViewSet, OtherItemViewSet, MachineItemViewSet, ProductInventoryItemViewSet,
    StockTransactionViewSet, StoneTransactionViewSet,
    FindingInventoryItemViewSet, FindingInventoryTransactionViewSet,
    ProductInventoryTransactionViewSet, IssueRequestViewSet,
)


router = DefaultRouter()
router.register('picklist-groups', PicklistGroupViewSet, basename='picklist-groups')
router.register('stone-items', StoneItemViewSet, basename='stone-items')
router.register('stone-stock-entries', StoneStockEntryViewSet, basename='stone-stock-entries')
# Keep old URL for backward compat
router.register('stone-transactions', StoneStockEntryViewSet, basename='stone-transactions-compat')
router.register('tools', ToolItemViewSet, basename='tools')
router.register('others', OtherItemViewSet, basename='others')
router.register('machines', MachineItemViewSet, basename='machines')
router.register('product-inventory', ProductInventoryItemViewSet, basename='product-inventory')
# New log / transaction endpoints
router.register('stock-transactions', StockTransactionViewSet, basename='stock-transactions')
router.register('stone-log', StoneTransactionViewSet, basename='stone-log')
router.register('finding-inventory', FindingInventoryItemViewSet, basename='finding-inventory')
router.register('finding-transactions', FindingInventoryTransactionViewSet, basename='finding-transactions')
router.register('product-transactions', ProductInventoryTransactionViewSet, basename='product-transactions')
router.register('issue-requests', IssueRequestViewSet, basename='issue-requests')
router.register('', InventoryTransactionViewSet, basename='inventory-transactions')

urlpatterns = [
    path('', include(router.urls)),
]
