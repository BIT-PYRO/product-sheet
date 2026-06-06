import re

with open('accounting/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add department read + validation after "if not date:" check
old_validation = "        if not date:\n            return Response({'success': False, 'message': 'date is required'}, status=400)\n\n        try:\n            with transaction.atomic():"

new_validation = "        if not date:\n            return Response({'success': False, 'message': 'date is required'}, status=400)\n\n        department = (data.get('department') or '').strip()\n        if not department:\n            return Response({'success': False, 'message': 'Department is required'}, status=400)\n\n        try:\n            with transaction.atomic():"

if old_validation in content:
    content = content.replace(old_validation, new_validation, 1)
    print('Validation block patched OK')
else:
    print('Validation block NOT FOUND')

# 2. Add department to JournalItem.create calls inside outstanding (vendor_payee lines)
old_ji_rec = "                    JournalItem.objects.create(entry=journal, ledger=ar_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name)\n                    JournalItem.objects.create(entry=journal, ledger=sales_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name)"
new_ji_rec = "                    JournalItem.objects.create(entry=journal, ledger=ar_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name, department=department)\n                    JournalItem.objects.create(entry=journal, ledger=sales_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name, department=department)"

if old_ji_rec in content:
    content = content.replace(old_ji_rec, new_ji_rec, 1)
    print('Receivable JournalItems patched OK')
else:
    print('Receivable JournalItems NOT FOUND')

old_ji_pay = "                    JournalItem.objects.create(entry=journal, ledger=expense_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name)\n                    JournalItem.objects.create(entry=journal, ledger=ap_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name)"
new_ji_pay = "                    JournalItem.objects.create(entry=journal, ledger=expense_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name, department=department)\n                    JournalItem.objects.create(entry=journal, ledger=ap_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name, department=department)"

if old_ji_pay in content:
    content = content.replace(old_ji_pay, new_ji_pay, 1)
    print('Payable JournalItems patched OK')
else:
    print('Payable JournalItems NOT FOUND')

# 3. Remove the duplicate department extraction inside transaction (already patched before)
old_dup = "\n                department = (data.get('department') or '').strip()\n\n                outstanding = Outstanding.objects.create("
new_dup = "\n                outstanding = Outstanding.objects.create("

if old_dup in content:
    content = content.replace(old_dup, new_dup, 1)
    print('Removed duplicate department extraction OK')
else:
    print('No duplicate found (ok)')

with open('accounting/views.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
