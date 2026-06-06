from django.db import migrations

def seed_industry_workflows(apps, schema_editor):
    Industry = apps.get_model('industries', 'Industry')
    IndustryWorkflow = apps.get_model('industries', 'IndustryWorkflow')

    workflows_data = {
        'Jewellery': ['Design', 'Approval', 'Manufacturing', 'QC', 'Ready'],
        'Fashion': ['Design', 'Sampling', 'Production', 'QC', 'Ready'],
        'Perfume': ['Formula', 'Batch Production', 'Packaging', 'QC', 'Ready'],
        'Home Decor': ['Design', 'Manufacturing', 'Finishing', 'QC', 'Ready'],
        'Generic Commerce': ['Draft', 'Active', 'Fulfilled', 'Closed'],
    }

    for industry_name, stages in workflows_data.items():
        try:
            industry = Industry.objects.get(name=industry_name)
            stages_json = [{'code': s.lower().replace(' ', '_'), 'label': s} for s in stages]
            IndustryWorkflow.objects.update_or_create(
                industry=industry,
                workflow_type='job_pipeline',
                defaults={'stages': stages_json}
            )
        except Industry.DoesNotExist:
            print(f"Warning: Industry '{industry_name}' does not exist. Skipping workflows.")

def reverse_industry_workflows(apps, schema_editor):
    IndustryWorkflow = apps.get_model('industries', 'IndustryWorkflow')
    IndustryWorkflow.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('industries', '0003_seed_all_industries'),
    ]

    operations = [
        migrations.RunPython(seed_industry_workflows, reverse_industry_workflows),
    ]
