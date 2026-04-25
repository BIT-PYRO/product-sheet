from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0010_increase_url_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='workforcemember',
            name='date_of_joining',
            field=models.DateField(blank=True, null=True),
        ),
    ]
