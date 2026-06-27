import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function PUT(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/v1/auth/roles/${id}/`);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/v1/auth/roles/${id}/`);
}
