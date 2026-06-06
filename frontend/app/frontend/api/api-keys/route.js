import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  return proxyAuthenticatedRequest(request, '/api/v1/auth/api-keys/');
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/auth/api-keys/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
