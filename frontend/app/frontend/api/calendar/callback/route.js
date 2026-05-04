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
        const retryResp = await fetch(backendCallbackUrl, {
          headers: { Authorization: `Bearer ${newToken}` },
          redirect: 'manual',
          cache: 'no-store',
        });
        // 302 = redirect (success), 200 = ok, anything 4xx/5xx = failure
        if (retryResp.status >= 400) {
          const body = await retryResp.text().catch(() => '');
          console.error('[calendar/callback] backend retry failed:', retryResp.status, body);
          return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
        }
      } else {
        // Could not refresh token
        return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
      }
    } else if (resp.status >= 400) {
      // Non-401 error from backend
      const body = await resp.text().catch(() => '');
      console.error('[calendar/callback] backend failed:', resp.status, body);
      return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
    }
  } catch (err) {
    console.error('[calendar/callback] fetch threw:', err);
    return NextResponse.redirect(new URL('/mydesk?calendar=error', request.url));
  }

  return NextResponse.redirect(new URL('/mydesk?calendar=connected', request.url));
}
