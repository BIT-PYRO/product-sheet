import re

with open('accounting/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# ── Patch IncomeCreateView ─────────────────────────────────────────
income_old = re.compile(
    r'class IncomeCreateView\(APIView\):.*?'
    r'return Response\(\{.success.: False, .message.: str\(e\)\}, status=400\)',
    re.DOTALL
)

income_new = '''class IncomeCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.db import transaction

        amount = float(request.data.get('amount', 0))
        account_id = request.data.get('account')
        date = request.data.get('date')
        description = request.data.get('description', '')
        department = (request.data.get('department') or '').strip()
        receipt = request.FILES.get('receipt')

        if amount <= 0:
            return Response({'success': False, 'message': 'Amount must be positive'}, status=400)
        if not account_id or not date:
            return Response({'success': False, 'message': 'Missing required fields'}, status=400)
        if not department:
            return Response({'success': False, 'message': 'Department is required'}, status=400)

        try:
            if isinstance(account_id, str) and not str(account_id).isdigit():
                account, _ = Account.objects.get_or_create(name=account_id, defaults={'type': Account.AccountType.BANK})
            else:
                account = Account.objects.get(pk=account_id)
        except Account.DoesNotExist:
            return Response({'success': False, 'message': 'Invalid account'}, status=400)

        ledger_name = f'{department} Income'
        category, _ = Ledger.objects.get_or_create(name=ledger_name, defaults={'type': Ledger.LedgerType.INCOME})

        try:
            with transaction.atomic():
                account_ledger = account.get_or_create_ledger()

                journal_entry = JournalEntry.objects.create(
                    date=date,
                    description=f'Income: {description}'
                )
                JournalItem.objects.create(
                    entry=journal_entry, ledger=category, debit=0, credit=amount,
                    notes=description, department=department
                )
                JournalItem.objects.create(
                    entry=journal_entry, ledger=account_ledger, debit=amount, credit=0,
                    notes=description, department=department
                )

                income = Income.objects.create(
                    amount=amount, category=category, account=account,
                    date=date, description=description, department=department,
                    receipt=receipt, journal_entry=journal_entry
                )

            return api_success({'income_id': income.pk}, message='Income recorded successfully.', status_code=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)'''

m = income_old.search(content)
if m:
    content = content[:m.start()] + income_new + content[m.end():]
    print('IncomeCreateView patched OK')
else:
    print('ERROR: IncomeCreateView not found')

# ── Patch ExpenseCreateView ────────────────────────────────────────
expense_old = re.compile(
    r'class ExpenseCreateView\(APIView\):.*?'
    r'return Response\(\{.success.: False, .message.: str\(e\)\}, status=400\)',
    re.DOTALL
)

expense_new = '''class ExpenseCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.db import transaction

        amount = float(request.data.get('amount', 0))
        account_id = request.data.get('account')
        date = request.data.get('date')
        description = request.data.get('description', '')
        department = (request.data.get('department') or '').strip()
        receipt = request.FILES.get('receipt')

        if amount <= 0:
            return Response({'success': False, 'message': 'Amount must be positive'}, status=400)
        if not account_id or not date:
            return Response({'success': False, 'message': 'Missing required fields'}, status=400)
        if not department:
            return Response({'success': False, 'message': 'Department is required'}, status=400)

        try:
            if isinstance(account_id, str) and not str(account_id).isdigit():
                account, _ = Account.objects.get_or_create(name=account_id, defaults={'type': Account.AccountType.BANK})
            else:
                account = Account.objects.get(pk=account_id)
        except Account.DoesNotExist:
            return Response({'success': False, 'message': 'Invalid account'}, status=400)

        ledger_name = f'{department} Expense'
        category, _ = Ledger.objects.get_or_create(name=ledger_name, defaults={'type': Ledger.LedgerType.EXPENSE})

        try:
            with transaction.atomic():
                account_ledger = account.get_or_create_ledger()

                journal_entry = JournalEntry.objects.create(
                    date=date,
                    description=f'Expense: {description}'
                )
                JournalItem.objects.create(
                    entry=journal_entry, ledger=category, debit=amount, credit=0,
                    notes=description, department=department
                )
                JournalItem.objects.create(
                    entry=journal_entry, ledger=account_ledger, debit=0, credit=amount,
                    notes=description, department=department
                )

                expense = Expense.objects.create(
                    amount=amount, category=category, account=account,
                    date=date, description=description, department=department,
                    receipt=receipt, journal_entry=journal_entry
                )

            return api_success({'expense_id': expense.pk}, message='Expense created successfully.', status_code=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)'''

m2 = expense_old.search(content)
if m2:
    content = content[:m2.start()] + expense_new + content[m2.end():]
    print('ExpenseCreateView patched OK')
else:
    print('ERROR: ExpenseCreateView not found')

with open('accounting/views.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('File written.')
