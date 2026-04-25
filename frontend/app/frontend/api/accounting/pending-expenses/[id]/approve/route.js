import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/pending-expenses/[id]/approve/
export async function POST(request, { params }) {
  const { id } = await params;
  const bodyBuffer = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, `/api/accounting/pending-expenses/${id}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(bodyBuffer),
  });
}
