from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0019_add_stage_fields_to_die_inventory'),
    ]

    operations = [
        migrations.AddField(
            model_name='dieinventoryitem',
            name='sku_qty_per_piece',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='{"SKU1": 2, "SKU2": 4} — dies needed per piece of each master SKU',
            ),
        ),
    ]
