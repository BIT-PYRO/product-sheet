from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0005_alter_job_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="voucher_no",
            field=models.CharField(blank=True, default='', help_text='e.g. JJ-01', max_length=30),
        ),
        migrations.AddField(
            model_name="job",
            name="voucher_type",
            field=models.CharField(
                blank=True,
                choices=[('New', 'New'), ('Re-Issue', 'Re-Issue')],
                default='New',
                help_text='New or Re-Issue voucher',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="dept_from",
            field=models.CharField(blank=True, default='', help_text='Source department', max_length=100),
        ),
        migrations.AddField(
            model_name="job",
            name="dept_to",
            field=models.CharField(blank=True, default='', help_text='Destination department', max_length=100),
        ),
        migrations.AddField(
            model_name="job",
            name="material_rows",
            field=models.JSONField(blank=True, default=list, help_text='Issued material rows from SKU table'),
        ),
        migrations.AddField(
            model_name="job",
            name="stone_rows",
            field=models.JSONField(blank=True, default=list, help_text='Stone issuance rows'),
        ),
        migrations.AddField(
            model_name="job",
            name="die_weight_rows",
            field=models.JSONField(blank=True, default=list, help_text='Die/findings rows'),
        ),
    ]
