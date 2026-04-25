import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.toString();
  return proxyAuthenticatedRequest(request, `/api/accounting/bank-accounts/${q ? `?${q}` : ''}`);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/accounting/bank-accounts/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
