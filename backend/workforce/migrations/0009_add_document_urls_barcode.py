from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		('workforce', '0008_add_profile_photo_url'),
	]

	operations = [
		migrations.AddField(
			model_name='workforcemember',
			name='aadhaar_url',
			field=models.URLField(blank=True, max_length=500),
		),
		migrations.AddField(
			model_name='workforcemember',
			name='pan_url',
			field=models.URLField(blank=True, max_length=500),
		),
		migrations.AddField(
			model_name='workforcemember',
			name='barcode_number',
			field=models.CharField(blank=True, db_index=True, max_length=50, null=True, unique=True),
		),
	]
