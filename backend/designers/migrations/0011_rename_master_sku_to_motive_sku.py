from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('designers', '0010_alter_designersheet_sku'),
    ]

    operations = [
        migrations.RenameField(
            model_name='designersheet',
            old_name='master_sku',
            new_name='motive_sku',
        ),
    ]
