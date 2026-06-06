import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const APPROVED_COOKIE = 'psd-approved';
const ONE_DAY_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
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

function extractTokens(payload) {
  const access =
    payload?.data?.access ||
    payload?.access ||
    payload?.tokens?.access ||
    '';
  const refresh =
    payload?.data?.refresh ||
    payload?.refresh ||
    payload?.tokens?.refresh ||
    '';

  return {
    access: String(access || '').trim(),
    refresh: String(refresh || '').trim(),
  };
}

function extractErrorMessage(payload, fallback) {
  return (
    payload?.error?.details?.detail ||
    payload?.error?.message ||
    payload?.message ||
    fallback
  );
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
    const { access, refresh } = extractTokens(loginResult);

    if (!loginResponse.ok || !access || !refresh) {
      return NextResponse.json(
        {
          success: false,
          message: extractErrorMessage(loginResult, 'Invalid user ID or password.'),
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
    const user = meResult?.data || meResult || null;

    const isApproved = user?.is_approved ?? true;
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    const response = NextResponse.json({
      success: true,
      user: {
        id: user?.username || userId,
        role: user?.role || 'staff',
      },
    });

    response.cookies.set({ name: ACCESS_COOKIE, value: access, ...cookieOpts, maxAge: ONE_DAY_SECONDS });
    response.cookies.set({ name: REFRESH_COOKIE, value: refresh, ...cookieOpts, maxAge: SEVEN_DAYS_SECONDS });
    response.cookies.set({ name: APPROVED_COOKIE, value: isApproved ? '1' : '0', ...cookieOpts, maxAge: SEVEN_DAYS_SECONDS });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to login. Please try again.' },
      { status: 400 }
    );
  }
}
