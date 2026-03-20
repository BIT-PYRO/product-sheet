import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';
  try {
    return await proxyAuthenticatedRequest(request, `/api/v1/drafts/${search}`);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Drafts backend unreachable' },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.text();
    return await proxyAuthenticatedRequest(request, '/api/v1/drafts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Drafts backend unreachable' },
      { status: 502 }
    );
  }
}
