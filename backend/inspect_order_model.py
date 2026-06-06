import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from orders.models import Order
for f in Order._meta.fields:
    print(f.name, f.get_internal_type())
