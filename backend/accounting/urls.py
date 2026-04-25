from django.urls import path

from .views import (
    BalanceSheetView,
    InvoiceListCreateView,
    InvoiceSettleView,
    JournalCreateView,
    LedgerListView,
    LedgerSummaryView,
    PendingExpenseApproveView,
    PendingExpenseListView,
    PendingExpenseRejectView,
    PendingExpenseSyncView,
    ProfitLossView,
    TrialBalanceView,
    AccountListView,
    ExpenseListView,
    ExpenseCreateView,
    IncomeListView,
    IncomeCreateView,
    FinanceDashboardView,
    OutstandingListView,
    OutstandingSettleView,
    OutstandingDashboardView,
    OutstandingReceiptView,
)


urlpatterns = [
    path('ledgers/', LedgerListView.as_view(), name='accounting-ledgers'),
    path('accounts/', AccountListView.as_view(), name='accounting-accounts'),
    path('expenses/', ExpenseListView.as_view(), name='accounting-expenses'),
    path('expenses/create/', ExpenseCreateView.as_view(), name='accounting-expense-create'),
    path('income/', IncomeListView.as_view(), name='accounting-income'),
    path('income/create/', IncomeCreateView.as_view(), name='accounting-income-create'),
    path('finance-dashboard/', FinanceDashboardView.as_view(), name='accounting-finance-dashboard'),
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
    # Outstanding endpoints
    path('outstandings/', OutstandingListView.as_view(), name='accounting-outstandings'),
    path('outstandings/dashboard/', OutstandingDashboardView.as_view(), name='accounting-outstandings-dashboard'),
    path('outstandings/<int:pk>/settle/', OutstandingSettleView.as_view(), name='accounting-outstanding-settle'),
    path('outstandings/<int:pk>/receipts/', OutstandingReceiptView.as_view(), name='accounting-outstanding-receipts'),
    # Invoice endpoints
    path('invoices/', InvoiceListCreateView.as_view(), name='accounting-invoices'),
    path('invoices/<int:pk>/settle/', InvoiceSettleView.as_view(), name='accounting-invoice-settle'),
]
