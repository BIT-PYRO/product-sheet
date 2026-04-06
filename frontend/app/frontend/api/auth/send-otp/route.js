import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const backendResponse = await fetch(
      `${getBackendBaseUrl()}/api/v1/auth/send-otp/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        cache: 'no-store',
      }
    );

    const result = await backendResponse.json().catch(() => null);

    return NextResponse.json(
      result || { success: false, message: 'Unexpected server error.' },
      { status: backendResponse.status }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
