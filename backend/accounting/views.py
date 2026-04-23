from django.db.models import Sum

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.api import api_success

from .models import JournalItem, Ledger, Account, Expense, Income, JournalEntry
from .serializers import JournalEntryCreateSerializer, JournalEntrySerializer, LedgerSerializer, ExpenseSerializer, IncomeSerializer


class LedgerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = LedgerSerializer(Ledger.objects.all(), many=True)
        return api_success(serializer.data, message='Ledgers fetched successfully.')


class AccountListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = Account.objects.all()
        data = [{'id': a.pk, 'name': a.name, 'type': a.type} for a in accounts]
        return api_success(data, message='Accounts fetched successfully.')

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        acc_type = (request.data.get('type') or 'bank').strip()
        if not name:
            return Response({'success': False, 'message': 'Account name is required.'}, status=400)
        account, created = Account.objects.get_or_create(name=name, defaults={'type': acc_type})
        return api_success({'id': account.pk, 'name': account.name, 'type': account.type},
                          message=f'Account {"created" if created else "already exists"}.', status_code=201 if created else 200)


class ExpenseListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Expense.objects.all().select_related('category', 'account')
        # Optional date range filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        data = ExpenseSerializer(qs, many=True).data
        return api_success(data, message='Expenses fetched successfully.')


class IncomeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Income.objects.all().select_related('category', 'account')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        data = IncomeSerializer(qs, many=True).data
        return api_success(data, message='Income fetched successfully.')


class IncomeCreateView(APIView):
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
            return Response({'success': False, 'message': str(e)}, status=400)


class FinanceDashboardView(APIView):
    """Returns aggregated totals for income and expense, optionally filtered by date range."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        expense_qs = Expense.objects.all()
        income_qs = Income.objects.all()

        if date_from:
            expense_qs = expense_qs.filter(date__gte=date_from)
            income_qs = income_qs.filter(date__gte=date_from)
        if date_to:
            expense_qs = expense_qs.filter(date__lte=date_to)
            income_qs = income_qs.filter(date__lte=date_to)

        from django.db.models import Sum
        total_expense = float(expense_qs.aggregate(t=Sum('amount'))['t'] or 0)
        total_income = float(income_qs.aggregate(t=Sum('amount'))['t'] or 0)
        net = round(total_income - total_expense, 2)

        # Account-wise breakdown: all accounts that have any income or expense
        account_breakdown = []
        all_accounts = Account.objects.all()
        for acc in all_accounts:
            inc_total = float(income_qs.filter(account=acc).aggregate(t=Sum('amount'))['t'] or 0)
            exp_total = float(expense_qs.filter(account=acc).aggregate(t=Sum('amount'))['t'] or 0)
            if inc_total > 0 or exp_total > 0:
                account_breakdown.append({
                    'account_id': acc.pk,
                    'account_name': acc.name,
                    'account_type': acc.type,
                    'income_total': round(inc_total, 2),
                    'expense_total': round(exp_total, 2),
                    'net': round(inc_total - exp_total, 2),
                })

        return api_success({
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net': net,
            'account_breakdown': account_breakdown,
        }, message='Finance dashboard fetched.')


class ExpenseListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expenses = Expense.objects.all().select_related('category', 'account')
        data = ExpenseSerializer(expenses, many=True).data
        return api_success(data, message='Expenses fetched successfully.')


class ExpenseCreateView(APIView):
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
            return Response({'success': False, 'message': str(e)}, status=400)


class JournalCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import json
        from .models import JournalItemAttachment
        
        # request.data is a QueryDict for multipart/form-data.
        # Assigning a list to a QueryDict key corrupts it, so we extract to a normal dict.
        data = {}
        for key, value in request.data.items():
            data[key] = value
            
        items_str = data.get('items')
        if isinstance(items_str, str):
            try:
                parsed_items = json.loads(items_str)
                # Pre-process ledgers to create them if they don't exist
                for item in parsed_items:
                    ledger_val = item.get('ledger')
                    if isinstance(ledger_val, str) and not str(ledger_val).isdigit():
                        debit = float(item.get('debit', 0) or 0)
                        l_type = Ledger.LedgerType.EXPENSE if debit > 0 else Ledger.LedgerType.ASSET
                        ledger_obj, _ = Ledger.objects.get_or_create(name=ledger_val, defaults={'type': l_type})
                        item['ledger'] = ledger_obj.id
                data['items'] = parsed_items
            except json.JSONDecodeError:
                return Response({'success': False, 'message': 'Invalid items JSON'}, status=400)

        serializer = JournalEntryCreateSerializer(data=data, context={'request': request})
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'message': 'Invalid journal entry data.',
                    'errors': serializer.errors,
                },
                status=400,
            )

        entry = serializer.save()
        
        # After saving, the items are created. But how to link attachments?
        # The frontend sends `items` as a list where some are 'debit' and some are 'credit'.
        # We need to find the created JournalItem for each item in the data.
        # Since we bulk_create or create them in order, we can fetch them.
        created_items = list(entry.items.all().order_by('id')) # Assuming they were created in order
        
        # But wait, in the serializer we pop 'type'. The frontend passes type='debit' or 'credit'.
        # The serializer created them in the exact order of `data['items']`.
        # So created_items[i] corresponds to data['items'][i].
        # Frontend sends files as `debit_0_attachment_0`, `credit_1_attachment_0`, etc.
        # Where 0, 1 are indices IN THE DEBIT OR CREDIT LIST in the frontend!
        # Ah! The frontend maintains two separate lists: debitLines and creditLines.
        # And it concatenates them: [...buildLineData(debitLines, 'debit'), ...buildLineData(creditLines, 'credit')]
        # So we can just reconstruct that to figure out which item is which.
        
        debit_idx = 0
        credit_idx = 0
        
        for i, item_data in enumerate(data.get('items', [])):
            item_type = item_data.get('type')
            j_item = created_items[i]
            
            if item_type == 'debit':
                frontend_idx = debit_idx
                debit_idx += 1
            else:
                frontend_idx = credit_idx
                credit_idx += 1
                
            # Now look for files matching `{item_type}_{frontend_idx}_attachment_*`
            # e.g., debit_0_attachment_0
            file_keys = [k for k in request.FILES.keys() if k.startswith(f'{item_type}_{frontend_idx}_attachment_')]
            for key in file_keys:
                uploaded_file = request.FILES[key]
                JournalItemAttachment.objects.create(
                    journal_item=j_item,
                    file=uploaded_file,
                    name=uploaded_file.name
                )

        result_data = JournalEntrySerializer(entry).data
        return api_success(
            {**result_data, 'entry_id': entry.pk},
            message='Journal entry created.',
            status_code=201,
        )


class LedgerSummaryView(APIView):
    """Aggregate debit/credit totals per ledger from all journal items."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        data = [
            {
                'ledger_id': row['ledger__id'],
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'total_debit': str(row['total_debit']),
                'total_credit': str(row['total_credit']),
            }
            for row in summary
        ]

        return api_success(data, message='Ledger summary fetched successfully.')


class TrialBalanceView(APIView):
    """
    GET /api/accounting/trial-balance/

    Computes the trial balance dynamically from JournalItems.
    Each ledger's net balance (total_debit - total_credit) is placed
    on the debit side when positive, credit side when negative.
    Validates that grand total debit == grand total credit.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Aggregate per ledger
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        entries = []
        grand_debit = 0
        grand_credit = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            balance = d - c

            # Positive balance → debit side; negative → credit side
            if balance >= 0:
                debit_val = round(balance, 2)
                credit_val = 0
            else:
                debit_val = 0
                credit_val = round(abs(balance), 2)

            grand_debit += debit_val
            grand_credit += credit_val

            entries.append({
                'ledger_id': row['ledger__id'],
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'debit': debit_val,
                'credit': credit_val,
            })

        grand_debit = round(grand_debit, 2)
        grand_credit = round(grand_credit, 2)
        is_balanced = grand_debit == grand_credit

        if not is_balanced:
            import logging
            logging.getLogger(__name__).warning(
                'Trial balance mismatch: debit=%s credit=%s', grand_debit, grand_credit
            )

        return api_success(
            {
                'entries': entries,
                'total_debit': grand_debit,
                'total_credit': grand_credit,
                'is_balanced': is_balanced,
            },
            message='Trial balance fetched successfully.',
        )


class ProfitLossView(APIView):
    """
    GET /api/accounting/profit-loss/

    Computes Profit & Loss from JournalItems.
    Income ledgers: balance = credit - debit
    Expense ledgers: balance = debit - credit
    Profit = total_income - total_expense
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        income_items = []
        expense_items = []
        total_income = 0
        total_expense = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']

            if ledger_type == 'income':
                # Income: credit side minus debit side
                balance = round(c - d, 2)
                income_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_income += balance

            elif ledger_type == 'expense':
                # Expense: debit side minus credit side
                balance = round(d - c, 2)
                expense_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_expense += balance

        total_income = round(total_income, 2)
        total_expense = round(total_expense, 2)
        profit = round(total_income - total_expense, 2)

        return api_success(
            {
                'income': income_items,
                'expenses': expense_items,
                'total_income': total_income,
                'total_expense': total_expense,
                'profit': profit,
            },
            message='Profit & Loss statement fetched successfully.',
        )


# ── Shared helper: aggregate JournalItems per ledger ──────────────
def _ledger_aggregates():
    """Return queryset of ledger-level debit/credit totals."""
    return (
        JournalItem.objects
        .values('ledger__id', 'ledger__name', 'ledger__type')
        .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
        .order_by('ledger__name')
    )


def _compute_profit():
    """Calculate net profit from income & expense ledgers (P&L logic)."""
    total_income = 0
    total_expense = 0
    for row in _ledger_aggregates():
        d = float(row['total_debit'] or 0)
        c = float(row['total_credit'] or 0)
        if row['ledger__type'] == 'income':
            total_income += c - d
        elif row['ledger__type'] == 'expense':
            total_expense += d - c
    return round(total_income - total_expense, 2)


class BalanceSheetView(APIView):
    """
    GET /api/accounting/balance-sheet/

    Assets  = debit - credit   (for asset-type ledgers)
    Liabilities = credit - debit (for liability-type ledgers)
    Equity  = net profit from P&L (income - expense)

    Verifies: total_assets == total_liabilities + equity
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = _ledger_aggregates()

        asset_items = []
        liability_items = []
        total_assets = 0
        total_liabilities = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']

            if ledger_type == 'asset':
                balance = round(d - c, 2)
                asset_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_assets += balance

            elif ledger_type == 'liability':
                balance = round(c - d, 2)
                liability_items.append({
                    'ledger_id': row['ledger__id'],
                    'ledger': row['ledger__name'],
                    'amount': balance,
                })
                total_liabilities += balance

        total_assets = round(total_assets, 2)
        total_liabilities = round(total_liabilities, 2)

        # Equity = retained profit (income − expense)
        equity = _compute_profit()

        # Accounting equation check
        is_balanced = total_assets == round(total_liabilities + equity, 2)

        return api_success(
            {
                'assets': asset_items,
                'liabilities': liability_items,
                'equity': equity,
                'total_assets': total_assets,
                'total_liabilities': total_liabilities,
                'is_balanced': is_balanced,
            },
            message='Balance sheet fetched successfully.',
        )

class OutstandingListView(APIView):
    """
    GET  /api/accounting/outstandings/?type=receivable|payable&status=pending|paid
    POST /api/accounting/outstandings/  -- create receivable or payable with auto journal
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Outstanding
        qs = Outstanding.objects.all()
        t = request.query_params.get('type')
        s = request.query_params.get('status')
        if t:
            qs = qs.filter(type=t)
        if s:
            qs = qs.filter(status=s)
        from .serializers import OutstandingSerializer
        return api_success(OutstandingSerializer(qs, many=True).data, message='Outstandings fetched.')

    def post(self, request):
        from django.db import transaction
        from .models import Outstanding

        data = request.data
        o_type = data.get('type')
        party_name = data.get('party_name', '').strip()
        amount = float(data.get('amount', 0))
        description = data.get('description', '')
        due_date = data.get('due_date') or None
        date = data.get('date')

        if o_type not in ('receivable', 'payable'):
            return Response({'success': False, 'message': 'type must be receivable or payable'}, status=400)
        if not party_name:
            return Response({'success': False, 'message': 'party_name is required'}, status=400)
        if amount <= 0:
            return Response({'success': False, 'message': 'amount must be positive'}, status=400)
        if not date:
            return Response({'success': False, 'message': 'date is required'}, status=400)

        department = (data.get('department') or '').strip()
        if not department:
            return Response({'success': False, 'message': 'Department is required'}, status=400)

        try:
            with transaction.atomic():
                if o_type == 'receivable':
                    # Accounts Receivable (Dr)  /  Sales (Cr)
                    ar_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Receivable', defaults={'type': Ledger.LedgerType.ASSET}
                    )
                    sales_ledger, _ = Ledger.objects.get_or_create(
                        name='Sales', defaults={'type': Ledger.LedgerType.INCOME}
                    )
                    journal = JournalEntry.objects.create(
                        date=date,
                        description=f'Receivable: {party_name} - {description}'
                    )
                    JournalItem.objects.create(entry=journal, ledger=ar_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name, department=department)
                    JournalItem.objects.create(entry=journal, ledger=sales_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name, department=department)
                else:
                    # Expense (Dr)  /  Accounts Payable (Cr)
                    expense_ledger, _ = Ledger.objects.get_or_create(
                        name='General Expense', defaults={'type': Ledger.LedgerType.EXPENSE}
                    )
                    ap_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Payable', defaults={'type': Ledger.LedgerType.LIABILITY}
                    )
                    journal = JournalEntry.objects.create(
                        date=date,
                        description=f'Payable: {party_name} - {description}'
                    )
                    JournalItem.objects.create(entry=journal, ledger=expense_ledger, debit=amount, credit=0, notes=description, vendor_payee=party_name, department=department)
                    JournalItem.objects.create(entry=journal, ledger=ap_ledger, debit=0, credit=amount, notes=description, vendor_payee=party_name, department=department)

                outstanding = Outstanding.objects.create(
                    type=o_type,
                    party_name=party_name,
                    amount=amount,
                    linked_journal=journal,
                    status=Outstanding.Status.PENDING,
                    description=description,
                    department=department,
                    due_date=due_date,
                )
            from .serializers import OutstandingSerializer
            return api_success(OutstandingSerializer(outstanding).data, message=f'{o_type.capitalize()} created successfully.', status_code=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class OutstandingSettleView(APIView):
    """
    POST /api/accounting/outstandings/<id>/settle/
    Body: { payment_account_id: <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.db import transaction
        from .models import Outstanding

        try:
            outstanding = Outstanding.objects.get(pk=pk)
        except Outstanding.DoesNotExist:
            return Response({'success': False, 'message': 'Outstanding not found'}, status=404)

        if outstanding.status == Outstanding.Status.PAID:
            return Response({'success': False, 'message': 'Already settled. Cannot settle twice.'}, status=400)

        payment_account_id = request.data.get('payment_account_id')
        if not payment_account_id:
            return Response({'success': False, 'message': 'payment_account_id is required'}, status=400)

        try:
            payment_account = Account.objects.get(pk=payment_account_id)
        except Account.DoesNotExist:
            return Response({'success': False, 'message': 'Payment account not found'}, status=404)

        amount = float(outstanding.amount)

        try:
            with transaction.atomic():
                bank_ledger = payment_account.get_or_create_ledger()

                if outstanding.type == Outstanding.OutstandingType.RECEIVABLE:
                    ar_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Receivable', defaults={'type': Ledger.LedgerType.ASSET}
                    )
                    journal = JournalEntry.objects.create(
                        date=request.data.get('date') or __import__('datetime').date.today().isoformat(),
                        description=f'Settlement of receivable from {outstanding.party_name}'
                    )
                    JournalItem.objects.create(entry=journal, ledger=bank_ledger, debit=amount, credit=0, vendor_payee=outstanding.party_name)
                    JournalItem.objects.create(entry=journal, ledger=ar_ledger, debit=0, credit=amount, vendor_payee=outstanding.party_name)
                else:
                    ap_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Payable', defaults={'type': Ledger.LedgerType.LIABILITY}
                    )
                    journal = JournalEntry.objects.create(
                        date=request.data.get('date') or __import__('datetime').date.today().isoformat(),
                        description=f'Settlement of payable to {outstanding.party_name}'
                    )
                    JournalItem.objects.create(entry=journal, ledger=ap_ledger, debit=amount, credit=0, vendor_payee=outstanding.party_name)
                    JournalItem.objects.create(entry=journal, ledger=bank_ledger, debit=0, credit=amount, vendor_payee=outstanding.party_name)

                outstanding.status = Outstanding.Status.PAID
                outstanding.settlement_journal = journal
                outstanding.settlement_account = payment_account
                outstanding.save(update_fields=['status', 'settlement_journal', 'settlement_account', 'updated_at'])

            from .serializers import OutstandingSerializer
            return api_success(OutstandingSerializer(outstanding).data, message='Settled successfully.')
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class OutstandingDashboardView(APIView):
    """GET /api/accounting/outstandings/dashboard/ - summary, account breakdown, settlement logs"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count
        from .models import Outstanding

        def agg(type_, status):
            qs = Outstanding.objects.filter(type=type_, status=status)
            return {
                'count': qs.count(),
                'total': float(qs.aggregate(t=Sum('amount'))['t'] or 0),
            }

        # Account-wise breakdown: how many bills paid/received per account
        account_breakdown = []
        settled = Outstanding.objects.filter(status='paid', settlement_account__isnull=False)
        account_ids = settled.values_list('settlement_account', flat=True).distinct()
        for acc_id in account_ids:
            acc = Account.objects.filter(pk=acc_id).first()
            if not acc:
                continue
            acc_settled = settled.filter(settlement_account=acc)
            rec = acc_settled.filter(type='receivable')
            pay = acc_settled.filter(type='payable')
            account_breakdown.append({
                'account_id': acc.id,
                'account_name': acc.name,
                'account_type': acc.type,
                'received_count': rec.count(),
                'received_total': float(rec.aggregate(t=Sum('amount'))['t'] or 0),
                'paid_count': pay.count(),
                'paid_total': float(pay.aggregate(t=Sum('amount'))['t'] or 0),
            })

        # Recent settlement logs (last 20)
        from .serializers import OutstandingSerializer
        recent_settlements = Outstanding.objects.filter(status='paid').order_by('-updated_at')[:20]

        return api_success({
            'receivable_pending': agg('receivable', 'pending'),
            'receivable_paid': agg('receivable', 'paid'),
            'payable_pending': agg('payable', 'pending'),
            'payable_paid': agg('payable', 'paid'),
            'account_breakdown': account_breakdown,
            'recent_settlements': OutstandingSerializer(recent_settlements, many=True).data,
        }, message='Outstanding dashboard fetched.')


class OutstandingReceiptView(APIView):
    """
    POST /api/accounting/outstandings/<id>/receipts/  - upload receipts
    GET  /api/accounting/outstandings/<id>/receipts/  - list receipts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .models import Outstanding, OutstandingReceipt
        from .serializers import OutstandingReceiptSerializer
        try:
            outstanding = Outstanding.objects.get(pk=pk)
        except Outstanding.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=404)
        receipts = OutstandingReceipt.objects.filter(outstanding=outstanding).order_by('-uploaded_at')
        return api_success(OutstandingReceiptSerializer(receipts, many=True).data)

    def post(self, request, pk):
        from .models import Outstanding, OutstandingReceipt
        from .serializers import OutstandingReceiptSerializer
        try:
            outstanding = Outstanding.objects.get(pk=pk)
        except Outstanding.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=404)

        files = request.FILES.getlist('receipts')
        if not files:
            files = request.FILES.getlist('receipt')
        if not files:
            return Response({'success': False, 'message': 'No files provided'}, status=400)

        created = []
        for f in files:
            r = OutstandingReceipt.objects.create(outstanding=outstanding, file=f, filename=f.name)
            created.append(r)
        return api_success(OutstandingReceiptSerializer(created, many=True).data, message=f'{len(created)} receipt(s) uploaded.')
