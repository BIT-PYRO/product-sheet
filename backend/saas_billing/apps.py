from django.apps import AppConfig


class SaasBillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_billing'

    def ready(self):
        # Import and register generic file tracking signals
        from saas_billing.signals import register_file_tracking_signals
        register_file_tracking_signals()
