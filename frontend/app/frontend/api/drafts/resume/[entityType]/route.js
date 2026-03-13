import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request, { params }) {
  return proxyAuthenticatedRequest(request, `/api/v1/drafts/resume/${params.entityType}/`);
}
