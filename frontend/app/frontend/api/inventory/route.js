import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';
  return proxyAuthenticatedRequest(request, `/api/v1/inventory/${search}`);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/inventory/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}
