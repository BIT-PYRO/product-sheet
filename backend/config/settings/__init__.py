import os


DJANGO_ENV = os.getenv('DJANGO_ENV', 'dev').lower()

if DJANGO_ENV == 'prod':
    from .prod import *  # noqa: F403
else:
    from .dev import *  # noqa: F403
