from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_alter_product_category'),
    ]

    operations = [
        # Step 1: replace any empty/null/non-JSON text values with '[]' so the
        # column cast to jsonb does not fail on existing rows.
        # Removed PostgreSQL-specific RunSQL (uses !~ regex operator).
        # We are using SQLite, and AlterField handles this sufficiently.
        # Step 2: now it is safe to change the column type to jsonb.
        migrations.AlterField(
            model_name='product',
            name='images',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
