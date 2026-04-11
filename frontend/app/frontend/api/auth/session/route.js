import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const APPROVED_COOKIE = 'psd-approved';
const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
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
  let meResponse = accessToken ? await fetchMe(accessToken) : null;

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

  const isApproved = user?.is_approved ?? true;

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
      is_superuser: !!user?.is_superuser,
    },
  });

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  if (activeAccessToken && activeAccessToken !== accessToken) {
    response.cookies.set({ name: ACCESS_COOKIE, value: activeAccessToken, ...cookieOpts, maxAge: 60 * 60 });
  }

  // Keep the approved cookie in sync with latest user data
  response.cookies.set({ name: APPROVED_COOKIE, value: isApproved ? '1' : '0', ...cookieOpts, maxAge: 60 * 60 * 24 });

  return response;
}
