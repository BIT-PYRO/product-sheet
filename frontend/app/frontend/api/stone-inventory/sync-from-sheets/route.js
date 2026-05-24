import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBaseUrl, ACCESS_COOKIE, REFRESH_COOKIE } from '@/app/frontend/api/_lib/backend-auth';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value || '';

  const doFetch = (token) =>
    fetch(`${backendBaseUrl()}/api/v1/inventory/stone-items/sync-from-sheets/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: '{}',
      cache: 'no-store',
    });

  let res = await doFetch(accessToken);

  if ((res.status === 401 || res.status === 403) && refreshToken) {
    const refreshRes = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: 'no-store',
    });
    if (refreshRes.ok) {
      const refreshPayload = await refreshRes.json().catch(() => null);
      const newToken = refreshPayload?.data?.access || refreshPayload?.access || '';
      if (newToken) {
        res = await doFetch(newToken);
      }
    }
  }

  const payload = await res.json().catch(() => null);
  return NextResponse.json(payload, { status: res.status });
}
