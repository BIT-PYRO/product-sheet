import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DeletionLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('deleted_at', models.DateTimeField(auto_now_add=True)),
                ('app_label', models.CharField(max_length=100)),
                ('model_name', models.CharField(max_length=100)),
                ('object_id', models.CharField(max_length=100)),
                ('object_repr', models.CharField(max_length=500)),
                ('serialized_data', models.JSONField(default=dict)),
                ('deleted_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='deletion_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-deleted_at'],
            },
        ),
        migrations.AddIndex(
            model_name='deletionlog',
            index=models.Index(fields=['app_label', 'model_name'], name='common_dele_app_lab_idx'),
        ),
    ]
