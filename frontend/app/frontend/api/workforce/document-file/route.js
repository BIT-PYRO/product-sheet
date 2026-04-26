import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendBaseUrl } from '@/app/frontend/api/_lib/backend-auth';

function extractAccessToken(payload) {
  const access = payload?.data?.access || payload?.access || payload?.tokens?.access || '';
  return String(access || '').trim();
}

async function requestTokenRefresh(refreshToken) {
  if (!refreshToken) return '';

  const response = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) return '';
  return extractAccessToken(payload);
}

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

function isBackendHost(targetUrl) {
  if (!targetUrl) return false;
  const backendHost = new URL(backendBaseUrl()).host;
  return targetUrl.host === backendHost;
}

function isCloudinaryHost(targetUrl) {
  const host = String(targetUrl?.host || '').toLowerCase();
  return host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com');
}

function buildCloudinaryFallbackUrls(targetUrl) {
  if (!isCloudinaryHost(targetUrl)) return [];

  const asString = targetUrl.toString();
  const candidates = new Set();

  // Repair accidental doubled extensions (e.g. aadhaar.pdf.pdf).
  const singleExt = asString.replace(/\.(pdf|png|jpe?g|webp|gif)\.\1(?=([?#]|$))/i, '.$1');
  if (singleExt !== asString) {
    candidates.add(singleExt);
  }

  // Some document uploads should be served from raw/upload rather than image/upload.
  if (/\/image\/upload\//i.test(asString) && /\.(pdf|docx?|bin)([?#]|$)/i.test(singleExt)) {
    candidates.add(singleExt.replace('/image/upload/', '/raw/upload/'));
  }

  return Array.from(candidates);
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

function inferContentType(filename, fallbackType) {
  const type = String(fallbackType || '').toLowerCase();
  if (type && type !== 'application/octet-stream') return fallbackType;

  const name = String(filename || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';

  return fallbackType || 'application/octet-stream';
}

export async function GET(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';
  const hasAuth = Boolean(accessToken || refreshToken);
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

  const targetIsBackend = isBackendHost(targetUrl);

  const fetchUpstream = async (bearerToken = '') => {
    const headers = {};
    if (targetIsBackend && bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    return fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'follow',
    });
  };

  let activeToken = accessToken;
  let refreshedToken = '';
  let upstream;
  let resolvedUrl = targetUrl.toString();
  try {
    upstream = await fetchUpstream(activeToken);

    // Retry protected backend URLs after refreshing access token.
    if (targetIsBackend && (upstream.status === 401 || upstream.status === 403) && refreshToken) {
      refreshedToken = await requestTokenRefresh(refreshToken);
      if (refreshedToken) {
        activeToken = refreshedToken;
        upstream = await fetchUpstream(activeToken);
      }
    }

    // Retry malformed/legacy Cloudinary document URLs with normalized alternatives.
    if (!upstream.ok && isCloudinaryHost(targetUrl) && (upstream.status === 401 || upstream.status === 404)) {
      const fallbackUrls = buildCloudinaryFallbackUrls(targetUrl);
      for (const fallbackUrl of fallbackUrls) {
        const fallbackTarget = new URL(fallbackUrl);
        const fallbackResponse = await fetch(fallbackTarget.toString(), {
          method: 'GET',
          cache: 'no-store',
          redirect: 'follow',
        });
        if (fallbackResponse.ok && fallbackResponse.body) {
          upstream = fallbackResponse;
          resolvedUrl = fallbackTarget.toString();
          break;
        }
      }
    }
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

  const upstreamType = upstream.headers.get('content-type') || 'application/octet-stream';
  const filename = inferFilename(new URL(resolvedUrl), upstreamType);
  const contentType = inferContentType(filename, upstreamType);
  const dispositionType = mode === 'download' ? 'attachment' : 'inline';

  const response = new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${dispositionType}; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });

  if (refreshedToken) {
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: refreshedToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}
