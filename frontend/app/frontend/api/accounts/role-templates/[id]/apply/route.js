import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

async function resolveId(context) {
  if (context?.params && typeof context.params.then === 'function') {
    const p = await context.params;
    return p?.id;
  }
  return context?.params?.id;
}

export async function POST(request, context) {
  const id = await resolveId(context);
  return proxyAuthenticatedRequest(request, `/api/v1/auth/role-templates/${id}/apply/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
