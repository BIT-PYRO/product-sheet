"""Permission syncing between RoleDefaultPermissions and WorkforceMember."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def ensure_role_defaults(designation, department=''):
    """
    Ensure a RoleDefaultPermissions entry exists for the given
    designation + department pair. Creates one with empty permissions if absent.
    Returns the object (existing or newly created).
    """
    from accounts.models import RoleDefaultPermissions

    designation = (designation or '').strip()
    department = (department or '').strip()

    if not designation:
        return None

    obj, created = RoleDefaultPermissions.objects.get_or_create(
        role=designation,
        department=department,
        defaults={'permissions': {}},
    )
    if created:
        logger.info(
            f'[PermSync] Auto-created RoleDefaultPermissions for '
            f'{designation!r}/{department!r}.'
        )
    return obj


def sync_member_permissions(member):
    """
    Copy the default permissions from RoleDefaultPermissions into the
    given WorkforceMember based on their designation + department.

    Also auto-creates a RoleDefaultPermissions entry for the combo if one
    does not yet exist (so custom "Other" roles appear in the permissions UI).

    Called when:
      - A workforce member is created or their designation/department changes
    """
    from accounts.models import RoleDefaultPermissions

    designation = (member.designation or '').strip()
    department = (member.department or '').strip()

    if not designation:
        return

    # Auto-create entry so custom departments/roles are visible in the UI
    ensure_role_defaults(designation, department)

    defaults = RoleDefaultPermissions.objects.filter(
        role=designation, department=department
    ).first()

    if not defaults:
        # Fallback: try with empty department (global defaults for designation)
        defaults = RoleDefaultPermissions.objects.filter(
            role=designation, department=''
        ).first()

    if defaults and defaults.permissions:
        member.permissions = defaults.permissions
        member.save(update_fields=['permissions'])
        logger.info(
            f'[PermSync] Synced permissions for member={member.pk} '
            f'({designation}/{department}) from defaults.'
        )


def sync_all_members_for_role(role, department=''):
    """
    When default permissions for a designation+department are updated,
    push the new permissions to ALL active workforce members that match.
    """
    from accounts.models import RoleDefaultPermissions
    from workforce.models import WorkforceMember

    defaults = RoleDefaultPermissions.objects.filter(
        role=role, department=department
    ).first()

    if not defaults:
        return 0

    qs = WorkforceMember.objects.filter(
        designation=role,
        active=True,
    )
    if department:
        qs = qs.filter(department=department)

    count = qs.update(permissions=defaults.permissions)
    logger.info(
        f'[PermSync] Pushed default permissions for {role}/{department or "all"} '
        f'to {count} member(s).'
    )
    return count
