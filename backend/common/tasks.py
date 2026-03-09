from celery import shared_task

from drafts.models import Draft
from inventory.models import InventoryTransaction
from jobs.models import Job
from kyc.models import KYCRecord
from products.models import Product
from workforce.models import WorkforceMember


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def ping_task(self):
    return 'pong'


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def generate_operations_summary_task(self):
    return {
        'products_total': Product.objects.count(),
        'jobs_total': Job.objects.count(),
        'inventory_transactions_total': InventoryTransaction.objects.count(),
        'workforce_total': WorkforceMember.objects.count(),
        'kyc_total': KYCRecord.objects.count(),
        'drafts_total': Draft.objects.count(),
    }
