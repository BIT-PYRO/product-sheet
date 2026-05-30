from rest_framework import serializers

from .models import DesignerSheet

# Image fields that may arrive as base64 data URIs from bulk upload.
# Maps model field name → Cloudinary public_id (slot name within the folder).
_IMAGE_FIELDS = {
    'rendered_photo':    'rendered_photo',
    'technical_drawing': 'technical_drawing',
    'designer_image_2':  'designer_image_2',
    'designer_image_3':  'other_photo',
}


def _sku_to_folder(sku: str) -> str:
    """Convert a designer SKU to a safe Cloudinary folder path component."""
    safe = (sku or 'unknown').replace('/', '-').replace(' ', '-').strip('-')
    return f'designers/{safe or "unknown"}'


class DesignerSheetSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(required=False, allow_blank=True, default='', label='Designer SKU')

    def validate_sku(self, value):
        return value.strip() if value else ''

    def _process_images(self, validated_data, instance=None):
        """
        For each image field, if the incoming value is a base64 data URI,
        upload it to Cloudinary (or local storage in dev) and replace the
        value with the returned URL before saving to the database.

        - If the upload succeeds, stores the returned URL.
        - If the upload returns '' (unsupported MIME or error), the field is
          removed from validated_data so existing Cloudinary URLs are preserved
          on PATCH and the slot is left empty on POST.
        - Raw base64 blobs are never stored in the database.

        Folder: designers/{sku}/
        Public-id: slot name (rendered_photo / technical_drawing / other_photo)
        """
        from common.image_upload import upload_image_base64

        sku    = validated_data.get('sku') or (instance.sku if instance else '') or ''
        folder = _sku_to_folder(sku)

        for field, public_id in _IMAGE_FIELDS.items():
            val = validated_data.get(field)
            if val and isinstance(val, str) and val.startswith('data:image/'):
                result = upload_image_base64(val, folder=folder, public_id=public_id)
                if result and not result.startswith('data:image/'):
                    # Successfully uploaded — store the returned Cloudinary/local URL.
                    validated_data[field] = result
                else:
                    # Upload failed or unsupported MIME — don't store raw base64 in DB.
                    # For PATCH: removes the key so the existing URL is unchanged.
                    # For POST:  the model default ('') will be used.
                    validated_data.pop(field, None)
        return validated_data

    def create(self, validated_data):
        validated_data = self._process_images(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._process_images(validated_data, instance=instance)
        return super().update(instance, validated_data)

    class Meta:
        model = DesignerSheet
        fields = '__all__'


class DesignerSheetListSerializer(serializers.ModelSerializer):
    """Lean serializer for designer sheet list responses.

    This avoids returning large raw image/base64 payloads and other
    non-essential fields when loading the master designer sheet.
    """
    class Meta:
        model = DesignerSheet
        fields = [
            'id', 'sku', 'design_stage', 'motive_code', 'motive_sku',
            'rendered_photo', 'image', 'technical_drawing', 'designer_image_2', 'designer_image_3',
            'total_die_code', 'total_mold_qty_per_die', 'total_cpx_dead_weight',
            'total_design_measurements', 'design_material',
            'stone_entries', 'mechanism', 'findings_entries', 'plating_entries',
            'setting_type', 'enamel', 'tracking_rows', 'designer_notes',
            'is_active',
        ]
