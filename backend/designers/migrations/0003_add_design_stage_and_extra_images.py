# Generated manually on 2026-03-23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0002_add_designer_sheet_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='designersheet',
            name='designer_image_2',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='designersheet',
            name='designer_image_3',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='designersheet',
            name='design_stage',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
