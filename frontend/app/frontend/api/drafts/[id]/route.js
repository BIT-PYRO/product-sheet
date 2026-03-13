import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function PATCH(request, { params }) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/drafts/${params.id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}

export async function DELETE(request, { params }) {
  return proxyAuthenticatedRequest(request, `/api/v1/drafts/${params.id}/`, {
    method: 'DELETE',
  });
}
