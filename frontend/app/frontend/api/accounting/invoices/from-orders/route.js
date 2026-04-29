import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/invoices/from-orders/
export async function POST(req) {
  const bodyBuffer = await req.arrayBuffer();
  return proxyAuthenticatedRequest(req, '/api/accounting/invoices/from-orders/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(bodyBuffer),
  });
}
