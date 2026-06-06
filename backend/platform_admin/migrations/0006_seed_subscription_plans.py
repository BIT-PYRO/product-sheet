from django.db import migrations

def seed_subscription_plans(apps, schema_editor):
    Plan = apps.get_model('saas_billing', 'Plan')
    Feature = apps.get_model('platform_admin', 'Feature')
    PlanFeature = apps.get_model('platform_admin', 'PlanFeature')

    # Ensure plans exist
    starter, _ = Plan.objects.get_or_create(name='Starter Plan', defaults={'code': 'STARTER', 'description': 'Essential features for small teams'})
    growth, _ = Plan.objects.get_or_create(name='Growth Plan', defaults={'code': 'GROWTH', 'description': 'Advanced features for growing businesses'})
    professional, _ = Plan.objects.get_or_create(name='Professional Plan', defaults={'code': 'PROFESSIONAL', 'description': 'Comprehensive tools for established companies'})
    enterprise, _ = Plan.objects.get_or_create(name='Enterprise Plan', defaults={'code': 'ENTERPRISE', 'description': 'Full suite with all capabilities'})

    starter_features = {
        'product-sheet', 'master-product-sheet', 'enrol-customer', 
        'master-customer-sheet', 'drafts', 'my-desk'
    }
    
    growth_features = starter_features.union({
        'inventory', 'master-inventory-sheet', 'orders', 
        'enrol-workforce', 'master-workforce-sheet', 
        'create-generic-job', 'master-job-sheet'
    })
    
    professional_features = growth_features.union({
        'hr-section', 'accountancy'
    })

    # Get all features
    all_features = Feature.objects.all()
    
    for feature in all_features:
        # Seed Starter
        PlanFeature.objects.update_or_create(
            plan=starter, feature=feature,
            defaults={'is_enabled': feature.code in starter_features}
        )
        # Seed Growth
        PlanFeature.objects.update_or_create(
            plan=growth, feature=feature,
            defaults={'is_enabled': feature.code in growth_features}
        )
        # Seed Professional
        PlanFeature.objects.update_or_create(
            plan=professional, feature=feature,
            defaults={'is_enabled': feature.code in professional_features}
        )
        # Seed Enterprise
        PlanFeature.objects.update_or_create(
            plan=enterprise, feature=feature,
            defaults={'is_enabled': True}
        )

def reverse_seed_subscription_plans(apps, schema_editor):
    Plan = apps.get_model('saas_billing', 'Plan')
    PlanFeature = apps.get_model('platform_admin', 'PlanFeature')
    
    # Do not delete Starter, just delete the new ones
    Plan.objects.filter(code__in=['GROWTH', 'PROFESSIONAL', 'ENTERPRISE']).delete()
    # Or to be safe, just clear out PlanFeature for those plans
    PlanFeature.objects.filter(plan__code__in=['GROWTH', 'PROFESSIONAL', 'ENTERPRISE']).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('platform_admin', '0005_seed_missing_features'),
        ('saas_billing', '0003_upgraderequestevent'),
    ]

    operations = [
        migrations.RunPython(seed_subscription_plans, reverse_seed_subscription_plans),
    ]
