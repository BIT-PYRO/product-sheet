from rest_framework.routers import DefaultRouter

from .views import DraftViewSet

router = DefaultRouter()
router.register(r"", DraftViewSet, basename="drafts")

urlpatterns = router.urls
