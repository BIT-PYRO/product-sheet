import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/accounting/bank-accounts/${id}/`);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/accounting/bank-accounts/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/accounting/bank-accounts/${id}/`, {
    method: 'DELETE',
  });
}
