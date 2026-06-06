from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0008_rename_design_code_master_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='designersheet',
            name='plating_entries',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
