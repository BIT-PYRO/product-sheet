import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  return proxyAuthenticatedRequest(request, '/api/v1/workforce/meta/');
}
