import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/jobs/bulk-create-from-picklist/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}
