from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Role, Permission, RoleDefaultPermissions
from rest_framework.permissions import IsAuthenticated
from common.api import api_success

# ---------------------------------------------------------------------------
# Constants: Designation Hierarchy, Department→Module Mapping
# ---------------------------------------------------------------------------

DESIGNATION_HIERARCHY = [
    'Intern',
    'Associate',
    'Manager',
    'Department Head',
    'Director',
    'CEO',
    'Chairman',
    'Superuser',
]

DESIGNATION_LEVEL = {d: i for i, d in enumerate(DESIGNATION_HIERARCHY)}

# All 21 application modules with display labels
ALL_MODULES = [
    {'key': 'product-sheet',          'label': 'Product Sheet'},
    {'key': 'master-product-sheet',   'label': 'Master Product Sheet'},
    {'key': 'master-inventory-sheet', 'label': 'Master Inventory Sheet'},
    {'key': 'enrol-customer',         'label': 'Enroll Customer'},
    {'key': 'master-customer-sheet',  'label': 'Master Customer Sheet'},
    {'key': 'master-kyc-sheet',       'label': 'Master KYC Sheet'},
    {'key': 'enrol-workforce',        'label': 'Enroll Workforce'},
    {'key': 'master-workforce-sheet', 'label': 'Master Workforce Sheet'},
    {'key': 'master-job-sheet',       'label': 'Master Job Sheet'},
    {'key': 'managers-dashboard',     'label': 'Managers Dashboard'},
    {'key': 'drafts',                 'label': 'Drafts'},
    {'key': 'orders',                 'label': 'Orders'},
    {'key': 'my-desk',                'label': 'My Desk'},
    {'key': 'create-generic-job',     'label': 'Create Generic Job'},
    {'key': 'master-designer-sheet',  'label': 'Master Designer Sheet'},
    {'key': 'designer-sheet',         'label': 'Designer Sheet'},
    {'key': 'finding-sheet',          'label': 'Master Finding Sheet'},
    {'key': 'finding-entry',          'label': 'Finding Sheet'},
    {'key': 'inventory',              'label': 'Inventory'},
    {'key': 'accountancy',            'label': 'Accountancy'},
    {'key': 'hr-section',             'label': 'Human Resources'},
]

# Department → list of module keys allocated to that department
DEPT_MODULE_MAP = {
    'Marketing': [
        'enrol-customer', 'master-customer-sheet', 'orders',
        'create-generic-job', 'managers-dashboard', 'my-desk',
    ],
    'CRM': [
        'enrol-customer', 'master-customer-sheet', 'orders',
        'drafts', 'managers-dashboard', 'my-desk',
    ],
    'Operations': [
        'product-sheet', 'master-product-sheet', 'master-inventory-sheet',
        'orders', 'inventory', 'create-generic-job', 'managers-dashboard', 'my-desk',
    ],
    'Design': [
        'designer-sheet', 'master-designer-sheet', 'finding-entry',
        'finding-sheet', 'drafts', 'orders', 'my-desk',
    ],
    'Logistics': [
        'orders', 'inventory', 'master-inventory-sheet', 'product-sheet', 'my-desk',
    ],
    'Purchase': [
        'product-sheet', 'master-product-sheet', 'inventory',
        'master-inventory-sheet', 'finding-entry', 'finding-sheet', 'my-desk',
    ],
    'Sales': [
        'enrol-customer', 'master-customer-sheet', 'orders',
        'create-generic-job', 'managers-dashboard', 'my-desk',
    ],
    'Finance': [
        'accountancy', 'orders', 'inventory', 'my-desk',
    ],
    'Information Technology': [
        'managers-dashboard', 'drafts', 'my-desk', 'hr-section', 'accountancy',
    ],
    'Human Resource': [
        'enrol-workforce', 'master-workforce-sheet', 'hr-section', 'managers-dashboard', 'my-desk',
    ],
    'Production': [
        'product-sheet', 'master-product-sheet', 'finding-entry', 'finding-sheet',
        'designer-sheet', 'orders', 'inventory', 'my-desk',
    ],
    'Services': [
        'orders', 'create-generic-job', 'managers-dashboard', 'my-desk',
    ],
    'House Keeping': [
        'hr-section', 'enrol-workforce', 'master-workforce-sheet', 'my-desk',
    ],
}

# "my-desk" is always accessible to everyone
MY_DESK_KEY = 'my-desk'

SYSTEM_ROLE_NAME = "Administrator"


# ---------------------------------------------------------------------------
# Helper: permission presets by designation level
# ---------------------------------------------------------------------------

def _empty_module_perms():
    return {'view': False, 'edit': False, 'create': False, 'export': False, 'amount': False}


def _full_module_perms():
    return {'view': True, 'edit': True, 'create': True, 'export': True, 'amount': True}


def _read_only_perms():
    return {'view': True, 'edit': False, 'create': False, 'export': False, 'amount': False}


def _operator_perms():
    return {'view': True, 'edit': True, 'create': True, 'export': False, 'amount': False}


def _manager_perms():
    return {'view': True, 'edit': True, 'create': True, 'export': True, 'amount': False}


def _head_perms():
    return {'view': True, 'edit': True, 'create': True, 'export': True, 'amount': True}


DESIGNATION_PERM_FACTORY = {
    'Intern':          _read_only_perms,
    'Associate':       _operator_perms,
    'Manager':         _manager_perms,
    'Department Head': _head_perms,
    'Director':        _head_perms,
    'CEO':             _full_module_perms,
    'Chairman':        _full_module_perms,
    'Superuser':       _full_module_perms,
}


def build_default_permissions(designation, department):
    """Return a full permissions dict for the given designation+department."""
    module_keys = list(DEPT_MODULE_MAP.get(department, []))
    if MY_DESK_KEY not in module_keys:
        module_keys.append(MY_DESK_KEY)

    perm_fn = DESIGNATION_PERM_FACTORY.get(designation, _empty_module_perms)
    sheets = {}
    for key in module_keys:
        sheets[key] = perm_fn()

    # My Desk always gets at least view+edit
    if MY_DESK_KEY in sheets:
        sheets[MY_DESK_KEY]['view'] = True
        sheets[MY_DESK_KEY]['edit'] = True

    # Director and above get access to ALL modules
    lvl = DESIGNATION_LEVEL.get(designation, 0)
    if lvl >= DESIGNATION_LEVEL.get('Director', 4):
        for m in ALL_MODULES:
            if m['key'] not in sheets:
                sheets[m['key']] = perm_fn()

    # HR department: Manager and above can manage team members & role templates
    is_hr_dept = department in ('Human Resource', 'Human Resources')
    if is_hr_dept:
        manage_members = lvl >= DESIGNATION_LEVEL.get('Manager', 2)
    else:
        manage_members = lvl >= DESIGNATION_LEVEL.get('Department Head', 3)
    return {'sheets': sheets, 'manage_members': manage_members}


# ---------------------------------------------------------------------------
# Authorization helper
# ---------------------------------------------------------------------------

def _can_manage_roles(request):
    """Return True if the request user can manage role templates."""
    if request.user.is_superuser or getattr(request.user, 'role', None) == 'admin':
        return True
    try:
        from workforce.models import WorkforceMember
        member = WorkforceMember.objects.filter(email__iexact=request.user.email).first()
        if member:
            lvl = DESIGNATION_LEVEL.get((member.designation or '').strip(), -1)
            dept = (member.department or '').strip()
            if lvl >= DESIGNATION_LEVEL.get('Department Head', 3):
                return True
            # HR Manager and above can manage roles and team directory
            if dept in ('Human Resource', 'Human Resources') and lvl >= DESIGNATION_LEVEL.get('Manager', 2):
                return True
            if member.permissions and member.permissions.get('manage_members'):
                return True
    except Exception:
        pass
    return False


# ---------------------------------------------------------------------------
# Legacy Role/Permission views (kept for backward compatibility)
# ---------------------------------------------------------------------------

def _ensure_admin_role():
    role, _ = Role.objects.get_or_create(name=SYSTEM_ROLE_NAME, defaults={'is_system': True})
    return role


class RoleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_admin_role()
        roles = Role.objects.all().prefetch_related('permissions')
        data = [
            {
                'id': r.id,
                'name': r.name,
                'permissions': [p.identifier for p in r.permissions.all()],
                'is_system': r.is_system,
            }
            for r in roles
        ]
        return Response({'roles': data}, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name')
        permissions_payload = request.data.get('permissions', [])
        if not name:
            return Response({'error': 'Role name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if name == SYSTEM_ROLE_NAME:
            return Response({'error': 'Cannot create system role.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                role, _ = Role.objects.get_or_create(name=name)
                perm_objects = []
                for p_str in permissions_payload:
                    perm_obj, _ = Permission.objects.get_or_create(identifier=p_str)
                    perm_objects.append(perm_obj)
                role.permissions.set(perm_objects)
            return Response({'message': 'Role saved.', 'role_id': role.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        new_name = request.data.get('name')
        if role.is_system and new_name and new_name != SYSTEM_ROLE_NAME:
            return Response({'error': 'Cannot rename system role.'}, status=status.HTTP_400_BAD_REQUEST)
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
        return Response({'message': 'Role updated successfully.'}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        if role.is_system:
            return Response({'error': 'Cannot delete system role.'}, status=status.HTTP_403_FORBIDDEN)
        role.delete()
        return Response({'message': 'Role deleted successfully.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# NEW: Department & Role-Template management APIs
# ---------------------------------------------------------------------------

class DepartmentModulesView(APIView):
    """
    GET /api/accounts/departments/
    Returns all departments with allocated modules, full module list,
    and designation hierarchy.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        module_map = {m['key']: m['label'] for m in ALL_MODULES}
        departments = []
        for dept_name, module_keys in DEPT_MODULE_MAP.items():
            keys = list(module_keys)
            if MY_DESK_KEY not in keys:
                keys.append(MY_DESK_KEY)
            departments.append({
                'name': dept_name,
                'modules': [{'key': k, 'label': module_map.get(k, k)} for k in keys],
            })
        return api_success({
            'departments': departments,
            'all_modules': ALL_MODULES,
            'designations': DESIGNATION_HIERARCHY,
            'my_desk_key': MY_DESK_KEY,
        })


class RoleTemplateListView(APIView):
    """
    GET  /api/accounts/role-templates/?department=X
    POST /api/accounts/role-templates/
    """
    permission_classes = [IsAuthenticated]

    def _ensure_workforce_combos(self):
        """Auto-create RoleDefaultPermissions entries for all active workforce combos."""
        try:
            from workforce.models import WorkforceMember
            from workforce.services.permission_sync import ensure_role_defaults
            existing_pairs = set(
                RoleDefaultPermissions.objects.values_list('role', 'department')
            )
            wf_combos = (
                WorkforceMember.objects
                .filter(active=True)
                .exclude(designation='')
                .values_list('designation', 'department')
                .distinct()
            )
            for des, dep in wf_combos:
                dep_norm = (dep or '').strip()
                if (des, dep_norm) not in existing_pairs:
                    ensure_role_defaults(des, dep_norm)
        except Exception:
            pass

    def get(self, request):
        self._ensure_workforce_combos()
        dept_filter = request.query_params.get('department', '').strip()
        qs = RoleDefaultPermissions.objects.all().order_by('department', 'role')
        if dept_filter:
            qs = qs.filter(department=dept_filter)

        grouped = {}
        flat = []
        for obj in qs:
            dept = obj.department or '(Global)'
            entry = {
                'id': obj.pk,
                'role': obj.role,
                'department': obj.department,
                'permissions': obj.permissions or {},
                'hierarchy_level': DESIGNATION_LEVEL.get(obj.role, -1),
                'is_standard': obj.role in DESIGNATION_HIERARCHY,
            }
            grouped.setdefault(dept, []).append(entry)
            flat.append(entry)

        return api_success({'grouped': grouped, 'flat': flat})

    def post(self, request):
        if not _can_manage_roles(request):
            return Response({'success': False, 'message': 'Not authorized.'}, status=403)

        role_name = (request.data.get('role') or '').strip()
        department = (request.data.get('department') or '').strip()
        permissions = request.data.get('permissions')

        if not role_name:
            return Response({'success': False, 'message': 'role is required.'}, status=400)
        if permissions is not None and not isinstance(permissions, dict):
            return Response({'success': False, 'message': 'permissions must be a JSON object.'}, status=400)

        with transaction.atomic():
            obj, created = RoleDefaultPermissions.objects.get_or_create(
                role=role_name, department=department,
                defaults={'permissions': permissions or {}},
            )
            if not created and permissions is not None:
                obj.permissions = permissions
                obj.save(update_fields=['permissions'])

        synced = 0
        if permissions is not None:
            try:
                from workforce.services.permission_sync import sync_all_members_for_role
                synced = sync_all_members_for_role(role_name, department)
            except Exception:
                pass

        return api_success(
            {'id': obj.pk, 'role': obj.role, 'department': obj.department, 'permissions': obj.permissions},
            message=f'Role template {"created" if created else "updated"}. {synced} member(s) synced.',
            status_code=201 if created else 200,
        )


class RoleTemplateDetailView(APIView):
    """
    GET    /api/accounts/role-templates/<pk>/
    PATCH  /api/accounts/role-templates/<pk>/
    DELETE /api/accounts/role-templates/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        obj = get_object_or_404(RoleDefaultPermissions, pk=pk)
        return api_success({
            'id': obj.pk,
            'role': obj.role,
            'department': obj.department,
            'permissions': obj.permissions or {},
            'hierarchy_level': DESIGNATION_LEVEL.get(obj.role, -1),
        })

    def patch(self, request, pk):
        if not _can_manage_roles(request):
            return Response({'success': False, 'message': 'Not authorized.'}, status=403)
        obj = get_object_or_404(RoleDefaultPermissions, pk=pk)
        permissions = request.data.get('permissions')
        role_name = (request.data.get('role') or '').strip()
        department = request.data.get('department')

        with transaction.atomic():
            if role_name:
                obj.role = role_name
            if department is not None:
                obj.department = department.strip()
            if permissions is not None:
                obj.permissions = permissions
            obj.save()

        synced = 0
        try:
            from workforce.services.permission_sync import sync_all_members_for_role
            synced = sync_all_members_for_role(obj.role, obj.department)
        except Exception:
            pass

        return api_success(
            {'id': obj.pk, 'role': obj.role, 'department': obj.department, 'permissions': obj.permissions},
            message=f'Updated. {synced} member(s) synced.',
        )

    def delete(self, request, pk):
        if not _can_manage_roles(request):
            return Response({'success': False, 'message': 'Not authorized.'}, status=403)
        obj = get_object_or_404(RoleDefaultPermissions, pk=pk)
        if obj.role in ('Superuser', 'CEO', 'Chairman'):
            return Response(
                {'success': False, 'message': 'Cannot delete system-level role template.'},
                status=403,
            )
        obj.delete()
        return api_success({}, message='Role template deleted.')


class RoleTemplateApplyView(APIView):
    """
    POST /api/accounts/role-templates/<pk>/apply/
    Applies permissions to all active workforce members with matching designation+department.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _can_manage_roles(request):
            return Response({'success': False, 'message': 'Not authorized.'}, status=403)
        obj = get_object_or_404(RoleDefaultPermissions, pk=pk)
        try:
            from workforce.services.permission_sync import sync_all_members_for_role
            synced = sync_all_members_for_role(obj.role, obj.department)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
        return api_success(
            {'role': obj.role, 'department': obj.department, 'synced': synced},
            message=f'Permissions applied to {synced} member(s).',
        )


class RoleTemplateCloneView(APIView):
    """
    POST /api/accounts/role-templates/<pk>/clone/
    Body: { new_role, new_department }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _can_manage_roles(request):
            return Response({'success': False, 'message': 'Not authorized.'}, status=403)
        source = get_object_or_404(RoleDefaultPermissions, pk=pk)
        new_role = (request.data.get('new_role') or '').strip()
        new_dept = (request.data.get('new_department') or source.department or '').strip()

        if not new_role:
            return Response({'success': False, 'message': 'new_role is required.'}, status=400)

        with transaction.atomic():
            clone, created = RoleDefaultPermissions.objects.get_or_create(
                role=new_role, department=new_dept,
                defaults={'permissions': source.permissions or {}},
            )
            if not created:
                clone.permissions = source.permissions or {}
                clone.save(update_fields=['permissions'])

        return api_success(
            {'id': clone.pk, 'role': clone.role, 'department': clone.department, 'permissions': clone.permissions},
            message=f'Cloned {source.role}/{source.department} → {clone.role}/{clone.department}.',
            status_code=201 if created else 200,
        )


class RoleTemplateSeedView(APIView):
    """
    POST /api/accounts/role-templates/seed/
    Seeds default permissions for all standard department+designation combos.
    Superuser / admin only.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, 'role', None) == 'admin'):
            return Response({'success': False, 'message': 'Superuser required.'}, status=403)

        created_count = 0
        updated_count = 0
        for dept in DEPT_MODULE_MAP:
            for designation in DESIGNATION_HIERARCHY:
                perms = build_default_permissions(designation, dept)
                obj, created = RoleDefaultPermissions.objects.get_or_create(
                    role=designation, department=dept, defaults={'permissions': perms}
                )
                if created:
                    created_count += 1
                else:
                    obj.permissions = perms
                    obj.save(update_fields=['permissions'])
                    updated_count += 1

        return api_success(
            {'created': created_count, 'updated': updated_count},
            message=f'Seed complete. Created: {created_count}, Updated: {updated_count}.',
        )


class RoleHierarchyView(APIView):
    """
    GET /api/accounts/role-hierarchy/
    Returns designation hierarchy with levels and dept-module mapping.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_success({
            'hierarchy': [{'designation': d, 'level': i} for i, d in enumerate(DESIGNATION_HIERARCHY)],
            'dept_module_map': DEPT_MODULE_MAP,
        })
