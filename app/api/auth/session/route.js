import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth';

const SESSION_COOKIE = 'psd-session';

export async function GET(request) {
  const userId = request.cookies.get(SESSION_COOKIE)?.value || '';
  const user = getUserById(userId);

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      role: user.role,
    },
  });
}
