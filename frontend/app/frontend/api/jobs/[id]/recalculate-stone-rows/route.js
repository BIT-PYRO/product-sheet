import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/v1/jobs/${id}/recalculate-stone-rows/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
