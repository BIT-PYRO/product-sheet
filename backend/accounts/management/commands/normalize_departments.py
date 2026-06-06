"""
Management command: normalize_departments

Merges all variant spellings of 'CRM' / 'Customer Relation Management' into
the single canonical name 'Customer Relation Management' across:
  - WorkforceMember.department
  - RoleDefaultPermissions.department

Also deduplicates RoleDefaultPermissions rows that end up with the same
(role, department) pair after normalization (keeps the one with the most
populated permissions).

Usage:
    python manage.py normalize_departments
    python manage.py normalize_departments --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction


# Every spelling / abbreviation that should map to the canonical name.
DEPT_ALIASES = {
    'crm':                              'Customer Relation Management',
    'customer relation management':     'Customer Relation Management',
    'customer relation manage':         'Customer Relation Management',
    'customer relationship management': 'Customer Relation Management',
    'customer relation':                'Customer Relation Management',
}

CANONICAL = 'Customer Relation Management'


def _canonical(name: str) -> str:
    """Return the canonical department name, or the original if no alias."""
    return DEPT_ALIASES.get((name or '').strip().lower(), (name or '').strip())


class Command(BaseCommand):
    help = 'Normalise CRM department name variants into "Customer Relation Management".'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would change without modifying the database.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        prefix = '[DRY RUN] ' if dry else ''

        # ── 1. WorkforceMember ───────────────────────────────────────────────
        try:
            from workforce.models import WorkforceMember
            members = WorkforceMember.objects.exclude(department='')
            renamed = 0
            for m in members:
                dept_parts = [p.strip() for p in (m.department or '').split(',') if p.strip()]
                new_parts = [_canonical(p) for p in dept_parts]
                new_dept = ', '.join(new_parts)
                if new_dept != m.department:
                    self.stdout.write(
                        f'{prefix}WorkforceMember id={m.id} ({m.full_name}): '
                        f'"{m.department}" -> "{new_dept}"'
                    )
                    if not dry:
                        m.department = new_dept
                        m.save(update_fields=['department'])
                    renamed += 1
            self.stdout.write(self.style.SUCCESS(
                f'{prefix}{renamed} WorkforceMember record(s) updated.'
            ))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'WorkforceMember update failed: {exc}'))

        # ── 2. RoleDefaultPermissions ────────────────────────────────────────
        try:
            from accounts.models import RoleDefaultPermissions
            rdps = list(RoleDefaultPermissions.objects.all())
            renamed = 0
            merged = 0

            if dry:
                for obj in rdps:
                    canon = _canonical(obj.department)
                    if canon != obj.department:
                        self.stdout.write(
                            f'{prefix}RoleDefaultPermissions id={obj.pk} role="{obj.role}" '
                            f'dept: "{obj.department}" -> "{canon}"'
                        )
                        renamed += 1
            else:
                with transaction.atomic():
                    for obj in rdps:
                        canon = _canonical(obj.department)
                        if canon == obj.department:
                            continue
                        # Check if a canonical record already exists for same role
                        existing = RoleDefaultPermissions.objects.filter(
                            role=obj.role, department=canon
                        ).exclude(pk=obj.pk).first()
                        if existing:
                            # Keep whichever has more populated permissions
                            obj_len = len(obj.permissions or {})
                            ex_len = len(existing.permissions or {})
                            if obj_len > ex_len:
                                existing.permissions = obj.permissions
                                existing.save(update_fields=['permissions'])
                            self.stdout.write(
                                f'Merged RoleDefaultPermissions id={obj.pk} '
                                f'(role="{obj.role}", dept="{obj.department}") '
                                f'into existing id={existing.pk} (dept="{canon}")'
                            )
                            obj.delete()
                            merged += 1
                        else:
                            old = obj.department
                            obj.department = canon
                            obj.save(update_fields=['department'])
                            self.stdout.write(
                                f'Renamed RoleDefaultPermissions id={obj.pk} '
                                f'role="{obj.role}": "{old}" -> "{canon}"'
                            )
                            renamed += 1

            self.stdout.write(self.style.SUCCESS(
                f'{prefix}{renamed} RoleDefaultPermissions record(s) renamed, '
                f'{merged} merged/deleted.'
            ))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'RoleDefaultPermissions update failed: {exc}'))

        self.stdout.write(self.style.SUCCESS('Done.'))
