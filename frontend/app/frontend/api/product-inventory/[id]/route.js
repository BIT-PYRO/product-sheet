import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request, context) {
  let id;
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    id = params?.id;
  } else {
    id = context?.params?.id;
  }
  return proxyAuthenticatedRequest(request, `/api/v1/product-inventory/${id}/`);
}

export async function PATCH(request, context) {
  let id;
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    id = params?.id;
  } else {
    id = context?.params?.id;
  }
  const body = await request.text();
  return proxyAuthenticatedRequest(request, `/api/v1/product-inventory/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request, context) {
  let id;
  if (context?.params && typeof context.params.then === 'function') {
    const params = await context.params;
    id = params?.id;
  } else {
    id = context?.params?.id;
  }
  return proxyAuthenticatedRequest(request, `/api/v1/product-inventory/${id}/`, {
    method: 'DELETE',
  });
}
