import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  return proxyAuthenticatedRequest(request, '/api/accounting/accounts/');
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const bodyBuffer = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, '/api/accounting/accounts/', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bodyBuffer),
  });
}
