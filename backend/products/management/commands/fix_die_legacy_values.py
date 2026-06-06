"""
Management command: fix_die_legacy_values

Scans all Product records and splits any die_numbers / findings entries
that still use the old combined format  "code[qty][location]"  into their
proper  { value, quantity, location }  fields.

Usage:
    python manage.py fix_die_legacy_values           # dry-run (shows what would change)
    python manage.py fix_die_legacy_values --apply   # writes changes to the DB
"""

import re

from django.core.management.base import BaseCommand

from products.models import Product

# Matches: code[qty][location]  or  code[qty]
_PATTERN_3 = re.compile(r'^(.+?)\[([^\]]+)\]\[([^\]]*)\]$')
_PATTERN_2 = re.compile(r'^(.+?)\[([^\]]+)\]$')


def _parse_item(item: dict) -> dict:
    """Return a (possibly updated) copy of *item* with value/quantity/location split."""
    if not isinstance(item, dict):
        return item

    # Already has quantity or location – nothing to do
    if str(item.get('quantity') or '').strip() or str(item.get('location') or '').strip():
        return item

    value = str(item.get('value') or '').strip()

    m3 = _PATTERN_3.match(value)
    if m3:
        return {**item, 'value': m3.group(1).strip(), 'quantity': m3.group(2).strip(), 'location': m3.group(3).strip()}

    m2 = _PATTERN_2.match(value)
    if m2:
        return {**item, 'value': m2.group(1).strip(), 'quantity': m2.group(2).strip()}

    return item


def _fix_list(entries: list) -> tuple[list, bool]:
    """Returns (fixed_list, was_changed)."""
    if not isinstance(entries, list):
        return entries, False
    fixed = [_parse_item(e) for e in entries]
    changed = fixed != entries
    return fixed, changed


class Command(BaseCommand):
    help = 'Parse legacy combined die_numbers values (code[qty][location]) into separate fields.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help='Actually write changes to the database (default is dry-run).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        mode = 'APPLY' if apply else 'DRY-RUN'
        self.stdout.write(f'[{mode}] Scanning Product.die_numbers and Product.findings …\n')

        updated = 0
        scanned = 0

        for product in Product.objects.only('id', 'master_sku', 'die_numbers', 'findings').iterator(chunk_size=200):
            scanned += 1
            new_die, die_changed = _fix_list(product.die_numbers or [])
            new_findings, findings_changed = _fix_list(product.findings or [])

            if die_changed or findings_changed:
                updated += 1
                self.stdout.write(
                    f'  Product {product.id} ({product.master_sku}): '
                    f'die_numbers_changed={die_changed}, findings_changed={findings_changed}'
                )
                if apply:
                    update_fields = []
                    if die_changed:
                        product.die_numbers = new_die
                        update_fields.append('die_numbers')
                    if findings_changed:
                        product.findings = new_findings
                        update_fields.append('findings')
                    product.save(update_fields=update_fields)

        self.stdout.write(
            f'\n[{mode}] Done. Scanned {scanned} products, '
            f'{"updated" if apply else "would update"} {updated}.\n'
        )
        if not apply and updated:
            self.stdout.write('  Run with --apply to write these changes.\n')
