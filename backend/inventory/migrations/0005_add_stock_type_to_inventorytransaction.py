from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_add_stage_to_inventorytransaction'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventorytransaction',
            name='stock_type',
            field=models.CharField(
                blank=True,
                choices=[('current', 'Current Stock'), ('min', 'Minimum Suggested'), ('wip', 'WIP')],
                default='current',
                max_length=20,
            ),
        ),
    ]
