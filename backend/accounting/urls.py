from django.urls import path

from .views import JournalCreateView, LedgerListView, LedgerSummaryView, TrialBalanceView


urlpatterns = [
    path('ledgers/', LedgerListView.as_view(), name='accounting-ledgers'),
    path('journal/create/', JournalCreateView.as_view(), name='accounting-journal-create'),
    path('ledger-summary/', LedgerSummaryView.as_view(), name='accounting-ledger-summary'),
    path('trial-balance/', TrialBalanceView.as_view(), name='accounting-trial-balance'),
    path('trial-balance/', TrialBalanceView.as_view(), name='accounting-trial-balance'),
]
