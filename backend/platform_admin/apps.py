from django.apps import AppConfig


class PlatformAdminConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'platform_admin'

    def ready(self):
        # Register cross-app cache-invalidation signals (after all apps loaded)
        from platform_admin.signals import register_override_cache_signals
        register_override_cache_signals()
