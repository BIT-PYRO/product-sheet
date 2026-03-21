import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || '';
  const query = email ? `?search=${encodeURIComponent(email)}&page_size=100` : '?page_size=100';
  return proxyAuthenticatedRequest(request, `/api/v1/workforce/${query}`);
}
