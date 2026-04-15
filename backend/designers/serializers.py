from rest_framework import serializers

from .models import DesignerSheet

# Image fields that may arrive as base64 data URIs from bulk upload.
# Maps model field name → Cloudinary public_id (slot name within the folder).
_IMAGE_FIELDS = {
    'rendered_photo':    'rendered_photo',
    'technical_drawing': 'technical_drawing',
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

        Folder: designers/{sku}/
        Public-id: slot name (rendered_photo / technical_drawing / other_photo)
        """
        from common.image_upload import upload_image_base64

        sku    = validated_data.get('sku') or (instance.sku if instance else '') or ''
        folder = _sku_to_folder(sku)

        for field, public_id in _IMAGE_FIELDS.items():
            val = validated_data.get(field)
            if val and isinstance(val, str) and val.startswith('data:image/'):
                validated_data[field] = upload_image_base64(
                    val, folder=folder, public_id=public_id
                )
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
