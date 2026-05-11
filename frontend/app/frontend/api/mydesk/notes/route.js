import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return proxyAuthenticatedRequest(request, `/api/mydesk/notes/${query}`);
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const body = await request.arrayBuffer();
  return proxyAuthenticatedRequest(request, '/api/mydesk/notes/', {
    method: 'POST',
    headers: contentType ? { 'Content-Type': contentType } : {},
    body,
  });
}
