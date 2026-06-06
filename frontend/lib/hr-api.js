/**
 * HR API Client — wraps all HR backend endpoints.
 * All endpoints proxy through Next.js /api/proxy → Django /api/hr/
 */

const BASE = '/api/hr';

async function hrFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HR API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Attendance ─────────────────────────────────────────────────────────────
export const getAttendanceToday = (date) =>
  hrFetch(`/attendance/today/${date ? `?date=${date}` : ''}`);

export const saveAttendanceToday = (date, rows) =>
  hrFetch('/attendance/today/', {
    method: 'POST',
    body: JSON.stringify({ date, rows }),
  });

export const getMonthlyRegister = (month) =>
  hrFetch(`/attendance/monthly-register/?month=${month}`);

export const getEmployeeSummary = (month) =>
  hrFetch(`/attendance/employee-summary/?month=${month}`);

export const getRegularizationQueue = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return hrFetch(`/attendance/regularizations/${qs ? `?${qs}` : ''}`);
};

export const actionRegularization = (entryId, data) =>
  hrFetch(`/attendance/regularizations/${entryId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const overrideAttendance = (entryId, data) =>
  hrFetch(`/attendance/override/${entryId}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getAttendanceRulebook = (userId) =>
  hrFetch(`/attendance/rulebook/${userId}/`);

export const saveAttendanceRulebook = (userId, data) =>
  hrFetch(`/attendance/rulebook/${userId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const getAttendanceScores = (month) =>
  hrFetch(`/attendance/scores/?month=${month}`);

// ── Leaves ─────────────────────────────────────────────────────────────────
export const getLeaveRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return hrFetch(`/leaves/${qs ? `?${qs}` : ''}`);
};

export const actionLeaveRequest = (pk, data) =>
  hrFetch(`/leaves/${pk}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// ── Payroll ────────────────────────────────────────────────────────────────
export const getPayrollDashboard = (month, search = '') => {
  const qs = new URLSearchParams({ month, ...(search ? { search } : {}) }).toString();
  return hrFetch(`/payroll/dashboard/?${qs}`);
};

export const getPayrollEmployeeDetail = (userId, month) => {
  const qs = new URLSearchParams({ month }).toString();
  return hrFetch(`/payroll/dashboard/${userId}/?${qs}`);
};

export const getPayrollRun = (month) => {
  const qs = new URLSearchParams({ month }).toString();
  return hrFetch(`/payroll/run/?${qs}`);
};

export const actionPayrollRun = (action, month, extra = {}) =>
  hrFetch('/payroll/run/', {
    method: 'POST',
    body: JSON.stringify({ action, month, ...extra }),
  });

export const saveEmployeeSalaryStructure = (userId, month, rows) =>
  hrFetch(`/payroll/dashboard/${userId}/`, {
    method: 'PUT',
    body: JSON.stringify({ month, rows }),
  });

export const savePayrollRecord = (userId, month, data) =>
  hrFetch(`/payroll/dashboard/${userId}/`, {
    method: 'PUT',
    body: JSON.stringify({ month, ...data }),
  });

export const addPayrollRecordForMember = (userId, month, data) =>
  hrFetch(`/payroll/member/${userId}/add/`, {
    method: 'POST',
    body: JSON.stringify({ month, ...data }),
  });


// ── Expenses ───────────────────────────────────────────────────────────────
export const getExpenses = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return hrFetch(`/expenses/${qs ? `?${qs}` : ''}`);
};

export const getMemberExpenses = (userId) =>
  hrFetch(`/expenses/member/${userId}/`);

export const actionExpense = (expenseId, data) =>
  hrFetch(`/expenses/${expenseId}/approval/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ── Tasks ──────────────────────────────────────────────────────────────────
export const getTasks = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return hrFetch(`/tasks/${qs ? `?${qs}` : ''}`);
};

export const assignTask = (data) =>
  hrFetch('/tasks/assign/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getTasksExportUrl = () => `${BASE}/tasks/export/`;

// ── Meetings ───────────────────────────────────────────────────────────────
export const getMeetings = () => hrFetch('/meetings/');

export const createMeeting = (data) =>
  hrFetch('/meetings/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMeeting = (eventId, data) =>
  hrFetch(`/meetings/${eventId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMeeting = (eventId) =>
  hrFetch(`/meetings/${eventId}/`, { method: 'DELETE' });

// ── MyDesk Calendar (direct proxy — same as MyDesk module) ─────────────────
/**
 * Fetch Google Calendar events for the current user, filtered to meetings only.
 * Uses the same /api/calendar/events/ endpoint that MyDesk uses.
 */
export async function getCalendarMeetings(startDate, endDate) {
  const res = await fetch(
    `/api/calendar/events/?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const events = await res.json();
  // Only return meetings (has hangoutLink / conferenceData / event_type === 'meeting')
  return Array.isArray(events)
    ? events.filter(
        (e) =>
          e.event_type === 'meeting' ||
          Boolean(e.meet_link) ||
          Boolean(e.hangoutLink),
      )
    : [];
}

// ── Calendar connection status ─────────────────────────────────────────────
export async function getCalendarStatus() {
  const res = await fetch('/api/calendar/status/', { cache: 'no-store' });
  if (!res.ok) return { connected: false };
  return res.json();
}
