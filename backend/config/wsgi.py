"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# Auto-apply any pending migrations on startup.
# This guarantees the DB schema is always up-to-date regardless of how
# the process manager (gunicorn / Render dashboard) invokes the app.
from django.core.management import call_command  # noqa: E402
try:
    call_command('migrate', '--noinput', verbosity=0)
except Exception:
    pass
