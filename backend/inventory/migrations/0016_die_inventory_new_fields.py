from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0015_alter_issuerequest_inventory_type_dieinventoryitem_and_more'),
    ]

    operations = [
        # ── DieInventoryItem ────────────────────────────────────────────────
        migrations.RenameField(
            model_name='dieinventoryitem',
            old_name='wax_setting',
            new_name='wax_setting_qty',
        ),
        migrations.RenameField(
            model_name='dieinventoryitem',
            old_name='casting',
            new_name='casting_qty',
        ),
        migrations.AddField(
            model_name='dieinventoryitem',
            name='wax_piece_qty',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='dieinventoryitem',
            name='wax_piece_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dieinventoryitem',
            name='wax_setting_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dieinventoryitem',
            name='casting_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),

        # ── DieTransaction ──────────────────────────────────────────────────
        migrations.RenameField(
            model_name='dietransaction',
            old_name='wax_setting',
            new_name='wax_setting_qty',
        ),
        migrations.RenameField(
            model_name='dietransaction',
            old_name='casting',
            new_name='casting_qty',
        ),
        migrations.AddField(
            model_name='dietransaction',
            name='wax_piece_qty',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='dietransaction',
            name='wax_piece_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietransaction',
            name='wax_setting_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='dietransaction',
            name='casting_location',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
