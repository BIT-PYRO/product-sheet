from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_order_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='picklist_number',
            field=models.IntegerField(blank=True, db_index=True, help_text='Picklist number this order was generated from', null=True),
        ),
    ]
