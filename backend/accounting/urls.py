from django.urls import path

from .views import BalanceSheetView, JournalCreateView, LedgerListView, LedgerSummaryView, ProfitLossView, TrialBalanceView


urlpatterns = [
    path('ledgers/', LedgerListView.as_view(), name='accounting-ledgers'),
    path('journal/create/', JournalCreateView.as_view(), name='accounting-journal-create'),
    path('ledger-summary/', LedgerSummaryView.as_view(), name='accounting-ledger-summary'),
    path('trial-balance/', TrialBalanceView.as_view(), name='accounting-trial-balance'),
    path('profit-loss/', ProfitLossView.as_view(), name='accounting-profit-loss'),
    path('balance-sheet/', BalanceSheetView.as_view(), name='accounting-balance-sheet'),
]
