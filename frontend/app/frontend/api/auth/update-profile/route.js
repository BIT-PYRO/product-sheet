import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function PATCH(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/auth/me/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
