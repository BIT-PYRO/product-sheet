"""
HR Models — Attendance, Payroll, Leaves, Expenses, Tasks, Meetings
Adapted from HR_share package for standalone `hr` app.
"""
from django.db import models
from django.conf import settings


# ── Attendance ───────────────────────────────────────────────────────────────

class AttendanceEntry(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('wfh', 'WFH'),
        ('leave', 'Leave'),
        ('on_duty', 'On Duty'),
    ]
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    SOURCE_CHOICES = [
        ('self', 'Self'),
        ('hr', 'HR/Manager'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_attendance_entries')
    entry_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    in_time = models.TimeField(blank=True, null=True)
    out_time = models.TimeField(blank=True, null=True)
    note = models.TextField(blank=True, default='')
    on_duty_detail = models.CharField(max_length=255, blank=True, default='')
    is_regularization = models.BooleanField(default=False)
    regularization_reason = models.TextField(blank=True, default='')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='self')
    late_minutes = models.PositiveIntegerField(default=0)
    early_leave_minutes = models.PositiveIntegerField(default=0)
    hours_worked = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    auto_status = models.CharField(max_length=30, blank=True, default='')
    hr_override_status = models.CharField(max_length=30, blank=True, default='')
    hr_override_reason = models.TextField(blank=True, default='')
    hr_override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_attendance_overrides',
    )
    hr_override_at = models.DateTimeField(blank=True, null=True)
    salary_deduction_days = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    attendance_score_points = models.PositiveSmallIntegerField(default=100)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(blank=True, null=True)
    is_paid_off = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_attendance_approved_entries',
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-entry_date', '-updated_at']
        indexes = [
            models.Index(fields=['org_id', 'user', 'entry_date']),
            models.Index(fields=['org_id', 'entry_date', 'is_active']),
        ]

    def __str__(self):
        return f'{self.user} — {self.entry_date} ({self.status})'


class AttendanceRulebook(models.Model):
    EMPLOYEE_TYPE_CHOICES = [
        ('office', 'Office'),
        ('labour', 'Labour'),
        ('field', 'Field'),
    ]
    WEEKLY_OFF_CHOICES = [
        ('sunday', 'Sunday'),
        ('saturday', 'Saturday'),
        ('none', 'None'),
    ]
    SATURDAY_WORKING_CHOICES = [
        ('yes', 'Yes'),
        ('no', 'No'),
        ('alternate', 'Alternate'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_attendance_rulebook')
    shift_start = models.TimeField(default='09:30:00')
    shift_end = models.TimeField(default='18:30:00')
    lunch_duration_minutes = models.PositiveIntegerField(default=30)
    grace_period_minutes = models.PositiveIntegerField(default=14)
    late_deduction_threshold_minutes = models.PositiveIntegerField(default=15)
    half_day_late_threshold_minutes = models.PositiveIntegerField(default=40)
    early_leave_deduction_minutes = models.PositiveIntegerField(default=10)
    half_day_early_leave_minutes = models.PositiveIntegerField(default=40)
    regularization_limit_per_month = models.PositiveIntegerField(default=3)
    employee_type = models.CharField(max_length=20, choices=EMPLOYEE_TYPE_CHOICES, default='office')
    weekly_off = models.CharField(max_length=20, choices=WEEKLY_OFF_CHOICES, default='sunday')
    saturday_working = models.CharField(max_length=20, choices=SATURDAY_WORKING_CHOICES, default='yes')
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_rulebook_edits',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['user_id']


# ── Leave Requests ───────────────────────────────────────────────────────────

class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = [
        ('casual', 'Casual'),
        ('sick', 'Sick'),
        ('earned', 'Earned'),
        ('comp_off', 'Comp-Off'),
        ('unpaid', 'Unpaid'),
        ('wfh', 'WFH'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_leave_requests')
    leave_type = models.CharField(max_length=30, choices=LEAVE_TYPE_CHOICES, default='casual')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, default='')
    decline_reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    document = models.FileField(upload_to='hr/leave_requests/', blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_leave_approvals',
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-created_at']


# ── Payroll ───────────────────────────────────────────────────────────────────

class EmployeePayrollProfile(models.Model):
    TAX_REGIME_CHOICES = [
        ('new', 'New Regime'),
        ('old', 'Old Regime'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_payroll_profiles')
    employee_code = models.CharField(max_length=40, blank=True, default='')
    pan_number = models.CharField(max_length=20, blank=True, default='')
    bank_name = models.CharField(max_length=255, blank=True, default='')
    bank_account_number = models.CharField(max_length=50, blank=True, default='')
    base_monthly_gross = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_regime = models.CharField(max_length=10, choices=TAX_REGIME_CHOICES, default='new')
    payment_mode = models.CharField(max_length=30, blank=True, default='NEFT')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-updated_at']
        unique_together = ('org_id', 'user')


class PayrollRun(models.Model):
    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    month = models.DateField(db_index=True)

    # Attendance lock
    attendance_locked_at = models.DateTimeField(blank=True, null=True)
    attendance_locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_attendance_locks',
    )

    # Calculation run
    calculation_run_at = models.DateTimeField(blank=True, null=True)
    calculation_run_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_calculations',
    )
    exception_count = models.IntegerField(default=0)
    exception_report = models.JSONField(default=list, blank=True)

    # HR Approval — after this employees see their payroll in MyDesk
    hr_approved_at = models.DateTimeField(blank=True, null=True)
    hr_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_hr_approvals',
    )

    # Send to Finance — transfers payroll to accounting module
    sent_to_finance_at = models.DateTimeField(blank=True, null=True)
    sent_to_finance_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_finance_sends',
    )
    accounting_payroll_id = models.IntegerField(blank=True, null=True)  # FK to accounting payroll batch

    # Finance approved (set by accounting side)
    finance_approved_at = models.DateTimeField(blank=True, null=True)
    finance_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_finance_approvals',
    )

    # GL Posting
    gl_posted_at = models.DateTimeField(blank=True, null=True)
    gl_posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_gl_postings',
    )
    gl_reference = models.CharField(max_length=120, blank=True, default='')

    # Payslip & Bank file generation
    payslips_generated_at = models.DateTimeField(blank=True, null=True)
    payslips_generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_payslip_generations',
    )
    bank_file_generated_at = models.DateTimeField(blank=True, null=True)
    bank_file_generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_payroll_bank_file_generations',
    )

    # Final lock
    is_locked = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-month', '-updated_at']
        unique_together = ('org_id', 'month')


class PayrollPaymentRecord(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Processed', 'Processed'),
        ('HR Approved', 'HR Approved'),
        ('Sent to Finance', 'Sent to Finance'),
        ('Finance Approved', 'Finance Approved'),
        ('Paid', 'Paid'),
        ('On Hold', 'On Hold'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_payroll_payment_records')
    month = models.DateField(db_index=True)
    working_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    present_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    lop_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(blank=True, null=True)
    utr_reference = models.CharField(max_length=120, blank=True, default='')
    payment_mode = models.CharField(max_length=30, blank=True, default='NEFT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Paid')
    earnings_breakup = models.JSONField(default=list, blank=True)
    deductions_breakup = models.JSONField(default=list, blank=True)
    payslip_pdf_url = models.URLField(max_length=500, blank=True, null=True)
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-month', 'user_id']
        unique_together = ('org_id', 'user', 'month')


# ── Expense Tracker ───────────────────────────────────────────────────────────

class ExpenseEntry(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Dept Head Approved', 'Dept Head Approved'),
        ('Finance Reviewed', 'Finance Reviewed'),
        ('Paid', 'Paid'),
        ('Rejected', 'Rejected'),
    ]
    CATEGORY_CHOICES = [
        ('travel', 'Travel'),
        ('food', 'Food & Meals'),
        ('office_supplies', 'Office Supplies'),
        ('equipment', 'Equipment'),
        ('misc', 'Misc'),
        ('other', 'Other'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
        ('cheque', 'Cheque'),
        ('other', 'Other'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_expenses')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='misc')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent_on = models.DateField()
    department = models.CharField(max_length=120, blank=True, default='')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Draft')
    receipt = models.FileField(upload_to='hr/expenses/receipts/', blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    rejection_reason = models.TextField(blank=True, default='')
    dept_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_dept_approved_expenses',
    )
    dept_approved_at = models.DateTimeField(blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, blank=True, default='')
    workflow_steps = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-spent_on', '-created_at']


# ── Task Tracker ──────────────────────────────────────────────────────────────

class MasterTask(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hr_assigned_tasks',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_created_tasks',
    )
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-created_at']


# ── Meeting Manager ───────────────────────────────────────────────────────────

class CompanyEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('birthday', 'Birthday'),
        ('holiday', 'Holiday'),
        ('event', 'Event'),
        ('big_sale', 'Big Sale'),
        ('annual_event', 'Annual Event'),
    ]

    org_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    title = models.CharField(max_length=255, blank=True, default='')
    event_type = models.CharField(max_length=32, choices=EVENT_TYPE_CHOICES, default='event')
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    description = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='hr_company_events',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hr'
        ordering = ['-start_date', '-created_at']
