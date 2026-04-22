from django.urls import path

from .views import (
    BalanceSheetView,
    JournalCreateView,
    LedgerListView,
    LedgerSummaryView,
    PendingExpenseApproveView,
    PendingExpenseListView,
    PendingExpenseRejectView,
    PendingExpenseSyncView,
    ProfitLossView,
    TrialBalanceView,
)


urlpatterns = [
    path('ledgers/', LedgerListView.as_view(), name='accounting-ledgers'),
    path('journal/create/', JournalCreateView.as_view(), name='accounting-journal-create'),
    path('ledger-summary/', LedgerSummaryView.as_view(), name='accounting-ledger-summary'),
    path('trial-balance/', TrialBalanceView.as_view(), name='accounting-trial-balance'),
    path('profit-loss/', ProfitLossView.as_view(), name='accounting-profit-loss'),
    path('balance-sheet/', BalanceSheetView.as_view(), name='accounting-balance-sheet'),
    # Pending Expense endpoints
    path('pending-expenses/', PendingExpenseListView.as_view(), name='accounting-pending-expenses'),
    path('pending-expenses/sync/', PendingExpenseSyncView.as_view(), name='accounting-pending-expenses-sync'),
    path('pending-expenses/<int:pk>/approve/', PendingExpenseApproveView.as_view(), name='accounting-pending-expense-approve'),
    path('pending-expenses/<int:pk>/reject/', PendingExpenseRejectView.as_view(), name='accounting-pending-expense-reject'),
]
