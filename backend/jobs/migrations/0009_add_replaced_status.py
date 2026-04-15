from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0008_add_partially_complete_and_receive_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='approval_status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('in_process', 'In Process'),
                    ('awaiting', 'Awaiting'),
                    ('partially_complete', 'Partially Completed'),
                    ('completed', 'Completed'),
                    ('replaced', 'Replaced'),
                ],
                default='pending',
                help_text='Voucher approval workflow status',
                max_length=30,
            ),
        ),
    ]
