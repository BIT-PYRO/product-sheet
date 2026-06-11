# Generated manually

import django.db.models.deletion
from django.db import migrations, models


def add_is_email_verified_if_not_exists(apps, schema_editor):
    from accounts.models import User
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name = 'accounts_user' AND column_name = 'is_email_verified';
        """)
        exists = cursor.fetchone()[0] > 0
    
    if not exists:
        field = User._meta.get_field('is_email_verified')
        schema_editor.add_field(User, field)


def reverse_add_field(apps, schema_editor):
    from accounts.models import User
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name = 'accounts_user' AND column_name = 'is_email_verified';
        """)
        exists = cursor.fetchone()[0] > 0
    if exists:
        field = User._meta.get_field('is_email_verified')
        schema_editor.remove_field(User, field)


def create_verification_token_table_if_not_exists(apps, schema_editor):
    from accounts.models import EmailVerificationToken
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_name = 'accounts_emailverificationtoken';
        """)
        exists = cursor.fetchone()[0] > 0
        
    if not exists:
        schema_editor.create_model(EmailVerificationToken)


def reverse_create_model(apps, schema_editor):
    from accounts.models import EmailVerificationToken
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_name = 'accounts_emailverificationtoken';
        """)
        exists = cursor.fetchone()[0] > 0
    if exists:
        schema_editor.delete_model(EmailVerificationToken)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_apikey_tenant'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='user',
                    name='is_email_verified',
                    field=models.BooleanField(default=False),
                ),
                migrations.CreateModel(
                    name='EmailVerificationToken',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('token', models.CharField(max_length=64, unique=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('expires_at', models.DateTimeField()),
                        ('used', models.BooleanField(default=False)),
                        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='verification_tokens', to='accounts.user')),
                    ],
                    options={
                        'ordering': ['-created_at'],
                    },
                ),
            ],
            database_operations=[
                migrations.RunPython(add_is_email_verified_if_not_exists, reverse_add_field),
                migrations.RunPython(create_verification_token_table_if_not_exists, reverse_create_model),
            ],
        ),
    ]
