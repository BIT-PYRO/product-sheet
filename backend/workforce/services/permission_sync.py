"""Permission syncing between RoleDefaultPermissions and WorkforceMember."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def sync_member_permissions(member):
    """
    Copy the default permissions from RoleDefaultPermissions into the
    given WorkforceMember based on their designation + department.

    Called when:
      - A workforce member is created or their designation/department changes
    """
    from accounts.models import RoleDefaultPermissions

    designation = (member.designation or '').strip()
    department = (member.department or '').strip()

    if not designation:
        return

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
