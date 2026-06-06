import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const body = await request.text();
    return await proxyAuthenticatedRequest(request, `/api/v1/drafts/${params.id}/`, {
      method: 'PATCH',
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

export async function DELETE(request, { params }) {
  try {
    return await proxyAuthenticatedRequest(request, `/api/v1/drafts/${params.id}/`, {
      method: 'DELETE',
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Drafts backend unreachable' },
      { status: 502 }
    );
  }
}
