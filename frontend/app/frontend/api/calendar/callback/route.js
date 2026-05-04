import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBaseUrl, ACCESS_COOKIE, REFRESH_COOKIE } from '@/app/frontend/api/_lib/backend-auth';

/**
 * Google OAuth2 callback.
 * Google redirects here with ?code=... after user grants permission.
 * We forward the code to the Django backend which exchanges it and stores credentials.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value || '';

  // Forward code to Django backend callback
  const backendCallbackUrl = `${backendBaseUrl()}/api/calendar/callback/?code=${encodeURIComponent(code)}`;
  try {
    const resp = await fetch(backendCallbackUrl, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      redirect: 'manual',
      cache: 'no-store',
    });

    if (resp.status === 401 && refreshToken) {
      // Try refresh
      const refreshResp = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      });
      const refreshPayload = await refreshResp.json().catch(() => ({}));
      const newToken = refreshPayload?.access || refreshPayload?.data?.access || '';
      if (newToken) {
        await fetch(backendCallbackUrl, {
          headers: { Authorization: `Bearer ${newToken}` },
          redirect: 'manual',
          cache: 'no-store',
        });
      }
    }
  } catch {
    return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
  }

  return NextResponse.redirect(new URL('/mydesk?calendar=connected', request.url));
}
