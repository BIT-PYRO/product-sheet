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

function extractAccessToken(payload) {
  const access = payload?.data?.access || payload?.access || payload?.tokens?.access || '';
  return String(access || '').trim();
}

export async function GET(request) {
  const backendBaseUrl = getBackendBaseUrl();
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const fetchMe = async (token) => {
    return fetch(`${backendBaseUrl}/api/v1/auth/me/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
  };

  let activeAccessToken = accessToken;
  let meResponse = null;

  try {
    meResponse = accessToken ? await fetchMe(accessToken) : null;

    if ((!meResponse || meResponse.status === 401) && refreshToken) {
      const refreshResponse = await fetch(`${backendBaseUrl}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      });

      const refreshResult = await refreshResponse.json().catch(() => null);
      const newAccessToken = extractAccessToken(refreshResult);

      if (refreshResponse.ok && newAccessToken) {
        activeAccessToken = newAccessToken;
        meResponse = await fetchMe(activeAccessToken);
      }
    }
  } catch (networkErr) {
    // Backend unreachable (Render cold start / network error) — return 503, not 500.
    return NextResponse.json(
      { success: false, message: 'Backend temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }

  if (!meResponse || !meResponse.ok) {
    const unauthorizedResponse = NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );

    unauthorizedResponse.cookies.set({
      name: ACCESS_COOKIE,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    unauthorizedResponse.cookies.set({
      name: REFRESH_COOKIE,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    return unauthorizedResponse;
  }

  const meResult = await meResponse.json().catch(() => null);
  const user = meResult?.data || meResult;

  const isSuperuser = !!user?.is_superuser;
  // Superusers are always treated as approved — they have full access regardless of the DB flag
  const isApproved = isSuperuser ? true : (user?.is_approved ?? true);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user?.username || 'User',
      username: user?.username || 'User',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      role: user?.role || 'staff',
      is_approved: isApproved,
      is_superuser: isSuperuser,
    },
  });

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  if (activeAccessToken && activeAccessToken !== accessToken) {
    response.cookies.set({ name: ACCESS_COOKIE, value: activeAccessToken, ...cookieOpts, maxAge: ONE_DAY_SECONDS });
  }

  // Keep the approved cookie in sync — superusers always get '1'
  response.cookies.set({ name: APPROVED_COOKIE, value: isApproved ? '1' : '0', ...cookieOpts, maxAge: 60 * 60 * 24 });

  return response;
}
