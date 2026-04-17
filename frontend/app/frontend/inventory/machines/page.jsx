'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
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

const STORAGE_KEY = 'inventory_machines_v1';
const MACHINE_ISSUE_REQUESTS_KEY = 'machine_issue_requests_v1';
const STATE_OPTIONS = [
  { key: 'running', label: 'Running' },
  { key: 'idle', label: 'Idle' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'maintenance', label: 'Under Maintenance' },
];

const STATE_FIELDS = {
  running: { qty: 'runningQty', location: 'runningLocation' },
  idle: { qty: 'idleQty', location: 'idleLocation' },
  breakdown: { qty: 'breakdownQty', location: 'breakdownLocation' },
  maintenance: { qty: 'maintenanceQty', location: 'maintenanceLocation' },
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

const createMachineRow = (id) => ({
  id,
  machineName: '',
  particulars: '',
  department: '',
  minRequiredStock: '',
  runningQty: '',
  runningLocation: '',
  idleQty: '',
  idleLocation: '',
  breakdownQty: '',
  breakdownLocation: '',
  maintenanceQty: '',
  maintenanceLocation: '',
});

const normalizeMachineRow = (row, id) => {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    ...createMachineRow(id),
    ...safeRow,
    id,
    machineName: String(safeRow.machineName ?? ''),
    particulars: String(safeRow.particulars ?? ''),
    department: String(safeRow.department ?? ''),
    minRequiredStock: String(safeRow.minRequiredStock ?? ''),
    runningQty: String(safeRow.runningQty ?? ''),
    runningLocation: String(safeRow.runningLocation ?? ''),
    idleQty: String(safeRow.idleQty ?? ''),
    idleLocation: String(safeRow.idleLocation ?? ''),
    breakdownQty: String(safeRow.breakdownQty ?? ''),
    breakdownLocation: String(safeRow.breakdownLocation ?? ''),
    maintenanceQty: String(safeRow.maintenanceQty ?? ''),
    maintenanceLocation: String(safeRow.maintenanceLocation ?? ''),
  };
};

const isEmptyMachineRow = (row) => {
  return [
    row.machineName,
    row.particulars,
    row.department,
    row.minRequiredStock,
    row.runningQty,
    row.runningLocation,
    row.idleQty,
    row.idleLocation,
    row.breakdownQty,
    row.breakdownLocation,
    row.maintenanceQty,
    row.maintenanceLocation,
  ].every((value) => String(value ?? '').trim() === '');
};

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
  const [issueRequestsReady, setIssueRequestsReady] = useState(false);
  const [issueForm, setIssueForm] = useState({ machineId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);

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
      const normalizedRows = parsed.map((row, index) => normalizeMachineRow(row, index + 1));
      const filteredRows = normalizedRows.filter((row) => !isEmptyMachineRow(row));
      setRows(filteredRows.map((row, index) => ({ ...row, id: index + 1 })));
      setSelectedIds(new Set());
      setStatus('Machines inventory refreshed.');
    } catch {
      setStatus('Unable to refresh saved machines data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const refreshWorkforce = () => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MACHINE_ISSUE_REQUESTS_KEY);
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
    localStorage.setItem(MACHINE_ISSUE_REQUESTS_KEY, JSON.stringify(issueRequests));
  }, [issueRequests, issueRequestsReady]);

  const updateRow = (id, key, nextValue) => {
    if (!editingRowIds.has(id)) return;
    setEditBuffer((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || normalizeMachineRow(rows.find((row) => row.id === id), id)),
        [key]: nextValue,
      },
    }));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createMachineRow(prev.length + 1)]);
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const effectiveDepartmentFilter = (filterDepartment && filterDepartment.length > 0) ? filterDepartment : [];
    const effectiveStateFilter = (filterState && filterState.length > 0) ? filterState : [];
    return rows.filter((row) => {
      const matchesSearch = !search || [row.machineName, row.particulars, row.department].some((v) => String(v || '').toLowerCase().includes(search));
      const matchesDepartment = effectiveDepartmentFilter.length === 0 || effectiveDepartmentFilter.some(f => String(row.department || '').toLowerCase().includes(f.toLowerCase()));
      const matchesState = effectiveStateFilter.length === 0 || effectiveStateFilter.some(stateLabel => {
        const stateKey = STATE_OPTIONS.find(opt => opt.label === stateLabel)?.key;
        if (!stateKey) return false;
        const field = STATE_FIELDS[stateKey];
        return field ? Number(row[field.qty] || 0) > 0 : false;
      });
      return matchesSearch && matchesDepartment && matchesState;
    });
  }, [rows, searchTerm, filterDepartment, filterState]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.department || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
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
      buffer[row.id] = { ...normalizeMachineRow(row, row.id) };
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
        return edited ? { ...normalizeMachineRow(edited, row.id), id: row.id } : row;
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
    return row?.machineName ? row.machineName : `Machine #${row?.id ?? ''}`;
  }

  function openIssuePopup() {
    setIssueForm({ machineId: selectedRows.length > 0 ? String(selectedRows[0].id) : '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
    setIssueOpen(true);
  }

  function createIssueRequest() {
    const machineIdNum = Number(issueForm.machineId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!machineIdNum) {
      setStatus('Please select a machine for request.');
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setStatus('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!issuedTo) {
      setStatus('Please select who the machine is issued to.');
      return;
    }
    if (!reason) {
      setStatus('Please enter reason of issue.');
      return;
    }
    const row = rows.find((r) => r.id === machineIdNum);
    const request = {
      id: Date.now(),
      machineId: machineIdNum,
      machineName: machineName(row),
      quantity: quantityNum,
      issuedTo,
      issuedBy,
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
      <tr><th>Machine</th><td>${request.machineName}</td></tr>
      <tr><th>Quantity</th><td>${request.quantity}</td></tr>
      <tr><th>Issued To</th><td>${request.issuedTo}</td></tr>
      <tr><th>Issued By</th><td>${request.issuedBy || '-'}</td></tr>
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
    setStatus('Machines inventory saved locally.');
  };

  const handleAddMachine = () => {
    const machineName = newMachine.machineName.trim();
    if (!machineName) {
      setStatus('Machine Name is required to add a machine.');
      return;
    }

    const nextRow = {
      ...createMachineRow(rows.length + 1),
      machineName,
      particulars: newMachine.particulars.trim(),
      department: newMachine.department.trim(),
      minRequiredStock: String(newMachine.minRequiredStock || ''),
    };

    setRows((prev) => {
      const updated = [...prev, nextRow];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setNewMachine({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
    setIsAddMachineOpen(false);
    setStatus('Machine added and saved.');
  };

  const handleAddMachineStock = () => {
    const machineId = Number(addStockForm.machineId);
    const qtyToAdd = Number(addStockForm.qty);
    const target = STATE_FIELDS[addStockForm.stateKey];

    if (!machineId || !target) {
      setStatus('Select a machine and stock state.');
      return;
    }
    if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) {
      setStatus('Enter a valid quantity greater than 0.');
      return;
    }

    let found = false;
    setRows((prev) =>
      prev.map((row) => {
        const safeRow = normalizeMachineRow(row, row.id);
        if (safeRow.id !== machineId) return safeRow;
        found = true;

        const currentQty = Number(safeRow[target.qty] || 0);
        return {
          ...safeRow,
          [target.qty]: String(currentQty + qtyToAdd),
          [target.location]: addStockForm.location.trim() || safeRow[target.location],
        };
      })
    );

    if (!found) {
      setStatus('Selected machine was not found.');
      return;
    }

    setAddStockForm((prev) => ({ ...prev, qty: '', location: '' }));
    setIsAddMachineStockOpen(false);
    setStatus('Machine stock added and saved.');
    setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, 0);
  };

  const handleUpdateMachineStock = () => {
    const machineId = Number(updateStockForm.machineId);
    const qtyToMove = Number(updateStockForm.qty);
    const from = STATE_FIELDS[updateStockForm.fromState];
    const to = STATE_FIELDS[updateStockForm.toState];

    if (!machineId || !from || !to) {
      setStatus('Select machine and valid from/to states.');
      return;
    }
    if (updateStockForm.fromState === updateStockForm.toState) {
      setStatus('From and To states must be different.');
      return;
    }
    if (!Number.isFinite(qtyToMove) || qtyToMove <= 0) {
      setStatus('Enter a valid transfer quantity greater than 0.');
      return;
    }

    let found = false;
    let insufficient = false;

    setRows((prev) =>
      prev.map((row) => {
        const safeRow = normalizeMachineRow(row, row.id);
        if (safeRow.id !== machineId) return safeRow;
        found = true;

        const fromQty = Number(safeRow[from.qty] || 0);
        const toQty = Number(safeRow[to.qty] || 0);

        if (fromQty < qtyToMove) {
          insufficient = true;
          return safeRow;
        }

        return {
          ...safeRow,
          [from.qty]: String(fromQty - qtyToMove),
          [to.qty]: String(toQty + qtyToMove),
        };
      })
    );

    if (!found) {
      setStatus('Selected machine was not found.');
      return;
    }
    if (insufficient) {
      setStatus('Not enough quantity in source state.');
      return;
    }

    setUpdateStockForm((prev) => ({ ...prev, qty: '' }));
    setIsUpdateMachineStockOpen(false);
    setStatus('Machine stock updated and saved.');
    setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }, 0);
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MACHINES INVENTORY</h1>
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
        </div>

        {editingRowIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button onClick={() => { handleSaveEdit(); saveRows(); }} className="h-8 px-3 bg-success text-white hover:bg-success/90">Save Changes</Button>
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
            <table className="w-full min-w-[2000px] text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#dbeafe]">
                  <th rowSpan={2} className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      disabled={editingRowIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno') && <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-16">S. No.</th>}
                  {visibleColumns.has('machineName') && <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Machine Name</th>}
                  {visibleColumns.has('particulars') && <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Particulars</th>}
                  {visibleColumns.has('department') && <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Department</th>}
                  {runningVisibleCount > 0 && <th colSpan={runningVisibleCount} className="bg-emerald-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-success">Running</th>}
                  {idleVisibleCount > 0 && <th colSpan={idleVisibleCount} className="bg-yellow-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-yellow-800">Idle</th>}
                  {breakdownVisibleCount > 0 && <th colSpan={breakdownVisibleCount} className="bg-red-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-danger">Breakdown</th>}
                  {maintenanceVisibleCount > 0 && <th colSpan={maintenanceVisibleCount} className="bg-orange-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-900">Under Maintenance</th>}
                  {visibleColumns.has('minRequiredStock') && <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[210px]">Minimum Required in Stock</th>}
                  {visibleColumns.has('action') && <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-24">Action</th>}
                </tr>
                {hasSubHeaders && (
                  <tr className="border-b border-soft-border bg-[#F8F9FA]">
                    {visibleColumns.has('runningQty') && <th className="bg-emerald-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>}
                    {visibleColumns.has('runningLocation') && <th className="bg-emerald-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>}

                    {visibleColumns.has('idleQty') && <th className="bg-yellow-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>}
                    {visibleColumns.has('idleLocation') && <th className="bg-yellow-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>}

                    {visibleColumns.has('breakdownQty') && <th className="bg-red-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>}
                    {visibleColumns.has('breakdownLocation') && <th className="bg-red-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>}

                    {visibleColumns.has('maintenanceQty') && <th className="bg-orange-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>}
                    {visibleColumns.has('maintenanceLocation') && <th className="bg-orange-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="px-4 py-6 text-center text-sm text-cool-gray">
                      No machines found. Add one using the options above.
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
                    {visibleColumns.has('machineName') && <td className="px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'machineName')} onChange={(e) => updateRow(row.id, 'machineName', e.target.value)} placeholder="Enter machine name" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('particulars') && <td className="px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'particulars')} onChange={(e) => updateRow(row.id, 'particulars', e.target.value)} placeholder="Enter particulars" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('department') && <td className="px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'department')} onChange={(e) => updateRow(row.id, 'department', e.target.value)} placeholder="Enter department" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('runningQty') && <td className="bg-emerald-50/40 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'runningQty')} onChange={(e) => updateRow(row.id, 'runningQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('runningLocation') && <td className="bg-emerald-50/40 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'runningLocation')} onChange={(e) => updateRow(row.id, 'runningLocation', e.target.value)} placeholder="Line 1" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('idleQty') && <td className="bg-yellow-100/70 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'idleQty')} onChange={(e) => updateRow(row.id, 'idleQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('idleLocation') && <td className="bg-yellow-100/70 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'idleLocation')} onChange={(e) => updateRow(row.id, 'idleLocation', e.target.value)} placeholder="Warehouse" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('breakdownQty') && <td className="bg-red-50/60 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'breakdownQty')} onChange={(e) => updateRow(row.id, 'breakdownQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('breakdownLocation') && <td className="bg-red-50/60 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'breakdownLocation')} onChange={(e) => updateRow(row.id, 'breakdownLocation', e.target.value)} placeholder="Repair bay" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('maintenanceQty') && <td className="bg-orange-200/60 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'maintenanceQty')} onChange={(e) => updateRow(row.id, 'maintenanceQty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}
                    {visibleColumns.has('maintenanceLocation') && <td className="bg-orange-200/60 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'maintenanceLocation')} onChange={(e) => updateRow(row.id, 'maintenanceLocation', e.target.value)} placeholder="Service center" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('minRequiredStock') && <td className="px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'minRequiredStock')} onChange={(e) => updateRow(row.id, 'minRequiredStock', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" />
                    </td>}

                    {visibleColumns.has('action') && <td className="px-4 py-2.5">
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
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      return (
                        <button
                          key={req.id}
                          onClick={() => { setActiveRequestId(req.id); setRequestDetailsOpen(true); }}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                        >
                          <p className="truncate text-sm text-midnight-ink">
                            <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.machineName}
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
                <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline mt-0.5 text-left">+ Quick Enrol Workforce</button>
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
                <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline mt-0.5 text-left">+ Quick Enrol Workforce</button>
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
                  storageKey="inventory:machines:department"
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
                  <option key={row.id} value={row.id}>{row.machineName || `Machine ${row.id}`}</option>
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
                  <option key={row.id} value={row.id}>{row.machineName || `Machine ${row.id}`}</option>
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

      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3">
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Machine:</span> {activeRequest.machineName}</div>
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
    </main>
  );
}
