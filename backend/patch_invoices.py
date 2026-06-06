import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Invoice, Outstanding

for inv in Invoice.objects.filter(status='pending'):
    if inv.outstanding and inv.outstanding.status == Outstanding.Status.PAID:
        inv.status = Invoice.Status.SETTLED
        inv.journal_entry = inv.outstanding.settlement_journal
        inv.save()
        print(f"Updated Invoice #{inv.id} to settled.")
print("Done")
