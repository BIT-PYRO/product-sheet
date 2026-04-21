import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return proxyAuthenticatedRequest(request, '/api/accounting/income/create/', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: request.body,
      duplex: 'half',
    });
  }
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/accounting/income/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
