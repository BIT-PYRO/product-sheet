import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  const contentType = request.headers.get('content-type') || 'application/json';
  const bodyBuffer = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, '/api/accounting/outstandings/bulk-settle/', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bodyBuffer),
  });
}
