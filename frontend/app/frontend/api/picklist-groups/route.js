import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';
  return proxyAuthenticatedRequest(request, `/api/v1/inventory/picklist-groups/${search}`);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/inventory/picklist-groups/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}

export async function PATCH(request) {
  const body = await request.text();
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');

  if (!groupId) {
    return Response.json(
      { success: false, message: 'groupId query parameter is required.' },
      { status: 400 }
    );
  }

  return proxyAuthenticatedRequest(request, `/api/v1/inventory/picklist-groups/${groupId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}
