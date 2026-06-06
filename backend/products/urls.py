from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ChannelViewSet, CollectionViewSet, MaterialViewSet, ProductViewSet, TableColumnConfigViewSet


router = DefaultRouter()
router.register('collections', CollectionViewSet, basename='collections')
router.register('materials', MaterialViewSet, basename='materials')
router.register('categories', CategoryViewSet, basename='categories')
router.register('channels', ChannelViewSet, basename='channels')
router.register('table-columns', TableColumnConfigViewSet, basename='table-columns')
router.register('', ProductViewSet, basename='products')

urlpatterns = [
    path('', include(router.urls)),
]
