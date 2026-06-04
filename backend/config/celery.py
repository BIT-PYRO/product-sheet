import os

from celery import Celery


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

from celery.schedules import crontab

app.conf.beat_schedule = {
    'aggregate-tenant-usage-nightly': {
        'task': 'saas_billing.tasks.usage_aggregation.aggregate_all_tenants',
        'schedule': crontab(hour=0, minute=0),  # Run daily at midnight
    },
    'reconcile-tenant-storage-nightly': {
        'task': 'saas_billing.tasks.usage_aggregation.reconcile_tenant_storage',
        'schedule': crontab(hour=1, minute=0),  # Run daily at 1am
    },
}
