import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveRole(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    return params?.designation;
  }
  return context?.params?.designation;
}

export async function PATCH(request, context) {
  const role = await resolveRole(context);
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-permissions/${role}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
