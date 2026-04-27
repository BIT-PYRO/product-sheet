"""
Centralised image/document upload helper.

- When CLOUDINARY_URL env var is set, uploads to Cloudinary and returns the secure URL.
- If Cloudinary upload fails (bad credentials, network, etc.) it falls back to writing
  to MEDIA_ROOT on local disk so development always works.
- Otherwise (no CLOUDINARY_URL), writes to MEDIA_ROOT on local disk.

Functions
---------
upload_image_file(image_file, folder, public_id=None)
    Upload a Django file object (e.g. from request.FILES). Returns url string.

upload_image_base64(data_url, folder, public_id=None)
    Upload an image encoded as a base64 data URI string. Returns url string.

upload_document_base64(data_url, folder, public_id=None)
    Upload ANY file type (image OR PDF) encoded as a base64 data URI.
    Returns (url, error_message) tuple. url is '' on failure.
"""

import base64
import io
import logging
import os
import uuid

from django.conf import settings

logger = logging.getLogger(__name__)

# MIME sub-types that Cloudinary (and Pillow local fallback) can handle.
# EMF, WMF, BMP-variant strings etc. are NOT in this set — they get skipped.
_SUPPORTED_MIMES = {
    'jpeg', 'jpg', 'png', 'gif', 'webp',
    'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif',
    'ico', 'svg+xml',
}


def _normalize_cloudinary_document_url(url: str) -> str:
    """Normalize common Cloudinary document URL artifacts (e.g. .pdf.pdf)."""
    value = str(url or '')
    return value.replace('.pdf.pdf', '.pdf').replace('.jpg.jpg', '.jpg').replace('.png.png', '.png')


def _safe_folder(folder: str) -> str:
    """Strip leading/trailing slashes from a Cloudinary folder path."""
    return folder.strip('/')


def upload_image_file(image_file, folder: str, public_id: str = None) -> str:
    """
    Upload a Django file object and return its public URL.
    Falls back to local disk if Cloudinary fails. Returns '' on total failure.
    """
    cloudinary_url = os.environ.get('CLOUDINARY_URL', '')
    if cloudinary_url:
        url, err = _upload_to_cloudinary_safe(image_file, folder, public_id, resource_type='image')
        if err:
            logger.error('upload_image_file: Cloudinary error for folder=%r: %s. Falling back to local.', folder, err)
            return _upload_to_local_file(image_file, folder, public_id)
        return url
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

        # Reject formats Cloudinary cannot process (e.g. EMF, WMF pasted from clipboard).
        if ext not in _SUPPORTED_MIMES:
            logger.warning(
                'upload_image_base64: unsupported MIME type %r for folder=%r – skipping upload.',
                mime, folder,
            )
            return ''  # caller should treat '' as "no image" and not overwrite existing URL

        if ext == 'jpeg':
            ext = 'jpg'

        image_bytes = base64.b64decode(b64data)
        file_name   = f'{public_id or uuid.uuid4().hex}.{ext}'

        cloudinary_url = os.environ.get('CLOUDINARY_URL', '')
        if cloudinary_url:
            url, err = _upload_to_cloudinary_safe(
                io.BytesIO(image_bytes), folder, public_id, resource_type='image'
            )
            if err:
                logger.error('upload_image_base64: Cloudinary error for folder=%r: %s. Falling back to local.', folder, err)
                return _upload_to_local_bytes(image_bytes, folder, file_name)
            return url
        return _upload_to_local_bytes(image_bytes, folder, file_name)

    except Exception as exc:
        logger.error(
            'upload_image_base64: upload failed for folder=%r public_id=%r: %s',
            folder, public_id, exc,
        )
        return ''


def upload_document_base64(data_url: str, folder: str, public_id: str = None) -> tuple:
    """
    Upload any base64 data URI (image OR PDF/DOC) and return (url, error_message).

    - data:image/* → uploaded as image, falls back to local on Cloudinary failure
    - data:application/pdf etc. → uploaded as raw, falls back to local on failure
    - Already a URL (https://...) → returned unchanged with no error

    Returns:
        (url_string, None)   on success
        ('', error_string)   on failure
    """
    if not data_url:
        return '', 'No document data provided.'

    if not data_url.startswith('data:'):
        # Already a URL — nothing to upload
        return data_url, None

    # data:image/* — delegate to image handler
    if data_url.startswith('data:image/'):
        url = upload_image_base64(data_url, folder=folder, public_id=public_id)
        if url:
            return url, None
        return '', 'Image upload failed. Ensure the file is a valid JPEG, PNG or WebP image.'

    # Non-image (PDF, DOC, etc.)
    try:
        header, b64data = data_url.split(',', 1)
        mime = header.split(';')[0].split(':')[1].lower()  # e.g. "application/pdf"
        ext_map = {
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        }
        ext = ext_map.get(mime, 'bin')
        file_name = f'{public_id or uuid.uuid4().hex}.{ext}'

        try:
            doc_bytes = base64.b64decode(b64data)
        except Exception as decode_err:
            return '', f'Could not decode document data: {decode_err}'

        cloudinary_url_env = os.environ.get('CLOUDINARY_URL', '')
        if cloudinary_url_env:
            # Use resource_type='raw' for PDFs so Cloudinary stores and serves them as-is.
            # Use resource_type='auto' for other document types.
            cloud_resource_type = 'raw' if mime == 'application/pdf' else 'auto'
            cloud_public_id = public_id or uuid.uuid4().hex
            url, err = _upload_to_cloudinary_safe(
                io.BytesIO(doc_bytes),
                folder,
                cloud_public_id,
                resource_type=cloud_resource_type,
            )
            if err:
                logger.error('upload_document_base64: Cloudinary error for folder=%r: %s. Falling back to local.', folder, err)
                local_url = _upload_to_local_bytes(doc_bytes, folder, file_name)
                return local_url, None
            return _normalize_cloudinary_document_url(url), None
        else:
            local_url = _upload_to_local_bytes(doc_bytes, folder, file_name)
            return local_url, None

    except Exception as exc:
        logger.error(
            'upload_document_base64: upload failed for folder=%r public_id=%r: %s',
            folder, public_id, exc,
        )
        return '', str(exc)


def upload_document_file(document_file, folder: str, public_id: str = None) -> tuple:
    """Upload a Django uploaded file as a document and return (url, error)."""
    if not document_file:
        return '', 'No document file provided.'

    content_type = str(getattr(document_file, 'content_type', '') or '').lower()
    ext = os.path.splitext(getattr(document_file, 'name', '') or '')[1].lower().lstrip('.')
    if not ext:
        ext = 'pdf' if content_type == 'application/pdf' else 'bin'

    file_name = f'{public_id or uuid.uuid4().hex}.{ext}'
    try:
        file_bytes = document_file.read()
        if hasattr(document_file, 'seek'):
            document_file.seek(0)
    except Exception as exc:
        return '', f'Could not read uploaded file: {exc}'

    cloudinary_url_env = os.environ.get('CLOUDINARY_URL', '')
    if cloudinary_url_env:
        # Use resource_type='raw' for PDFs so Cloudinary stores and serves them as-is.
        is_pdf = content_type == 'application/pdf' or ext == 'pdf'
        cloud_resource_type = 'raw' if is_pdf else 'auto'
        cloud_public_id = public_id or uuid.uuid4().hex
        url, err = _upload_to_cloudinary_safe(
            io.BytesIO(file_bytes),
            folder,
            cloud_public_id,
            resource_type=cloud_resource_type,
        )
        if err:
            logger.error('upload_document_file: Cloudinary error for folder=%r: %s. Falling back to local.', folder, err)
            return _upload_to_local_bytes(file_bytes, folder, file_name), None
        return _normalize_cloudinary_document_url(url), None

    return _upload_to_local_bytes(file_bytes, folder, file_name), None



def _upload_to_cloudinary_safe(image_source, folder: str, public_id: str = None, resource_type: str = 'image') -> tuple:
    """Upload to Cloudinary. Returns (url, error_message). Never raises."""
    try:
        import cloudinary
        import cloudinary.uploader
        kwargs = dict(
            folder=_safe_folder(folder),
            resource_type=resource_type,
            type='upload',
            access_mode='public',
            overwrite=True,
        )
        if public_id:
            kwargs['public_id'] = public_id
        result = cloudinary.uploader.upload(image_source, **kwargs)
        return result['secure_url'], None
    except Exception as exc:
        return '', str(exc)


def _upload_to_cloudinary(image_source, folder: str, public_id: str = None, file_name: str = None) -> str:
    """Legacy wrapper kept for backward compat. Raises on failure."""
    url, err = _upload_to_cloudinary_safe(image_source, folder, public_id, resource_type='image')
    if err:
        raise RuntimeError(f'Cloudinary upload failed: {err}')
    return url


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
