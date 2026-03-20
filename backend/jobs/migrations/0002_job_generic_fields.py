# Generated migration for Job model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='job_type',
            field=models.CharField(blank=True, help_text='Type of work (e.g., Electrical, AC Repair, etc.)', max_length=100),
        ),
        migrations.AddField(
            model_name='job',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='job',
            name='assignee_name',
            field=models.CharField(blank=True, help_text='Name of assignee for non-jewelry jobs', max_length=255),
        ),
        migrations.AddField(
            model_name='job',
            name='location',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='job',
            name='start_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='due_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='estimated_cost',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='priority',
            field=models.CharField(
                choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
                default='medium',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='job',
            name='urgency',
            field=models.CharField(
                choices=[('normal', 'Normal'), ('express', 'Express'), ('asap', 'ASAP')],
                default='normal',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='job',
            name='special_instructions',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='job',
            name='workers',
            field=models.JSONField(blank=True, default=list, help_text='List of workers assigned with roles'),
        ),
        migrations.AddField(
            model_name='job',
            name='materials',
            field=models.JSONField(blank=True, default=list, help_text='List of materials required'),
        ),
        migrations.AddField(
            model_name='job',
            name='tools',
            field=models.JSONField(blank=True, default=list, help_text='List of tools/equipment needed'),
        ),
        migrations.AlterField(
            model_name='job',
            name='product',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT, related_name='jobs', to='products.product'),
        ),
    ]
