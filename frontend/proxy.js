import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';

function isPublicAsset(pathname) {
  return /\.[^/]+$/.test(pathname);
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const isAuthenticated = hasAccessToken || hasRefreshToken;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (isAuthenticated) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|frontend/api|_next/static|_next/image|favicon.ico).*)'],
};
