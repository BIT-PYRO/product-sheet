from django.db import migrations


def seed_role_defaults(apps, schema_editor):
    RoleDefaultPermissions = apps.get_model('accounts', 'RoleDefaultPermissions')
    for role in ['admin', 'manager', 'staff']:
        RoleDefaultPermissions.objects.get_or_create(role=role, defaults={'permissions': {}})


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_roledefaultpermissions'),
    ]

    operations = [
        migrations.RunPython(seed_role_defaults, migrations.RunPython.noop),
    ]
