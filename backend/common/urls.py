from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DeletionLogViewSet, TaskStatusView, TriggerOperationsSummaryTaskView, TriggerPingTaskView

router = DefaultRouter()
router.register('deletion-logs', DeletionLogViewSet, basename='deletion-logs')

urlpatterns = [
    path('tasks/ping/', TriggerPingTaskView.as_view(), name='trigger-ping-task'),
    path('tasks/operations-summary/', TriggerOperationsSummaryTaskView.as_view(), name='trigger-operations-summary-task'),
    path('tasks/<str:task_id>/', TaskStatusView.as_view(), name='task-status'),
    path('', include(router.urls)),
]
