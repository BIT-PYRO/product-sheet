from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0012_rename_die_mold_cpx_to_total_decimal'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='designersheet',
            name='design_motive_size',
        ),
        migrations.RemoveField(
            model_name='designersheet',
            name='total_design_measurements',
        ),
        migrations.AddField(
            model_name='designersheet',
            name='total_design_measurements',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
