"""
HR Views — Attendance, Payroll, Leaves, Expenses, Tasks, Meetings
"""
import csv
from datetime import date, timedelta
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AttendanceRulebook, LeaveRequest,
    EmployeePayrollProfile, PayrollRun, PayrollPaymentRecord,
    ExpenseEntry, MasterTask, CompanyEvent,
)
# Regularization data lives in the MyDesk shared table
from core.mydesk.models import AttendanceEntry
from .serializers import (
    AttendanceEntrySerializer, AttendanceRulebookSerializer, LeaveRequestSerializer,
    EmployeePayrollProfileSerializer, PayrollRunSerializer, PayrollPaymentRecordSerializer,
    ExpenseEntrySerializer, MasterTaskSerializer, CompanyEventSerializer,
)

User = get_user_model()


def get_org(request):
    """Return the org_id from the authenticated user's workforce record (or username as fallback)."""
    try:
        from workforce.models import WorkforceMember
        m = WorkforceMember.objects.filter(email__iexact=request.user.email).first()
        if m:
            return str(m.id)
    except Exception:
        pass
    return request.user.username or str(request.user.id)


def all_users_in_org():
    """Return all active users (org-scoped organisations use all users for now)."""
    return User.objects.filter(is_active=True)


# ── Attendance ────────────────────────────────────────────────────────────────

class HrAttendanceTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date', str(date.today()))
        try:
            entry_date = date.fromisoformat(date_str)
        except ValueError:
            entry_date = date.today()

        users = all_users_in_org()
        existing = {
            e.user_id: e
            for e in AttendanceEntry.objects.filter(entry_date=entry_date, is_active=True)
        }

        rows = []
        for user in users:
            entry = existing.get(user.id)
            rows.append({
                'user_id': user.id,
                'employee_name': user.get_full_name() or user.username,
                'email': user.email,
                'status': entry.status if entry else 'present',
                'in_time': str(entry.in_time) if entry and entry.in_time else '',
                'out_time': str(entry.out_time) if entry and entry.out_time else '',
                'note': entry.note if entry else '',
                'on_duty_detail': entry.on_duty_detail if entry else '',
                'record_id': entry.id if entry else None,
                'approval_status': entry.approval_status if entry else 'pending',
            })

        return Response({'rows': rows})

    def post(self, request):
        entry_date_str = request.data.get('date', str(date.today()))
        try:
            entry_date = date.fromisoformat(entry_date_str)
        except ValueError:
            entry_date = date.today()

        rows = request.data.get('rows', [])
        saved = 0
        for row in rows:
            user_id = row.get('user_id')
            if not user_id:
                continue
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                continue

            entry, created = AttendanceEntry.objects.get_or_create(
                user=user, entry_date=entry_date, is_active=True,
                defaults={'source': 'hr'},
            )
            entry.status = row.get('status', 'present')
            entry.source = 'hr'
            if row.get('in_time'):
                entry.in_time = row['in_time']
            if row.get('out_time'):
                entry.out_time = row['out_time']
            entry.note = row.get('note', entry.note)
            entry.on_duty_detail = row.get('on_duty_detail', entry.on_duty_detail)
            entry.approval_status = 'approved'
            entry.save()
            saved += 1

        return Response({'saved': saved})


class HrAttendanceMonthlyRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get('month', '')
        if month_str:
            try:
                year, mon = map(int, month_str.split('-'))
            except Exception:
                year, mon = date.today().year, date.today().month
        else:
            year, mon = date.today().year, date.today().month

        # Build list of days in month
        first = date(year, mon, 1)
        days = []
        d = first
        while d.month == mon:
            days.append(str(d))
            d += timedelta(days=1)

        users = all_users_in_org()
        entries_qs = AttendanceEntry.objects.filter(
            entry_date__year=year,
            entry_date__month=mon,
            is_active=True,
        ).select_related('user')

        by_user = {}
        for e in entries_qs:
            by_user.setdefault(e.user_id, {})[str(e.entry_date)] = e.status

        STATUS_SCORE = {'present': 1, 'wfh': 1, 'on_duty': 1, 'half_day': 0.5, 'leave': 0, 'absent': 0}

        rows = []
        for user in users:
            cells = []
            totals = {'present': 0, 'absent': 0, 'half_day': 0, 'wfh': 0, 'on_duty': 0, 'leave': 0}
            for day_str in days:
                st = by_user.get(user.id, {}).get(day_str, '')
                cells.append({'date': day_str, 'status': st})
                if st in totals:
                    if st == 'half_day':
                        totals[st] += 0.5
                    else:
                        totals[st] += 1

            payable_days = totals['present'] + totals['wfh'] + totals['on_duty'] + totals['half_day']
            totals['payable_days'] = round(payable_days, 1)

            rows.append({
                'user_id': user.id,
                'employee_name': user.get_full_name() or user.username,
                'cells': cells,
                'totals': totals,
            })

        return Response({'days': days, 'rows': rows})


class HrAttendanceEmployeeSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get('month', '')
        if month_str:
            try:
                year, mon = map(int, month_str.split('-'))
            except Exception:
                year, mon = date.today().year, date.today().month
        else:
            year, mon = date.today().year, date.today().month

        users = all_users_in_org()
        entries_qs = AttendanceEntry.objects.filter(
            entry_date__year=year,
            entry_date__month=mon,
            is_active=True,
        ).select_related('user')

        by_user = {}
        for e in entries_qs:
            by_user.setdefault(e.user_id, []).append(e)

        rows = []
        for user in users:
            elist = by_user.get(user.id, [])
            present = sum(1 for e in elist if e.status == 'present')
            absent = sum(1 for e in elist if e.status == 'absent')
            half_day = sum(1 for e in elist if e.status == 'half_day')
            wfh = sum(1 for e in elist if e.status == 'wfh')
            leave = sum(1 for e in elist if e.status == 'leave')
            on_duty = sum(1 for e in elist if e.status == 'on_duty')
            late_marks = sum(1 for e in elist if e.late_minutes > 0)
            deduction_days = float(sum(e.salary_deduction_days for e in elist))
            total_hours = float(sum(e.hours_worked for e in elist))
            payable_days = present + wfh + on_duty + half_day * 0.5

            rows.append({
                'user_id': user.id,
                'employee_name': user.get_full_name() or user.username,
                'present_days': present,
                'absent_days': absent,
                'half_days': half_day,
                'wfh_days': wfh,
                'leave_days': leave,
                'on_duty_days': on_duty,
                'late_marks': late_marks,
                'deduction_days': deduction_days,
                'payable_days': round(payable_days, 1),
                'total_hours': round(total_hours, 2),
            })

        return Response({'rows': rows})


class HrRegularizationQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AttendanceEntry.objects.filter(is_regularization=True, is_active=True).select_related('user')
        approval_status = request.query_params.get('approval_status', '')
        if approval_status:
            qs = qs.filter(approval_status=approval_status)
        month = request.query_params.get('month', '')
        if month:
            try:
                year, mon = map(int, month.split('-'))
                qs = qs.filter(entry_date__year=year, entry_date__month=mon)
            except Exception:
                pass

        rows = []
        for e in qs[:100]:
            rows.append({
                'id': e.id,
                'user_id': e.user_id,
                'employee_name': e.user.get_full_name() or e.user.username,
                'entry_date': str(e.entry_date),
                'in_time': str(e.in_time) if e.in_time else '',
                'out_time': str(e.out_time) if e.out_time else '',
                'auto_status': e.auto_status or e.status,
                'regularization_reason': e.regularization_reason,
                'approval_status': e.approval_status,
            })
        return Response({'rows': rows})

    def patch(self, request, entry_id=None):
        if entry_id is None:
            return Response({'error': 'entry_id required'}, status=400)
        try:
            entry = AttendanceEntry.objects.get(pk=entry_id)
        except AttendanceEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        action = request.data.get('action', '')
        if action == 'approve':
            entry.approval_status = 'approved'
            entry.approved_by = request.user
            entry.approved_at = timezone.now()
        elif action == 'reject':
            entry.approval_status = 'rejected'
            entry.rejection_reason = request.data.get('reason', '')
        entry.save()
        return Response({'ok': True})


class HrAttendanceOverrideView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, entry_id=None):
        try:
            entry = AttendanceEntry.objects.get(pk=entry_id)
        except AttendanceEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        override_status = request.data.get('status', '')
        reason = request.data.get('reason', '')
        if override_status:
            entry.hr_override_status = override_status
            entry.hr_override_reason = reason
            entry.hr_override_by = request.user
            entry.hr_override_at = timezone.now()
            entry.status = override_status
            entry.source = 'hr'
            entry.save()
        return Response({'ok': True})


class AttendanceRulebookView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            rb = AttendanceRulebook.objects.get(user_id=user_id)
            return Response(AttendanceRulebookSerializer(rb).data)
        except AttendanceRulebook.DoesNotExist:
            return Response({})

    def put(self, request, user_id):
        try:
            rb = AttendanceRulebook.objects.get(user_id=user_id)
        except AttendanceRulebook.DoesNotExist:
            rb = AttendanceRulebook(user_id=user_id)
        ser = AttendanceRulebookSerializer(rb, data=request.data, partial=True)
        if ser.is_valid():
            ser.save(last_edited_by=request.user)
            return Response(ser.data)
        return Response(ser.errors, status=400)


class HrAttendanceScoreListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get('month', '')
        if month_str:
            try:
                year, mon = map(int, month_str.split('-'))
            except Exception:
                year, mon = date.today().year, date.today().month
        else:
            year, mon = date.today().year, date.today().month

        users = all_users_in_org()
        entries_qs = AttendanceEntry.objects.filter(
            entry_date__year=year, entry_date__month=mon, is_active=True
        ).select_related('user')

        by_user = {}
        for e in entries_qs:
            by_user.setdefault(e.user_id, []).append(e)

        rows = []
        for user in users:
            elist = by_user.get(user.id, [])
            total_points = sum(e.attendance_score_points for e in elist) if elist else 100
            score = round(total_points / max(len(elist), 1))
            rows.append({
                'user_id': user.id,
                'employee_name': user.get_full_name() or user.username,
                'score': min(score, 100),
                'absent_count': sum(1 for e in elist if e.status == 'absent'),
                'late_count': sum(1 for e in elist if e.late_minutes > 0),
            })

        return Response({'rows': sorted(rows, key=lambda r: -r['score'])})


# ── Leave ────────────────────────────────────────────────────────────────────

class HrLeaveRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = LeaveRequest.objects.all().select_related('user')
        status_filter = request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)
        month = request.query_params.get('month', '')
        if month:
            try:
                year, mon = map(int, month.split('-'))
                qs = qs.filter(start_date__year=year, start_date__month=mon)
            except Exception:
                pass

        rows = []
        for lr in qs[:100]:
            rows.append({
                'id': lr.id,
                'user_id': lr.user_id,
                'requested_by_name': lr.user.get_full_name() or lr.user.username,
                'leave_type': lr.leave_type,
                'start_date': str(lr.start_date),
                'end_date': str(lr.end_date),
                'reason': lr.reason,
                'decline_reason': lr.decline_reason,
                'status': lr.status,
                'created_at': lr.created_at.isoformat(),
            })
        return Response({'rows': rows})

    def patch(self, request, pk=None):
        if pk is None:
            return Response({'error': 'pk required'}, status=400)
        try:
            lr = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        action = request.data.get('action', '')
        if action == 'approve':
            lr.status = 'approved'
            lr.approved_by = request.user
            lr.approved_at = timezone.now()
        elif action == 'reject':
            lr.status = 'rejected'
            lr.decline_reason = request.data.get('reason', '')
        lr.save()
        return Response({'ok': True})


# ── Payroll ───────────────────────────────────────────────────────────────────

class HrPayrollDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get('month', '')
        if month_str:
            try:
                year, mon = map(int, month_str.split('-'))
            except Exception:
                year, mon = date.today().year, date.today().month
        else:
            year, mon = date.today().year, date.today().month

        records = PayrollPaymentRecord.objects.filter(
            month__year=year, month__month=mon
        ).select_related('user')
        record_map = {r.user_id: r for r in records}
        
        users = all_users_in_org()
        
        entries_qs = AttendanceEntry.objects.filter(
            entry_date__year=year,
            entry_date__month=mon,
            is_active=True,
        )
        by_user = {}
        for e in entries_qs:
            by_user.setdefault(e.user_id, []).append(e)
            
        import calendar
        _, num_days = calendar.monthrange(year, mon)

        rows = []
        for user in users:
            rec = record_map.get(user.id)
            if rec:
                rows.append({
                    'id': rec.id,
                    'user_id': rec.user_id,
                    'employee_name': rec.user.get_full_name() or rec.user.username,
                    'month': str(rec.month),
                    'gross_amount': float(rec.gross_amount),
                    'total_deductions': float(rec.total_deductions),
                    'net_amount': float(rec.net_amount),
                    'status': rec.status,
                    'payment_date': str(rec.payment_date) if rec.payment_date else '',
                    'working_days': float(rec.working_days),
                    'present_days': float(rec.present_days),
                    'lop_days': float(rec.lop_days),
                })
            else:
                elist = by_user.get(user.id, [])
                present = sum(1 for e in elist if e.status == 'present')
                half_day = sum(1 for e in elist if e.status == 'half_day')
                absent = sum(1 for e in elist if e.status == 'absent')
                salary_deductions = sum(float(e.salary_deduction_days) for e in elist)
                lop_days = float(absent) + (float(half_day) * 0.5) + salary_deductions
                payable_days = float(num_days) - lop_days
                if payable_days < 0:
                    payable_days = 0.0

                rows.append({
                    'id': None,
                    'user_id': user.id,
                    'employee_name': user.get_full_name() or user.username,
                    'month': f"{year}-{mon:02d}-01",
                    'gross_amount': None,
                    'total_deductions': None,
                    'net_amount': None,
                    'status': 'Pending',
                    'payment_date': '',
                    'working_days': float(num_days),
                    'present_days': payable_days,
                    'lop_days': lop_days,
                })

        run = None
        try:
            payroll_run = PayrollRun.objects.get(month__year=year, month__month=mon)
            run = {
                'id': payroll_run.id,
                'month': str(payroll_run.month),
                'is_locked': payroll_run.is_locked,
                'hr_approved_at': payroll_run.hr_approved_at.isoformat() if payroll_run.hr_approved_at else None,
                'finance_approved_at': payroll_run.finance_approved_at.isoformat() if payroll_run.finance_approved_at else None,
                'exception_count': payroll_run.exception_count,
                'exception_report': payroll_run.exception_report,
            }
        except PayrollRun.DoesNotExist:
            pass

        return Response({'rows': rows, 'run': run})


class HrPayrollEmployeeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        records = PayrollPaymentRecord.objects.filter(
            user_id=user_id
        ).order_by('-month').select_related('user')[:12]
        profile = EmployeePayrollProfile.objects.filter(user_id=user_id).first()

        return Response({
            'records': PayrollPaymentRecordSerializer(records, many=True).data,
            'profile': EmployeePayrollProfileSerializer(profile).data if profile else None,
        })


class HrPayrollRunControlView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month_str = request.query_params.get('month', '')
        if not month_str:
            today = date.today()
            month_str = f'{today.year}-{today.month:02d}'
        try:
            year, mon = map(int, month_str.split('-'))
        except Exception:
            year, mon = date.today().year, date.today().month

        run, _ = PayrollRun.objects.get_or_create(
            month=date(year, mon, 1),
            defaults={'org_id': ''}
        )
        return Response(PayrollRunSerializer(run).data)

    def post(self, request):
        """Actions: hr_approve, finance_approve, lock"""
        action = request.data.get('action', '')
        month_str = request.data.get('month', '')
        if not month_str:
            today = date.today()
            month_str = f'{today.year}-{today.month:02d}'
        try:
            year, mon = map(int, month_str.split('-'))
        except Exception:
            year, mon = date.today().year, date.today().month

        run, _ = PayrollRun.objects.get_or_create(month=date(year, mon, 1))

        if action == 'lock_attendance':
            # Mark all attendance entries for the month as locked
            AttendanceEntry.objects.filter(entry_date__year=year, entry_date__month=mon).update(is_locked=True, locked_at=timezone.now())
        elif action == 'run_calculation':
            import calendar
            _, num_days = calendar.monthrange(year, mon)
            users = all_users_in_org()
            profiles = {p.user_id: p for p in EmployeePayrollProfile.objects.filter(is_active=True)}
            
            entries_qs = AttendanceEntry.objects.filter(
                entry_date__year=year,
                entry_date__month=mon,
                is_active=True,
            )
            by_user = {}
            for e in entries_qs:
                by_user.setdefault(e.user_id, []).append(e)

            exceptions = []

            for user in users:
                profile = profiles.get(user.id)
                if not profile:
                    exceptions.append({
                        "user_id": user.id,
                        "name": user.get_full_name() or user.username,
                        "type": "Missing Profile",
                        "message": "Employee has no active payroll profile."
                    })
                    base_gross = 0.0
                else:
                    if not profile.bank_account_number:
                        exceptions.append({
                            "user_id": user.id,
                            "name": user.get_full_name() or user.username,
                            "type": "Missing Bank",
                            "message": "Bank account number is not configured."
                        })
                    base_gross = float(profile.base_monthly_gross)

                elist = by_user.get(user.id, [])
                present = sum(1 for e in elist if e.status == 'present')
                wfh = sum(1 for e in elist if e.status == 'wfh')
                on_duty = sum(1 for e in elist if e.status == 'on_duty')
                half_day = sum(1 for e in elist if e.status == 'half_day')
                leave = sum(1 for e in elist if e.status == 'leave')
                absent = sum(1 for e in elist if e.status == 'absent')
                
                salary_deductions = sum(float(e.salary_deduction_days) for e in elist)
                lop_days = float(absent) + (float(half_day) * 0.5) + salary_deductions
                
                working_days = float(num_days)
                payable_days = working_days - lop_days
                if payable_days < 0:
                    payable_days = 0.0
                
                prorated_gross = (base_gross / working_days) * payable_days if working_days else 0
                prorated_gross = round(prorated_gross, 2)
                
                deductions = 0.0
                net = prorated_gross - deductions
                
                if net == 0 and working_days > 0 and base_gross > 0:
                    exceptions.append({
                        "user_id": user.id,
                        "name": user.get_full_name() or user.username,
                        "type": "Zero Pay",
                        "message": "Calculated net pay is zero."
                    })
                
                record, _ = PayrollPaymentRecord.objects.get_or_create(
                    user=user,
                    month=date(year, mon, 1),
                    defaults={'org_id': ''}
                )
                record.working_days = working_days
                record.present_days = payable_days
                record.lop_days = lop_days
                record.gross_amount = prorated_gross
                record.total_deductions = deductions
                record.net_amount = net
                record.status = 'Processed'
                record.save()
            
            run.exception_report = exceptions
            run.exception_count = len(exceptions)
            run.calculation_run_at = timezone.now()
            run.calculation_run_by = request.user
        elif action == 'hr_approve':
            run.hr_approved_at = timezone.now()
            run.hr_approved_by = request.user
        elif action == 'finance_approve':
            run.finance_approved_at = timezone.now()
            run.finance_approved_by = request.user
        elif action == 'post_gl':
            from django.db.models import Sum
            from accounting.models import JournalEntry, JournalItem, Ledger
            
            aggr = PayrollPaymentRecord.objects.filter(month=run.month).aggregate(
                total_gross=Sum('gross_amount'),
                total_net=Sum('net_amount')
            )
            gross = aggr['total_gross'] or 0
            net = aggr['total_net'] or 0
            
            if gross > 0:
                salary_exp_ledger, _ = Ledger.objects.get_or_create(
                    name="Salary Expense", 
                    defaults={'type': Ledger.LedgerType.EXPENSE}
                )
                salary_pay_ledger, _ = Ledger.objects.get_or_create(
                    name="Salary Payable", 
                    defaults={'type': Ledger.LedgerType.LIABILITY}
                )
                
                je = JournalEntry.objects.create(
                    date=date.today(),
                    description=f"Payroll for {month_str}"
                )
                
                # Debit Expense
                JournalItem.objects.create(entry=je, ledger=salary_exp_ledger, debit=gross, credit=0)
                # Credit Payable
                JournalItem.objects.create(entry=je, ledger=salary_pay_ledger, debit=0, credit=net)
                
                # Deductions
                deductions = gross - net
                if deductions > 0:
                    ded_ledger, _ = Ledger.objects.get_or_create(
                        name="Salary Deductions Payable",
                        defaults={'type': Ledger.LedgerType.LIABILITY}
                    )
                    JournalItem.objects.create(entry=je, ledger=ded_ledger, debit=0, credit=deductions)
                    
                gl_ref = f"JE-{je.id}"
            else:
                gl_ref = f"GL-{year}{mon:02d}-{run.id}"

            run.gl_posted_at = timezone.now()
            run.gl_posted_by = request.user
            run.gl_reference = gl_ref
        elif action == 'lock':
            run.is_locked = True
        elif action == 'generate_payslips':
            run.payslips_generated_at = timezone.now()
            run.payslips_generated_by = request.user
        elif action == 'export_bank_file':
            run.bank_file_generated_at = timezone.now()
            run.bank_file_generated_by = request.user
        
        run.save()
        return Response(PayrollRunSerializer(run).data)


# ── Expense Tracker ───────────────────────────────────────────────────────────

class HrExpenseTrackerOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ExpenseEntry.objects.all().select_related('user')
        status_filter = request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)
        month = request.query_params.get('month', '')
        if month:
            try:
                year, mon = map(int, month.split('-'))
                qs = qs.filter(spent_on__year=year, spent_on__month=mon)
            except Exception:
                pass
        return Response({'expenses': ExpenseEntrySerializer(qs[:200], many=True).data})


class HrExpenseTrackerMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        qs = ExpenseEntry.objects.filter(user_id=user_id).select_related('user')
        return Response({'expenses': ExpenseEntrySerializer(qs[:100], many=True).data})


class HrExpenseApprovalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, expense_id):
        try:
            expense = ExpenseEntry.objects.get(pk=expense_id)
        except ExpenseEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        action = request.data.get('action', '')
        if action == 'approve':
            expense.status = 'Dept Head Approved'
            expense.dept_approved_by = request.user
            expense.dept_approved_at = timezone.now()
        elif action == 'reject':
            expense.status = 'Rejected'
            expense.rejection_reason = request.data.get('reason', '')
        expense.save()
        return Response({'ok': True})


# ── Master Task Tracker ───────────────────────────────────────────────────────

class HrMasterTaskTrackerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = MasterTask.objects.all().select_related('assigned_to', 'assigned_by')
        status_filter = request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)

        hr_tasks = list(MasterTaskSerializer(qs[:200], many=True).data)

        # Include ALL MyDesk personal todos from all users (org-wide)
        mydesk_tasks = []
        try:
            from core.mydesk.models import PersonalTodoItem
            todo_qs = PersonalTodoItem.objects.select_related('user').all()[:500]
            for item in todo_qs:
                meta = item.meta if isinstance(item.meta, dict) else {}
                task_status = meta.get('status') or ('done' if item.is_done else 'todo')
                if status_filter and status_filter.lower() not in (task_status or '').lower():
                    continue
                mydesk_tasks.append({
                    'id': f'mydesk_{item.id}',
                    'title': meta.get('title') or item.text or '',
                    'description': meta.get('description', ''),
                    'priority': meta.get('priority', 'medium'),
                    'status': task_status,
                    'due_date': meta.get('dueDate') or meta.get('due_date') or '',
                    'assigned_to': item.user_id,
                    'assigned_to_name': item.user.get_full_name() or item.user.username,
                    'assigned_by': None,
                    'assigned_by_name': None,
                    'created_at': item.created_at.isoformat(),
                    'source': 'mydesk',
                })
        except Exception:
            pass

        return Response({'tasks': hr_tasks + mydesk_tasks})

    def post(self, request):
        ser = MasterTaskSerializer(data=request.data)
        if ser.is_valid():
            ser.save(assigned_by=request.user)
            return Response(ser.data, status=201)
        return Response(ser.errors, status=400)


class HrMasterTaskAssignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        data['assigned_by'] = request.user.id
        ser = MasterTaskSerializer(data=data)
        if ser.is_valid():
            task = ser.save(assigned_by=request.user)
            return Response(MasterTaskSerializer(task).data, status=201)
        return Response(ser.errors, status=400)


class HrMasterTaskExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = MasterTask.objects.all().select_related('assigned_to', 'assigned_by')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="tasks_export.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Title', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Created'])
        for task in qs:
            writer.writerow([
                task.id, task.title,
                task.assigned_to.get_full_name() or task.assigned_to.username,
                task.priority, task.status,
                str(task.due_date) if task.due_date else '',
                task.created_at.date(),
            ])
        return response


# ── Meeting Manager ───────────────────────────────────────────────────────────

class HrMeetingManagerOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CompanyEvent.objects.all().select_related('created_by')
        company_events = CompanyEventSerializer(qs[:100], many=True).data

        # Aggregate Google Calendar meetings from all connected team members
        calendar_meetings = []
        try:
            from calendar_integration.models import GoogleCalendarCredential
            from calendar_integration import services as cal_services

            start = request.query_params.get(
                'start',
                (date.today() - timedelta(days=7)).isoformat(),
            )
            end = request.query_params.get(
                'end',
                (date.today() + timedelta(days=60)).isoformat(),
            )

            connected_users = GoogleCalendarCredential.objects.select_related('user').values_list('user', flat=True)
            for user_id in connected_users:
                try:
                    user_obj = User.objects.get(pk=user_id)
                    events = cal_services.list_events(user_obj, start, end)
                    for ev in events:
                        if ev.get('event_type') == 'meeting':
                            ev['calendar_owner'] = user_obj.get_full_name() or user_obj.username
                            ev['calendar_owner_email'] = user_obj.email
                            calendar_meetings.append(ev)
                except Exception:
                    continue
        except Exception:
            pass

        return Response({'events': list(company_events), 'calendar_meetings': calendar_meetings})

    def post(self, request):
        ser = CompanyEventSerializer(data=request.data)
        if ser.is_valid():
            ser.save(created_by=request.user)
            return Response(ser.data, status=201)
        return Response(ser.errors, status=400)


class HrMeetingManagerEventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, event_id):
        try:
            event = CompanyEvent.objects.get(pk=event_id)
        except CompanyEvent.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        ser = CompanyEventSerializer(event, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=400)

    def delete(self, request, event_id):
        try:
            event = CompanyEvent.objects.get(pk=event_id)
        except CompanyEvent.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        event.delete()
        return Response(status=204)
