from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0011_rename_master_sku_to_motive_sku'),
    ]

    operations = [
        # ── Step 1: Rename columns ────────────────────────────────────────────
        migrations.RenameField(
            model_name='designersheet',
            old_name='die_code',
            new_name='total_die_code',
        ),
        migrations.RenameField(
            model_name='designersheet',
            old_name='mold_qty_per_die',
            new_name='total_mold_qty_per_die',
        ),
        migrations.RenameField(
            model_name='designersheet',
            old_name='cpx_dead_weight',
            new_name='total_cpx_dead_weight',
        ),
        # ── Step 2: Cast to DECIMAL in the DB (coerce bad text to NULL) ───────
        migrations.RunSQL(
            sql="""
                ALTER TABLE designers_designersheet ALTER COLUMN total_die_code DROP NOT NULL;
                ALTER TABLE designers_designersheet ALTER COLUMN total_mold_qty_per_die DROP NOT NULL;
                ALTER TABLE designers_designersheet ALTER COLUMN total_cpx_dead_weight DROP NOT NULL;
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_die_code TYPE DECIMAL(12,4)
                    USING CASE
                        WHEN total_die_code ~ '^[0-9]+(\\.[0-9]+)?$' THEN total_die_code::DECIMAL(12,4)
                        ELSE NULL
                    END;
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_mold_qty_per_die TYPE DECIMAL(12,4)
                    USING CASE
                        WHEN total_mold_qty_per_die ~ '^[0-9]+(\\.[0-9]+)?$' THEN total_mold_qty_per_die::DECIMAL(12,4)
                        ELSE NULL
                    END;
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_cpx_dead_weight TYPE DECIMAL(12,4)
                    USING CASE
                        WHEN total_cpx_dead_weight ~ '^[0-9]+(\\.[0-9]+)?$' THEN total_cpx_dead_weight::DECIMAL(12,4)
                        ELSE NULL
                    END;
            """,
            reverse_sql="""
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_die_code TYPE VARCHAR(120)
                    USING COALESCE(total_die_code::TEXT, '');
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_mold_qty_per_die TYPE VARCHAR(60)
                    USING COALESCE(total_mold_qty_per_die::TEXT, '');
                ALTER TABLE designers_designersheet
                    ALTER COLUMN total_cpx_dead_weight TYPE VARCHAR(60)
                    USING COALESCE(total_cpx_dead_weight::TEXT, '');
            """,
        ),
        # ── Step 3: Update Django field definitions ───────────────────────────
        migrations.AlterField(
            model_name='designersheet',
            name='total_die_code',
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name='designersheet',
            name='total_mold_qty_per_die',
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name='designersheet',
            name='total_cpx_dead_weight',
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True),
        ),
    ]
