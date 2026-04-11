import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const APPROVED_COOKIE = 'psd-approved';

export async function POST() {
  const response = NextResponse.json({ success: true });

  [ACCESS_COOKIE, REFRESH_COOKIE, APPROVED_COOKIE].forEach((cookieName) => {
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

  return response;
}
