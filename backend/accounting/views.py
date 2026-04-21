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
        category_id = request.data.get('category')
        account_id = request.data.get('account')
        date = request.data.get('date')
        description = request.data.get('description')
        receipt = request.FILES.get('receipt')

        if amount <= 0:
            return Response({'success': False, 'message': 'Amount must be positive'}, status=400)
        if not category_id or not account_id or not date:
            return Response({'success': False, 'message': 'Missing required fields'}, status=400)

        try:
            if isinstance(category_id, str) and not str(category_id).isdigit():
                category, _ = Ledger.objects.get_or_create(name=category_id, defaults={'type': Ledger.LedgerType.INCOME})
            else:
                category = Ledger.objects.get(pk=category_id)

            if category.type != Ledger.LedgerType.INCOME:
                return Response({'success': False, 'message': 'Category must be an income ledger'}, status=400)

            if isinstance(account_id, str) and not str(account_id).isdigit():
                account, _ = Account.objects.get_or_create(name=account_id, defaults={'type': Account.AccountType.BANK})
            else:
                account = Account.objects.get(pk=account_id)
        except (Ledger.DoesNotExist, Account.DoesNotExist):
            return Response({'success': False, 'message': 'Invalid category or account'}, status=400)

        try:
            with transaction.atomic():
                account_ledger = account.get_or_create_ledger()

                journal_entry = JournalEntry.objects.create(
                    date=date,
                    description=f'Income: {description}'
                )
                # Credit Income ledger
                JournalItem.objects.create(
                    entry=journal_entry, ledger=category, debit=0, credit=amount, notes=description
                )
                # Debit the payment account (asset)
                JournalItem.objects.create(
                    entry=journal_entry, ledger=account_ledger, debit=amount, credit=0, notes=description
                )

                income = Income.objects.create(
                    amount=amount, category=category, account=account,
                    date=date, description=description, receipt=receipt,
                    journal_entry=journal_entry
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

        return api_success({
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net': net,
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
        category_id = request.data.get('category')
        account_id = request.data.get('account')
        date = request.data.get('date')
        description = request.data.get('description')
        receipt = request.FILES.get('receipt')

        if amount <= 0:
            return Response({'success': False, 'message': 'Amount must be positive'}, status=400)
        if not category_id or not account_id or not date:
            return Response({'success': False, 'message': 'Missing required fields'}, status=400)

        try:
            if isinstance(category_id, str) and not str(category_id).isdigit():
                category, _ = Ledger.objects.get_or_create(name=category_id, defaults={'type': Ledger.LedgerType.EXPENSE})
            else:
                category = Ledger.objects.get(pk=category_id)

            if category.type != Ledger.LedgerType.EXPENSE:
                return Response({'success': False, 'message': 'Category must be an expense ledger'}, status=400)
            
            if isinstance(account_id, str) and not str(account_id).isdigit():
                account, _ = Account.objects.get_or_create(name=account_id, defaults={'type': Account.AccountType.BANK})
            else:
                account = Account.objects.get(pk=account_id)
        except (Ledger.DoesNotExist, Account.DoesNotExist):
            return Response({'success': False, 'message': 'Invalid category or account'}, status=400)

        try:
            with transaction.atomic():
                account_ledger = account.get_or_create_ledger()

                journal_entry = JournalEntry.objects.create(
                    date=date,
                    description=f"Expense: {description}"
                )

                # Debit Expense
                JournalItem.objects.create(
                    entry=journal_entry,
                    ledger=category,
                    debit=amount,
                    credit=0,
                    notes=description
                )
                
                # Credit Payment Account
                JournalItem.objects.create(
                    entry=journal_entry,
                    ledger=account_ledger,
                    debit=0,
                    credit=amount,
                    notes=description
                )

                expense = Expense.objects.create(
                    amount=amount,
                    category=category,
                    account=account,
                    date=date,
                    description=description,
                    receipt=receipt,
                    journal_entry=journal_entry
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
