from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0007_add_designer_notes'),
    ]

    operations = [
        migrations.RenameField(
            model_name='designersheet',
            old_name='design_code',
            new_name='motive_code',
        ),
        migrations.RenameField(
            model_name='designersheet',
            old_name='master_number',
            new_name='master_sku',
        ),
    ]
