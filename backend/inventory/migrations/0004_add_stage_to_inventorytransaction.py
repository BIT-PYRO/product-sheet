from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_picklistgroup_picklistitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventorytransaction',
            name='stage',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
    ]
