from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_customer_address_order_customer_city_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="order_source",
            field=models.CharField(
                choices=[
                    ("custom", "Custom"),
                    ("picklist", "Picklist"),
                    ("shopify", "Shopify"),
                    ("sample", "Sample"),
                ],
                default="custom",
                help_text="Origin of the order: custom, picklist, shopify, or sample",
                max_length=20,
            ),
        ),
    ]
