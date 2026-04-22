from django.db import migrations, models


def copy_old_to_new(apps, schema_editor):
    ToolItem = apps.get_model('inventory', 'ToolItem')
    for tool in ToolItem.objects.all():
        tool.new_qty = tool.quantity
        tool.new_unit = tool.unit
        tool.new_location = tool.location
        tool.min_required_stock = tool.min_level
        tool.save(update_fields=['new_qty', 'new_unit', 'new_location', 'min_required_stock'])


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0017_add_min_level_to_stone_item'),
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='toolitem',
            name='new_qty',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='new_unit',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='new_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='used_unit',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='used_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='in_use_qty',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='in_use_unit',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='toolitem',
            name='min_required_stock',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        # Copy old data into new fields
        migrations.RunPython(copy_old_to_new, migrations.RunPython.noop),
        # Remove old fields
        migrations.RemoveField(
            model_name='toolitem',
            name='quantity',
        ),
        migrations.RemoveField(
            model_name='toolitem',
            name='unit',
        ),
        migrations.RemoveField(
            model_name='toolitem',
            name='location',
        ),
        migrations.RemoveField(
            model_name='toolitem',
            name='min_level',
        ),
    ]
