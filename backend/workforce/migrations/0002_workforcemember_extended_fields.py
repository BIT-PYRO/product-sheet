# Generated migration for extended WorkforceMember fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workforcemember',
            name='whatsapp',
            field=models.CharField(blank=True, max_length=20, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='email',
            field=models.EmailField(blank=True, max_length=254, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='dob',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='gender',
            field=models.CharField(blank=True, max_length=20, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='department',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='current_address',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='permanent_address',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='gst_number',
            field=models.CharField(blank=True, max_length=20, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='current_location',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='first_language',
            field=models.CharField(blank=True, max_length=50, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='second_language',
            field=models.CharField(blank=True, max_length=50, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workforcemember',
            name='notes',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
    ]
