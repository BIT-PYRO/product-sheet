import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();
  return proxyAuthenticatedRequest(request, `/api/accounting/outstandings/${params ? `?${params}` : ''}`);
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const bodyBuffer = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, '/api/accounting/outstandings/', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bodyBuffer),
  });
}
