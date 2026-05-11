from django.contrib import admin

from core.mydesk.models import (
    MyDeskNote,
    MyDeskNoteVersion,
    MyDeskNoteAttachment,
    PersonalTodoItem,
    PersonalTodoAttachment,
    ExpenseEntry,
    ExpenseShare,
    LeaveRequest,
    AttendanceEntry,
    AttendanceRulebook,
    CompanyProfile,
    EmployeeProfile,
    PayrollProfile,
    PayrollPaymentRecord,
    PayrollRun,
    PayrollSalaryStructure,
    PayrollTaxDeclaration,
    GalleryAlbum,
    GalleryItem,
    GalleryItemShare,
    HrMeetingManagerCompanyEvent,
)

admin.site.register(MyDeskNote)
admin.site.register(MyDeskNoteVersion)
admin.site.register(MyDeskNoteAttachment)
admin.site.register(PersonalTodoItem)
admin.site.register(PersonalTodoAttachment)
admin.site.register(ExpenseEntry)
admin.site.register(ExpenseShare)
admin.site.register(LeaveRequest)
admin.site.register(AttendanceEntry)
admin.site.register(AttendanceRulebook)
admin.site.register(CompanyProfile)
admin.site.register(EmployeeProfile)
admin.site.register(PayrollProfile)
admin.site.register(PayrollPaymentRecord)
admin.site.register(PayrollRun)
admin.site.register(PayrollSalaryStructure)
admin.site.register(PayrollTaxDeclaration)
admin.site.register(GalleryAlbum)
admin.site.register(GalleryItem)
admin.site.register(GalleryItemShare)
admin.site.register(HrMeetingManagerCompanyEvent)
