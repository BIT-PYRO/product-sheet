import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  return proxyAuthenticatedRequest(request, '/api/v1/products/collections/');
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/products/collections/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  return proxyAuthenticatedRequest(request, `/api/v1/products/collections/${id}/`, {
    method: 'DELETE',
  });
}
