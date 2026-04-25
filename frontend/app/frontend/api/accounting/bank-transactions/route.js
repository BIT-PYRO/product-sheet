import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.toString();
  return proxyAuthenticatedRequest(request, `/api/accounting/bank-transactions/${q ? `?${q}` : ''}`);
}
