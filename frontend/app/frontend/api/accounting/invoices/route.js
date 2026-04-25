import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// GET  /api/accounting/invoices   — list (supports ?type=sales|purchase&status=&department=)
// POST /api/accounting/invoices   — create invoice
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.toString();
  return proxyAuthenticatedRequest(req, `/api/accounting/invoices/${query ? '?' + query : ''}`, {
    method: 'GET',
  });
}

export async function POST(req) {
  const bodyBuffer = await req.arrayBuffer();
  return proxyAuthenticatedRequest(req, '/api/accounting/invoices/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(bodyBuffer),
  });
}
