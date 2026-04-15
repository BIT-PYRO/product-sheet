from django.db import migrations


def add_apoorva_workforce(apps, schema_editor):
    WorkforceMember = apps.get_model('workforce', 'WorkforceMember')
    # Create WorkforceMember record for the main superuser account if it doesn't exist yet
    if not WorkforceMember.objects.filter(email='apoorva.janki@gmail.com').exists():
        WorkforceMember.objects.create(
            full_name='Apoorva Dixit',
            email='apoorva.janki@gmail.com',
            designation='Superuser',
        )


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0006_workforcemember_external_id'),
    ]

    operations = [
        migrations.RunPython(add_apoorva_workforce, migrations.RunPython.noop),
    ]
