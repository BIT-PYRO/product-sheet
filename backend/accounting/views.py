from rest_framework import permissions
from core_permissions.permissions import SaaSResourcePermission, RequiresFeature
import logging
from datetime import date

from django.db import transaction
from django.db.models import Sum

from rest_framework import status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from decimal import Decimal

from common.api import api_success
from orders.models import Order

from .models import (
    Account, BankAccount, BankTransaction,
    BulkSettlement,
    Expense, Income, Invoice, JournalEntry, JournalItem, Ledger, Outstanding, OutstandingReceipt, PendingExpense,
)
from .services.bank_import_service import build_preview, confirm_import, parse_file
from .serializers import (
    ApproveExpenseSerializer,
    BankAccountCreateSerializer,
    BankAccountSerializer,
    BankTransactionSerializer,
    BulkSettlementSerializer,
    ExpenseSerializer,
    IncomeSerializer,
    InvoiceCreateSerializer,
    InvoiceSerializer,
    InvoiceSettleSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
    LedgerSerializer,
    OutstandingReceiptSerializer,
    OutstandingSerializer,
    PendingExpenseSerializer,
)

logger = logging.getLogger(__name__)


class LedgerListView(APIView):
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        serializer = LedgerSerializer(Ledger.objects.all(), many=True)
        return api_success(serializer.data, message='Ledgers fetched successfully.')


class AccountListView(APIView):
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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

        # Account-wise breakdown — 2 aggregate queries instead of N*2
        income_by_account = dict(
            income_qs.values('account').annotate(t=Sum('amount')).values_list('account', 't')
        )
        expense_by_account = dict(
            expense_qs.values('account').annotate(t=Sum('amount')).values_list('account', 't')
        )
        all_account_ids = set(income_by_account) | set(expense_by_account)
        account_map = {
            acc.pk: acc
            for acc in Account.objects.filter(pk__in=all_account_ids).only('id', 'name', 'type')
        }
        account_breakdown = sorted(
            [
                {
                    'account_id': pk,
                    'account_name': account_map[pk].name,
                    'account_type': account_map[pk].type,
                    'income_total': round(float(income_by_account.get(pk, 0) or 0), 2),
                    'expense_total': round(float(expense_by_account.get(pk, 0) or 0), 2),
                    'net': round(
                        float(income_by_account.get(pk, 0) or 0) - float(expense_by_account.get(pk, 0) or 0), 2
                    ),
                }
                for pk in all_account_ids
                if pk in account_map
            ],
            key=lambda x: x['account_id'],
        )

        return api_success({
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net': net,
            'account_breakdown': account_breakdown,
        }, message='Finance dashboard fetched.')



class ExpenseCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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


def _build_transaction_detail(item):
    """Convert a JournalItem + its JournalEntry into a transaction detail dict."""
    return {
        'id': item.id,
        'entry_id': item.entry_id,
        'entry_date': str(item.entry.date),
        'entry_description': item.entry.description or '',
        'debit': float(item.debit or 0),
        'credit': float(item.credit or 0),
        'department': item.department or '',
        'payment_method': item.payment_method or '',
        'vendor_payee': item.vendor_payee or '',
        'bill_date': str(item.bill_date) if item.bill_date else '',
        'ref_id': item.ref_id or '',
        'notes': item.notes or '',
    }


class LedgerSummaryView(APIView):
    """Aggregate debit/credit totals per ledger from all journal items, with transaction drill-down."""

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        # Aggregates
        summary = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        # Per-ledger transactions (select_related for entry date/description)
        items_qs = (
            JournalItem.objects
            .select_related('entry')
            .order_by('ledger__id', '-entry__date', '-entry__created_at')
        )
        # Group by ledger_id
        from collections import defaultdict
        tx_map = defaultdict(list)
        for item in items_qs:
            tx_map[item.ledger_id].append(_build_transaction_detail(item))

        data = []
        for row in summary:
            lid = row['ledger__id']
            data.append({
                'ledger_id': lid,
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'total_debit': str(row['total_debit']),
                'total_credit': str(row['total_credit']),
                'transactions': tx_map.get(lid, []),
            })

        return api_success(data, message='Ledger summary fetched successfully.')


class TrialBalanceView(APIView):
    """
    GET /api/accounting/trial-balance/

    Computes the trial balance dynamically from JournalItems.
    Each ledger's net balance (total_debit - total_credit) is placed
    on the debit side when positive, credit side when negative.
    Validates that grand total debit == grand total credit.
    """

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        from collections import defaultdict
        # Aggregate per ledger
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        # Build transaction map
        tx_map = defaultdict(list)
        for item in JournalItem.objects.select_related('entry').order_by('ledger__id', '-entry__date'):
            tx_map[item.ledger_id].append(_build_transaction_detail(item))

        entries = []
        grand_debit = 0
        grand_credit = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            balance = d - c

            if balance >= 0:
                debit_val = round(balance, 2)
                credit_val = 0
            else:
                debit_val = 0
                credit_val = round(abs(balance), 2)

            grand_debit += debit_val
            grand_credit += credit_val

            lid = row['ledger__id']
            entries.append({
                'ledger_id': lid,
                'ledger': row['ledger__name'],
                'type': row['ledger__type'],
                'debit': debit_val,
                'credit': credit_val,
                'transactions': tx_map.get(lid, []),
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

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        from collections import defaultdict
        rows = (
            JournalItem.objects
            .values('ledger__id', 'ledger__name', 'ledger__type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('ledger__name')
        )

        # Transaction detail map
        tx_map = defaultdict(list)
        for item in JournalItem.objects.select_related('entry').order_by('ledger__id', '-entry__date'):
            tx_map[item.ledger_id].append(_build_transaction_detail(item))

        income_items = []
        expense_items = []
        total_income = 0
        total_expense = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']
            lid = row['ledger__id']

            if ledger_type == 'income':
                balance = round(c - d, 2)
                income_items.append({
                    'ledger_id': lid,
                    'ledger': row['ledger__name'],
                    'amount': balance,
                    'transactions': tx_map.get(lid, []),
                })
                total_income += balance

            elif ledger_type == 'expense':
                balance = round(d - c, 2)
                expense_items.append({
                    'ledger_id': lid,
                    'ledger': row['ledger__name'],
                    'amount': balance,
                    'transactions': tx_map.get(lid, []),
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

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        from collections import defaultdict
        rows = _ledger_aggregates()

        # Transaction detail map
        tx_map = defaultdict(list)
        for item in JournalItem.objects.select_related('entry').order_by('ledger__id', '-entry__date'):
            tx_map[item.ledger_id].append(_build_transaction_detail(item))

        asset_items = []
        liability_items = []
        total_assets = 0
        total_liabilities = 0

        for row in rows:
            d = float(row['total_debit'] or 0)
            c = float(row['total_credit'] or 0)
            ledger_type = row['ledger__type']
            lid = row['ledger__id']

            if ledger_type == 'asset':
                balance = round(d - c, 2)
                asset_items.append({
                    'ledger_id': lid,
                    'ledger': row['ledger__name'],
                    'amount': balance,
                    'transactions': tx_map.get(lid, []),
                })
                total_assets += balance

            elif ledger_type == 'liability':
                balance = round(c - d, 2)
                liability_items.append({
                    'ledger_id': lid,
                    'ledger': row['ledger__name'],
                    'amount': balance,
                    'transactions': tx_map.get(lid, []),
                })
                total_liabilities += balance

        total_assets = round(total_assets, 2)
        total_liabilities = round(total_liabilities, 2)

        equity = _compute_profit()
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


class DepartmentDashboardView(APIView):
    """
    GET /api/accounting/departments/dashboard/
    Aggregates income/expense for all departments from JournalItems and PendingExpenses.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        departments = {}

        def get_dept(name):
            if not name: name = 'General'
            if name == 'Human Resources': name = 'HR & Admin'
            if name not in departments:
                departments[name] = {
                    'name': name,
                    'income': 0, 'expense': 0,
                    'income_entries': 0, 'expense_entries': 0,
                    'top_accounts': []
                }
            return departments[name]

        # 1. Posted Journal Items — use iterator() + only() to avoid loading full
        # model instances for the entire table into memory at once.
        items = (
            JournalItem.objects
            .select_related('entry', 'ledger')
            .only(
                'department', 'debit', 'credit', 'notes', 'ref_id',
                'ledger__name', 'ledger__type',
                'entry__date', 'entry__description',
            )
            .iterator(chunk_size=500)
        )
        for item in items:
            if item.ledger.type not in ('income', 'expense'):
                continue
            
            dept = get_dept(item.department)
            
            if item.ledger.type == 'expense' and item.debit > 0:
                dept['expense'] += float(item.debit)
                dept['expense_entries'] += 1
                dept['top_accounts'].append({
                    'name': item.ledger.name,
                    'amount': float(item.debit),
                    'type': 'expense',
                    'date': str(item.entry.date),
                    'description': item.notes or item.entry.description,
                    'receipt': item.ref_id or ''
                })
            elif item.ledger.type == 'income' and item.credit > 0:
                dept['income'] += float(item.credit)
                dept['income_entries'] += 1
                dept['top_accounts'].append({
                    'name': item.ledger.name,
                    'amount': float(item.credit),
                    'type': 'income',
                    'date': str(item.entry.date),
                    'description': item.notes or item.entry.description,
                    'receipt': item.ref_id or ''
                })


        # Define UI colors for standard departments
        color_map = {
            'Sales': {'color': '#059669', 'bg': '#ecfdf5', 'border': '#a7f3d0', 'icon': '💼'},
            'Operations': {'color': '#2563eb', 'bg': '#eff6ff', 'border': '#bfdbfe', 'icon': '⚙️'},
            'HR & Admin': {'color': '#d97706', 'bg': '#fffbeb', 'border': '#fde68a', 'icon': '👥'},
            'Marketing': {'color': '#7c3aed', 'bg': '#f5f3ff', 'border': '#ddd6fe', 'icon': '📣'},
            'Finance': {'color': '#64748b', 'bg': '#f8fafc', 'border': '#e2e8f0', 'icon': '🏦'},
        }
        fallback_colors = {'color': '#0f172a', 'bg': '#f8fafc', 'border': '#e2e8f0', 'icon': '🏢'}

        # Format output
        results = []
        for name, data in departments.items():
            meta = color_map.get(name, fallback_colors)
            data.update(meta)
            # Sort top accounts by amount descending
            data['top_accounts'].sort(key=lambda x: x['amount'], reverse=True)
            results.append(data)
            
        # Guarantee base departments exist
        existing = {r['name'] for r in results}
        for name, meta in color_map.items():
            if name not in existing:
                results.append({
                    'name': name,
                    'income': 0, 'expense': 0,
                    'income_entries': 0, 'expense_entries': 0,
                    'top_accounts': [],
                    **meta
                })

        return api_success(results, message='Department dashboard fetched.')



# ═══════════════════════════════════════════════════════════════════
# PENDING EXPENSE SYSTEM
# ═══════════════════════════════════════════════════════════════════

# ── Mock external API data ──────────────────────────────────────────
# Replace EXTERNAL_API_URL with the real URL once the other team
# provides it. Keep MOCK_EXPENSES as a fallback / test dataset.
EXTERNAL_API_URL = None   # e.g. 'https://expense-app.example.com/api/expenses/'
MOCK_EXPENSES = [
    {'id': 'EXP001', 'employee': 'Rahul Sharma', 'amount': 1500, 'category': 'Travel', 'description': 'Client meeting travel'},
    {'id': 'EXP002', 'employee': 'Priya Verma', 'amount': 3200, 'category': 'Marketing', 'description': 'Digital ads campaign'},
    {'id': 'EXP003', 'employee': 'Amit Singh', 'amount': 800,  'category': 'Meals',     'description': 'Team lunch'},
    {'id': 'EXP004', 'employee': 'Neha Gupta', 'amount': 5000, 'category': 'Salary',    'description': 'Freelancer payment'},
    {'id': 'EXP005', 'employee': 'Rohit Das',  'amount': 1200, 'category': 'Rent',      'description': 'Office supplies'},
]


def _fetch_external_expenses():
    """
    Fetch raw expense dicts from the external system.
    Swap EXTERNAL_API_URL once the other team shares it.
    """
    if EXTERNAL_API_URL:
        import urllib.request, json as _json
        with urllib.request.urlopen(EXTERNAL_API_URL, timeout=10) as resp:
            return _json.loads(resp.read())
    # Fallback: use mock data for development / testing
    return MOCK_EXPENSES


class PendingExpenseListView(APIView):
    """
    GET /api/accounting/pending-expenses/
    Query params: status (optional), e.g. ?status=pending
    """

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        qs = PendingExpense.objects.select_related('category').all()

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = PendingExpenseSerializer(qs, many=True)
        return api_success(serializer.data, message='Pending expenses fetched.')


class PendingExpenseSyncView(APIView):
    """
    POST /api/accounting/pending-expenses/sync/
    Pulls expenses from the external system and upserts them as pending.
    Source_id deduplication prevents double-imports.
    """

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        try:
            raw_expenses = _fetch_external_expenses()
        except Exception as exc:
            logger.error('Failed to fetch external expenses: %s', exc)
            return Response(
                {'success': False, 'message': f'External API error: {exc}'},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )

        created_count = 0
        skipped_count = 0

        for item in raw_expenses:
            source_id = str(item.get('id', ''))
            if not source_id:
                continue

            # Try to resolve category string → Ledger (best-effort)
            category_str = item.get('category', '')
            category = Ledger.objects.filter(
                name__iexact=category_str, type='expense'
            ).first()

            _, created = PendingExpense.objects.get_or_create(
                source_id=source_id,
                defaults={
                    'employee_name': item.get('employee', 'Unknown'),
                    'amount': item.get('amount', 0),
                    'category': category,
                    'description': item.get('description', ''),
                    'source': item.get('source', 'external_app'),
                    'status': PendingExpense.Status.PENDING,
                },
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        return api_success(
            {'created': created_count, 'skipped': skipped_count},
            message=f'Sync complete. {created_count} new, {skipped_count} already existed.',
        )


class PendingExpenseApproveView(APIView):
    """
    POST /api/accounting/pending-expenses/{id}/approve/
    Body: { "payment_ledger": <ledger_id> }
    Creates a double-entry journal and marks the expense approved.
    """

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request, pk):
        try:
            expense = PendingExpense.objects.select_related('category').get(pk=pk)
        except PendingExpense.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Expense not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if expense.status != PendingExpense.Status.PENDING:
            return Response(
                {'success': False, 'message': f'Expense is already {expense.status}.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        if not expense.category:
            return Response(
                {'success': False, 'message': 'Expense has no category ledger. Assign one before approving.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveExpenseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid input.', 'errors': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        payment_ledger = serializer.validated_data['payment_ledger']

        with transaction.atomic():
            # Create journal entry
            entry = JournalEntry.objects.create(
                date=date.today(),
                description=f'Expense by {expense.employee_name}: {expense.description or expense.category.name}',
            )
            # Debit the expense ledger (cost incurred)
            JournalItem.objects.create(
                entry=entry,
                ledger=expense.category,
                debit=expense.amount,
                credit=0,
                department=expense.department,
            )
            # Credit the payment ledger (cash / bank / wallet going out)
            JournalItem.objects.create(
                entry=entry,
                ledger=payment_ledger,
                debit=0,
                credit=expense.amount,
                department=expense.department,
            )
            # Mark approved
            expense.status = PendingExpense.Status.APPROVED
            expense.journal_entry = entry
            expense.save(update_fields=['status', 'journal_entry', 'updated_at'])

        logger.info(
            'Expense #%s approved → JournalEntry #%s (₹%s)',
            expense.pk, entry.pk, expense.amount,
        )
        return api_success(
            {'expense_id': expense.pk, 'journal_entry_id': entry.pk},
            message='Expense approved and journal entry created.',
        )


class PendingExpenseRejectView(APIView):
    """
    POST /api/accounting/pending-expenses/{id}/reject/
    Marks the expense as rejected. No journal entry is created.
    """

    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request, pk):
        try:
            expense = PendingExpense.objects.get(pk=pk)
        except PendingExpense.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Expense not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if expense.status != PendingExpense.Status.PENDING:
            return Response(
                {'success': False, 'message': f'Expense is already {expense.status}.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        expense.status = PendingExpense.Status.REJECTED
        expense.save(update_fields=['status', 'updated_at'])

        return api_success(
            {'expense_id': expense.pk},
            message='Expense rejected.',
        )


# ═══════════════════════════════════════════════════════════════════
# OUTSTANDING / PAYABLES & RECEIVABLES SYSTEM
# ═══════════════════════════════════════════════════════════════════

class OutstandingListView(APIView):
    """
    GET  /api/accounting/outstandings/?type=receivable|payable&status=pending|paid
    POST /api/accounting/outstandings/  -- create receivable or payable with auto journal
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request, pk):
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

        amount      = outstanding.amount
        dept        = (outstanding.department or 'General').strip()
        party       = outstanding.party_name
        settle_date = request.data.get('date') or date.today().isoformat()

        try:
            with transaction.atomic():
                # Zero-amount: skip journal entries (debit=0/credit=0 violates DB constraint)
                if amount == 0:
                    outstanding.status = Outstanding.Status.PAID
                    outstanding.save(update_fields=['status', 'updated_at'])
                    if hasattr(outstanding, 'invoice') and outstanding.invoice:
                        linked_inv = outstanding.invoice
                        if linked_inv.status != Invoice.Status.SETTLED:
                            linked_inv.status = Invoice.Status.SETTLED
                            linked_inv.save(update_fields=['status', 'updated_at'])
                    from .serializers import OutstandingSerializer
                    return api_success(OutstandingSerializer(outstanding).data, message='Settled successfully.')

                bank_ledger = payment_account.get_or_create_ledger()

                if outstanding.type == Outstanding.OutstandingType.RECEIVABLE:
                    # Journal: Bank Dr / Accounts Receivable Cr
                    ar_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Receivable', defaults={'type': Ledger.LedgerType.ASSET}
                    )
                    journal = JournalEntry.objects.create(
                        date=settle_date,
                        description=f'Settlement of receivable from {party}',
                    )
                    JournalItem.objects.create(
                        entry=journal, ledger=bank_ledger, debit=amount, credit=0,
                        vendor_payee=party, department=dept,
                    )
                    JournalItem.objects.create(
                        entry=journal, ledger=ar_ledger, debit=0, credit=amount,
                        vendor_payee=party, department=dept,
                    )
                    # Income record → shows in Finance Dashboard & Income tab
                    income_ledger, _ = Ledger.objects.get_or_create(
                        name=f'{dept} Income', defaults={'type': Ledger.LedgerType.INCOME}
                    )
                    Income.objects.create(
                        amount=amount, category=income_ledger, account=payment_account,
                        date=settle_date, description=f'Settled receivable — {party}',
                        department=dept, journal_entry=journal,
                    )

                else:
                    # Journal: Accounts Payable Dr / Bank Cr
                    ap_ledger, _ = Ledger.objects.get_or_create(
                        name='Accounts Payable', defaults={'type': Ledger.LedgerType.LIABILITY}
                    )
                    journal = JournalEntry.objects.create(
                        date=settle_date,
                        description=f'Settlement of payable to {party}',
                    )
                    JournalItem.objects.create(
                        entry=journal, ledger=ap_ledger, debit=amount, credit=0,
                        vendor_payee=party, department=dept,
                    )
                    JournalItem.objects.create(
                        entry=journal, ledger=bank_ledger, debit=0, credit=amount,
                        vendor_payee=party, department=dept,
                    )
                    # Expense record → shows in Finance Dashboard & Expense tab
                    expense_ledger, _ = Ledger.objects.get_or_create(
                        name=f'{dept} Expense', defaults={'type': Ledger.LedgerType.EXPENSE}
                    )
                    Expense.objects.create(
                        amount=amount, category=expense_ledger, account=payment_account,
                        date=settle_date, description=f'Settled payable — {party}',
                        department=dept, journal_entry=journal,
                    )

                outstanding.status             = Outstanding.Status.PAID
                outstanding.settlement_journal = journal
                outstanding.settlement_account = payment_account
                outstanding.save(update_fields=['status', 'settlement_journal', 'settlement_account', 'updated_at'])

                # Sync linked Invoice status (if this outstanding came from an Invoice)
                if hasattr(outstanding, 'invoice') and outstanding.invoice:
                    linked_inv = outstanding.invoice
                    if linked_inv.status != Invoice.Status.SETTLED:
                        linked_inv.status        = Invoice.Status.SETTLED
                        linked_inv.journal_entry = journal
                        linked_inv.save(update_fields=['status', 'journal_entry', 'updated_at'])

            from .serializers import OutstandingSerializer
            return api_success(OutstandingSerializer(outstanding).data, message='Settled successfully.')
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


# ═══════════════════════════════════════════════════════════════════
# BULK SETTLEMENT — settle multiple outstandings in one batch
# ═══════════════════════════════════════════════════════════════════

class BulkSettleView(APIView):
    """
    POST /api/accounting/outstandings/bulk-settle/
    Body: {
      outstanding_ids: [1, 2, 3],
      payment_account_id: <int>,
      date: "YYYY-MM-DD",
      label: "Optional batch label",
      notes: ""
    }

    Settles each pending outstanding individually (reusing OutstandingSettleView logic),
    then creates a BulkSettlement record that groups them as a folder.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        outstanding_ids = request.data.get('outstanding_ids', [])
        payment_account_id = request.data.get('payment_account_id')
        settle_date = request.data.get('date') or date.today().isoformat()
        label = (request.data.get('label') or '').strip()
        notes = (request.data.get('notes') or '').strip()

        if not outstanding_ids or not isinstance(outstanding_ids, list):
            return Response({'success': False, 'message': 'outstanding_ids must be a non-empty list.'}, status=400)
        if not payment_account_id:
            return Response({'success': False, 'message': 'payment_account_id is required.'}, status=400)

        try:
            payment_account = Account.objects.get(pk=payment_account_id)
        except Account.DoesNotExist:
            return Response({'success': False, 'message': 'Payment account not found.'}, status=404)

        outstandings = Outstanding.objects.filter(pk__in=outstanding_ids, status=Outstanding.Status.PENDING)
        if not outstandings.exists():
            return Response({'success': False, 'message': 'No pending outstandings found for the given IDs.'}, status=400)

        settled_ids = []
        total_amount = 0

        try:
            with transaction.atomic():
                bank_ledger = payment_account.get_or_create_ledger()

                for outstanding in outstandings:
                    amount = outstanding.amount
                    dept = (outstanding.department or 'General').strip()
                    party = outstanding.party_name

                    if outstanding.type == Outstanding.OutstandingType.RECEIVABLE:
                        ar_ledger, _ = Ledger.objects.get_or_create(
                            name='Accounts Receivable', defaults={'type': Ledger.LedgerType.ASSET}
                        )
                        journal = JournalEntry.objects.create(
                            date=settle_date,
                            description=f'[Bulk] Settlement of receivable from {party}',
                        )
                        JournalItem.objects.create(
                            entry=journal, ledger=bank_ledger, debit=amount, credit=0,
                            vendor_payee=party, department=dept,
                        )
                        JournalItem.objects.create(
                            entry=journal, ledger=ar_ledger, debit=0, credit=amount,
                            vendor_payee=party, department=dept,
                        )
                        income_ledger, _ = Ledger.objects.get_or_create(
                            name=f'{dept} Income', defaults={'type': Ledger.LedgerType.INCOME}
                        )
                        Income.objects.create(
                            amount=amount, category=income_ledger, account=payment_account,
                            date=settle_date, description=f'[Bulk] Settled receivable — {party}',
                            department=dept, journal_entry=journal,
                        )
                    else:
                        ap_ledger, _ = Ledger.objects.get_or_create(
                            name='Accounts Payable', defaults={'type': Ledger.LedgerType.LIABILITY}
                        )
                        journal = JournalEntry.objects.create(
                            date=settle_date,
                            description=f'[Bulk] Settlement of payable to {party}',
                        )
                        JournalItem.objects.create(
                            entry=journal, ledger=ap_ledger, debit=amount, credit=0,
                            vendor_payee=party, department=dept,
                        )
                        JournalItem.objects.create(
                            entry=journal, ledger=bank_ledger, debit=0, credit=amount,
                            vendor_payee=party, department=dept,
                        )
                        expense_ledger, _ = Ledger.objects.get_or_create(
                            name=f'{dept} Expense', defaults={'type': Ledger.LedgerType.EXPENSE}
                        )
                        Expense.objects.create(
                            amount=amount, category=expense_ledger, account=payment_account,
                            date=settle_date, description=f'[Bulk] Settled payable — {party}',
                            department=dept, journal_entry=journal,
                        )

                    outstanding.status = Outstanding.Status.PAID
                    outstanding.settlement_journal = journal
                    outstanding.settlement_account = payment_account
                    outstanding.save(update_fields=['status', 'settlement_journal', 'settlement_account', 'updated_at'])

                    # Sync linked Invoice if any
                    if hasattr(outstanding, 'invoice') and outstanding.invoice:
                        linked_inv = outstanding.invoice
                        if linked_inv.status != Invoice.Status.SETTLED:
                            linked_inv.status = Invoice.Status.SETTLED
                            linked_inv.journal_entry = journal
                            linked_inv.save(update_fields=['status', 'journal_entry', 'updated_at'])

                    settled_ids.append(outstanding.pk)
                    total_amount += float(amount)

                # Auto-generate label if not provided
                if not label:
                    label = f'Bulk Settlement — {settle_date} ({len(settled_ids)} items)'

                bulk = BulkSettlement.objects.create(
                    label=label,
                    settlement_account=payment_account,
                    settlement_date=settle_date,
                    total_amount=round(total_amount, 2),
                    items_count=len(settled_ids),
                    outstanding_ids=settled_ids,
                    notes=notes,
                )

            logger.info(
                'BulkSettlement #%s: %d items settled, total ₹%s via account %s',
                bulk.pk, len(settled_ids), round(total_amount, 2), payment_account.name,
            )
            return api_success(
                BulkSettlementSerializer(bulk).data,
                message=f'{len(settled_ids)} items settled successfully as Bulk #{bulk.pk}.',
                status_code=201,
            )

        except Exception as exc:
            logger.error('BulkSettle failed: %s', exc, exc_info=True)
            return Response({'success': False, 'message': str(exc)}, status=400)


class BulkSettlementListView(APIView):
    """
    GET /api/accounting/bulk-settlements/
    Returns all bulk settlement folders, newest first.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        qs = BulkSettlement.objects.select_related('settlement_account').all()
        return api_success(BulkSettlementSerializer(qs, many=True).data, message='Bulk settlements fetched.')


class OutstandingDashboardView(APIView):
    """GET /api/accounting/outstandings/dashboard/ - summary, account breakdown, settlement logs"""
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

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


# ═══════════════════════════════════════════════════════════════════
# INVOICE SYSTEM
# ═══════════════════════════════════════════════════════════════════

class InvoiceListCreateView(APIView):
    """
    GET  /api/accounting/invoices/         – list, filter by ?type=sales|purchase&status=pending|settled&department=
    POST /api/accounting/invoices/         – create invoice + linked outstanding
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        qs = Invoice.objects.select_related('outstanding', 'journal_entry').all()
        inv_type   = request.query_params.get('type')
        inv_status = request.query_params.get('status')
        department = request.query_params.get('department')
        if inv_type:   qs = qs.filter(type=inv_type)
        if inv_status: qs = qs.filter(status=inv_status)
        if department: qs = qs.filter(department=department)
        return api_success(InvoiceSerializer(qs, many=True).data, message='Invoices fetched.')

    def post(self, request):
        ser = InvoiceCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({'success': False, 'message': 'Invalid data.', 'errors': ser.errors}, status=400)

        d = ser.validated_data
        inv_type   = d['type']
        party_name = d['party_name']
        amount     = d['amount']
        department = d.get('department', '')
        due_date   = d.get('due_date')
        description = d.get('description', '')

        try:
            with transaction.atomic():
                # Create Outstanding (receivable for sales, payable for purchase)
                outstanding_type = (
                    Outstanding.OutstandingType.RECEIVABLE
                    if inv_type == Invoice.InvoiceType.SALES
                    else Outstanding.OutstandingType.PAYABLE
                )
                outstanding = Outstanding.objects.create(
                    type=outstanding_type,
                    party_name=party_name,
                    amount=amount,
                    department=department,
                    due_date=due_date,
                    description=description or f'{inv_type.capitalize()} invoice for {party_name}',
                    status=Outstanding.Status.PENDING,
                )

                invoice = Invoice.objects.create(
                    type=inv_type,
                    party_name=party_name,
                    amount=amount,
                    department=department,
                    due_date=due_date,
                    description=description,
                    status=Invoice.Status.PENDING,
                    outstanding=outstanding,
                )

            logger.info('Invoice #%s (%s) created → Outstanding #%s', invoice.pk, inv_type, outstanding.pk)
            return api_success(InvoiceSerializer(invoice).data, message='Invoice created.', status_code=201)

        except Exception as exc:
            logger.error('Invoice creation failed: %s', exc, exc_info=True)
            return Response({'success': False, 'message': str(exc)}, status=400)


class InvoiceSettleView(APIView):
    """
    POST /api/accounting/invoices/{pk}/settle/
    Body: { "payment_account": <account_id> }

    Sales invoice   → Bank Dr / Sales Income Cr   (department income += amount)
    Purchase invoice → Purchase Expense Dr / Bank Cr (department expense += amount)
    Then marks invoice + outstanding as settled.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.select_related('outstanding').get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'success': False, 'message': 'Invoice not found.'}, status=404)

        if invoice.status == Invoice.Status.SETTLED:
            return Response({'success': False, 'message': 'Invoice is already settled.'}, status=400)

        ser = InvoiceSettleSerializer(data=request.data)
        if not ser.is_valid():
            return Response({'success': False, 'message': 'Invalid data.', 'errors': ser.errors}, status=400)

        payment_account = ser.validated_data['payment_account']
        dept = invoice.department or 'General'
        amount = invoice.amount

        try:
            with transaction.atomic():
                # Zero-amount: skip journal entries (debit=0/credit=0 violates DB constraint)
                if amount == 0:
                    invoice.status = Invoice.Status.SETTLED
                    invoice.save(update_fields=['status', 'updated_at'])
                    if invoice.outstanding:
                        invoice.outstanding.status = Outstanding.Status.PAID
                        invoice.outstanding.save(update_fields=['status', 'updated_at'])
                    return api_success(
                        InvoiceSerializer(invoice).data,
                        message=f'Invoice #{invoice.pk} settled (zero amount).',
                    )

                account_ledger = payment_account.get_or_create_ledger()

                if invoice.type == Invoice.InvoiceType.SALES:
                    # Sales income ledger (department-wise)
                    income_ledger, _ = Ledger.objects.get_or_create(
                        name=f'{dept} Income',
                        defaults={'type': Ledger.LedgerType.INCOME},
                    )
                    entry = JournalEntry.objects.create(
                        date=date.today(),
                        description=f'Settlement – Sales Invoice #{invoice.pk} | {invoice.party_name}',
                    )
                    # Bank Dr (asset increases)
                    JournalItem.objects.create(
                        entry=entry, ledger=account_ledger,
                        debit=amount, credit=0,
                        department=dept, notes=f'Invoice #{invoice.pk}',
                    )
                    # Sales Cr (income recognised)
                    JournalItem.objects.create(
                        entry=entry, ledger=income_ledger,
                        debit=0, credit=amount,
                        department=dept, notes=f'Invoice #{invoice.pk}',
                    )
                    # Income record → Finance Dashboard & Income tab
                    Income.objects.create(
                        amount=amount, category=income_ledger, account=payment_account,
                        date=date.today(), department=dept,
                        description=f'Sales Invoice #{invoice.pk} — {invoice.party_name}',
                        journal_entry=entry,
                    )

                else:  # PURCHASE
                    # Purchase expense ledger (department-wise)
                    expense_ledger, _ = Ledger.objects.get_or_create(
                        name=f'{dept} Expense',
                        defaults={'type': Ledger.LedgerType.EXPENSE},
                    )
                    entry = JournalEntry.objects.create(
                        date=date.today(),
                        description=f'Settlement – Purchase Bill #{invoice.pk} | {invoice.party_name}',
                    )
                    # Expense Dr (cost recognised)
                    JournalItem.objects.create(
                        entry=entry, ledger=expense_ledger,
                        debit=amount, credit=0,
                        department=dept, notes=f'Invoice #{invoice.pk}',
                    )
                    # Bank Cr (asset decreases)
                    JournalItem.objects.create(
                        entry=entry, ledger=account_ledger,
                        debit=0, credit=amount,
                        department=dept, notes=f'Invoice #{invoice.pk}',
                    )
                    # Expense record → Finance Dashboard & Expense tab
                    Expense.objects.create(
                        amount=amount, category=expense_ledger, account=payment_account,
                        date=date.today(), department=dept,
                        description=f'Purchase Bill #{invoice.pk} — {invoice.party_name}',
                        journal_entry=entry,
                    )

                # Mark invoice settled
                invoice.status = Invoice.Status.SETTLED
                invoice.journal_entry = entry
                invoice.save(update_fields=['status', 'journal_entry', 'updated_at'])

                # Mark linked outstanding settled
                if invoice.outstanding:
                    invoice.outstanding.status = Outstanding.Status.PAID
                    invoice.outstanding.settlement_journal = entry
                    invoice.outstanding.settlement_account = payment_account
                    invoice.outstanding.save(update_fields=['status', 'settlement_journal', 'settlement_account', 'updated_at'])

            logger.info(
                'Invoice #%s settled → JournalEntry #%s (account: %s, ₹%s)',
                invoice.pk, entry.pk, payment_account.name, amount,
            )
            return api_success(
                InvoiceSerializer(invoice).data,
                message=f'Invoice #{invoice.pk} settled. Journal entry #{entry.pk} created.',
            )

        except Exception as exc:
            logger.error('Invoice settlement failed: %s', exc, exc_info=True)
            return Response({'success': False, 'message': str(exc)}, status=400)


class InvoiceFromOrdersView(APIView):
    """
    POST /api/accounting/invoices/from-orders/
    Body:
      order_ids     : list[int]   – IDs of Order objects to invoice
      party_name    : str
      department    : str
      due_date      : date | null
      description   : str
      invoice_mode  : 'combined' | 'per_order'   (default: combined)
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        order_ids    = request.data.get('order_ids', [])
        party_name   = request.data.get('party_name', '').strip()
        department   = request.data.get('department', '').strip()
        due_date     = request.data.get('due_date') or None
        description     = request.data.get('description', '').strip()
        invoice_mode    = request.data.get('invoice_mode', 'combined')
        unit_type       = request.data.get('unit_type', '').strip() or None  # optional override
        amount_override = request.data.get('amount_override')  # optional manual amount (combined mode)

        if not order_ids:
            return Response({'success': False, 'message': 'No order_ids provided.'}, status=400)
        if not party_name:
            return Response({'success': False, 'message': 'party_name is required.'}, status=400)
        if invoice_mode not in ('combined', 'per_order'):
            return Response({'success': False, 'message': 'invoice_mode must be combined or per_order.'}, status=400)

        orders = list(Order.objects.filter(id__in=order_ids).prefetch_related('items__product'))
        if not orders:
            return Response({'success': False, 'message': 'No matching orders found.'}, status=404)

        def _build_order_ref(o):
            name = (
                f'PICKLIST-{o.picklist_number}' if o.order_source == 'picklist' and o.picklist_number
                else f'CUSTOM-{o.id}'
            )
            items = list(o.items.all())
            total_qty = sum(item.quantity for item in items)

            # Use product.invoice_price when every item has one set > 0
            priced_items = [
                item for item in items
                if item.product and float(item.product.invoice_price or 0) > 0
            ]
            if priced_items and len(priced_items) == len(items):
                computed_total = sum(
                    float(item.product.invoice_price) * item.quantity for item in items
                )
                rate = round(computed_total / total_qty, 2) if total_qty else 0
            else:
                total_float = float(o.total)
                computed_total = total_float
                rate = round(total_float / total_qty, 2) if total_qty else total_float

            return {
                'id': o.id,
                'name': name,
                'order_source': o.order_source,
                'picklist_number': o.picklist_number,
                'total': str(round(computed_total, 2)),
                'units': unit_type or o.units or 'Pieces',
                'quantity': total_qty,
                'rate': str(rate),
                'order_type': o.order_type or '',
            }

        def _create_single_invoice(amount, refs, desc):
            outstanding_type = Outstanding.OutstandingType.RECEIVABLE
            outstanding = Outstanding.objects.create(
                type=outstanding_type,
                party_name=party_name,
                amount=amount,
                department=department,
                due_date=due_date,
                description=desc or f'Sales invoice for {party_name}',
                status=Outstanding.Status.PENDING,
            )
            invoice = Invoice.objects.create(
                type=Invoice.InvoiceType.SALES,
                party_name=party_name,
                amount=amount,
                department=department,
                due_date=due_date,
                description=desc,
                status=Invoice.Status.PENDING,
                outstanding=outstanding,
                order_refs=refs,
            )
            return invoice

        try:
            with transaction.atomic():
                created_invoices = []

                if invoice_mode == 'combined':
                    refs = [_build_order_ref(o) for o in orders]
                    computed_total = sum(Decimal(ref['total']) for ref in refs)
                    # Use manually overridden amount when provided and valid
                    if amount_override is not None:
                        try:
                            override_val = Decimal(str(amount_override))
                            total_amount = override_val if override_val > 0 else computed_total
                        except Exception:
                            total_amount = computed_total
                    else:
                        total_amount = computed_total
                    order_names = ', '.join(r['name'] for r in refs)
                    desc = description or f'Combined invoice: {order_names}'
                    inv = _create_single_invoice(total_amount, refs, desc)
                    created_invoices.append(inv)
                else:  # per_order
                    for o in orders:
                        ref = _build_order_ref(o)
                        amount = Decimal(ref['total'])
                        desc = description or f'Invoice for {ref["name"]}'
                        inv = _create_single_invoice(amount, [ref], desc)
                        created_invoices.append(inv)

            logger.info(
                'InvoiceFromOrders: created %d invoice(s) for order_ids=%s mode=%s',
                len(created_invoices), order_ids, invoice_mode,
            )
            return api_success(
                InvoiceSerializer(created_invoices, many=True).data,
                message=f'{len(created_invoices)} invoice(s) created.',
                status_code=201,
            )

        except Exception as exc:
            logger.error('InvoiceFromOrders failed: %s', exc, exc_info=True)
            return Response({'success': False, 'message': str(exc)}, status=400)

# ---------------------------------------------------------------------------
# Bank Statement Import  (parses file → stores as BankTransaction staging rows)
# ---------------------------------------------------------------------------

class BankImportPreviewView(APIView):
    """
    POST /api/accounting/bank-import/preview/
    Accepts: multipart/form-data
      - file: statement file (CSV / TXT / Excel / PDF)
      - bank_account_id: int  — BankAccount PK  (preferred)
                                OR Ledger PK for legacy callers

    Behaviour:
      1. Parses the file.
      2. For each row, get_or_create a BankTransaction (duplicate guard via unique_hash).
      3. Returns the saved BankTransaction rows so the frontend can show them.
      4. Also returns all ledgers for dropdowns.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        import hashlib
        from decimal import Decimal as _D

        csv_file = request.FILES.get('file')
        bank_account_id = request.data.get('bank_account_id')

        if not csv_file:
            return Response({'success': False, 'message': 'No file provided.'}, status=400)
        if not bank_account_id:
            return Response({'success': False, 'message': 'bank_account_id is required.'}, status=400)

        try:
            bank_account_id = int(bank_account_id)
        except (ValueError, TypeError):
            return Response({'success': False, 'message': 'Invalid bank_account_id.'}, status=400)

        # Resolve BankAccount — create one on-the-fly if using legacy Ledger PK
        bank_account = None
        try:
            bank_account = BankAccount.objects.get(pk=bank_account_id)
        except BankAccount.DoesNotExist:
            # Fallback: maybe it's a Ledger PK (old callers)
            try:
                ledger = Ledger.objects.get(pk=bank_account_id)
                bank_account, _ = BankAccount.objects.get_or_create(
                    name=ledger.name,
                    defaults={
                        'bank_name': '',
                        'account_number': '',
                        'opening_balance': _D('0'),
                        'ledger': ledger,
                    },
                )
            except Ledger.DoesNotExist:
                return Response({'success': False, 'message': 'Invalid bank_account_id — no BankAccount or Ledger found.'}, status=400)

        file_type = request.data.get('file_type', 'csv').lower().strip()

        try:
            file_bytes = csv_file.read()
            rows = parse_file(file_bytes, file_type=file_type)
        except ValueError as exc:
            return Response({'success': False, 'message': str(exc)}, status=400)
        except Exception as exc:
            logger.exception('File parse error')
            return Response({'success': False, 'message': f'Failed to parse file: {str(exc)}'}, status=500)

        if not rows:
            return Response({'success': False, 'message': 'No valid rows found in the file.'}, status=400)

        # Get classification rules from the service
        from .services.bank_import_service import classify_description, INCOME_LEDGER_NAME, FALLBACK_EXPENSE_LEDGER_NAME
        all_ledgers = {l.name: l for l in Ledger.objects.all()}

        created_count = 0
        skipped_count = 0
        saved_rows = []

        for row in rows:
            amount_float = float(row['amount'])
            abs_amount = abs(amount_float)

            # Build unique hash
            raw = f"{row['date']}|{amount_float}|{row['description']}".strip().lower()
            unique_hash = hashlib.sha256(raw.encode()).hexdigest()[:64]

            # Classify
            ledger_name, tx_type = classify_description(row['description'])
            if tx_type is None:
                if amount_float < 0:
                    ledger_name = FALLBACK_EXPENSE_LEDGER_NAME
                else:
                    ledger_name = INCOME_LEDGER_NAME
            suggested_ledger = all_ledgers.get(ledger_name)

            tx_kind = BankTransaction.TxType.DEBIT if amount_float < 0 else BankTransaction.TxType.CREDIT

            tx, created = BankTransaction.objects.get_or_create(
                unique_hash=unique_hash,
                defaults={
                    'bank_account': bank_account,
                    'date': row['date'],
                    'description': row['description'],
                    'amount': _D(str(abs_amount)),
                    'type': tx_kind,
                    'status': BankTransaction.Status.UNPROCESSED,
                    'suggested_ledger': suggested_ledger,
                },
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1
            saved_rows.append(tx)

        ledgers = list(Ledger.objects.values('id', 'name', 'type').order_by('name'))
        from .serializers import BankTransactionSerializer as BTSer
        return api_success({
            'rows': BTSer(saved_rows, many=True).data,
            'ledgers': ledgers,
            'bank_account_id': bank_account.pk,
            'created': created_count,
            'skipped_duplicates': skipped_count,
        })


class BankImportConfirmView(APIView):
    """
    POST /api/accounting/bank-import/confirm/
    Accepts: application/json
    Body:
      {
        bank_account_id: int,
        transactions: [
          {
            date: "YYYY-MM-DD",
            description: str,
            amount: float,
            ledger_id: int,
            department: str (optional),
            import_hash: str
          },
          ...
        ]
      }

    Creates JournalEntry + JournalItems for each confirmed transaction.
    Skips duplicates (import_hash already exists).
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        bank_account_id = request.data.get('bank_account_id')
        transactions = request.data.get('transactions', [])

        if not bank_account_id:
            return Response({'success': False, 'message': 'bank_account_id is required.'}, status=400)
        if not isinstance(transactions, list) or len(transactions) == 0:
            return Response({'success': False, 'message': 'No transactions provided.'}, status=400)

        try:
            bank_account_id = int(bank_account_id)
        except (ValueError, TypeError):
            return Response({'success': False, 'message': 'Invalid bank_account_id.'}, status=400)

        try:
            result = confirm_import(transactions, bank_account_id)
        except ValueError as exc:
            return Response({'success': False, 'message': str(exc)}, status=400)
        except Exception as exc:
            logger.exception('Bank import confirm error')
            return Response({'success': False, 'message': 'Import failed.'}, status=500)

        return api_success(result, message=f"{result['created']} entries created, {result['skipped_duplicates']} duplicates skipped.")


# ---------------------------------------------------------------------------
# Banking Module — BankAccount CRUD
# ---------------------------------------------------------------------------

class BankAccountListView(APIView):
    """
    GET  /api/accounting/bank-accounts/        — list all bank accounts with computed balances
    POST /api/accounting/bank-accounts/        — create a new bank account
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        accounts = BankAccount.objects.prefetch_related('transactions').all()
        return api_success(BankAccountSerializer(accounts, many=True).data)

    def post(self, request):
        ser = BankAccountCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # Auto-create a linked Ledger (Asset type) if not provided
        ledger = ser.validated_data.get('ledger')
        if not ledger:
            name = ser.validated_data['name']
            ledger, _ = Ledger.objects.get_or_create(
                name=f'{name} Account',
                defaults={'type': 'asset'},
            )
            ser.validated_data['ledger'] = ledger

        account = ser.save()
        return api_success(BankAccountSerializer(account).data, message='Bank account created.')


class BankAccountDetailView(APIView):
    """
    GET    /api/accounting/bank-accounts/<pk>/
    PATCH  /api/accounting/bank-accounts/<pk>/
    DELETE /api/accounting/bank-accounts/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def _get(self, pk):
        try:
            return BankAccount.objects.get(pk=pk)
        except BankAccount.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({'success': False, 'message': 'Not found.'}, status=404)
        return api_success(BankAccountSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({'success': False, 'message': 'Not found.'}, status=404)
        ser = BankAccountCreateSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return api_success(BankAccountSerializer(obj).data, message='Updated.')

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({'success': False, 'message': 'Not found.'}, status=404)
        obj.delete()
        return api_success({}, message='Deleted.')


# ---------------------------------------------------------------------------
# Banking Module — BankTransaction list + detail
# ---------------------------------------------------------------------------

class BankTransactionListView(APIView):
    """
    GET /api/accounting/bank-transactions/
    Query params: bank_account, status, date_from, date_to, search
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def get(self, request):
        qs = BankTransaction.objects.select_related('bank_account', 'suggested_ledger', 'journal_entry').all()

        bank_account = request.query_params.get('bank_account')
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        search = request.query_params.get('search', '').strip()

        if bank_account:
            qs = qs.filter(bank_account_id=bank_account)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(description__icontains=search)

        # Counts for header
        total = qs.count()
        unprocessed = qs.filter(status=BankTransaction.Status.UNPROCESSED).count()

        data = BankTransactionSerializer(qs, many=True).data
        return api_success({'transactions': data, 'total': total, 'unprocessed': unprocessed})


class BankTransactionDetailView(APIView):
    """
    PATCH  /api/accounting/bank-transactions/<pk>/   — update ledger/department suggestion
    DELETE /api/accounting/bank-transactions/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def patch(self, request, pk):
        try:
            obj = BankTransaction.objects.get(pk=pk)
        except BankTransaction.DoesNotExist:
            return Response({'success': False, 'message': 'Not found.'}, status=404)

        ledger_id = request.data.get('suggested_ledger')
        department = request.data.get('department')
        if ledger_id is not None:
            obj.suggested_ledger_id = ledger_id or None
        if department is not None:
            obj.department = department
        obj.save(update_fields=['suggested_ledger_id', 'department'])
        return api_success(BankTransactionSerializer(obj).data)

    def delete(self, request, pk):
        try:
            obj = BankTransaction.objects.get(pk=pk)
        except BankTransaction.DoesNotExist:
            return Response({'success': False, 'message': 'Not found.'}, status=404)
        obj.delete()
        return api_success({}, message='Deleted.')


class BankTransactionBulkDeleteView(APIView):
    """DELETE /api/accounting/bank-transactions/bulk-delete/"""
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'success': False, 'message': 'No ids provided.'}, status=400)
        deleted, _ = BankTransaction.objects.filter(pk__in=ids).delete()
        return api_success({'deleted': deleted}, message=f'{deleted} transaction(s) deleted.')


# ---------------------------------------------------------------------------
# Banking Module — Convert to Journal
# ---------------------------------------------------------------------------

class BankTransactionConvertView(APIView):
    """
    POST /api/accounting/bank-transactions/convert/

    Body: [{ transaction_id, ledger_id, department (optional) }, ...]

    Creates one JournalEntry per transaction using double-entry bookkeeping.
    """
    permission_classes = [permissions.IsAuthenticated, SaaSResourcePermission, RequiresFeature]
    required_feature_code = 'accountancy'

    def post(self, request):
        items = request.data
        if not isinstance(items, list) or len(items) == 0:
            return Response({'success': False, 'message': 'Send a non-empty list of conversions.'}, status=400)

        created_count = 0
        skipped_count = 0
        errors = []

        with transaction.atomic():
            for item in items:
                tx_id = item.get('transaction_id')
                ledger_id = item.get('ledger_id')
                department = item.get('department', '') or None

                if not tx_id or not ledger_id:
                    errors.append(f'transaction_id and ledger_id are required (got {item}).')
                    continue

                try:
                    tx = BankTransaction.objects.select_related('bank_account__ledger').get(pk=tx_id)
                except BankTransaction.DoesNotExist:
                    errors.append(f'Transaction id={tx_id} not found.')
                    continue

                if tx.status == BankTransaction.Status.PROCESSED:
                    skipped_count += 1
                    continue

                try:
                    counter_ledger = Ledger.objects.get(pk=ledger_id)
                except Ledger.DoesNotExist:
                    errors.append(f'Ledger id={ledger_id} not found.')
                    continue

                bank_ledger = tx.bank_account.ledger
                if not bank_ledger:
                    errors.append(f'BankAccount "{tx.bank_account.name}" has no linked ledger. Please assign one.')
                    continue

                abs_amount = abs(tx.amount)

                entry = JournalEntry.objects.create(
                    date=tx.date,
                    description=tx.description,
                )

                if tx.type == BankTransaction.TxType.DEBIT:
                    # Money OUT: Dr counter_ledger (expense), Cr bank_ledger
                    JournalItem.objects.create(entry=entry, ledger=counter_ledger, debit=abs_amount, credit=0, department=department)
                    JournalItem.objects.create(entry=entry, ledger=bank_ledger, debit=0, credit=abs_amount, department=department)
                else:
                    # Money IN: Dr bank_ledger, Cr counter_ledger (income)
                    JournalItem.objects.create(entry=entry, ledger=bank_ledger, debit=abs_amount, credit=0, department=department)
                    JournalItem.objects.create(entry=entry, ledger=counter_ledger, debit=0, credit=abs_amount, department=department)

                tx.journal_entry = entry
                tx.status = BankTransaction.Status.PROCESSED
                if department:
                    tx.department = department
                tx.save(update_fields=['journal_entry', 'status', 'department'])
                created_count += 1

        return api_success(
            {'created': created_count, 'skipped': skipped_count, 'errors': errors},
            message=f'{created_count} journal entr{"ies" if created_count != 1 else "y"} created.'
        )
