import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    return await proxyAuthenticatedRequest(request, `/api/v1/drafts/resume/${params.entityType}/`);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Drafts backend unreachable' },
      { status: 502 }
    );
  }
}
