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
        migrations.RunSQL(
            sql="""
                UPDATE products_product
                SET stone_entries = CASE
                    WHEN (
                        COALESCE(stone_name, '') <> '' OR
                        COALESCE(stone_cut,  '') <> '' OR
                        COALESCE(stone_color,'') <> '' OR
                        COALESCE(stone_size, '') <> '' OR
                        COALESCE(stone_quantity, '') <> ''
                    )
                    THEN jsonb_build_array(jsonb_build_object(
                        'type',    COALESCE(stone_name, ''),
                        'species', '',
                        'variety', '',
                        'color',   COALESCE(stone_color, ''),
                        'cut',     COALESCE(stone_cut, ''),
                        'shape',   '',
                        'length',  '',
                        'width',   '',
                        'height',  '',
                        'qty',     COALESCE(stone_quantity, '')
                    ))
                    ELSE '[]'::jsonb
                END;
            """,
            reverse_sql="""
                UPDATE products_product
                SET
                    stone_name     = COALESCE(stone_entries->0->>'type', ''),
                    stone_cut      = COALESCE(stone_entries->0->>'cut', ''),
                    stone_color    = COALESCE(stone_entries->0->>'color', ''),
                    stone_size     = '',
                    stone_quantity = COALESCE(stone_entries->0->>'qty', '');
            """,
        ),
        migrations.RemoveField(model_name='product', name='stone_name'),
        migrations.RemoveField(model_name='product', name='stone_cut'),
        migrations.RemoveField(model_name='product', name='stone_color'),
        migrations.RemoveField(model_name='product', name='stone_size'),
        migrations.RemoveField(model_name='product', name='stone_quantity'),
    ]
