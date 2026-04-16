from django.urls import path

from .views import JournalCreateView, LedgerListView


urlpatterns = [
    path('ledgers/', LedgerListView.as_view(), name='accounting-ledgers'),
    path('journal/create/', JournalCreateView.as_view(), name='accounting-journal-create'),
]
