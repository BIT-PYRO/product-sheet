import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function DELETE(request, { params }) {
  const { eventId } = await params;
  return proxyAuthenticatedRequest(request, `/api/calendar/events/${eventId}/`, {
    method: 'DELETE',
  });
}
