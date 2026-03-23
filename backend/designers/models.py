from django.db import models
from common.models import AuditModel


class DesignerSheet(AuditModel):
    """Stores designer data linked to a product SKU."""

    sku = models.CharField(max_length=60, unique=True)

    # ── Images / Drawings ────────────────────────────────────────────────────
    rendered_photo = models.TextField(blank=True, default='')      # Rendered Photo (URL/base64)
    technical_drawing = models.TextField(blank=True, default='')   # Technical Drawing (URL/base64)

    # ── Design Identity ───────────────────────────────────────────────────────
    design_code = models.CharField(max_length=120, blank=True, default='')
    master_number = models.CharField(max_length=120, blank=True, default='')

    # ── Die & Mold ────────────────────────────────────────────────────────────
    die_code = models.CharField(max_length=120, blank=True, default='')
    mold_qty_per_die = models.CharField(max_length=60, blank=True, default='')
    cpx_dead_weight = models.CharField(max_length=60, blank=True, default='')

    # ── Physical Dimensions ───────────────────────────────────────────────────
    design_motive_size = models.CharField(max_length=120, blank=True, default='')
    total_design_measurements = models.CharField(max_length=120, blank=True, default='')

    # ── Material ─────────────────────────────────────────────────────────────
    design_material = models.CharField(max_length=120, blank=True, default='')

    # ── Stone Information (list of stones per SKU) ───────────────────────────
    # Each entry: {name, material, color, cut, size, quantity, weight}
    stone_entries = models.JSONField(default=list, blank=True)

    # ── Mechanism ─────────────────────────────────────────────────────────────
    mechanism = models.CharField(max_length=120, blank=True, default='')

    # ── Findings (list of findings per SKU) ──────────────────────────────────
    # Each entry: {code, die, size, quantity, weight}
    findings_entries = models.JSONField(default=list, blank=True)

    # ── Legacy / kept for backward compat ────────────────────────────────────
    image = models.TextField(blank=True, default='')
    tdm_file = models.TextField(blank=True, default='')   # stores Google Drive link for 3DM
    stl_file = models.TextField(blank=True, default='')   # stores Google Drive link for STL
    tdm_status = models.CharField(max_length=255, blank=True, default='')
    stl_status = models.CharField(max_length=255, blank=True, default='')
    render_status = models.CharField(max_length=255, blank=True, default='')
    print_3d_status = models.CharField(max_length=255, blank=True, default='')
    die_entries = models.JSONField(default=list, blank=True)

    # ── Designer Panel – multi-image slots ───────────────────────────────────
    designer_image_2 = models.TextField(blank=True, default='')  # second image slot
    designer_image_3 = models.TextField(blank=True, default='')  # third image slot

    # ── Design Stage ─────────────────────────────────────────────────────────
    # Tracks which stage the product is currently at in the design pipeline.
    # Values: '' | '3DM' | 'STL' | 'RENDER' | '3D PRINT' | 'COMPLETE'
    design_stage = models.CharField(max_length=50, blank=True, default='')

    # ── Tracking Table ───────────────────────────────────────────────────────
    # Each row: {id, tdm, stl, designCode, masterNumber, dieCode, moldDieQty}
    tracking_rows = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'Designer – {self.sku}'
