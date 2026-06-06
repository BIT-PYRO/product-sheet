from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WorkforceMemberViewSet
from .webhook import workforce_webhook

router = DefaultRouter()
router.register('', WorkforceMemberViewSet, basename='workforce-members')

urlpatterns = [
	path('', include(router.urls)),
	path('webhook/sync/', workforce_webhook, name='workforce-webhook'),
]
