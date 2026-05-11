from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.calendar_status, name='calendar-status'),
    path('auth/', views.calendar_auth, name='calendar-auth'),
    path('callback/', views.calendar_callback, name='calendar-callback'),
    path('events/', views.calendar_events, name='calendar-events-list'),
    path('events/create/', views.calendar_events_create, name='calendar-events-create'),
    path('events/<str:event_id>/', views.calendar_event_delete, name='calendar-event-delete'),
    path('schedule/', views.calendar_schedule, name='calendar-schedule'),
    path('sync/', views.calendar_sync, name='calendar-sync'),
    path('disconnect/', views.calendar_disconnect, name='calendar-disconnect'),
]
