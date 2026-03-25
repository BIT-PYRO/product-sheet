from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_alter_product_category'),
    ]

    operations = [
        # Step 1: replace any empty/null/non-JSON text values with '[]' so the
        # column cast to jsonb does not fail on existing rows.
        migrations.RunSQL(
            sql="""
                UPDATE products_product
                SET images = '[]'
                WHERE images IS NULL
                   OR images = ''
                   OR images !~ '^\\s*[\\[{]';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Step 2: now it is safe to change the column type to jsonb.
        migrations.AlterField(
            model_name='product',
            name='images',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
