import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth';

const SESSION_COOKIE = 'psd-session';

function isPublicAsset(pathname) {
  return /\.[^/]+$/.test(pathname);
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const sessionUserId = request.cookies.get(SESSION_COOKIE)?.value || '';
  const isAuthenticated = Boolean(getUserById(sessionUserId));

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
