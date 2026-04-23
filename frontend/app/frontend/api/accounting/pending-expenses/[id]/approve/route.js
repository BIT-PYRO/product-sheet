import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/pending-expenses/[id]/approve/
export async function POST(request, { params }) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/accounting/pending-expenses/${params.id}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
