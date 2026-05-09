import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// GET /api/accounting/departments/dashboard/
export async function GET(request) {
  return proxyAuthenticatedRequest(request, `/api/accounting/departments/dashboard/`);
}
