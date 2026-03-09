import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
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
    const newAccessToken = refreshResult?.data?.access;

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
  const user = meResult?.data;

  const response = NextResponse.json({
    success: true,
    user: {
      id: user?.username || 'User',
      role: user?.is_staff ? 'admin' : 'user',
    },
  });

  if (activeAccessToken && activeAccessToken !== accessToken) {
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: activeAccessToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    });
  }

  return response;
}
