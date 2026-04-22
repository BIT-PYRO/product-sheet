import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';
  return proxyAuthenticatedRequest(request, `/api/v1/common/deletion-logs/${search}`);
}
