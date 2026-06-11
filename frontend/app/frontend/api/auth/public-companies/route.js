import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://product-sheet.onrender.com'
    : 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  const url = (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  return url;
}

export async function GET() {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    const res = await fetch(`${backendBaseUrl}/api/v1/auth/public-companies/`, {
      method: 'GET',
      cache: 'no-store',
    });
    const result = await res.json().catch(() => null);
    return NextResponse.json(result || { success: false, data: [] });
  } catch {
    return NextResponse.json({ success: false, data: [] });
  }
}
