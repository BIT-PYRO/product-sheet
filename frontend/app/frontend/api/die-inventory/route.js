import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// Render free-tier wakes up slowly and returns 502/503 on cold start.
// Retry up to 3 times with a 5 s pause before giving up.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export async function GET(request) {
  const url = new URL(request.url);
  const search = url.search || '';

  let lastResponse;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    lastResponse = await proxyAuthenticatedRequest(request, `/api/v1/inventory/die-inventory/${search}`);
    if (lastResponse.status !== 502 && lastResponse.status !== 503) {
      return lastResponse;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return lastResponse;
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/v1/inventory/die-inventory/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
