"""
Management command: associate_existing_records

Phase 2.1 — Data Migration
===========================

Associates all existing ERP records (created before multi-tenancy was added)
with a Default Tenant and Default Company.

Usage:
    python manage.py associate_existing_records
    python manage.py associate_existing_records --tenant-slug default
    python manage.py associate_existing_records --dry-run

This command is idempotent — safe to run multiple times.
Records that already have a tenant/company are skipped.
"""

from django.core.management.base import BaseCommand
from django.db import transaction


APPS_AND_MODELS = [
    # (app_label, model_name, needs_company)
    ('products', 'Product', True),
    ('products', 'Collection', False),   # tenant-only
    ('products', 'Material', False),
    ('products', 'Category', False),
    ('products', 'Channel', False),
    ('products', 'TableColumnConfig', False),
    ('inventory', 'InventoryTransaction', True),
    ('inventory', 'PicklistGroup', True),
    ('inventory', 'PicklistItem', True),
    ('inventory', 'StoneItem', True),
    ('inventory', 'StoneStockEntry', True),
    ('inventory', 'ToolItem', True),
    ('inventory', 'OtherItem', True),
    ('inventory', 'MachineItem', True),
    ('inventory', 'ProductInventoryItem', True),
    ('inventory', 'StockTransaction', True),
    ('inventory', 'StoneTransaction', True),
    ('inventory', 'FindingInventoryItem', True),
    ('inventory', 'FindingInventoryTransaction', True),
    ('inventory', 'ProductInventoryTransaction', True),
    ('inventory', 'IssueRequest', True),
    ('inventory', 'DieInventoryItem', True),
    ('inventory', 'DieTransaction', True),
    ('inventory', 'RepairBatch', True),
    ('inventory', 'RepairItem', True),
    ('orders', 'Order', True),
    ('orders', 'OrderItem', True),
    ('workforce', 'WorkforceMember', True),
    ('customers', 'Customer', True),
    ('jobs', 'Job', True),
    ('kyc', 'KYCRecord', True),
    ('drafts', 'Draft', True),
]


class Command(BaseCommand):
    help = (
        'Associate all existing ERP records with a default Tenant and Company. '
        'Safe to run multiple times — skips records that already have a tenant.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-slug',
            default='default',
            help='Slug of the default tenant to create/use (default: "default")',
        )
        parser.add_argument(
            '--tenant-name',
            default='Default Tenant',
            help='Name of the default tenant to create/use (default: "Default Tenant")',
        )
        parser.add_argument(
            '--company-name',
            default='Default Company',
            help='Name of the default company to create/use (default: "Default Company")',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from django.apps import apps as django_apps
        from core_tenants.models import Tenant, Company

        dry_run = options['dry_run']
        tenant_slug = options['tenant_slug']
        tenant_name = options['tenant_name']
        company_name = options['company_name']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be saved.'))

        # ── Step 1: Get or create Default Tenant ──────────────────────────────
        self.stdout.write(f'\nResolving default tenant (slug={tenant_slug!r})...')
        tenant, tenant_created = Tenant.objects.get_or_create(
            slug=tenant_slug,
            defaults={'name': tenant_name, 'is_active': True},
        )
        if tenant_created:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Created Tenant: {tenant.name} (slug={tenant.slug})'))
        else:
            self.stdout.write(f'  -> Using existing Tenant: {tenant.name} (slug={tenant.slug})')

        # ── Step 2: Get or create Default Company ─────────────────────────────
        self.stdout.write(f'\nResolving default company (name={company_name!r})...')
        company, company_created = Company.objects.get_or_create(
            tenant=tenant,
            name=company_name,
            defaults={'is_active': True},
        )
        if company_created:
            self.stdout.write(self.style.SUCCESS(f'  [OK] Created Company: {company.name}'))
        else:
            self.stdout.write(f'  -> Using existing Company: {company.name}')

        # ── Step 3: Associate all unscoped records ────────────────────────────
        self.stdout.write('\nAssociating existing records...\n')
        total_updated = 0

        for app_label, model_name, needs_company in APPS_AND_MODELS:
            try:
                Model = django_apps.get_model(app_label, model_name)
            except LookupError:
                self.stdout.write(
                    self.style.WARNING(f'  SKIP {app_label}.{model_name} — model not found')
                )
                continue

            # Use unscoped_objects to bypass auto-filtering
            manager = getattr(Model, 'unscoped_objects', Model.objects)

            # Check which records lack a tenant
            try:
                unscoped_qs = manager.filter(tenant__isnull=True)
                count = unscoped_qs.count()
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f'  SKIP {app_label}.{model_name} — field not yet migrated ({exc})'
                    )
                )
                continue

            if count == 0:
                self.stdout.write(f'  [OK] {app_label}.{model_name}: already associated (0 unscoped)')
                continue

            self.stdout.write(
                f'  -> {app_label}.{model_name}: {count} record(s) to associate'
            )

            if not dry_run:
                update_fields = {'tenant': tenant}
                if needs_company:
                    update_fields['company'] = company
                updated = unscoped_qs.update(**update_fields)
                total_updated += updated
                self.stdout.write(
                    self.style.SUCCESS(f'    [OK] Updated {updated} record(s)')
                )
            else:
                total_updated += count

        # ── Step 4: Summary ───────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 60)
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN complete. Would update ~{total_updated} record(s).'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Migration complete. {total_updated} record(s) associated with '
                    f'Tenant "{tenant.name}" / Company "{company.name}".'
                )
            )
        self.stdout.write('=' * 60)
