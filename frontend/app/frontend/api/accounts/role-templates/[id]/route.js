import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveId(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const p = await context.params;
    return p?.id;
  }
  return context?.params?.id;
}

export async function GET(request, context) {
  const id = await resolveId(context);
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-templates/${id}/`);
}

export async function PATCH(request, context) {
  const id = await resolveId(context);
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-templates/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request, context) {
  const id = await resolveId(context);
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-templates/${id}/`, {
    method: 'DELETE',
  });
}
