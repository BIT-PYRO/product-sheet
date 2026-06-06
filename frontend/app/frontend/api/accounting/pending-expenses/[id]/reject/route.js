import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/pending-expenses/[id]/reject/
export async function POST(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/accounting/pending-expenses/${id}/reject/`, {
    method: 'POST',
  });
}
