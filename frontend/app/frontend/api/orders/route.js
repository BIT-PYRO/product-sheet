import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';

function getBackendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/orders/${search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(request) {
  try {
    const body = await request.text();
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/orders/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Backend unreachable' }, { status: 502 });
  }
}
