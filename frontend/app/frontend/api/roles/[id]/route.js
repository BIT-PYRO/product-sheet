import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function PUT(request, { params }) {
  return proxyAuthenticatedRequest(request, `/api/v1/auth/roles/${params.id}/`);
}

export async function DELETE(request, { params }) {
  return proxyAuthenticatedRequest(request, `/api/v1/auth/roles/${params.id}/`);
}
