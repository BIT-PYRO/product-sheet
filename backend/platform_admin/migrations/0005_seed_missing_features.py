"""
Migration: 0005_seed_missing_features
Adds the 6 missing modules (Drafts, My Desk, Master Designer Sheet,
Designer Sheet, Master Finding Sheet, Finding Sheet) as Feature rows
and creates PlanFeature rows for every existing Plan so they appear on
the dashboard and are manageable from Django Admin.
"""
from django.db import migrations


def seed_missing_features(apps, schema_editor):
    FeatureGroup = apps.get_model('platform_admin', 'FeatureGroup')
    Feature = apps.get_model('platform_admin', 'Feature')
    PlanFeature = apps.get_model('platform_admin', 'PlanFeature')
    Plan = apps.get_model('saas_billing', 'Plan')

    # ── ensure the canonical group exists ────────────────────────────────────
    group, _ = FeatureGroup.objects.get_or_create(
        name='Core Platform',
        defaults={'order': 0},
    )

    # ── features to add (code, name, description, category, route, min_plan) ─
    new_features = [
        {
            'code': 'drafts',
            'name': 'Drafts',
            'description': 'Save and manage work-in-progress drafts before finalising orders or jobs.',
            'category': 'Operations',
            'route': '/drafts',
            'min_plan_name': 'Starter',
            'is_active': True,
        },
        {
            'code': 'my-desk',
            'name': 'My Desk',
            'description': 'Personal workspace with task lists, notes and calendar integration.',
            'category': 'Productivity',
            'route': '/mydesk',
            'min_plan_name': 'Starter',
            'is_active': True,
        },
        {
            'code': 'master-designer-sheet',
            'name': 'Master Designer Sheet',
            'description': 'Consolidated view of all designer assignments and their production status.',
            'category': 'Design',
            'route': '/master-designer-sheet',
            'min_plan_name': 'Business',
            'is_active': True,
        },
        {
            'code': 'designer-sheet',
            'name': 'Designer Sheet',
            'description': 'Create and track individual designer job sheets and deliverables.',
            'category': 'Design',
            'route': '/designer-sheet',
            'min_plan_name': 'Business',
            'is_active': True,
        },
        {
            'code': 'master-finding-sheet',
            'name': 'Master Finding Sheet',
            'description': 'Overview of all findings inventory, entries and reconciliation status.',
            'category': 'Inventory',
            'route': '/finding-entry',
            'min_plan_name': 'Business',
            'is_active': True,
        },
        {
            'code': 'finding-sheet',
            'name': 'Finding Sheet',
            'description': 'Record and manage stone / finding inventory movements.',
            'category': 'Inventory',
            'route': '/finding-sheet',
            'min_plan_name': 'Business',
            'is_active': True,
        },
    ]

    created_features = []
    for spec in new_features:
        feature, created = Feature.objects.get_or_create(
            code=spec['code'],
            defaults={
                'group': group,
                'name': spec['name'],
                'description': spec['description'],
                'category': spec['category'],
                'route': spec['route'],
                'min_plan_name': spec['min_plan_name'],
                'is_active': spec['is_active'],
                'is_deprecated': False,
                'is_beta': False,
            },
        )
        if not created:
            # Update fields that may have drifted
            feature.name = spec['name']
            feature.description = spec['description']
            feature.category = spec['category']
            feature.route = spec['route']
            feature.min_plan_name = spec['min_plan_name']
            feature.is_active = spec['is_active']
            feature.save()
        created_features.append(feature)

    # ── create PlanFeature rows for every existing Plan ───────────────────────
    # Starter gets Drafts + MyDesk enabled; the Design/Inventory modules disabled.
    starter_enabled = {'drafts', 'my-desk'}

    for plan in Plan.objects.all():
        for feature in created_features:
            enabled = feature.code in starter_enabled if plan.code == 'STARTER' else False
            PlanFeature.objects.get_or_create(
                plan=plan,
                feature=feature,
                defaults={'is_enabled': enabled},
            )


def reverse_seed_missing_features(apps, schema_editor):
    """Remove only the features added in this migration (safe no-op if rows are gone)."""
    Feature = apps.get_model('platform_admin', 'Feature')
    codes = ['drafts', 'my-desk', 'master-designer-sheet', 'designer-sheet',
             'master-finding-sheet', 'finding-sheet']
    Feature.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('platform_admin', '0004_feature_industries'),
        ('saas_billing', '0003_upgraderequestevent'),
    ]

    operations = [
        migrations.RunPython(
            seed_missing_features,
            reverse_code=reverse_seed_missing_features,
        ),
    ]
