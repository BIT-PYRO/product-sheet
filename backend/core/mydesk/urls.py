from django.urls import path
from core.mydesk.views import (
    MyDeskNoteListCreateView,
    MyDeskNoteDetailView,
    MyDeskNoteAttachmentDetailView,
    PersonalTodoListCreateView,
    PersonalTodoDetailView,
    PersonalTodoAttachmentDetailView,
    ExpenseListCreateView,
    ExpenseDetailView,
    ExpenseSendToHrView,
    LeaveRequestListCreateView,
    LeaveRequestDetailView,
    HrLeaveRequestView,
    MyDeskAttendanceOverviewView,
    MyDeskAttendanceEntryCreateView,
    MyDeskPayrollOverviewView,
    MyDeskPayrollDeclarationsView,
    MyDeskPayrollDisputeView,
    HrAttendanceTodayView,
    HrAttendanceMonthlyRegisterView,
    HrAttendanceEmployeeSummaryView,
    AttendanceRulebookView,
    MyAttendanceRulebookView,
    HrRegularizationQueueView,
    HrAttendanceOverrideView,
    AttendanceScoreView,
    HrAttendanceScoreListView,
    HrMasterTaskTrackerView,
    HrMasterTaskTrackerAssignView,
    HrMasterTaskTrackerExportView,
    HrMeetingManagerOverviewView,
    HrMeetingManagerCompanyEventDetailView,
    HrPayrollRunControlView,
    HrPayrollDashboardView,
    HrPayrollEmployeeDetailView,
    FinancePayrollLedgerView,
    HrExpenseTrackerOverviewView,
    HrExpenseTrackerMemberDetailView,
    HrExpenseTrackerApprovalActionView,
    HrExpenseTrackerRequestApprovalView,
    GalleryAlbumListCreateView,
    GalleryItemListCreateView,
    GalleryItemDetailView,
    GalleryItemDownloadView,
    ChatContactsView,
    ChatConversationListView,
    ChatMessageListCreateView,
    ChatMarkReadView,
    TeamMembersView,
)

# --- URL Patterns ---
urlpatterns = [
    # Notes
    path('api/mydesk/notes/', MyDeskNoteListCreateView.as_view(), name='mydesk-notes-list-create'),
    path('api/mydesk/notes/<int:pk>/', MyDeskNoteDetailView.as_view(), name='mydesk-notes-detail'),
    path('api/mydesk/notes/attachments/<int:pk>/', MyDeskNoteAttachmentDetailView.as_view(), name='mydesk-notes-attachment-detail'),

    # Personal Todos
    path('api/mydesk/todos/', PersonalTodoListCreateView.as_view(), name='mydesk-todos-list-create'),
    path('api/mydesk/todos/<int:pk>/', PersonalTodoDetailView.as_view(), name='mydesk-todos-detail'),
    path('api/mydesk/todos/attachments/<int:pk>/', PersonalTodoAttachmentDetailView.as_view(), name='mydesk-todos-attachment-detail'),

    # Expenses
    path('api/mydesk/expenses/', ExpenseListCreateView.as_view(), name='mydesk-expenses-list-create'),
    path('api/mydesk/expenses/<int:pk>/', ExpenseDetailView.as_view(), name='mydesk-expenses-detail'),
    path('api/mydesk/expenses/send-to-hr/', ExpenseSendToHrView.as_view(), name='mydesk-expenses-send-to-hr'),

    # Leaves (Employee + HR)
    path('api/mydesk/leaves/', LeaveRequestListCreateView.as_view(), name='mydesk-leaves-list-create'),
    path('api/mydesk/leaves/<int:pk>/', LeaveRequestDetailView.as_view(), name='mydesk-leaves-detail'),
    path('api/hr/leaves/', HrLeaveRequestView.as_view(), name='hr-leaves-list'),
    path('api/hr/leaves/<int:pk>/', HrLeaveRequestView.as_view(), name='hr-leaves-detail'),

    # Attendance (Employee)
    path('api/mydesk/attendance/overview/', MyDeskAttendanceOverviewView.as_view(), name='mydesk-attendance-overview'),
    path('api/mydesk/attendance/entries/', MyDeskAttendanceEntryCreateView.as_view(), name='mydesk-attendance-entry-create'),
    path('api/mydesk/attendance/rulebook/', MyAttendanceRulebookView.as_view(), name='mydesk-attendance-rulebook'),
    path('api/mydesk/attendance/score/', AttendanceScoreView.as_view(), name='mydesk-attendance-score'),

    # Payroll (Employee)
    path('api/mydesk/payroll/overview/', MyDeskPayrollOverviewView.as_view(), name='mydesk-payroll-overview'),
    path('api/mydesk/payroll/declarations/', MyDeskPayrollDeclarationsView.as_view(), name='mydesk-payroll-declarations'),
    path('api/mydesk/payroll/dispute/', MyDeskPayrollDisputeView.as_view(), name='mydesk-payroll-dispute'),

    # Attendance (HR)
    path('api/hr/attendance/today/', HrAttendanceTodayView.as_view(), name='hr-attendance-today'),
    path('api/hr/attendance/monthly-register/', HrAttendanceMonthlyRegisterView.as_view(), name='hr-attendance-monthly-register'),
    path('api/hr/attendance/employee-summary/', HrAttendanceEmployeeSummaryView.as_view(), name='hr-attendance-employee-summary'),
    path('api/hr/attendance/regularizations/', HrRegularizationQueueView.as_view(), name='hr-attendance-regularizations'),
    path('api/hr/attendance/regularizations/<int:entry_id>/', HrRegularizationQueueView.as_view(), name='hr-attendance-regularization-detail'),
    path('api/hr/attendance/override/<int:entry_id>/', HrAttendanceOverrideView.as_view(), name='hr-attendance-override'),
    path('api/hr/attendance/rulebook/<int:user_id>/', AttendanceRulebookView.as_view(), name='hr-attendance-rulebook'),
    path('api/hr/attendance/scores/', HrAttendanceScoreListView.as_view(), name='hr-attendance-scores'),

    # HR Tasks
    path('api/hr/tasks/master-tracker/', HrMasterTaskTrackerView.as_view(), name='hr-master-task-tracker'),
    path('api/hr/tasks/master-tracker/assign/', HrMasterTaskTrackerAssignView.as_view(), name='hr-master-task-tracker-assign'),
    path('api/hr/tasks/master-tracker/export/', HrMasterTaskTrackerExportView.as_view(), name='hr-master-task-tracker-export'),

    # Payroll (HR)
    path('api/hr/payroll/run/', HrPayrollRunControlView.as_view(), name='hr-payroll-run-control'),
    path('api/hr/payroll/dashboard/', HrPayrollDashboardView.as_view(), name='hr-payroll-dashboard'),
    path('api/hr/payroll/dashboard/<int:user_id>/', HrPayrollEmployeeDetailView.as_view(), name='hr-payroll-employee-detail'),
    path('api/finance/payroll/ledger/', FinancePayrollLedgerView.as_view(), name='finance-payroll-ledger'),

    # Meeting Manager (HR)
    path('api/hr/meeting-manager/', HrMeetingManagerOverviewView.as_view(), name='hr-meeting-manager-overview'),
    path('api/hr/meeting-manager/company-events/<int:event_id>/', HrMeetingManagerCompanyEventDetailView.as_view(), name='hr-meeting-manager-company-event-detail'),

    # Expense Tracker (HR)
    path('api/hr/expenses/tracker/', HrExpenseTrackerOverviewView.as_view(), name='hr-expense-tracker-overview'),
    path('api/hr/expenses/tracker/member/<int:user_id>/', HrExpenseTrackerMemberDetailView.as_view(), name='hr-expense-tracker-member-detail'),
    path('api/hr/expenses/tracker/<int:expense_id>/approval/', HrExpenseTrackerApprovalActionView.as_view(), name='hr-expense-tracker-approval-action'),
    path('api/hr/expenses/tracker/member/<int:user_id>/request-approval/', HrExpenseTrackerRequestApprovalView.as_view(), name='hr-expense-tracker-request-approval'),

    # Gallery
    path('api/mydesk/gallery/albums/', GalleryAlbumListCreateView.as_view(), name='mydesk-gallery-albums'),
    path('api/mydesk/gallery/items/', GalleryItemListCreateView.as_view(), name='mydesk-gallery-items-list-create'),
    path('api/mydesk/gallery/items/<int:pk>/', GalleryItemDetailView.as_view(), name='mydesk-gallery-items-detail'),
    path('api/mydesk/gallery/items/<int:pk>/download/', GalleryItemDownloadView.as_view(), name='mydesk-gallery-items-download'),

    # Chat
    path('api/mydesk/chat/contacts/', ChatContactsView.as_view(), name='mydesk-chat-contacts'),
    path('api/mydesk/chat/conversations/', ChatConversationListView.as_view(), name='mydesk-chat-conversations'),
    path('api/mydesk/chat/conversations/<int:conv_id>/messages/', ChatMessageListCreateView.as_view(), name='mydesk-chat-messages'),
    path('api/mydesk/chat/conversations/<int:conv_id>/read/', ChatMarkReadView.as_view(), name='mydesk-chat-mark-read'),

    # Team members (for meeting scheduling)
    path('api/team/members/', TeamMembersView.as_view(), name='team-members'),
]

# In your main urlpatterns, add:
#   urlpatterns += mydesk_urlpatterns
