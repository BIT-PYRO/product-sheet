/**
 * MyDesk API Proxy — catch-all route for /api/mydesk/* → Django backend /api/mydesk/*
 * Handles notes, todos, expenses, attendance, payroll, leaves, gallery, diary, etc.
 * Supports both JSON and multipart/form-data (file uploads).
 */
import { NextResponse } from 'next/server';
import { proxyAuthenticatedRequest, backendBaseUrl, ACCESS_COOKIE, REFRESH_COOKIE } from '@/app/frontend/api/_lib/backend-auth';

/**
 * Proxy a request that may carry any body (JSON, multipart, binary).
 * We stream the raw body through rather than re-encoding it.
 */
async function proxyRaw(request, backendPath, method) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

  const contentType = request.headers.get('content-type') || '';

  // Build forwarded headers — include Content-Type for non-GET so multipart boundary is preserved
  const buildHeaders = (token) => {
    const headers = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const doFetch = async (token) => {
    const body = method === 'GET' || method === 'DELETE' ? undefined : request.body;
    return fetch(`${backendBaseUrl()}${backendPath}`, {
      method,
      headers: buildHeaders(token),
      body,
      cache: 'no-store',
      // Required for streaming body in Node.js fetch
      duplex: 'half',
    });
  };

  try {
    let activeToken = accessToken;
    let backendResponse = await doFetch(activeToken);

    if ((backendResponse.status === 401 || backendResponse.status === 403) && refreshToken) {
      // Attempt token refresh
      const refreshRes = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      });
      const refreshPayload = await refreshRes.json().catch(() => null);
      const newToken = refreshPayload?.data?.access || refreshPayload?.access || '';
      if (newToken) {
        activeToken = newToken;
        // Re-read body is not possible after streaming — fall back to proxyAuthenticatedRequest for retries
        backendResponse = await doFetch(activeToken);
      }
    }

    const isNoContent = backendResponse.status === 204 || backendResponse.status === 205;
    if (isNoContent) {
      return new NextResponse(null, { status: backendResponse.status });
    }

    const payload = await backendResponse.json().catch(() => ({ success: false, message: 'Invalid backend response' }));
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Backend unreachable: ${err?.message || 'Network error'}` },
      { status: 502 }
    );
  }
}

export async function GET(request, { params }) {
  const slug = (await params).slug || [];
  const url = new URL(request.url);
  const qs = url.search || '';
  const backendPath = `/api/mydesk/${slug.join('/')}/${qs}`;
  return proxyAuthenticatedRequest(request, backendPath);
}

export async function POST(request, { params }) {
  const slug = (await params).slug || [];
  const backendPath = `/api/mydesk/${slug.join('/')}/`;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    return proxyRaw(request, backendPath, 'POST');
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, backendPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PUT(request, { params }) {
  const slug = (await params).slug || [];
  const backendPath = `/api/mydesk/${slug.join('/')}/`;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    return proxyRaw(request, backendPath, 'PUT');
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, backendPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PATCH(request, { params }) {
  const slug = (await params).slug || [];
  const backendPath = `/api/mydesk/${slug.join('/')}/`;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    return proxyRaw(request, backendPath, 'PATCH');
  }

  const body = await request.text();
  return proxyAuthenticatedRequest(request, backendPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request, { params }) {
  const slug = (await params).slug || [];
  const backendPath = `/api/mydesk/${slug.join('/')}/`;
  return proxyAuthenticatedRequest(request, backendPath, { method: 'DELETE' });
}
