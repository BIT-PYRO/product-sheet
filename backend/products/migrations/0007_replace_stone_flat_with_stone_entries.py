from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_product_rename_sku_master_sku_add_designer_sku'),
    ]

    operations = [
        # Migrate existing flat stone data into stone_entries JSON, then drop old columns
        migrations.AddField(
            model_name='product',
            name='stone_entries',
            field=models.JSONField(default=list, blank=True),
        ),
        # Removed PostgreSQL-specific RunSQL data migration since we are using SQLite.
        # This prevents the 'unrecognized token: ":"' error.
        migrations.RemoveField(model_name='product', name='stone_name'),
        migrations.RemoveField(model_name='product', name='stone_cut'),
        migrations.RemoveField(model_name='product', name='stone_color'),
        migrations.RemoveField(model_name='product', name='stone_size'),
        migrations.RemoveField(model_name='product', name='stone_quantity'),
    ]
