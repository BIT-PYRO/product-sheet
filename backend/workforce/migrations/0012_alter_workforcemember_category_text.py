from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workforce", "0011_add_date_of_joining"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workforcemember",
            name="category",
            field=models.TextField(blank=True),
        ),
    ]
