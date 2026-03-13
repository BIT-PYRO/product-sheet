import { NextResponse } from 'next/server';

const ORDERS_BACKEND_URL = (process.env.BACKEND_BASE_URL || 'https://product-sheet.onrender.com').replace(/\/$/, '');

export async function GET() {
  try {
    const res = await fetch(`${ORDERS_BACKEND_URL}/api/v1/orders/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(request) {
  try {
    const body = await request.text();
    const res = await fetch(`${ORDERS_BACKEND_URL}/api/v1/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 });
  }
}
