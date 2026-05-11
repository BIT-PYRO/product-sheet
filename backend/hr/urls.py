from django.urls import path
from .views import (
    HrAttendanceTodayView,
    HrAttendanceMonthlyRegisterView,
    HrAttendanceEmployeeSummaryView,
    HrRegularizationQueueView,
    HrAttendanceOverrideView,
    AttendanceRulebookView,
    HrAttendanceScoreListView,
    HrPayrollDashboardView,
    HrPayrollEmployeeDetailView,
    HrPayrollRunControlView,
    HrMasterTaskTrackerView,
    HrMasterTaskAssignView,
    HrMasterTaskExportView,
    HrMeetingManagerOverviewView,
    HrMeetingManagerEventDetailView,
)

urlpatterns = [
    # ── Attendance ──────────────────────────────────────────────────────
    path('attendance/today/', HrAttendanceTodayView.as_view(), name='hr-attendance-today'),
    path('attendance/monthly-register/', HrAttendanceMonthlyRegisterView.as_view(), name='hr-attendance-monthly-register'),
    path('attendance/employee-summary/', HrAttendanceEmployeeSummaryView.as_view(), name='hr-attendance-employee-summary'),
    path('attendance/regularizations/', HrRegularizationQueueView.as_view(), name='hr-attendance-regularizations'),
    path('attendance/regularizations/<int:entry_id>/', HrRegularizationQueueView.as_view(), name='hr-attendance-regularization-detail'),
    path('attendance/override/<int:entry_id>/', HrAttendanceOverrideView.as_view(), name='hr-attendance-override'),
    path('attendance/rulebook/<int:user_id>/', AttendanceRulebookView.as_view(), name='hr-attendance-rulebook'),
    path('attendance/scores/', HrAttendanceScoreListView.as_view(), name='hr-attendance-scores'),

    # NOTE: Leaves and Expenses routes are intentionally removed here.
    # They are handled by core.mydesk.urls which reads the correct shared models
    # (core.mydesk.models.LeaveRequest / ExpenseEntry) that employees write to via MyDesk.

    # ── Payroll ─────────────────────────────────────────────────────────
    path('payroll/run/', HrPayrollRunControlView.as_view(), name='hr-payroll-run-control'),
    path('payroll/dashboard/', HrPayrollDashboardView.as_view(), name='hr-payroll-dashboard'),
    path('payroll/dashboard/<int:user_id>/', HrPayrollEmployeeDetailView.as_view(), name='hr-payroll-employee-detail'),

    # ── Tasks ────────────────────────────────────────────────────────────
    path('tasks/', HrMasterTaskTrackerView.as_view(), name='hr-master-task-tracker'),
    path('tasks/assign/', HrMasterTaskAssignView.as_view(), name='hr-master-task-assign'),
    path('tasks/export/', HrMasterTaskExportView.as_view(), name='hr-master-task-export'),

    # ── Meeting Manager ───────────────────────────────────────────────────
    path('meetings/', HrMeetingManagerOverviewView.as_view(), name='hr-meeting-manager-overview'),
    path('meetings/<int:event_id>/', HrMeetingManagerEventDetailView.as_view(), name='hr-meeting-manager-event-detail'),
]
