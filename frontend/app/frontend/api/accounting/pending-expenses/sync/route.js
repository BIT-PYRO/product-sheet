import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// POST /api/accounting/pending-expenses/sync/
export async function POST(request) {
  return proxyAuthenticatedRequest(request, '/api/accounting/pending-expenses/sync/', {
    method: 'POST',
  });
}
