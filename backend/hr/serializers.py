"""
HR Serializers
"""
from rest_framework import serializers
from .models import (
    AttendanceEntry, AttendanceRulebook, LeaveRequest,
    EmployeePayrollProfile, PayrollRun, PayrollPaymentRecord,
    ExpenseEntry, MasterTask, CompanyEvent,
)


class AttendanceEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceEntry
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_email(self, obj):
        return obj.user.email


class AttendanceRulebookSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRulebook
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = '__all__'

    def get_requested_by_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class EmployeePayrollProfileSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeePayrollProfile
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = '__all__'


class PayrollPaymentRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPaymentRecord
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ExpenseEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseEntry
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class MasterTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MasterTask
        fields = '__all__'

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() or obj.assigned_to.username

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return None


class CompanyEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyEvent
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None
