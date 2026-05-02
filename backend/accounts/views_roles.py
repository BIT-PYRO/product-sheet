from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Role, Permission
from rest_framework.permissions import IsAuthenticated

SYSTEM_ROLE_NAME = "Administrator"

_MODULES = {
    'products_inventory': ['product_sheet', 'master_product_sheet', 'master_inventory_sheet', 'inventory'],
    'design_findings': ['designer_sheet', 'master_designer_sheet', 'finding_entry', 'finding_sheet'],
    'jobs_orders': ['create_generic_job', 'master_job_sheet', 'orders', 'drafts'],
    'customers_kyc': ['enrol_customer', 'master_customer_sheet', 'master_kyc_sheet'],
    'human_resources': [
        'team_directory', 'enrol_workforce', 'master_workforce_sheet',
        'master_task_manager', 'meeting_manager', 'attendance_dashboard',
        'leave_requests', 'org_hierarchy', 'roles_permissions', 'diary'
    ],
    'finance_accountancy': [
        'payroll', 'expenses', 'dept_expenses', 'accounts_payable',
        'accounts_receivable', 'invoices', 'purchase_bills', 'profit_loss', 'finance_dashboard'
    ],
    'workspace': ['my_desk', 'managers_dashboard']
}

_ACTIONS = ['view', 'create', 'edit', 'delete', 'view_amounts', 'export']
ALL_PERMISSIONS = []
for mod_id, pages in _MODULES.items():
    for page_id in pages:
        for action in _ACTIONS:
            ALL_PERMISSIONS.append(f"{mod_id}:{page_id}:{action}")

def _ensure_admin_role():
    role, created = Role.objects.get_or_create(
        name=SYSTEM_ROLE_NAME,
        defaults={'is_system': True}
    )
    current_perm_count = role.permissions.count()
    if created or current_perm_count != len(ALL_PERMISSIONS):
        perm_objects = []
        for perm_str in ALL_PERMISSIONS:
            perm_obj, _ = Permission.objects.get_or_create(identifier=perm_str)
            perm_objects.append(perm_obj)
        role.permissions.set(perm_objects)
    return role

class RoleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_admin_role()
        roles = Role.objects.all().prefetch_related('permissions')
        data = []
        for role in roles:
            data.append({
                "id": role.id,
                "name": role.name,
                "permissions": [p.identifier for p in role.permissions.all()],
                "is_system": role.is_system
            })
        return Response({"roles": data}, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name')
        permissions_payload = request.data.get('permissions', [])
        if not name:
            return Response({"error": "Role name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if name == SYSTEM_ROLE_NAME:
            return Response({"error": "Cannot create system role."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                role, created = Role.objects.get_or_create(name=name)
                perm_objects = []
                for p_str in permissions_payload:
                    perm_obj, _ = Permission.objects.get_or_create(identifier=p_str)
                    perm_objects.append(perm_obj)
                role.permissions.set(perm_objects)
            return Response({"message": f"Role saved.", "role_id": role.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        new_name = request.data.get('name')
        if role.is_system and new_name and new_name != SYSTEM_ROLE_NAME:
            return Response({"error": "Cannot rename system role."}, status=status.HTTP_400_BAD_REQUEST)

        permissions_payload = request.data.get('permissions')
        with transaction.atomic():
            if new_name and not role.is_system:
                role.name = new_name
            if permissions_payload is not None:
                perm_objects = []
                for p_str in permissions_payload:
                    perm_obj, _ = Permission.objects.get_or_create(identifier=p_str)
                    perm_objects.append(perm_obj)
                role.permissions.set(perm_objects)
            role.save()
        return Response({"message": "Role updated successfully."}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        if role.is_system:
            return Response({"error": "Cannot delete system role."}, status=status.HTTP_403_FORBIDDEN)
        role.delete()
        return Response({"message": "Role deleted successfully."}, status=status.HTTP_200_OK)
