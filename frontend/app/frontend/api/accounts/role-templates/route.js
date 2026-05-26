import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dept = searchParams.get('department') || '';
  const backendUrl = dept
    ? `/api/v1/auth/role-templates/?department=${encodeURIComponent(dept)}`
    : '/api/v1/auth/role-templates/';
  return proxyAuthenticatedRequest(request, backendUrl);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/auth/role-templates/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
