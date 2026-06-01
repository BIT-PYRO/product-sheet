import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const APPROVED_COOKIE = 'psd-approved';

// Paths unapproved users are allowed to visit (everything else → /profile)
const PENDING_ALLOWED = ['/profile', '/login'];

function isPublicAsset(pathname) {
  return /\.[^/]+$/.test(pathname);
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const isAuthenticated = hasAccessToken || hasRefreshToken;
  const approved = request.cookies.get(APPROVED_COOKIE)?.value;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/login' || pathname === '/') {
    if (isAuthenticated && pathname === '/login') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    const nextPath = `${pathname}${search || ''}`;
    loginUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(loginUrl);
  }

  // Unapproved users can only access home, profile, settings, login, and api routes
  if (approved === '0') {
    const isAllowed =
      PENDING_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/');
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|frontend/api|_next/static|_next/image|favicon.ico).*)'],
};
