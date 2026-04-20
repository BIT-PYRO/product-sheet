'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import SortPopover from '@/components/sort-popover';
import BulkUploadButton from '@/components/bulk-upload-button';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import LastUpdatedFooter from '@/components/last-updated-footer';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CreatableFilterPopover from '@/components/creatable-filter-popover';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';

const STATE_OPTIONS = [
  { key: 'running', label: 'Running' },
  { key: 'idle', label: 'Idle' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'maintenance', label: 'Under Maintenance' },
];

const STATE_FIELDS = {
  running: { qty: 'running_qty', location: 'running_location' },
  idle: { qty: 'idle_qty', location: 'idle_location' },
  breakdown: { qty: 'breakdown_qty', location: 'breakdown_location' },
  maintenance: { qty: 'maintenance_qty', location: 'maintenance_location' },
};

const MACHINE_COLUMNS = [
  { id: 'sno', label: 'S. No.' },
  { id: 'machineName', label: 'Machine Name' },
  { id: 'particulars', label: 'Particulars' },
  { id: 'department', label: 'Department' },
  { id: 'runningQty', label: 'Running Qty' },
  { id: 'runningLocation', label: 'Running Location' },
  { id: 'idleQty', label: 'Idle Qty' },
  { id: 'idleLocation', label: 'Idle Location' },
  { id: 'breakdownQty', label: 'Breakdown Qty' },
  { id: 'breakdownLocation', label: 'Breakdown Location' },
  { id: 'maintenanceQty', label: 'Under Maintenance Qty' },
  { id: 'maintenanceLocation', label: 'Under Maintenance Location' },
  { id: 'minRequiredStock', label: 'Minimum Required in Stock' },
  { id: 'action', label: 'Action' },
];

export default function MachinesInventoryPage() {
  const { canExport } = useSheetPermissions('inventory');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterState, setFilterState] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (field) => { setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return field; }); };
  const [customDepartmentFilter, setCustomDepartmentFilter] = useState('');
  const [customStateFilter, setCustomStateFilter] = useState('');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false);
  const [isAddMachineStockOpen, setIsAddMachineStockOpen] = useState(false);
  const [isUpdateMachineStockOpen, setIsUpdateMachineStockOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(MACHINE_COLUMNS.map((column) => column.id)));
  const [newMachine, setNewMachine] = useState({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
  const [addStockForm, setAddStockForm] = useState({ machineId: '', stateKey: 'running', qty: '', location: '' });
  const [updateStockForm, setUpdateStockForm] = useState({ machineId: '', fromState: 'idle', toState: 'running', qty: '' });

  const [issueOpen, setIssueOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [reviewError, setReviewError] = useState('');
  // issueRequestsReady removed — now using API
  const [issueForm, setIssueForm] = useState({ machineId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsernameRaw, setCurrentUsernameRaw] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/machines?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
      setLastUpdated(new Date());
      setSelectedIds(new Set());
      setEditBuffer({});
      setEditingRowIds(new Set());
      setStatus('Machines inventory refreshed.');
    } catch (err) {
      setStatus(err.message || 'Unable to load machines.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIssueRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/issue-requests?inventory_type=machines&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { loadIssueRequests(); }, [loadIssueRequests]);

  useEffect(() => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.data?.results) ? d.data.results : Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const refreshWorkforce = () => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.data?.results) ? d.data.results : Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
        setCurrentUserName(fullName);
        setCurrentUserEmail(u.email || '');
        setCurrentUsernameRaw(u.username || '');
      })
      .catch(() => {});
  }, []);

  const updateRow = (id, key, nextValue) => {
    if (!editingRowIds.has(id)) return;
    const apiKey = { machineName: 'machine_name', minRequiredStock: 'min_required_stock', runningQty: 'running_qty', runningLocation: 'running_location', idleQty: 'idle_qty', idleLocation: 'idle_location', breakdownQty: 'breakdown_qty', breakdownLocation: 'breakdown_location', maintenanceQty: 'maintenance_qty', maintenanceLocation: 'maintenance_location' }[key] || key;
    setEditBuffer((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [apiKey]: nextValue } }));
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const effectiveDepartmentFilter = (filterDepartment && filterDepartment.length > 0) ? filterDepartment : [];
    const effectiveStateFilter = (filterState && filterState.length > 0) ? filterState : [];
    const base = rows.filter((row) => {
      const machineName = row.machine_name || row.machineName || '';
      const matchesSearch = !search || [machineName, row.particulars, row.department].some((v) => String(v || '').toLowerCase().includes(search));
      const matchesDepartment = effectiveDepartmentFilter.length === 0 || effectiveDepartmentFilter.some(f => String(row.department || '').toLowerCase().includes(f.toLowerCase()));
      const matchesState = effectiveStateFilter.length === 0 || effectiveStateFilter.some(stateLabel => {
        const stateKey = STATE_OPTIONS.find(opt => opt.label === stateLabel)?.key;
        if (!stateKey) return false;
        const field = STATE_FIELDS[stateKey];
        const apiField = stateKey + '_qty';
        return field ? (Number(row[field.qty] || 0) > 0 || Number(row[apiField] || 0) > 0) : false;
      });
      return matchesSearch && matchesDepartment && matchesState;
    });
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, searchTerm, filterDepartment, filterState, sortField, sortDir]);

  const [workforceDepts, setWorkforceDepts] = useState([]);

  useEffect(() => {
    fetch('/api/workforce/meta', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.success && Array.isArray(d?.data?.departments)) setWorkforceDepts(d.data.departments); })
      .catch(() => {});
  }, []);

  const addDepartmentToBackend = async (name) => {
    await fetch('/api/workforce/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setWorkforceDepts((prev) => [...new Set([...prev, name])]);
  };

  const departmentOptions = useMemo(
    () => {
      const fromRows = rows.map((row) => String(row.department || '').trim()).filter(Boolean);
      return Array.from(new Set([...workforceDepts, ...fromRows])).sort((a, b) => a.localeCompare(b));
    },
    [rows, workforceDepts]
  );

  const allSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const runningVisibleCount = ['runningQty', 'runningLocation'].filter((key) => visibleColumns.has(key)).length;
  const idleVisibleCount = ['idleQty', 'idleLocation'].filter((key) => visibleColumns.has(key)).length;
  const breakdownVisibleCount = ['breakdownQty', 'breakdownLocation'].filter((key) => visibleColumns.has(key)).length;
  const maintenanceVisibleCount = ['maintenanceQty', 'maintenanceLocation'].filter((key) => visibleColumns.has(key)).length;
  const hasSubHeaders = runningVisibleCount + idleVisibleCount + breakdownVisibleCount + maintenanceVisibleCount > 0;
  const visibleTableColumnCount = 1 + MACHINE_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;
  const pendingIssueRequests = issueRequests.filter((r) => r.status === 'pending');
  const sortedIssueRequests = [...issueRequests].sort((a, b) => new Date(b.requested_at || b.requestedAt || 0) - new Date(a.requested_at || a.requestedAt || 0));
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
    if (selectedIds.size === 0) { setStatus('Select at least one row, then click Edit Row.'); return; }
    const ids = new Set(selectedRows.map((row) => row.id));
    const buffer = {};
    selectedRows.forEach((row) => {
      buffer[row.id] = { machine_name: row.machine_name ?? row.machineName ?? '', particulars: row.particulars ?? '', department: row.department ?? '', min_required_stock: row.min_required_stock ?? row.minRequiredStock ?? '', running_qty: row.running_qty ?? row.runningQty ?? '', running_location: row.running_location ?? row.runningLocation ?? '', idle_qty: row.idle_qty ?? row.idleQty ?? '', idle_location: row.idle_location ?? row.idleLocation ?? '', breakdown_qty: row.breakdown_qty ?? row.breakdownQty ?? '', breakdown_location: row.breakdown_location ?? row.breakdownLocation ?? '', maintenance_qty: row.maintenance_qty ?? row.maintenanceQty ?? '', maintenance_location: row.maintenance_location ?? row.maintenanceLocation ?? '' };
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

  async function handleSaveEdit() {
    const ids = Array.from(editingRowIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(
        Object.entries(editBuffer).map(async ([id, fields]) => {
          const res = await fetch(`/api/machines/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
          if (!res.ok) throw new Error(`Error saving machine ${id}`);
        })
      );
      setEditingRowIds(new Set());
      setEditBuffer({});
      await loadRows();
      setStatus(`Saved ${ids.length} row${ids.length !== 1 ? 's' : ''}.`);
    } catch (err) { setStatus(err.message || 'Failed to save edits'); }
  }

  // Maps camelCase UI keys to snake_case API keys
  const FIELD_MAP = { machineName: 'machine_name', minRequiredStock: 'min_required_stock', runningQty: 'running_qty', runningLocation: 'running_location', idleQty: 'idle_qty', idleLocation: 'idle_location', breakdownQty: 'breakdown_qty', breakdownLocation: 'breakdown_location', maintenanceQty: 'maintenance_qty', maintenanceLocation: 'maintenance_location' };

  function getRowValue(row, key) {
    const apiKey = FIELD_MAP[key] || key;
    if (editingRowIds.has(row.id) && editBuffer[row.id]) {
      return editBuffer[row.id][apiKey] ?? editBuffer[row.id][key] ?? '';
    }
    return row[apiKey] ?? row[key] ?? '';
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
    if (selectedColumnsForAction.size === MACHINE_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(MACHINE_COLUMNS.map((column) => column.id)));
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

  function machineName(row) {
    return row?.machine_name || row?.machineName || `Machine #${row?.id ?? ''}`;
  }

  function openIssuePopup() {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUserName.toLowerCase();
    const lUser = currentUsernameRaw.toLowerCase();
    const matchedMember = workforceMembers.find((w) => lEmail && w.email && w.email.toLowerCase() === lEmail)
      || workforceMembers.find((w) => lName && w.full_name && w.full_name.toLowerCase() === lName)
      || workforceMembers.find((w) => lUser && w.full_name && w.full_name.toLowerCase().startsWith(lUser));
    const issuedBy = matchedMember?.full_name || currentUserName;
    setIssueForm({ machineId: selectedRows.length > 0 ? String(selectedRows[0].id) : '', quantity: '', issuedTo: '', issuedBy, reason: '' });
    setIssueOpen(true);
  }

  async function createIssueRequest() {
    const machineIdNum = Number(issueForm.machineId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!machineIdNum) { setStatus('Please select a machine for request.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { setStatus('Please enter a valid quantity greater than 0.'); return; }
    if (!issuedTo) { setStatus('Please select who the machine is issued to.'); return; }
    if (!reason) { setStatus('Please enter reason of issue.'); return; }
    const row = rows.find((r) => r.id === machineIdNum);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_type: 'machines', item_id: machineIdNum, item_name: machineName(row), quantity: quantityNum, issued_to: issuedTo, issued_by: issuedBy, reason }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setIssueOpen(false);
      setIssueForm({ machineId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
      await loadIssueRequests();
      setStatus('Issue request created.');
    } catch (err) { setStatus(err.message || 'Failed to create issue request'); }
  }

  async function reviewIssueRequest(nextStatus) {
    if (!activeRequest) return;
    setReviewError('');
    try {
      const res = await fetch(`/api/issue-requests/${activeRequest.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewError(data?.message || `Error ${res.status}`);
        return;
      }
      setReviewError('');
      await loadRows();
      setRequestDetailsOpen(false);
      await loadIssueRequests();
      setStatus(`Request ${nextStatus}.`);
    } catch (err) { setReviewError(err.message || 'Review failed'); }
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
    const requestedAt = (request.requested_at || request.requestedAt) ? new Date(request.requested_at || request.requestedAt).toLocaleString() : '-';
    const reviewedAt = (request.reviewed_at || request.reviewedAt) ? new Date(request.reviewed_at || request.reviewedAt).toLocaleString() : '-';
    const html = `
      <html><head><title>Machine Issue Voucher</title>
      <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #E5E7EB;padding:10px;text-align:left;font-size:14px}
      th{background:#F8F9FA;width:220px}
      .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#DCFCE7;color:#166534;font-weight:600}
      </style></head><body>
      <h1>Machine Issue Voucher</h1>
      <table>
      <tr><th>Request ID</th><td>${request.id}</td></tr>
      <tr><th>Machine</th><td>${request.item_name || request.machineName}</td></tr>
      <tr><th>Quantity</th><td>${request.quantity}</td></tr>
      <tr><th>Issued To</th><td>${request.issued_to || request.issuedTo}</td></tr>
      <tr><th>Issued By</th><td>${request.issued_by || request.issuedBy || '-'}</td></tr>
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

  const deleteRow = async (id) => {
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setStatus('Machine deleted.');
    } catch (err) { setStatus(err.message || 'Delete failed'); }
  };

  const handleAddMachine = async () => {
    const name = newMachine.machineName.trim();
    if (!name) { setStatus('Machine Name is required to add a machine.'); return; }
    try {
      const res = await fetch('/api/machines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_name: name, particulars: newMachine.particulars.trim(), department: newMachine.department.trim(), min_required_stock: newMachine.minRequiredStock || 0 }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || 'Failed to create machine'); }
      setNewMachine({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
      setIsAddMachineOpen(false);
      await loadRows();
      setStatus('Machine added.');
    } catch (err) { setStatus(err.message || 'Failed to add machine'); }
  };

  const handleAddMachineStock = async () => {
    const machineId = Number(addStockForm.machineId);
    const qtyToAdd = Number(addStockForm.qty);
    const target = STATE_FIELDS[addStockForm.stateKey];
    if (!machineId || !target) { setStatus('Select a machine and stock state.'); return; }
    if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) { setStatus('Enter a valid quantity greater than 0.'); return; }
    const row = rows.find((r) => r.id === machineId);
    const qtyFieldApi = addStockForm.stateKey + '_qty';
    const locFieldApi = addStockForm.stateKey + '_location';
    const currentQty = Number(row?.[qtyFieldApi] ?? row?.[target.qty] ?? 0);
    try {
      await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [qtyFieldApi]: currentQty + qtyToAdd, ...(addStockForm.location.trim() ? { [locFieldApi]: addStockForm.location.trim() } : {}) }),
      });
      await fetch('/api/stock-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txn_date: new Date().toISOString().slice(0, 10), inventory_type: 'machines', txn_type: 'received', item_name: machineName(row), qty: qtyToAdd, location: addStockForm.location.trim() || '', machine: machineId }),
      });
      setAddStockForm((prev) => ({ ...prev, qty: '', location: '' }));
      setIsAddMachineStockOpen(false);
      await loadRows();
      setStatus('Machine stock added.');
    } catch (err) { setStatus(err.message || 'Failed to add stock'); }
  };

  const handleUpdateMachineStock = async () => {
    const machineId = Number(updateStockForm.machineId);
    const qtyToMove = Number(updateStockForm.qty);
    const from = STATE_FIELDS[updateStockForm.fromState];
    const to = STATE_FIELDS[updateStockForm.toState];
    if (!machineId || !from || !to) { setStatus('Select machine and valid from/to states.'); return; }
    if (updateStockForm.fromState === updateStockForm.toState) { setStatus('From and To states must be different.'); return; }
    if (!Number.isFinite(qtyToMove) || qtyToMove <= 0) { setStatus('Enter a valid transfer quantity greater than 0.'); return; }
    const row = rows.find((r) => r.id === machineId);
    const fromQtyField = updateStockForm.fromState + '_qty';
    const toQtyField = updateStockForm.toState + '_qty';
    const fromQty = Number(row?.[fromQtyField] ?? row?.[from.qty] ?? 0);
    const toQty = Number(row?.[toQtyField] ?? row?.[to.qty] ?? 0);
    if (fromQty < qtyToMove) { setStatus('Not enough quantity in source state.'); return; }
    try {
      await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fromQtyField]: fromQty - qtyToMove, [toQtyField]: toQty + qtyToMove }),
      });
      setUpdateStockForm((prev) => ({ ...prev, qty: '' }));
      setIsUpdateMachineStockOpen(false);
      await loadRows();
      setStatus('Machine stock updated.');
    } catch (err) { setStatus(err.message || 'Failed to update stock'); }
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MACHINES INVENTORY</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-3 md:px-4 pt-16 pb-16">
        <div className="mb-4 flex justify-end">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handlePrintTable}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <SortPopover
              columns={[
                { id: 'machine_name', label: 'Machine Name' },
                { id: 'department', label: 'Department' },
                { id: 'running_qty', label: 'Running Qty' },
                { id: 'idle_qty', label: 'Idle Qty' },
                { id: 'breakdown_qty', label: 'Breakdown Qty' },
                { id: 'maintenance_qty', label: 'Maintenance Qty' },
              ]}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onClear={() => { setSortField(''); setSortDir('asc'); }}
            />
            <button
              type="button"
              onClick={() => setIsManageColumnsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink"
            >
              Manage Columns
            </button>
            <button
              type="button"
              onClick={handleEditRows}
              disabled={editingRowIds.size > 0}
              className="inline-flex items-center gap-2 rounded-full border border-trust-blue bg-white px-4 h-8 text-sm font-medium text-trust-blue disabled:opacity-40"
            >
              <Pencil className="h-4 w-4" />
              Edit Row
            </button>
            <button
              type="button"
              onClick={() => {
                setNewMachine({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
                setIsAddMachineOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-trust-blue bg-white px-4 h-8 text-sm font-medium text-trust-blue"
            >
              + New Machine
            </button>
            <button
              type="button"
              onClick={() => {
                setAddStockForm({ machineId: '', stateKey: 'running', qty: '', location: '' });
                setIsAddMachineStockOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink"
            >
              Add Machine Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setUpdateStockForm({ machineId: '', fromState: 'idle', toState: 'running', qty: '' });
                setIsUpdateMachineStockOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink"
            >
              Update Machine Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setAddStockForm({ machineId: '', stateKey: 'running', qty: '', location: '' });
                setIsAddMachineStockOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-white px-4 h-8 text-sm font-medium text-emerald-600"
            >
              Add Machine
            </button>
            <button
              type="button"
              onClick={openIssuePopup}
              className="inline-flex items-center gap-2 rounded-full border border-orange-400 bg-white px-4 h-8 text-sm font-medium text-orange-500"
            >
              Issue Machine
            </button>
            <BulkUploadButton sheetType="machines" onComplete={loadRows} className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" />
            <button
              type="button"
              onClick={() => setRequestsPanelOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink"
            >
              Requests
              {pendingIssueRequests.length > 0 && (
                <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white leading-none">
                  {pendingIssueRequests.length}
                </span>
              )}
            </button>
        </div>

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
              storageKey="inventory:machines:department"
            />
            <MultiselectFilterPopover
              label="State"
              selectedValues={filterState}
              onSelectValues={setFilterState}
              options={STATE_OPTIONS.map((option) => option.label)}
              storageKey="inventory:machines:state"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterDepartment([]);
                setFilterState([]);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-soft-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#dbeafe]">
                  <th rowSpan={2} className="border border-soft-border px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      disabled={editingRowIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno') && <th rowSpan={2} className="border border-soft-border px-3 py-3 text-left text-xs font-normal text-black w-20">S. No.</th>}
                  {visibleColumns.has('machineName') && <th rowSpan={2} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black min-w-[170px]">Machine Name</th>}
                  {visibleColumns.has('particulars') && <th rowSpan={2} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black min-w-[170px]">Particulars</th>}
                  {visibleColumns.has('department') && <th rowSpan={2} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black min-w-[170px]">Department</th>}
                  {runningVisibleCount > 0 && <th colSpan={runningVisibleCount} className="border border-soft-border bg-emerald-50 px-4 py-3 text-left text-xs font-normal text-black">Running</th>}
                  {idleVisibleCount > 0 && <th colSpan={idleVisibleCount} className="border border-soft-border bg-yellow-100 px-4 py-3 text-left text-xs font-normal text-black">Idle</th>}
                  {breakdownVisibleCount > 0 && <th colSpan={breakdownVisibleCount} className="border border-soft-border bg-red-50 px-4 py-3 text-left text-xs font-normal text-black">Breakdown</th>}
                  {maintenanceVisibleCount > 0 && <th colSpan={maintenanceVisibleCount} className="border border-soft-border bg-orange-200 px-4 py-3 text-left text-xs font-normal text-black">Under Maintenance</th>}
                  {visibleColumns.has('minRequiredStock') && <th rowSpan={2} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black min-w-[210px]">Minimum Required in Stock</th>}
                  {visibleColumns.has('action') && <th rowSpan={2} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black w-24">Action</th>}
                </tr>
                {hasSubHeaders && (
                  <tr className="border-b border-soft-border bg-[#F8F9FA]">
                    {visibleColumns.has('runningQty') && <th className="border border-soft-border bg-emerald-50 px-4 py-3 text-left text-xs font-normal text-black min-w-[90px]">Qty</th>}
                    {visibleColumns.has('runningLocation') && <th className="border border-soft-border bg-emerald-50 px-4 py-3 text-left text-xs font-normal text-black min-w-[140px]">Location</th>}

                    {visibleColumns.has('idleQty') && <th className="border border-soft-border bg-yellow-100 px-4 py-3 text-left text-xs font-normal text-black min-w-[90px]">Qty</th>}
                    {visibleColumns.has('idleLocation') && <th className="border border-soft-border bg-yellow-100 px-4 py-3 text-left text-xs font-normal text-black min-w-[140px]">Location</th>}

                    {visibleColumns.has('breakdownQty') && <th className="border border-soft-border bg-red-50 px-4 py-3 text-left text-xs font-normal text-black min-w-[90px]">Qty</th>}
                    {visibleColumns.has('breakdownLocation') && <th className="border border-soft-border bg-red-50 px-4 py-3 text-left text-xs font-normal text-black min-w-[140px]">Location</th>}

                    {visibleColumns.has('maintenanceQty') && <th className="border border-soft-border bg-orange-200 px-4 py-3 text-left text-xs font-normal text-black min-w-[90px]">Qty</th>}
                    {visibleColumns.has('maintenanceLocation') && <th className="border border-soft-border bg-orange-200 px-4 py-3 text-left text-xs font-normal text-black min-w-[140px]">Location</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="border border-soft-border px-4 py-6 text-center text-sm text-cool-gray">
                      No machines found. Add one using the options above.
                    </td>
                  </tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border last:border-0 transition hover:bg-[#F8F9FA]">
                    <td className="border border-soft-border px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        disabled={editingRowIds.size > 0}
                        className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                      />
                    </td>
                    {visibleColumns.has('sno') && <td className="border border-soft-border px-3 py-2.5 text-midnight-ink">{row.id}</td>}
                    {visibleColumns.has('machineName') && <td className="border border-soft-border px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'machineName')} onChange={(e) => updateRow(row.id, 'machineName', e.target.value)} placeholder="Enter machine name" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('particulars') && <td className="border border-soft-border px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'particulars')} onChange={(e) => updateRow(row.id, 'particulars', e.target.value)} placeholder="Enter particulars" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('department') && <td className="border border-soft-border px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'department')} onChange={(e) => updateRow(row.id, 'department', e.target.value)} placeholder="Enter department" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('runningQty') && <td className="border border-soft-border bg-emerald-50/40 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'runningQty')} onChange={(e) => updateRow(row.id, 'runningQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('runningLocation') && <td className="border border-soft-border bg-emerald-50/40 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'runningLocation')} onChange={(e) => updateRow(row.id, 'runningLocation', e.target.value)} placeholder="Line 1" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('idleQty') && <td className="border border-soft-border bg-yellow-100/70 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'idleQty')} onChange={(e) => updateRow(row.id, 'idleQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('idleLocation') && <td className="border border-soft-border bg-yellow-100/70 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'idleLocation')} onChange={(e) => updateRow(row.id, 'idleLocation', e.target.value)} placeholder="Warehouse" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('breakdownQty') && <td className="border border-soft-border bg-red-50/60 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'breakdownQty')} onChange={(e) => updateRow(row.id, 'breakdownQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('breakdownLocation') && <td className="border border-soft-border bg-red-50/60 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'breakdownLocation')} onChange={(e) => updateRow(row.id, 'breakdownLocation', e.target.value)} placeholder="Repair bay" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('maintenanceQty') && <td className="border border-soft-border bg-orange-200/60 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'maintenanceQty')} onChange={(e) => updateRow(row.id, 'maintenanceQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('maintenanceLocation') && <td className="border border-soft-border bg-orange-200/60 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'maintenanceLocation')} onChange={(e) => updateRow(row.id, 'maintenanceLocation', e.target.value)} placeholder="Service center" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('minRequiredStock') && <td className="border border-soft-border px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'minRequiredStock')} onChange={(e) => updateRow(row.id, 'minRequiredStock', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('action') && <td className="border border-soft-border px-4 py-2.5">
                      <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label={`Delete row ${row.id}`}>
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
                  <p className="text-xs text-cool-gray">Issue requests for machines</p>
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
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      return (
                        <button
                          key={req.id}
                          onClick={() => { setActiveRequestId(req.id); setRequestDetailsOpen(true); }}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                        >
                          <p className="truncate text-sm text-midnight-ink">
                            <span className="font-semibold">{req.issued_to || req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.item_name || req.machineName}
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
                            <span className="text-[11px] text-cool-gray">{relativeTime(req.requested_at || req.requestedAt)}</span>
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
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Machine</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Machine</label>
              <select
                value={issueForm.machineId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, machineId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select machine</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{machineName(r)}</option>
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
                <select
                  value={issueForm.issuedTo}
                  onChange={(e) => setIssueForm((prev) => ({ ...prev, issuedTo: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  <option value="">Select person</option>
                  {workforceMembers.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Issued By</label>
                <select
                  value={issueForm.issuedBy}
                  onChange={(e) => setIssueForm((prev) => ({ ...prev, issuedBy: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  <option value="">Select person</option>
                  {workforceMembers.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline text-left">+ Enroll Workforce</button>
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

      <Dialog open={isAddMachineOpen} onOpenChange={setIsAddMachineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Machine</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Machine Name</label>
                <input
                  type="text"
                  value={newMachine.machineName}
                  onChange={(e) => setNewMachine((prev) => ({ ...prev, machineName: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Particulars</label>
                <input
                  type="text"
                  value={newMachine.particulars}
                  onChange={(e) => setNewMachine((prev) => ({ ...prev, particulars: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Department</label>
              <div className="w-fit">
                <CreatableFilterPopover
                  label="Department"
                  selectedValue={newMachine.department}
                  onSelectValue={(value) => setNewMachine((prev) => ({ ...prev, department: value }))}
                  options={departmentOptions}
                  onAddOption={addDepartmentToBackend}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Minimum Required in Stock</label>
              <input
                type="number"
                min={0}
                value={newMachine.minRequiredStock}
                onChange={(e) => setNewMachine((prev) => ({ ...prev, minRequiredStock: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddMachineOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMachine}>Add Machine</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMachineStockOpen} onOpenChange={setIsAddMachineStockOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Machine Stock</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Machine</label>
              <select
                value={addStockForm.machineId}
                onChange={(e) => setAddStockForm((prev) => ({ ...prev, machineId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select Machine</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>{row.machine_name || row.machineName || `Machine ${row.id}`}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">State</label>
                <select
                  value={addStockForm.stateKey}
                  onChange={(e) => setAddStockForm((prev) => ({ ...prev, stateKey: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  {STATE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={addStockForm.qty}
                  onChange={(e) => setAddStockForm((prev) => ({ ...prev, qty: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Location (optional)</label>
              <input
                type="text"
                value={addStockForm.location}
                onChange={(e) => setAddStockForm((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddMachineStockOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMachineStock}>Add Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateMachineStockOpen} onOpenChange={setIsUpdateMachineStockOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Update Machine Stock</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Machine</label>
              <select
                value={updateStockForm.machineId}
                onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, machineId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select Machine</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>{row.machine_name || row.machineName || `Machine ${row.id}`}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">From State</label>
                <select
                  value={updateStockForm.fromState}
                  onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, fromState: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  {STATE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">To State</label>
                <select
                  value={updateStockForm.toState}
                  onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, toState: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  {STATE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity to Move</label>
              <input
                type="number"
                min={0}
                value={updateStockForm.qty}
                onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, qty: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsUpdateMachineStockOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMachineStock}>Update Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDetailsOpen} onOpenChange={(open) => { setRequestDetailsOpen(open); if (!open) setReviewError(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3">
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Machine:</span> {activeRequest.item_name || activeRequest.machineName}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Quantity:</span> {activeRequest.quantity}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Issued To:</span> {activeRequest.issued_to || activeRequest.issuedTo}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Reason:</span> {activeRequest.reason || '-'}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Status:</span> {activeRequest.status.toUpperCase()}</div>
            </div>
          ) : (
            <p className="text-sm text-cool-gray">Request not found.</p>
          )}
          {reviewError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {reviewError}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRequestDetailsOpen(false)}>Close</Button>
            {activeRequest?.status === 'pending' && (
              <>
                <Button variant="destructive" onClick={() => reviewIssueRequest('rejected')}>Decline</Button>
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

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <input
                  id="select-all-machines-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === MACHINE_COLUMNS.length && MACHINE_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-machines-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {MACHINE_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`machines-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`machines-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
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

      {enrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={enrollWorkforceOpen}
          onEnroll={() => { refreshWorkforce(); setEnrollWorkforceOpen(false); }}
          onClose={() => setEnrollWorkforceOpen(false)}
        />
      )}
      {/* Fixed Footer */}
      {(() => {
        const _tp = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
        const _sp = Math.min(currentPage, _tp);
        return (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-soft-border shadow-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm text-cool-gray">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-soft-border rounded px-2 py-1 text-sm text-midnight-ink bg-white">
                {[25, 50, 75, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{filteredRows.length === 0 ? '0' : `${(_sp - 1) * rowsPerPage + 1}-${Math.min(_sp * rowsPerPage, filteredRows.length)}`} of {filteredRows.length}</span>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={_sp <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
              <span>{_sp} / {_tp}</span>
              <button onClick={() => setCurrentPage(p => Math.min(_tp, p + 1))} disabled={_sp >= _tp} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
            </div>
            <div className="flex gap-4">
              <span>Selected: {selectedIds.size}</span>
              {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} item(s)</span>}
            </div>
            <LastUpdatedFooter timestamp={lastUpdated} username={currentUserName} compact />
          </div>
        );
      })()}
    </main>
  );
}
