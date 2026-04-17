import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveId(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    return params?.id;
  }
  return context?.params?.id;
}

export async function POST(request, context) {
  const id = await resolveId(context);
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/inventory/issue-requests/${id}/review/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
