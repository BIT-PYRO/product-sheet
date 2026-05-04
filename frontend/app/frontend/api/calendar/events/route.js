import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const refresh = searchParams.get('_') || '';
  let query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  if (refresh) query += `&_=${refresh}`;
  return proxyAuthenticatedRequest(request, `/api/calendar/events/${query}`);
}

export async function POST(request) {
  const body = await request.text();
  return proxyAuthenticatedRequest(request, '/api/calendar/events/create/', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}
