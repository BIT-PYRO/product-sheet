from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_seed_role_default_permissions'),
    ]

    operations = [
        # 1. Widen the role field and drop choices + unique constraint
        migrations.AlterField(
            model_name='roledefaultpermissions',
            name='role',
            field=models.CharField(max_length=100),
        ),
        # 2. Add department field
        migrations.AddField(
            model_name='roledefaultpermissions',
            name='department',
            field=models.CharField(max_length=100, default=''),
        ),
        # 3. Replace unique constraint on role with unique_together (role, department)
        migrations.AlterUniqueTogether(
            name='roledefaultpermissions',
            unique_together={('role', 'department')},
        ),
    ]
