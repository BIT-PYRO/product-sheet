from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0014_rename_setting_to_hand_setting'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='designer_skus',
            field=models.JSONField(blank=True, default=list, help_text='List of all designer SKUs linked to this master SKU'),
        ),
    ]
