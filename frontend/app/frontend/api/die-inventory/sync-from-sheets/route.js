import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  return proxyAuthenticatedRequest(request, '/api/v1/inventory/die-inventory/sync-from-sheets/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
