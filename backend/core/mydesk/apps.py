from django.apps import AppConfig


class MyDeskConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.mydesk'
    label = 'mydesk'
    verbose_name = 'MyDesk'
