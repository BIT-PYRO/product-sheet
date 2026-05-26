"""
Management command: seed_role_defaults

Seeds RoleDefaultPermissions for every standard department × designation combo.

Usage:
    python manage.py seed_role_defaults
    python manage.py seed_role_defaults --overwrite   # overwrite existing entries
"""
from django.core.management.base import BaseCommand

from accounts.models import RoleDefaultPermissions
from accounts.views_roles import (
    DEPT_MODULE_MAP,
    DESIGNATION_HIERARCHY,
    build_default_permissions,
)


class Command(BaseCommand):
    help = 'Seeds default role permissions for all standard department × designation combinations.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing entries (default: skip if already exists).',
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        created = 0
        updated = 0
        skipped = 0

        for dept in DEPT_MODULE_MAP:
            for designation in DESIGNATION_HIERARCHY:
                perms = build_default_permissions(designation, dept)
                obj, was_created = RoleDefaultPermissions.objects.get_or_create(
                    role=designation,
                    department=dept,
                    defaults={'permissions': perms},
                )
                if was_created:
                    created += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  [CREATE] {designation} / {dept}')
                    )
                elif overwrite:
                    obj.permissions = perms
                    obj.save(update_fields=['permissions'])
                    updated += 1
                    self.stdout.write(
                        self.style.WARNING(f'  [UPDATE] {designation} / {dept}')
                    )
                else:
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Created: {created}  Updated: {updated}  Skipped: {skipped}\n'
                f'Total departments: {len(DEPT_MODULE_MAP)}, '
                f'Total designations: {len(DESIGNATION_HIERARCHY)}, '
                f'Total combinations: {len(DEPT_MODULE_MAP) * len(DESIGNATION_HIERARCHY)}\n'
            )
        )
