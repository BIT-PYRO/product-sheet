import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://product-sheet.onrender.com'
    : 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  const url = (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') {
    const normalized = String(url).toLowerCase();
    const isLocal =
      normalized.includes('127.0.0.1') ||
      normalized.includes('localhost') ||
      normalized.includes('0.0.0.0');
    if (!isLocal) {
      throw new Error(`Unsafe BACKEND_BASE_URL in development: ${url}.`);
    }
  }
  return url;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const backendBaseUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendBaseUrl}/api/v1/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const result = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, message: result?.message || 'Registration failed. Please try again.' },
        { status: backendRes.status || 400 },
      );
    }

    return NextResponse.json(
      { success: true, message: result?.message || 'Registration successful!' },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to register. Please try again.' },
      { status: 400 },
    );
  }
}
