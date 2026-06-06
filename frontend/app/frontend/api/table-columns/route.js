import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const url = new URL(request.url);
  const tableType = url.searchParams.get('table_type');
  const suffix = tableType ? `?table_type=${encodeURIComponent(tableType)}` : '';
  return proxyAuthenticatedRequest(request, `/api/v1/products/table-columns/${suffix}`);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/products/table-columns/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PUT(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/products/table-columns/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  return proxyAuthenticatedRequest(request, `/api/v1/products/table-columns/${id}/`, {
    method: 'DELETE',
  });
}
