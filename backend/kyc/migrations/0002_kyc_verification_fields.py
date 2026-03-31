from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("kyc", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="kycrecord",
            name="aadhaar_number",
            field=models.CharField(blank=True, default='', max_length=12),
        ),
        migrations.AddField(
            model_name="kycrecord",
            name="pan_number",
            field=models.CharField(blank=True, default='', max_length=10),
        ),
        migrations.AddField(
            model_name="kycrecord",
            name="gst_number",
            field=models.CharField(blank=True, default='', max_length=15),
        ),
        migrations.AddField(
            model_name="kycrecord",
            name="aadhaar_status",
            field=models.CharField(
                choices=[
                    ('not_provided', 'Not Provided'),
                    ('format_invalid', 'Format Invalid'),
                    ('format_ok', 'Format OK (Unverified)'),
                    ('verified', 'Verified'),
                ],
                default='not_provided',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="kycrecord",
            name="pan_status",
            field=models.CharField(
                choices=[
                    ('not_provided', 'Not Provided'),
                    ('format_invalid', 'Format Invalid'),
                    ('format_ok', 'Format OK (Unverified)'),
                    ('verified', 'Verified'),
                ],
                default='not_provided',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="kycrecord",
            name="gst_status",
            field=models.CharField(
                choices=[
                    ('not_provided', 'Not Provided'),
                    ('format_invalid', 'Format Invalid'),
                    ('format_ok', 'Format OK (Unverified)'),
                    ('verified', 'Verified'),
                ],
                default='not_provided',
                max_length=20,
            ),
        ),
    ]
