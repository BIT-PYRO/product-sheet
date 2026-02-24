import { NextResponse } from 'next/server';
import { validateCredentials } from '@/lib/auth';

const SESSION_COOKIE = 'psd-session';
const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const password = body?.password;

    const user = validateCredentials(userId, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID or password.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, role: user.role },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: user.id,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_DAY_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to login. Please try again.' },
      { status: 400 }
    );
  }
}
