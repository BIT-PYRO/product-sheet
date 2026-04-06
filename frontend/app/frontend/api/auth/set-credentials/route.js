import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function POST(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required.' },
        { status: 400 }
      );
    }

    // Try with access token, fall back to refresh
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

    const backendResponse = await fetch(
      `${getBackendBaseUrl()}/api/v1/auth/set-credentials/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
      }
    );

    const result = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, message: result?.message || result?.error?.message || 'Failed to set credentials.' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json({ success: true, message: result?.message || 'Credentials saved.' });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to save credentials. Please try again.' },
      { status: 500 }
    );
  }
}
