import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendBaseUrl } from '@/app/frontend/api/_lib/backend-auth';

function parseIncomingUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    return new URL(value, backendBaseUrl());
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedHost(targetUrl) {
  if (!targetUrl) return false;

  const backendHost = new URL(backendBaseUrl()).host;
  const host = targetUrl.host;
  if (!host) return false;

  if (host === backendHost) return true;

  // Allow Cloudinary delivery hosts for legacy and current uploads.
  if (/\.cloudinary\.com$/i.test(host) || host === 'res.cloudinary.com') return true;

  if (process.env.NODE_ENV !== 'production') {
    if (host.includes('localhost') || host.includes('127.0.0.1')) return true;
  }

  return false;
}

function inferFilename(sourceUrl, fallbackType) {
  const rawPath = sourceUrl?.pathname || '';
  const lastPart = rawPath.split('/').filter(Boolean).pop() || '';
  const clean = decodeURIComponent(lastPart || '').trim();
  if (clean) return clean;

  if ((fallbackType || '').includes('pdf')) return 'document.pdf';
  if ((fallbackType || '').includes('png')) return 'document.png';
  if ((fallbackType || '').includes('jpeg') || (fallbackType || '').includes('jpg')) return 'document.jpg';
  return 'document';
}

export async function GET(request) {
  const hasAuth = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value
  );
  if (!hasAuth) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const reqUrl = new URL(request.url);
  const mode = String(reqUrl.searchParams.get('mode') || 'preview').toLowerCase();
  const source = reqUrl.searchParams.get('url') || '';

  const targetUrl = parseIncomingUrl(source);
  if (!targetUrl) {
    return NextResponse.json({ success: false, message: 'Invalid document URL.' }, { status: 400 });
  }

  if (!/^https?:$/i.test(targetUrl.protocol)) {
    return NextResponse.json({ success: false, message: 'Unsupported URL protocol.' }, { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return NextResponse.json({ success: false, message: 'URL host is not allowed for preview.' }, { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Unable to load document: ${err?.message || 'Network error'}` },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { success: false, message: `Document fetch failed (${upstream.status}).` },
      { status: upstream.status || 502 }
    );
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const filename = inferFilename(targetUrl, contentType);
  const dispositionType = mode === 'download' ? 'attachment' : 'inline';

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${dispositionType}; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
