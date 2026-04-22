import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request, { params }) {
  const { id } = await params;
  return proxyAuthenticatedRequest(request, `/api/accounting/outstandings/${id}/receipts/`);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const contentType = request.headers.get('content-type') || '';
  const bodyBuffer = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, `/api/accounting/outstandings/${id}/receipts/`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bodyBuffer),
    duplex: 'half',
  });
}
