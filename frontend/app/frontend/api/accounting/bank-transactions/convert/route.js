import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/accounting/bank-transactions/convert/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
