import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/invoices/[id]/settle
export async function POST(req, { params }) {
  const { id } = await params;
  const bodyBuffer = await req.arrayBuffer();
  return proxyAuthenticatedRequest(req, `/api/accounting/invoices/${id}/settle/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(bodyBuffer),
  });
}
