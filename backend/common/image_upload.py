"""
Centralised image upload helper.

- When CLOUDINARY_URL env var is set (production), uploads to Cloudinary
  and returns the secure HTTPS URL.
- Otherwise, writes to MEDIA_ROOT on local disk (development).

Functions
---------
upload_image_file(image_file, folder, public_id=None)
    Upload a Django file object (e.g. from request.FILES).

upload_image_base64(data_url, folder, public_id=None)
    Upload an image encoded as a base64 data URI string.
    If the value does not start with "data:image/", it is returned unchanged
    (already a URL, nothing to do).
"""

import base64
import io
import os
import uuid

from django.conf import settings


def _safe_folder(folder: str) -> str:
    """Strip leading/trailing slashes from a Cloudinary folder path."""
    return folder.strip('/')


def upload_image_file(image_file, folder: str, public_id: str = None) -> str:
    """
    Upload a Django file object and return its public URL.

    Args:
        image_file: Django InMemoryUploadedFile / TemporaryUploadedFile
        folder:     Cloudinary folder, e.g. "designers/SD-AM120-ST"
        public_id:  Optional Cloudinary public_id (filename without extension)
    """
    cloudinary_url = os.environ.get('CLOUDINARY_URL', '')
    if cloudinary_url:
        return _upload_to_cloudinary(image_file, folder, public_id)
    return _upload_to_local_file(image_file, folder, public_id)


def upload_image_base64(data_url: str, folder: str, public_id: str = None) -> str:
    """
    Upload an image encoded as a base64 data URI and return its public URL.

    If ``data_url`` does not start with "data:image/" it is returned unchanged
    (it's already a remote URL — no upload needed).

    Args:
        data_url:  "data:image/jpeg;base64,/9j/4AAQ…" string
        folder:    Cloudinary folder, e.g. "designers/SD-AM120-ST"
        public_id: Optional Cloudinary public_id (slot name such as "rendered_photo")
    """
    if not data_url or not data_url.startswith('data:image/'):
        return data_url  # already a URL or empty — nothing to do

    try:
        header, b64data = data_url.split(',', 1)
        # header looks like "data:image/jpeg;base64"
        mime = header.split(';')[0].split(':')[1].lower()  # e.g. "image/jpeg"
        ext  = mime.split('/')[1]
        if ext == 'jpeg':
            ext = 'jpg'

        image_bytes = base64.b64decode(b64data)
        file_name   = f'{public_id or uuid.uuid4().hex}.{ext}'

        cloudinary_url = os.environ.get('CLOUDINARY_URL', '')
        if cloudinary_url:
            return _upload_to_cloudinary(
                io.BytesIO(image_bytes),
                folder,
                public_id,
                file_name=file_name,
            )
        return _upload_to_local_bytes(image_bytes, folder, file_name)

    except Exception:
        # If anything goes wrong keep the original value rather than losing the image
        return data_url


# ── Internal helpers ──────────────────────────────────────────────────────────

def _upload_to_cloudinary(image_source, folder: str, public_id: str = None, file_name: str = None) -> str:
    import cloudinary
    import cloudinary.uploader

    kwargs = dict(
        folder=_safe_folder(folder),
        resource_type='image',
        overwrite=True,
    )
    if public_id:
        kwargs['public_id'] = public_id

    result = cloudinary.uploader.upload(image_source, **kwargs)
    return result['secure_url']


def _upload_to_local_file(image_file, folder: str, public_id: str = None) -> str:
    ext      = os.path.splitext(image_file.name)[1].lower() or '.jpg'
    filename = f'{public_id or uuid.uuid4().hex}{ext}'
    upload_dir = os.path.join(settings.MEDIA_ROOT, _safe_folder(folder))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, 'wb') as f:
        for chunk in image_file.chunks():
            f.write(chunk)

    return f'{settings.MEDIA_URL}{_safe_folder(folder)}/{filename}'


def _upload_to_local_bytes(image_bytes: bytes, folder: str, file_name: str) -> str:
    upload_dir = os.path.join(settings.MEDIA_ROOT, _safe_folder(folder))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, 'wb') as f:
        f.write(image_bytes)

    return f'{settings.MEDIA_URL}{_safe_folder(folder)}/{file_name}'
