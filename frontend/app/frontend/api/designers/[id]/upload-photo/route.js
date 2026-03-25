import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/app/frontend/api/_lib/backend-auth';

const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function backendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

async function resolveId(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    return params?.id;
  }
  return context?.params?.id;
}

export async function POST(request, context) {
  const id = await resolveId(context);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';

  // Extract the field query param from the incoming request URL
  const { searchParams } = new URL(request.url);
  const field = searchParams.get('field') || 'rendered_photo';

  let incomingForm;
  try {
    incomingForm = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid form data' }, { status: 400 });
  }

  const imageFile = incomingForm.get('image');
  if (!imageFile || typeof imageFile === 'string') {
    return NextResponse.json({ success: false, message: 'No image file provided' }, { status: 400 });
  }

  // Rebuild FormData so fetch can auto-generate the correct multipart boundary
  const outForm = new FormData();
  outForm.append('image', imageFile, imageFile.name);

  try {
    const backendResponse = await fetch(
      `${backendBaseUrl()}/api/v1/designers/${id}/upload-photo/?field=${encodeURIComponent(field)}`,
      {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
        },
        body: outForm,
      }
    );

    const payload = await backendResponse.json().catch(() => ({
      success: false,
      message: 'Invalid backend response',
    }));

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Upload failed: ${err?.message || 'Network error'}` },
      { status: 502 }
    );
  }
}
