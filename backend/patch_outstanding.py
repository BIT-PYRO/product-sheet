import re

with open('accounting/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Patch OutstandingListView.post to read department and save it
old = "outstanding = Outstanding.objects.create(\n                    type=o_type,\n                    party_name=party_name,\n                    amount=amount,\n                    linked_journal=journal,\n                    status=Outstanding.Status.PENDING,\n                    description=description,\n                    due_date=due_date,\n                )"

new = "department = (data.get('department') or '').strip()\n\n                outstanding = Outstanding.objects.create(\n                    type=o_type,\n                    party_name=party_name,\n                    amount=amount,\n                    linked_journal=journal,\n                    status=Outstanding.Status.PENDING,\n                    description=description,\n                    department=department,\n                    due_date=due_date,\n                )"

if old in content:
    content = content.replace(old, new, 1)
    print('OutstandingListView department patched OK')
else:
    # Try with different indentation
    print('Exact match not found, searching...')
    idx = content.find('outstanding = Outstanding.objects.create(')
    if idx >= 0:
        print(repr(content[idx:idx+300]))
    else:
        print('NOT FOUND at all')

with open('accounting/views.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
