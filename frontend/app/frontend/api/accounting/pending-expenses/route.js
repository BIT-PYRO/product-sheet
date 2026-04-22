import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// GET /api/accounting/pending-expenses/?status=pending
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return proxyAuthenticatedRequest(request, `/api/accounting/pending-expenses/${qs}`);
}
