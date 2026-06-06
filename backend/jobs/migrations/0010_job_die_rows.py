from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0009_add_replaced_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='die_rows',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Die code rows for pre-casting stages [{master_sku, die_code, qty_per_piece, issued_qty}]',
            ),
        ),
    ]
