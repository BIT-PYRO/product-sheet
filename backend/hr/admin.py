from django.contrib import admin
from .models import (
    AttendanceEntry, AttendanceRulebook, LeaveRequest,
    EmployeePayrollProfile, PayrollRun, PayrollPaymentRecord,
    ExpenseEntry, MasterTask, CompanyEvent,
)

admin.site.register(AttendanceEntry)
admin.site.register(AttendanceRulebook)
admin.site.register(LeaveRequest)
admin.site.register(EmployeePayrollProfile)
admin.site.register(PayrollRun)
admin.site.register(PayrollPaymentRecord)
admin.site.register(ExpenseEntry)
admin.site.register(MasterTask)
admin.site.register(CompanyEvent)
