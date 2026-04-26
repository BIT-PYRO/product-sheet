import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const APPROVED_COOKIE = 'psd-approved';
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
    const email = String(body?.email || '').trim().toLowerCase();
    const otp = String(body?.otp || '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and OTP are required.' },
        { status: 400 }
      );
    }

    const backendResponse = await fetch(
      `${getBackendBaseUrl()}/api/v1/auth/verify-otp/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
        cache: 'no-store',
      }
    );

    const result = await backendResponse.json().catch(() => null);
    const access = result?.data?.access || result?.access || '';
    const refresh = result?.data?.refresh || result?.refresh || '';

    if (!backendResponse.ok || !access || !refresh) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message || result?.error?.message || 'Invalid OTP.',
        },
        { status: backendResponse.status || 400 }
      );
    }

    const isApproved = result?.data?.is_approved ?? true;
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    const response = NextResponse.json({ success: true });
    response.cookies.set({ name: ACCESS_COOKIE, value: access, ...cookieOpts, maxAge: ONE_DAY_SECONDS });
    response.cookies.set({ name: REFRESH_COOKIE, value: refresh, ...cookieOpts, maxAge: ONE_DAY_SECONDS });
    response.cookies.set({ name: APPROVED_COOKIE, value: isApproved ? '1' : '0', ...cookieOpts, maxAge: ONE_DAY_SECONDS });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
