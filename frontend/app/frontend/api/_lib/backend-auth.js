import { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'psd-access-token';
export const REFRESH_COOKIE = 'psd-refresh-token';
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000/';

function backendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

function extractAccessToken(payload) {
  const access = payload?.data?.access || payload?.access || payload?.tokens?.access || '';
  return String(access || '').trim();
}

function applyAuthCookies(response, accessToken) {
  if (accessToken) {
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: accessToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    });
  }
}

function clearAuthCookies(response) {
  [ACCESS_COOKIE, REFRESH_COOKIE].forEach((cookieName) => {
    response.cookies.set({
      name: cookieName,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  });
}

async function requestTokenRefresh(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  const access = extractAccessToken(payload);

  if (!response.ok || !access) {
    return null;
  }

  return access;
}

export async function proxyAuthenticatedRequest(request, backendPath, options = {}) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

  const doBackendFetch = async (token) => {
    const headers = {
      ...(options.headers || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${backendBaseUrl()}${backendPath}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      cache: 'no-store',
    });
  };

  try {
    let activeToken = accessToken;
    let backendResponse = await doBackendFetch(activeToken);

    if (backendResponse.status === 401 && refreshToken) {
      const refreshedToken = await requestTokenRefresh(refreshToken);
      if (refreshedToken) {
        activeToken = refreshedToken;
        backendResponse = await doBackendFetch(activeToken);
      }
    }

    const isNoContent = backendResponse.status === 204 || backendResponse.status === 205;
    const payload = isNoContent
      ? null
      : await backendResponse.json().catch(() => ({ success: false, message: 'Invalid backend response' }));

    const response = isNoContent
      ? new NextResponse(null, { status: backendResponse.status })
      : NextResponse.json(payload, { status: backendResponse.status });

    if (backendResponse.status === 401) {
      clearAuthCookies(response);
    } else if (activeToken && activeToken !== accessToken) {
      applyAuthCookies(response, activeToken);
    }

    return response;
  } catch (networkError) {
    return NextResponse.json(
      { success: false, message: `Backend unreachable: ${networkError?.message || 'Network error'}` },
      { status: 502 }
    );
  }
}
