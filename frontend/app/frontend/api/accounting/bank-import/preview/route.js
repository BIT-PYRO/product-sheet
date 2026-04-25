import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

export async function POST(request) {
  // Parse the multipart form from the browser request
  const incomingForm = await request.formData();

  // Re-build a new FormData so that fetch sets the correct
  // Content-Type: multipart/form-data; boundary=... automatically.
  // Forwarding request.body as a raw stream causes boundary mismatches.
  const outgoing = new FormData();

  const file = incomingForm.get('file');
  if (file) outgoing.append('file', file);

  const bankAccountId = incomingForm.get('bank_account_id');
  if (bankAccountId) outgoing.append('bank_account_id', String(bankAccountId));

  const fileType = incomingForm.get('file_type');
  if (fileType) outgoing.append('file_type', String(fileType));

  // Do NOT set Content-Type in headers — fetch sets it with the correct boundary
  return proxyAuthenticatedRequest(request, '/api/accounting/bank-import/preview/', {
    method: 'POST',
    body: outgoing,
  });
}
