import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveDesignation(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    return params?.designation;
  }
  return context?.params?.designation;
}

export async function PATCH(request, context) {
  // Decode __SLASH__ → / and __SP__ → ' ' (frontend encodes names to avoid URL path breakage)
  const raw = await resolveDesignation(context);
  const designation = (raw || '').replace(/__SLASH__/g, '/').replace(/__SP__/g, ' ');
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-permissions/${encodeURIComponent(designation)}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
