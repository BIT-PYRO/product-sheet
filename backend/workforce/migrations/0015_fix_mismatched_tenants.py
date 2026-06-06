# Generated manually to fix tenant mismatches between User and WorkforceMember
from django.db import migrations

def fix_tenant_mismatches(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    WorkforceMember = apps.get_model('workforce', 'WorkforceMember')

    # Update any WorkforceMember where the tenant doesn't match the corresponding User's tenant
    for member in WorkforceMember.objects.exclude(email='').exclude(email__isnull=True):
        user = User.objects.filter(email__iexact=member.email).first()
        if user and user.tenant_id != member.tenant_id:
            member.tenant_id = user.tenant_id
            member.save(update_fields=['tenant'])

def reverse_fix(apps, schema_editor):
    pass  # We don't want to revert fixing the data corruption

class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0014_alter_workforcemember_company_and_more'),
        ('accounts', '0001_initial'),  # Ensures User model is available
    ]

    operations = [
        migrations.RunPython(fix_tenant_mismatches, reverse_fix),
    ]
