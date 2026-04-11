import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveParams(context) {
  if (context?.params && typeof context.params.then === 'function') {
    return await context.params;
  }
  return context?.params || {};
}

export async function PATCH(request, context) {
  const params = await resolveParams(context);
  const designation = params?.designation || '';
  const department = params?.department || '';
  const body = await request.text();
  return proxyAuthenticatedRequest(
    request,
    `/api/v1/auth/role-permissions/${encodeURIComponent(designation)}/${encodeURIComponent(department)}/`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );
}
