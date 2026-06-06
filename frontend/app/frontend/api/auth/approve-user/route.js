import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
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

export async function POST(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const is_approved = body?.is_approved;

    if (!email || is_approved === undefined) {
      return NextResponse.json(
        { success: false, message: 'Email and is_approved are required.' },
        { status: 400 }
      );
    }

    async function doApprove(token) {
      return fetch(`${getBackendBaseUrl()}/api/v1/auth/approve-user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, is_approved }),
        cache: 'no-store',
      });
    }

    let token = accessToken;
    if (!token && refreshToken) {
      const refreshRes = await fetch(`${getBackendBaseUrl()}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      });
      const refreshData = await refreshRes.json().catch(() => null);
      token = refreshData?.data?.access || refreshData?.access || '';
    }

    if (!token) {
      return NextResponse.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 });
    }

    let backendResponse = await doApprove(token);

    // If token expired (401), try refresh once
    if (backendResponse.status === 401 && refreshToken) {
      const refreshRes = await fetch(`${getBackendBaseUrl()}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      });
      const refreshData = await refreshRes.json().catch(() => null);
      const newToken = refreshData?.data?.access || refreshData?.access || '';
      if (newToken) {
        backendResponse = await doApprove(newToken);
      }
    }

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Failed to update approval.' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json({ success: true, message: data?.message || 'Approval updated.', data: data?.data });
  } catch {
    return NextResponse.json({ success: false, message: 'Internal error.' }, { status: 500 });
  }
}
