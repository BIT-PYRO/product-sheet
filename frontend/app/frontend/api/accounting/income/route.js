import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();
  return proxyAuthenticatedRequest(request, `/api/accounting/income/${params ? `?${params}` : ''}`);
}
