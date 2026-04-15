'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CreatableFilterPopover from '@/components/creatable-filter-popover';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';

const STORAGE_KEY = 'inventory_tools_v1';
const TOOL_ISSUE_REQUESTS_KEY = 'tool_issue_requests_v1';
const TOOLS_COLUMNS = [
  { id: 'sno', label: 'S. No.' },
  { id: 'toolName', label: 'Tool name' },
  { id: 'particulars', label: 'Particulars' },
  { id: 'department', label: 'Department' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'unit', label: 'Unit' },
  { id: 'location', label: 'Location' },
  { id: 'action', label: 'Action' },
];

const createToolRow = (id) => ({
  id,
  toolName: '',
  particulars: '',
  department: '',
  quantity: '',
  unit: '',
  location: '',
});

const normalizeToolRow = (row, id) => {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    ...createToolRow(id),
    ...safeRow,
    id,
    toolName: String(safeRow.toolName ?? ''),
    particulars: String(safeRow.particulars ?? ''),
    department: String(safeRow.department ?? ''),
    quantity: String(safeRow.quantity ?? ''),
    unit: String(safeRow.unit ?? ''),
    location: String(safeRow.location ?? ''),
  };
};

const isEmptyToolRow = (row) => {
  return [row.toolName, row.particulars, row.department, row.quantity, row.unit, row.location]
    .every((value) => String(value ?? '').trim() === '');
};

export default function ToolsInventoryPage() {
  const { canExport } = useSheetPermissions('inventory');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterUnit, setFilterUnit] = useState([]);
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [addToolForm, setAddToolForm] = useState({
    toolName: '',
    particulars: '',
    department: '',
    quantity: '',
    unit: 'PCS',
    location: '',
  });
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(TOOLS_COLUMNS.map((column) => column.id)));

  const [issueOpen, setIssueOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [issueRequestsReady, setIssueRequestsReady] = useState(false);
  const [issueForm, setIssueForm] = useState({ toolId: '', quantity: '', issuedTo: '', reason: '' });

  const loadRows = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setRows([]);
        setSelectedIds(new Set());
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setRows([]);
        setSelectedIds(new Set());
        return;
      }
      const normalizedRows = parsed.map((row, index) => normalizeToolRow(row, index + 1));
      const filteredRows = normalizedRows.filter((row) => !isEmptyToolRow(row));
      setRows(filteredRows.map((row, index) => ({ ...row, id: index + 1 })));
      setSelectedIds(new Set());
      setStatus('Tools inventory refreshed.');
    } catch {
      setStatus('Unable to refresh saved tools data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOOL_ISSUE_REQUESTS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setIssueRequests(parsed);
    } catch {
      // Ignore malformed local data.
    } finally {
      setIssueRequestsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!issueRequestsReady) return;
    localStorage.setItem(TOOL_ISSUE_REQUESTS_KEY, JSON.stringify(issueRequests));
  }, [issueRequests, issueRequestsReady]);

  const updateRow = (id, key, nextValue) => {
    if (!editingRowIds.has(id)) return;
    setEditBuffer((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || normalizeToolRow(rows.find((row) => row.id === id), id)),
        [key]: nextValue,
      },
    }));
  };

  const openAddToolDialog = () => {
    setAddToolForm({
      toolName: '',
      particulars: '',
      department: '',
      quantity: '',
      unit: 'PCS',
      location: '',
    });
    setIsAddToolOpen(true);
  };

  const handleAddTool = () => {
    if (!String(addToolForm.toolName || '').trim()) {
      setStatus('Tool name is required.');
      return;
    }

    const nextRow = normalizeToolRow(
      {
        toolName: addToolForm.toolName,
        particulars: addToolForm.particulars,
        department: addToolForm.department,
        quantity: addToolForm.quantity,
        unit: addToolForm.unit,
        location: addToolForm.location,
      },
      rows.length + 1
    );

    setRows((prev) => [...prev, nextRow]);
    setIsAddToolOpen(false);
    setStatus('Tool added. Click Save to persist.');
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !search || [row.toolName, row.particulars, row.department, row.location].some((v) => String(v || '').toLowerCase().includes(search));
      const matchesDepartment = !filterDepartment || filterDepartment.length === 0 || filterDepartment.some(dept => String(row.department || '').toLowerCase().includes(String(dept).toLowerCase()));
      const matchesUnit = !filterUnit || filterUnit.length === 0 || filterUnit.some(unit => String(row.unit || '').toLowerCase().includes(String(unit).toLowerCase()));
      return matchesSearch && matchesDepartment && matchesUnit;
    });
  }, [rows, searchTerm, filterDepartment, filterUnit]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.department || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const unitOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.unit || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const allSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const visibleTableColumnCount = 1 + TOOLS_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;
  const pendingIssueRequests = issueRequests.filter((r) => r.status === 'pending');
  const sortedIssueRequests = [...issueRequests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  const activeRequest = issueRequests.find((r) => r.id === activeRequestId) || null;

  function toggleSelectAll() {
    if (editingRowIds.size > 0) return;
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => next.delete(row.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => next.add(row.id));
        return next;
      });
    }
  }

  function toggleRow(id) {
    if (editingRowIds.size > 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEditRows() {
    if (selectedIds.size === 0) {
      setStatus('Select at least one row, then click Edit Row.');
      return;
    }
    const ids = new Set(selectedRows.map((row) => row.id));
    const buffer = {};
    selectedRows.forEach((row) => {
      buffer[row.id] = { ...normalizeToolRow(row, row.id) };
    });
    setEditingRowIds(ids);
    setEditBuffer(buffer);
    setStatus(`Editing ${ids.size} row${ids.size !== 1 ? 's' : ''}.`);
  }

  function handleCancelEdit() {
    setEditingRowIds(new Set());
    setEditBuffer({});
    setStatus('Edit canceled.');
  }

  function handleSaveEdit() {
    const ids = Array.from(editingRowIds);
    if (ids.length === 0) return;
    setRows((prev) =>
      prev.map((row) => {
        if (!editingRowIds.has(row.id)) return row;
        const edited = editBuffer[row.id];
        return edited ? { ...normalizeToolRow(edited, row.id), id: row.id } : row;
      })
    );
    setEditingRowIds(new Set());
    setEditBuffer({});
    setStatus(`Saved ${ids.length} row${ids.length !== 1 ? 's' : ''}. Click Save to persist.`);
  }

  function getRowValue(row, key) {
    if (editingRowIds.has(row.id) && editBuffer[row.id]) {
      return editBuffer[row.id][key] ?? '';
    }
    return row[key] ?? '';
  }

  function handlePrintTable() {
    window.print();
  }

  function toggleColumnSelection(columnId) {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  }

  function toggleSelectAllColumns() {
    if (selectedColumnsForAction.size === TOOLS_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(TOOLS_COLUMNS.map((column) => column.id)));
    }
  }

  function handleHideColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.delete(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  function handleShowColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.add(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  function toolName(row) {
    return row?.toolName ? row.toolName : `Tool #${row?.id ?? ''}`;
  }

  function openIssuePopup() {
    if (selectedRows.length === 0) {
      setStatus('Select at least one tool row to raise issue request.');
      return;
    }
    setIssueForm({ toolId: String(selectedRows[0].id), quantity: '', issuedTo: '', reason: '' });
    setIssueOpen(true);
  }

  function createIssueRequest() {
    const toolIdNum = Number(issueForm.toolId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const reason = issueForm.reason.trim();
    if (!toolIdNum) {
      setStatus('Please select a tool row for request.');
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setStatus('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!issuedTo) {
      setStatus('Please enter issued to.');
      return;
    }
    if (!reason) {
      setStatus('Please enter reason of issue.');
      return;
    }
    const row = rows.find((r) => r.id === toolIdNum);
    const request = {
      id: Date.now(),
      toolId: toolIdNum,
      toolName: toolName(row),
      quantity: quantityNum,
      issuedTo,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
    };
    setIssueRequests((prev) => [request, ...prev]);
    setIssueOpen(false);
    setStatus('Issue request created.');
  }

  function reviewIssueRequest(nextStatus) {
    if (!activeRequest) return;
    setIssueRequests((prev) =>
      prev.map((r) => (r.id === activeRequest.id ? { ...r, status: nextStatus, reviewedAt: new Date().toISOString() } : r))
    );
    setRequestDetailsOpen(false);
    setStatus(`Request ${nextStatus}.`);
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  }

  function printIssueVoucher(request) {
    if (!request) return;
    const opened = window.open('', '_blank', 'width=900,height=700');
    if (!opened) {
      setStatus('Popup blocked. Please allow popups to print voucher.');
      return;
    }
    const requestedAt = request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '-';
    const reviewedAt = request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-';
    const html = `
      <html><head><title>Tool Issue Voucher</title>
      <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #E5E7EB;padding:10px;text-align:left;font-size:14px}
      th{background:#F8F9FA;width:220px}
      .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#DCFCE7;color:#166534;font-weight:600}
      </style></head><body>
      <h1>Tool Issue Voucher</h1>
      <table>
      <tr><th>Request ID</th><td>${request.id}</td></tr>
      <tr><th>Tool</th><td>${request.toolName}</td></tr>
      <tr><th>Quantity</th><td>${request.quantity}</td></tr>
      <tr><th>Issued To</th><td>${request.issuedTo}</td></tr>
      <tr><th>Reason of Issue</th><td>${request.reason || '-'}</td></tr>
      <tr><th>Status</th><td><span class="badge">${String(request.status || '').toUpperCase()}</span></td></tr>
      <tr><th>Requested At</th><td>${requestedAt}</td></tr>
      <tr><th>Reviewed At</th><td>${reviewedAt}</td></tr>
      </table></body></html>
    `;
    opened.document.open();
    opened.document.write(html);
    opened.document.close();
    opened.focus();
    opened.print();
  }

  const deleteRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) return [];
      return next.map((row, index) => ({ ...row, id: index + 1 }));
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const saveRows = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    setStatus('Tools inventory saved locally.');
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">TOOLS INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handlePrintTable}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={() => setIsManageColumnsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              Manage Columns
            </button>
            <button
              type="button"
              onClick={handleEditRows}
              disabled={editingRowIds.size > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition disabled:opacity-40"
            >
              <Pencil className="h-4 w-4" />
              Edit Row
            </button>
            <button
              type="button"
              onClick={openAddToolDialog}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition"
            >
              <Plus className="h-4 w-4" />
              Add Tool
            </button>
            <button
              type="button"
              onClick={saveRows}
              className="inline-flex items-center gap-2 rounded-lg bg-trust-blue px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Save
            </button>
            <button
              type="button"
              onClick={openIssuePopup}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Issue Tool
            </button>
            <button
              onClick={() => setRequestsPanelOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              Requests
              {pendingIssueRequests.length > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white leading-none">
                  {pendingIssueRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <p className="mb-2 text-xs text-trust-blue">
            {selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected — click "Issue Tool" to create a request.
          </p>
        )}

        {editingRowIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button onClick={handleSaveEdit} className="h-8 px-3 bg-success text-white hover:bg-success/90">Save Changes</Button>
            <Button variant="outline" onClick={handleCancelEdit} className="h-8 px-3 border-danger text-danger hover:bg-danger/10">Cancel Edit</Button>
          </div>
        )}

        {status && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}

        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <MultiselectFilterPopover
              label="Department"
              selectedValues={filterDepartment}
              onSelectValues={setFilterDepartment}
              options={departmentOptions}
              storageKey="inventory:tools:department"
            />
            <MultiselectFilterPopover
              label="Unit"
              selectedValues={filterUnit}
              onSelectValues={setFilterUnit}
              options={unitOptions}
              storageKey="inventory:tools:unit"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterDepartment([]);
                setFilterUnit([]);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-soft-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#dbeafe]">
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      disabled={editingRowIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno') && <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-16">S. No.</th>}
                  {visibleColumns.has('toolName') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Tool name</th>}
                  {visibleColumns.has('particulars') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Particulars</th>}
                  {visibleColumns.has('department') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Department</th>}
                  {visibleColumns.has('quantity') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Quantity</th>}
                  {visibleColumns.has('unit') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Unit</th>}
                  {visibleColumns.has('location') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Location</th>}
                  {visibleColumns.has('action') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-24">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="px-4 py-6 text-center text-sm text-cool-gray">
                      No tools found. Add one using the button above.
                    </td>
                  </tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border last:border-0 transition hover:bg-[#F8F9FA]">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        disabled={editingRowIds.size > 0}
                        className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                      />
                    </td>
                    {visibleColumns.has('sno') && <td className="px-3 py-2.5 text-midnight-ink">{row.id}</td>}
                    {visibleColumns.has('toolName') && <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'toolName')}
                        onChange={(e) => updateRow(row.id, 'toolName', e.target.value)}
                        placeholder="Enter tool name"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('particulars') && <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'particulars')}
                        onChange={(e) => updateRow(row.id, 'particulars', e.target.value)}
                        placeholder="Enter particulars"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('department') && <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'department')}
                        onChange={(e) => updateRow(row.id, 'department', e.target.value)}
                        placeholder="Enter department"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('quantity') && <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={getRowValue(row, 'quantity')}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        placeholder="0"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('unit') && <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'unit')}
                        onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                        placeholder="PCS"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('location') && <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'location')}
                        onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                        placeholder="Store room A"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray"
                      />
                    </td>}
                    {visibleColumns.has('action') && <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        aria-label={`Delete row ${row.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      </div>

      {requestsPanelOpen && (
        <>
          <div className="fixed inset-0 z-[75] bg-black/20" onClick={() => setRequestsPanelOpen(false)} />
          <aside className="fixed right-2 top-[64px] z-[80] h-[calc(100vh-72px)] w-full max-w-[390px] rounded-2xl border border-soft-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-midnight-ink">Notifications</h3>
                  <p className="text-xs text-cool-gray">Issue requests for tools</p>
                </div>
                <button onClick={() => setRequestsPanelOpen(false)} className="rounded-md p-1 text-cool-gray hover:bg-[#F3F4F6] hover:text-midnight-ink">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sortedIssueRequests.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-cool-gray">No requests yet.</div>
                ) : (
                  <div className="divide-y divide-soft-border">
                    {sortedIssueRequests.map((req) => {
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      return (
                        <button
                          key={req.id}
                          onClick={() => { setActiveRequestId(req.id); setRequestDetailsOpen(true); }}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                        >
                          <p className="truncate text-sm text-midnight-ink">
                            <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.toolName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{req.status}</span>
                            {req.status === 'approved' && canExport && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); printIssueVoucher(req); }}
                                className="inline-flex items-center gap-1 rounded-full border border-soft-border px-2 py-0.5 text-[10px] font-semibold text-midnight-ink hover:border-trust-blue"
                              >
                                <Printer size={10} />
                                Print
                              </button>
                            )}
                            <span className="text-[11px] text-cool-gray">{relativeTime(req.requestedAt)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Tool Request</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Tool</label>
              <select
                value={issueForm.toolId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, toolId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select tool</option>
                {selectedRows.map((r) => (
                  <option key={r.id} value={r.id}>{toolName(r)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={issueForm.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setIssueForm((prev) => ({ ...prev, quantity: '' }));
                      return;
                    }
                    const num = Number(value);
                    setIssueForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                  }}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Issued To</label>
                <input
                  type="text"
                  value={issueForm.issuedTo}
                  onChange={(e) => setIssueForm((prev) => ({ ...prev, issuedTo: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Reason of Issue</label>
              <input
                type="text"
                value={issueForm.reason}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={createIssueRequest}>Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Tool</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Tool Name</label>
                <input
                  type="text"
                  value={addToolForm.toolName}
                  onChange={(e) => setAddToolForm((prev) => ({ ...prev, toolName: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Particulars</label>
                <input
                  type="text"
                  value={addToolForm.particulars}
                  onChange={(e) => setAddToolForm((prev) => ({ ...prev, particulars: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Department</label>
              <div className="w-fit">
                <CreatableFilterPopover
                  label="Department"
                  selectedValue={addToolForm.department}
                  onSelectValue={(value) => setAddToolForm((prev) => ({ ...prev, department: value }))}
                  options={departmentOptions}
                  storageKey="inventory:tools:department"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={addToolForm.quantity}
                  onChange={(e) => setAddToolForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                <input
                  type="text"
                  value={addToolForm.unit}
                  onChange={(e) => setAddToolForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Location</label>
                <input
                  type="text"
                  value={addToolForm.location}
                  onChange={(e) => setAddToolForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTool}>Add Tool</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <input
                  id="select-all-tools-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === TOOLS_COLUMNS.length && TOOLS_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-tools-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {TOOLS_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`tools-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`tools-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id)
                    ? <span className="bg-danger/10 text-danger-dark px-2 py-1 rounded-full text-sm">Hidden</span>
                    : <span className="bg-success/10 text-success-dark px-2 py-1 rounded-full text-sm">Visible</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-danger border-danger/40 hover:bg-danger/10">Hide</Button>
            <Button onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-success border-green-300 hover:bg-success/10">Show</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3">
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Tool:</span> {activeRequest.toolName}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Quantity:</span> {activeRequest.quantity}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Issued To:</span> {activeRequest.issuedTo}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Reason:</span> {activeRequest.reason || '-'}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Status:</span> {activeRequest.status.toUpperCase()}</div>
            </div>
          ) : (
            <p className="text-sm text-cool-gray">Request not found.</p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRequestDetailsOpen(false)}>Close</Button>
            {activeRequest?.status === 'pending' && (
              <>
                <Button variant="destructive" onClick={() => reviewIssueRequest('declined')}>Decline</Button>
                <Button onClick={() => reviewIssueRequest('approved')}>Approve</Button>
              </>
            )}
            {activeRequest?.status === 'approved' && canExport && (
              <Button variant="outline" onClick={() => printIssueVoucher(activeRequest)}>
                <Printer size={14} className="mr-2" />
                Print
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
