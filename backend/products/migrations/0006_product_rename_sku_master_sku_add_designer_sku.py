from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_alter_product_images'),
    ]

    operations = [
        # 1. Drop the old (non-unique) master_sku reference field first
        migrations.RemoveField(
            model_name='product',
            name='master_sku',
        ),
        # 2. Rename the unique sku identifier to master_sku
        migrations.RenameField(
            model_name='product',
            old_name='sku',
            new_name='master_sku',
        ),
        # 3. Add the new designer_sku field
        migrations.AddField(
            model_name='product',
            name='designer_sku',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
    ]
