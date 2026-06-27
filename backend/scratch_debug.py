import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobs.models import Job
from products.models import Product as ProductModel
from inventory.models import DieInventoryItem, PicklistItem, PicklistGroup, ProductInventoryItem, InventoryTransaction
from django.db.models.functions import Upper
from django.db.models import Q

try:
    try:
        job = Job.objects.get(id=438)
        print("Successfully loaded Job 438:", job.voucher_no)
    except Job.DoesNotExist:
        job = Job.objects.first()
        if not job:
            print("Error: No jobs exist in the database.")
            exit(1)
        print(f"Job 438 not found. Using first available Job {job.id}: {job.voucher_no}")

    # Let's run the exact view logic:
    picklist_ids = []
    if job.picklist_group_id:
        picklist_ids.append(job.picklist_group_id)
    
    notes = job.notes or ""
    if "Combined Picklists:" in notes:
        line = [l for l in notes.split('\n') if "Combined Picklists:" in l][0]
        numbers_str = line.replace("Combined Picklists:", "").strip()
        numbers = [int(num.strip()) for num in numbers_str.split(',') if num.strip().isdigit()]
        if numbers:
            combined_groups = PicklistGroup.objects.filter(number__in=numbers).values_list('id', flat=True)
            for pg_id in combined_groups:
                if pg_id not in picklist_ids:
                    picklist_ids.append(pg_id)

    sku_needed_map = {}
    if picklist_ids:
        for item in PicklistItem.objects.filter(group__in=picklist_ids).only('sku', 'needed'):
            sku = item.sku.strip()
            if sku:
                sku_needed_map[sku.upper()] = sku_needed_map.get(sku.upper(), 0) + (item.needed or 0)

    if not sku_needed_map:
        for row in (job.material_rows or []):
            sku = row.get('sku', '').strip()
            if sku:
                try:
                    qty = int(row.get('issued_qty') or row.get('qty') or 1)
                except (ValueError, TypeError):
                    qty = 1
                sku_needed_map[sku.upper()] = sku_needed_map.get(sku.upper(), 0) + qty

    print("sku_needed_map built:", sku_needed_map)

    if not sku_needed_map:
        print("No SKUs needed, exiting.")
        exit(0)

    upper_skus = list(sku_needed_map.keys())

    exact_prods = (
        ProductModel.objects
        .annotate(upper_sku=Upper('master_sku'))
        .filter(upper_sku__in=upper_skus)
        .only('master_sku', 'die_numbers', 'images')
    )
    products_map = {p.master_sku.upper(): p for p in exact_prods}

    unmatched = [s for s in upper_skus if s not in products_map and '/' in s]
    if unmatched:
        prefix_to_variants = {}
        for s in unmatched:
            prefix_to_variants.setdefault(s.split('/')[0], []).append(s)
        prefix_prods = (
            ProductModel.objects
            .annotate(upper_sku=Upper('master_sku'))
            .filter(upper_sku__in=prefix_to_variants.keys())
            .only('master_sku', 'die_numbers', 'images')
        )
        for p in prefix_prods:
            for variant in prefix_to_variants.get(p.master_sku.upper(), []):
                if variant not in products_map:
                    products_map[variant] = p

    print("products_map fetched:", list(products_map.keys()))

    product_qty_map = {}
    product_obj_map = {}
    for upper_sku, needed_qty in sku_needed_map.items():
        if needed_qty <= 0:
            continue
        product = products_map.get(upper_sku)
        if not product:
            continue
        product_qty_map[product.id] = product_qty_map.get(product.id, 0) + needed_qty
        product_obj_map[product.id] = product

    product_ids = list(product_qty_map.keys())
    print("product_ids:", product_ids)

    # 3. Fetch Product Locations
    prod_inv_locations = {}
    if product_ids:
        inv_items = ProductInventoryItem.objects.filter(product_id__in=product_ids).only('product_id', 'location')
        for item in inv_items:
            if item.location:
                prod_inv_locations.setdefault(item.product_id, set()).add(item.location.strip())

    prod_txn_locations = {}
    if product_ids:
        txns = (
            InventoryTransaction.objects
            .filter(product_id__in=product_ids, stage__icontains='final')
            .exclude(location='')
            .values('product_id', 'location', 'created_at')
            .order_by('product_id', 'created_at')
        )
        for txn in txns:
            if txn['location']:
                prod_txn_locations.setdefault(txn['product_id'], set()).add(txn['location'].strip())

    def get_product_location(prod_id):
        locs = prod_inv_locations.get(prod_id, set())
        if not locs:
            locs = prod_txn_locations.get(prod_id, set())
        if locs:
            return " | ".join(sorted(list(locs)))
        return ""

    # 4. Fetch DieInventoryItem
    all_die_codes = set()
    for product in product_obj_map.values():
        if isinstance(product.die_numbers, list):
            for entry in product.die_numbers:
                if isinstance(entry, dict):
                    die_code = str(entry.get('value') or '').strip()
                    if die_code:
                        all_die_codes.add(die_code)

    print("all_die_codes:", all_die_codes)

    die_inv_map = {
        d.die_code: d
        for d in DieInventoryItem.objects
        .filter(die_code__in=all_die_codes)
        .only('die_code', 'image', 'location', 'designer_skus', 'wax_piece_location', 'wax_setting_location', 'casting_location')
    }
    print("die_inv_map keys:", list(die_inv_map.keys()))

    def make_absolute(url):
        if not url:
            return None
        if isinstance(url, dict):
            url = url.get('url') or url.get('src') or ''
        url = str(url).strip()
        if not url:
            return None
        return url

    die_details_map = {}
    for die_code in all_die_codes:
        inv = die_inv_map.get(die_code)
        raw_img = (inv.image or '') if inv else ''
        imgs = []
        if raw_img:
            if raw_img.startswith('['):
                try:
                    import json
                    parsed = json.loads(raw_img)
                    if isinstance(parsed, list):
                        imgs = [str(x) for x in parsed]
                    else:
                        imgs = [str(parsed)]
                except Exception:
                    imgs = [raw_img]
            elif ',' in raw_img:
                imgs = [x.strip() for x in raw_img.split(',') if x.strip()]
            else:
                imgs = [raw_img]

        resolved_imgs = []
        for img in imgs:
            abs_img = make_absolute(img)
            if abs_img:
                resolved_imgs.append(abs_img)

        die_details_map[die_code] = {
            'die_code': die_code,
            'image': resolved_imgs[0] if resolved_imgs else '',
            'images': resolved_imgs,
            'location': (inv.location or '') if inv else '',
            'wax_piece_location': (inv.wax_piece_location or '') if inv else '',
            'wax_setting_location': (inv.wax_setting_location or '') if inv else '',
            'casting_location': (inv.casting_location or '') if inv else '',
        }

    result = []
    for product_id, total_qty in product_qty_map.items():
        product = product_obj_map[product_id]
        raw_images = product.images if isinstance(product.images, list) else []
        resolved_product_imgs = [make_absolute(img) for img in raw_images]
        resolved_product_imgs = [img for img in resolved_product_imgs if img]
        product_location = get_product_location(product_id)
        
        related_dies = []
        if isinstance(product.die_numbers, list):
            for entry in product.die_numbers:
                if not isinstance(entry, dict):
                    continue
                die_code = str(entry.get('value') or '').strip()
                if not die_code:
                    continue
                try:
                    qty_per_piece = float(entry.get('quantity') or 0)
                except (ValueError, TypeError):
                    qty_per_piece = 0.0
                if qty_per_piece <= 0:
                    continue
                
                die_qty = qty_per_piece * total_qty
                die_qty_formatted = int(die_qty) if die_qty == int(die_qty) else round(die_qty, 2)
                qty_per_piece_formatted = int(qty_per_piece) if qty_per_piece == int(qty_per_piece) else round(qty_per_piece, 2)
                
                die_details = die_details_map.get(die_code, {
                    'die_code': die_code,
                    'image': '',
                    'images': [],
                    'location': '',
                    'wax_piece_location': '',
                    'wax_setting_location': '',
                    'casting_location': '',
                })
                
                related_dies.append({
                    **die_details,
                    'qty_per_piece': qty_per_piece_formatted,
                    'qty_needed': die_qty_formatted,
                })
        
        qty_formatted = int(total_qty) if total_qty == int(total_qty) else round(total_qty, 2)
        
        result.append({
            'master_sku': product.master_sku,
            'quantity': qty_formatted,
            'location': product_location,
            'images': resolved_product_imgs,
            'dies': related_dies,
        })

    print("SUCCESS! Final result data structure built.")
    print("Result sample:", result[:1])

except Exception as e:
    print("CRITICAL ERROR ENCOUNTERED:")
    traceback.print_exc()
