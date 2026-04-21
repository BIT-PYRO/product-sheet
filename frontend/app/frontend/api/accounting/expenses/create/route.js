import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';

  // Buffer the entire body so it can be re-sent on auth retry
  const bodyBuffer = await request.arrayBuffer();

  return proxyAuthenticatedRequest(request, '/api/accounting/expenses/create/', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bodyBuffer),
  });
}
