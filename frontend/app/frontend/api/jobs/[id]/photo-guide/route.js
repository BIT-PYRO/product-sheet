import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/v1/jobs/${id}/photo-guide/`);
}
