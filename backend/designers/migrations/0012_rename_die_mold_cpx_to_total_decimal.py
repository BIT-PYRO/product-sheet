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
        # Removed PostgreSQL-specific RunSQL since we are using SQLite.
        # Django's AlterField below will handle the schema change.
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
