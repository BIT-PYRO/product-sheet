import { emitMyDeskNotification } from './mydeskNotifications';

async function parseResponse(response) {
    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!response.ok) {
        let message = data?.detail || data?.message;
        if (!message && data && typeof data === 'object') {
            const [firstKey] = Object.keys(data);
            const firstValue = firstKey ? data[firstKey] : null;
            if (Array.isArray(firstValue) && firstValue.length > 0) {
                message = `${firstKey}: ${firstValue[0]}`;
            } else if (typeof firstValue === 'string') {
                message = `${firstKey}: ${firstValue}`;
            }
        }
        if (!message) {
            message = `Request failed (${response.status})`;
        }
        throw new Error(message);
    }

    return data;
}

async function executeMutation(requestFn, { successMessage, errorMessage }) {
    try {
        const result = await requestFn();
        if (successMessage) {
            emitMyDeskNotification(successMessage, 'success');
        }
        return result;
    } catch (error) {
        emitMyDeskNotification(error?.message || errorMessage || 'Action failed.', 'error');
        throw error;
    }
}

export async function listMyDeskNotes(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`/api/mydesk/notes/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskNote(payload, files = []) {
    const hasFiles = Array.isArray(files) && files.length > 0;

    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch('/api/mydesk/notes/', {
                method: 'POST',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Note created.' });
    }

    if (hasFiles) {
        const formData = new FormData();
        formData.append('title', payload?.title || '');
        formData.append('content_html', payload?.content_html || '');
        formData.append('tags', JSON.stringify(payload?.tags || []));
        formData.append('labels', JSON.stringify(payload?.labels || []));
        formData.append('attachments', JSON.stringify(payload?.attachments || []));
        formData.append('drive_links', JSON.stringify(payload?.drive_links || []));
        files.forEach((file) => formData.append('files', file));

        return executeMutation(async () => {
            const response = await fetch('/api/mydesk/notes/', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            return parseResponse(response);
        }, { successMessage: 'Note created.' });
    }

    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/notes/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Note created.' });
}

export async function updateMyDeskNote(id, payload) {
    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch(`/api/mydesk/notes/${id}/`, {
                method: 'PATCH',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Note updated.' });
    }

    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/notes/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Note updated.' });
}

export async function deleteMyDeskNote(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/notes/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Note deleted.' });
}

export async function deleteMyDeskNoteAttachment(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/notes/attachments/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Attachment removed.' });
}

export async function listMyDeskTodos(options = {}) {
    const params = new URLSearchParams();
    const type = String(options?.type || '').trim().toLowerCase();
    if (type === 'task' || type === 'personal') {
        params.set('type', type);
    }

    if (options?.includeAttachments === true) {
        params.set('include_attachments', '1');
    } else if (options?.includeAttachments === false) {
        params.set('include_attachments', '0');
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/todos/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function getMyDeskTodo(id, options = {}) {
    const params = new URLSearchParams();
    if (options?.includeAttachments === true) {
        params.set('include_attachments', '1');
    } else if (options?.includeAttachments === false) {
        params.set('include_attachments', '0');
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/todos/${id}/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskTodo(payload) {
    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch('/api/mydesk/todos/', {
                method: 'POST',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Task created.' });
    }

    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/todos/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Task created.' });
}

export async function updateMyDeskTodo(id, payload) {
    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch(`/api/mydesk/todos/${id}/`, {
                method: 'PATCH',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Task updated.' });
    }

    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/todos/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Task updated.' });
}

export async function deleteMyDeskTodo(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/todos/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Task deleted.' });
}

export async function deleteMyDeskTodoAttachment(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/todos/attachments/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Attachment removed.' });
}

export async function listMyDeskExpenses(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/expenses/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskExpense(formData) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/expenses/', {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        return parseResponse(response);
    }, { successMessage: 'Expense created.' });
}

export async function updateMyDeskExpense(id, formData) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/expenses/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            body: formData,
        });
        return parseResponse(response);
    }, { successMessage: 'Expense updated.' });
}

export async function deleteMyDeskExpense(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/expenses/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Expense deleted.' });
}

export async function sendMyDeskExpensesToHr(payload = {}) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/expenses/send-to-hr/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Expenses sent to HR.' });
}

export async function listMyDeskLeaves() {
    const response = await fetch('/api/mydesk/leaves/', { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskLeave(payload) {
    return executeMutation(async () => {
        const isFormData = payload instanceof FormData;
        const response = await fetch('/api/mydesk/leaves/', {
            method: 'POST',
            credentials: 'include',
            ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
            body: isFormData ? payload : JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Leave request submitted.' });
}

export async function updateMyDeskLeave(id, payload) {
    return executeMutation(async () => {
        const isFormData = payload instanceof FormData;
        const response = await fetch(`/api/mydesk/leaves/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
            body: isFormData ? payload : JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Leave request updated.' });
}

export async function remindMyDeskLeave(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/leaves/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remind' }),
        });
        return parseResponse(response);
    }, { successMessage: 'Reminder sent.' });
}

export async function deleteMyDeskLeave(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/leaves/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Leave request deleted.' });
}

export async function hrListLeaveRequests(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/leaves/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function hrActionLeaveRequest(id, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/leaves/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Leave request updated.' });
}



export async function listMyDeskGalleryAlbums() {
    const response = await fetch('/api/mydesk/gallery/albums/', { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskGalleryAlbum(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/gallery/albums/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Album created.' });
}

export async function listMyDeskGalleryItems(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/gallery/items/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskGalleryItem(formData) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/gallery/items/', {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        return parseResponse(response);
    }, { successMessage: 'Gallery item added.' });
}

export async function deleteMyDeskGalleryItem(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/gallery/items/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Gallery item deleted.' });
}

export async function updateMyDeskGalleryItem(id, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/mydesk/gallery/items/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        return parseResponse(response);
    }, { errorMessage: 'Unable to update vault item.' });
}

export async function getMyDeskGalleryItemDownloadLink(id, options = {}) {
    const download = Boolean(options?.download);
    const query = download ? '?download=1' : '';
    const response = await fetch(`/api/mydesk/gallery/items/${id}/download/${query}`, {
        credentials: 'include',
    });
    return parseResponse(response);
}

export async function listMyDeskDiaryEntries(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/diary/entries/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyDeskDiaryEntry(payload) {
    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch('/api/diary/entries/', {
                method: 'POST',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Diary entry created.' });
    }

    return executeMutation(async () => {
        const response = await fetch('/api/diary/entries/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Diary entry created.' });
}

export async function updateMyDeskDiaryEntry(id, payload) {
    if (payload instanceof FormData) {
        return executeMutation(async () => {
            const response = await fetch(`/api/diary/entries/${id}/`, {
                method: 'PATCH',
                credentials: 'include',
                body: payload,
            });
            return parseResponse(response);
        }, { successMessage: 'Diary entry updated.' });
    }

    return executeMutation(async () => {
        const response = await fetch(`/api/diary/entries/${id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Diary entry updated.' });
}

export async function deleteMyDeskDiaryEntry(id) {
    return executeMutation(async () => {
        const response = await fetch(`/api/diary/entries/${id}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Diary entry deleted.' });
}

export async function listMyAttendanceOverview(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/attendance/overview/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createMyAttendanceEntry(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/attendance/entries/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Attendance submitted.' });
}

export async function listHrAttendanceToday(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/attendance/today/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function listHrDiaryLogbooks(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/diary/logbooks/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function saveHrAttendanceToday(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/hr/attendance/today/', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Attendance marked for today.' });
}

export async function listHrAttendanceMonthlyRegister(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/attendance/monthly-register/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function listHrAttendanceEmployeeSummary(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/attendance/employee-summary/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function getMyAttendanceRulebook() {
    const response = await fetch('/api/mydesk/attendance/rulebook/', { credentials: 'include' });
    return parseResponse(response);
}

export async function getMyAttendanceScore(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/attendance/score/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function getHrAttendanceRulebook(userId) {
    const response = await fetch(`/api/hr/attendance/rulebook/${userId}/`, { credentials: 'include' });
    return parseResponse(response);
}

export async function updateHrAttendanceRulebook(userId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/attendance/rulebook/${userId}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Rulebook updated.' });
}

export async function listHrRegularizationQueue(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/attendance/regularizations/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function actionHrRegularization(entryId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/attendance/regularizations/${entryId}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Regularization updated.' });
}

export async function hrOverrideAttendance(entryId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/attendance/override/${entryId}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Attendance overridden.' });
}

export async function listHrAttendanceScores(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/attendance/scores/${query}`, { credentials: 'include' });
    return parseResponse(response);
}



export async function listHrExpenseTrackerOverview(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/expenses/tracker/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function getHrExpenseTrackerMemberDetail(userId, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/expenses/tracker/member/${userId}/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function updateHrExpenseTrackerApproval(expenseId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/expenses/tracker/${expenseId}/approval/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Expense status updated.' });
}

export async function requestHrExpenseTrackerApproval(userId, payload = {}) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/expenses/tracker/member/${userId}/request-approval/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Approval request sent.' });
}

export async function getMyPayrollOverview(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/mydesk/payroll/overview/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function saveMyPayrollDeclarations(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/payroll/declarations/', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Payroll declarations saved.' });
}

export async function raiseMyPayrollDispute(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/mydesk/payroll/dispute/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Payroll dispute submitted.' });
}

export async function listHrPayrollDashboard(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/payroll/dashboard/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function getHrPayrollRunStatus(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/payroll/run/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function executeHrPayrollRunAction(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/hr/payroll/run/', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Payroll run action completed.' });
}

export async function getHrPayrollEmployeeDetail(userId, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/payroll/dashboard/${userId}/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function saveHrPayrollEmployeeSalaryStructure(userId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/payroll/dashboard/${userId}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Salary structure saved.' });
}

export async function saveHrPayrollEmployeeBreakup(userId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/payroll/dashboard/${userId}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return parseResponse(response);
    }, { successMessage: 'Earnings and deductions saved.' });
}

export async function getFinancePayrollLedger() {
    const response = await fetch('/api/finance/payroll/ledger/', { credentials: 'include' });
    return parseResponse(response);
}

export async function verifyFinancePayrollRecord(month, userId) {
    return executeMutation(async () => {
        const response = await fetch('/api/hr/payroll/run/', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_finance', month, user_id: userId }),
        });
        return parseResponse(response);
    }, { successMessage: 'Record verification updated.' });
}

export async function listHrMasterTaskTracker(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/tasks/master-tracker/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function assignHrMasterTaskTrackerTasks(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/hr/tasks/master-tracker/assign/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        return parseResponse(response);
    }, { successMessage: 'Tasks assigned successfully.' });
}

export async function listHrMeetingManagerOverview(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/meeting-manager/${query}`, { credentials: 'include' });
    return parseResponse(response);
}

export async function createHrMeetingManagerCompanyEvent(payload) {
    return executeMutation(async () => {
        const response = await fetch('/api/hr/meeting-manager/', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        return parseResponse(response);
    }, { successMessage: 'Company calendar event created.' });
}

export async function updateHrMeetingManagerCompanyEvent(eventId, payload) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/meeting-manager/company-events/${eventId}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
        });
        return parseResponse(response);
    }, { successMessage: 'Company calendar event updated.' });
}

export async function deleteHrMeetingManagerCompanyEvent(eventId) {
    return executeMutation(async () => {
        const response = await fetch(`/api/hr/meeting-manager/company-events/${eventId}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok && response.status !== 204) {
            return parseResponse(response);
        }
        return true;
    }, { successMessage: 'Company calendar event deleted.' });
}

function resolveDownloadFileName(contentDisposition, fallbackName) {
    if (!contentDisposition) return fallbackName;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        try {
            return decodeURIComponent(utfMatch[1]);
        } catch {
            return utfMatch[1];
        }
    }

    const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (plainMatch?.[1]) {
        return plainMatch[1];
    }

    return fallbackName;
}

export async function downloadHrMasterTaskTrackerReport(format = 'csv', filters = {}) {
    const normalizedFormat = String(format || 'csv').trim().toLowerCase() === 'pdf' ? 'pdf' : 'csv';
    const params = new URLSearchParams();

    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.set(key, String(value));
    });
    params.set('format', normalizedFormat);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/hr/tasks/master-tracker/export/${query}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const text = await response.text();
        let message = `Export failed (${response.status})`;
        try {
            const parsed = text ? JSON.parse(text) : null;
            message = parsed?.detail || parsed?.message || message;
        } catch {
            if (text) {
                message = text;
            }
        }
        emitMyDeskNotification(message, 'error');
        throw new Error(message);
    }

    const blob = await response.blob();
    const fallbackName = `hr-master-task-tracker.${normalizedFormat}`;
    const filename = resolveDownloadFileName(response.headers.get('Content-Disposition'), fallbackName);

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);

    emitMyDeskNotification(`Export downloaded: ${filename}`, 'success');
    return filename;
}
