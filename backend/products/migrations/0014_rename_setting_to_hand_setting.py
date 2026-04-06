from django.db import migrations


def rename_setting_label(apps, schema_editor):
    TableColumnConfig = apps.get_model('products', 'TableColumnConfig')
    TableColumnConfig.objects.filter(
        table_type='live_stock',
        key='setting',
        label='Setting',
    ).update(label='Hand Setting')


def reverse_rename(apps, schema_editor):
    TableColumnConfig = apps.get_model('products', 'TableColumnConfig')
    TableColumnConfig.objects.filter(
        table_type='live_stock',
        key='setting',
        label='Hand Setting',
    ).update(label='Setting')


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_channel'),
    ]

    operations = [
        migrations.RunPython(rename_setting_label, reverse_rename),
    ]
