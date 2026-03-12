import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const ONE_DAY_SECONDS = 60 * 60 * 24;
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const password = body?.password;

    if (!userId || !String(password || '').trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID or password.' },
        { status: 401 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    const loginResponse = await fetch(`${backendBaseUrl}/api/v1/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userId,
        password,
      }),
      cache: 'no-store',
    });

    const loginResult = await loginResponse.json().catch(() => null);
    const tokenData = loginResult?.data || {};
    const access = tokenData?.access;
    const refresh = tokenData?.refresh;

    if (!loginResponse.ok || !access || !refresh) {
      return NextResponse.json(
        {
          success: false,
          message: loginResult?.message || 'Invalid user ID or password.',
        },
        { status: loginResponse.status || 401 }
      );
    }

    const meResponse = await fetch(`${backendBaseUrl}/api/v1/auth/me/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access}`,
      },
      cache: 'no-store',
    });

    const meResult = await meResponse.json().catch(() => null);
    const user = meResult?.data || null;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user?.username || userId,
        role: user?.role || 'staff',
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
      { success: false, message: 'Unable to login. Please try again.' },
      { status: 400 }
    );
  }
}
