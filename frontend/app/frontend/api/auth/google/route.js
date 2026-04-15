import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const ONE_DAY_SECONDS = 60 * 60 * 24;
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
  try {
    const body = await request.json();
    const idToken = String(body?.id_token || '').trim();

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'id_token is required.' },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    const googleResponse = await fetch(`${backendBaseUrl}/api/v1/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
      cache: 'no-store',
    });

    const result = await googleResponse.json().catch(() => null);

    const access =
      result?.data?.access ||
      result?.access ||
      '';
    const refresh =
      result?.data?.refresh ||
      result?.refresh ||
      '';

    if (!googleResponse.ok || !access || !refresh) {
      return NextResponse.json(
        { success: false, message: result?.message || 'Google login failed.' },
        { status: googleResponse.status || 401 }
      );
    }

    const userData = result?.data?.user || {};

    const response = NextResponse.json({
      success: true,
      user: {
        id: userData.email || '',
        full_name: userData.full_name || '',
        picture: userData.picture || '',
        role: 'staff',
      },
    });

    response.cookies.set({
      name: ACCESS_COOKIE,
      value: access,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    });

    response.cookies.set({
      name: REFRESH_COOKIE,
      value: refresh,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_DAY_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to complete Google login. Please try again.' },
      { status: 400 }
    );
  }
}
