"""
Centralised image upload helper.

- When CLOUDINARY_URL env var is set (production), uploads to Cloudinary
  and returns the secure HTTPS URL.
- Otherwise, writes to MEDIA_ROOT on local disk (development).
"""

import os
import uuid

from django.conf import settings


def upload_image_file(image_file, folder: str) -> str:
    """
    Upload an image file and return its public URL.

    Args:
        image_file: Django InMemoryUploadedFile / TemporaryUploadedFile
        folder:     Logical folder name, e.g. "products/42" or "designers/7"

    Returns:
        Absolute URL string (Cloudinary https URL or relative /media/... path)
    """
    cloudinary_url = os.environ.get('CLOUDINARY_URL', '')

    if cloudinary_url:
        return _upload_to_cloudinary(image_file, folder)
    return _upload_to_local(image_file, folder)


def _upload_to_cloudinary(image_file, folder: str) -> str:
    import cloudinary
    import cloudinary.uploader

    result = cloudinary.uploader.upload(
        image_file,
        folder=folder,
        resource_type='image',
        overwrite=False,
    )
    return result['secure_url']


def _upload_to_local(image_file, folder: str) -> str:
    ext = os.path.splitext(image_file.name)[1].lower() or '.jpg'
    filename = f'{uuid.uuid4().hex}{ext}'
    upload_dir = os.path.join(settings.MEDIA_ROOT, folder)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, 'wb') as f:
        for chunk in image_file.chunks():
            f.write(chunk)

    return f'{settings.MEDIA_URL}{folder}/{filename}'
