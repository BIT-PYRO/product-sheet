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
export const getPayrollDashboard = (month) =>
  hrFetch(`/payroll/dashboard/?month=${month}`);

export const getPayrollEmployeeDetail = (userId) =>
  hrFetch(`/payroll/dashboard/${userId}/`);

export const getPayrollRun = (month) =>
  hrFetch(`/payroll/run/?month=${month}`);

export const actionPayrollRun = (action, month) =>
  hrFetch('/payroll/run/', {
    method: 'POST',
    body: JSON.stringify({ action, month }),
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
    method: 'POST',
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
