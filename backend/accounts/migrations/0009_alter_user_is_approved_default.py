from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_alter_emailotp_otp'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='is_approved',
            field=models.BooleanField(
                default=False,
                help_text='Approved users have full access. Unapproved users can only access their Profile page.',
            ),
        ),
    ]
