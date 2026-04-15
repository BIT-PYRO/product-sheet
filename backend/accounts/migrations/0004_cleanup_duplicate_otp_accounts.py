"""
Migration: Clean up duplicate User accounts created by the old OTP login flow.

The old VerifyOTPView did get_or_create(username=email), which created a new
account with username == email even when a proper account with the same email
already existed (e.g. superusers whose username != email).

This migration:
1. Finds all users whose username looks like an email address (username contains '@')
2. For each such user, checks if there is ANOTHER user with the same email
3. If a proper account exists (with a different username), deletes the duplicate
   OTP-created account.
"""

from django.db import migrations


def cleanup_otp_duplicates(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # Find users whose username is an email (created by OTP flow)
    otp_style_users = User.objects.filter(username__contains='@')

    for otp_user in otp_style_users:
        email = otp_user.email or otp_user.username
        # Look for another account with the same email but a different username
        proper_account = User.objects.filter(email=email).exclude(pk=otp_user.pk).first()
        if proper_account is None:
            # No duplicate — this IS the real account, leave it alone
            continue
        # A proper account exists. The otp_user is the duplicate.
        # Only delete if the otp_user is NOT a superuser (safety check).
        if otp_user.is_superuser:
            # Both are superusers? Shouldn't happen, just skip.
            continue
        otp_user.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_set_kartik_superuser'),
    ]

    operations = [
        migrations.RunPython(cleanup_otp_duplicates, migrations.RunPython.noop),
    ]
