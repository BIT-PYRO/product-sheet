import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production' ? 'https://product-sheet.onrender.com' : 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  const url = (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') {
    const normalized = String(url).toLowerCase();
    const isLocal = normalized.includes('127.0.0.1') || normalized.includes('localhost') || normalized.includes('0.0.0.0');
    if (!isLocal) {
      throw new Error(`Unsafe BACKEND_BASE_URL in development: ${url}. Use a local backend URL only.`);
    }
  }
  return url;
}

export async function GET(request) {
  const backendBaseUrl = getBackendBaseUrl();
  const accessToken = request.cookies.get('psd-access-token')?.value || '';

  try {
    const res = await fetch(`${backendBaseUrl}/api/v1/platform/features/`, {
      method: 'GET',
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      // Return graceful empty features so login page doesn't flash errors
      return NextResponse.json({ success: true, features: {} }, { status: 200 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    // Return a graceful empty response instead of 503 to avoid noisy console errors on login page
    return NextResponse.json({ success: true, features: {} }, { status: 200 });
  }
}
