from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_order_picklist_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='order_type',
            field=models.CharField(blank=True, default='JANKI', max_length=100),
        ),
        migrations.AddField(
            model_name='order',
            name='units',
            field=models.CharField(blank=True, default='Pieces', max_length=50),
        ),
    ]
