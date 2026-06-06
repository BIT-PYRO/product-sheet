import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/workforce/${id}/delete-document/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
