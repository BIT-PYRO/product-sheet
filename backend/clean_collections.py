import os
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from products.models import Collection, Product
from django.db import transaction

def clean_collections():
    print("Starting database cleanup/migration for collections...")

    with transaction.atomic():
        # 1. Update Product collection fields (unscoped)
        prod_aarushaa = Product.unscoped_objects.filter(collection='Aarushaa Collection')
        aarushaa_count = prod_aarushaa.count()
        if aarushaa_count > 0:
            prod_aarushaa.update(collection='Arushaa')
            print(f"Updated {aarushaa_count} products: 'Aarushaa Collection' -> 'Arushaa'")
        else:
            print("No products found with collection 'Aarushaa Collection'")

        prod_janki = Product.unscoped_objects.filter(collection='Janki Silver925')
        janki_count = prod_janki.count()
        if janki_count > 0:
            prod_janki.update(collection='Janki 925')
            print(f"Updated {janki_count} products: 'Janki Silver925' -> 'Janki 925'")
        else:
            print("No products found with collection 'Janki Silver925'")

        # 2. Update/merge Collection table records (unscoped)
        all_collections = list(Collection.unscoped_objects.all())
        
        # We look for Aarushaa Collection
        for c in all_collections:
            if c.name == 'Aarushaa Collection':
                tenant_id = c.tenant_id
                # Check if 'Arushaa' already exists for this tenant
                exists = Collection.unscoped_objects.filter(name='Arushaa', tenant_id=tenant_id).exists()
                if exists:
                    print(f"Collection 'Arushaa' already exists for tenant {tenant_id}. Deleting 'Aarushaa Collection' (ID: {c.id}).")
                    c.delete()
                else:
                    print(f"Renaming Collection 'Aarushaa Collection' (ID: {c.id}) to 'Arushaa' for tenant {tenant_id}.")
                    c.name = 'Arushaa'
                    c.save()

            elif c.name == 'Janki Silver925':
                tenant_id = c.tenant_id
                # Check if 'Janki 925' already exists for this tenant
                exists = Collection.unscoped_objects.filter(name='Janki 925', tenant_id=tenant_id).exists()
                if exists:
                    print(f"Collection 'Janki 925' already exists for tenant {tenant_id}. Deleting 'Janki Silver925' (ID: {c.id}).")
                    c.delete()
                else:
                    print(f"Renaming Collection 'Janki Silver925' (ID: {c.id}) to 'Janki 925' for tenant {tenant_id}.")
                    c.name = 'Janki 925'
                    c.save()

        # Let's ensure standard collections exist for the default tenants (so that the lists match the image)
        # The collections in Master Product sheet:
        desired_names = ['Arushaa', 'Initials', 'Janki 925', 'Religious', 'Religious Murti', 'The Jaipur Edit', 'Wax Seal', 'Zodiac']
        from core_tenants.models import Tenant
        
        for tenant in Tenant.objects.all():
            print(f"\nVerifying collections for tenant: {tenant.name} ({tenant.id})")
            existing_names = set(Collection.unscoped_objects.filter(tenant=tenant).values_list('name', flat=True))
            for name in desired_names:
                if name not in existing_names:
                    Collection.unscoped_objects.create(name=name, tenant=tenant)
                    print(f"Created collection '{name}' for tenant {tenant.id}")

    print("\nDatabase cleanup/migration finished successfully!")

if __name__ == '__main__':
    clean_collections()
