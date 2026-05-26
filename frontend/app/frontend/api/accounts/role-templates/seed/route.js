import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  return proxyAuthenticatedRequest(request, '/api/v1/auth/role-templates/seed/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
