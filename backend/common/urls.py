from django.urls import path

from .views import TaskStatusView, TriggerOperationsSummaryTaskView, TriggerPingTaskView


urlpatterns = [
    path('tasks/ping/', TriggerPingTaskView.as_view(), name='trigger-ping-task'),
    path('tasks/operations-summary/', TriggerOperationsSummaryTaskView.as_view(), name='trigger-operations-summary-task'),
    path('tasks/<str:task_id>/', TaskStatusView.as_view(), name='task-status'),
]
