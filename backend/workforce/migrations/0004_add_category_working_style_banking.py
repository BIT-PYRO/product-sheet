from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0003_add_designation_to_workforcemember'),
    ]

    operations = [
        migrations.AddField(
            model_name='workforcemember',
            name='category',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='working_style',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='account_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='bank_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='account_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='ifsc',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
