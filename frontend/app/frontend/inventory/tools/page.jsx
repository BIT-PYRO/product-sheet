'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Download, Pencil, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import SortPopover from '@/components/sort-popover';
import BulkUploadButton from '@/components/bulk-upload-button';
import { fmtNum } from '@/lib/utils';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import LastUpdatedFooter from '@/components/last-updated-footer';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import CreatableFilterPopover from '@/components/creatable-filter-popover';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';

const TOOLS_COLUMNS = [
  { id: 'sno', label: 'S. No.' },
  { id: 'toolName', label: 'Tool name' },
  { id: 'particulars', label: 'Particulars' },
  { id: 'department', label: 'Department' },
  { id: 'new_qty', label: 'New Qty' },
  { id: 'new_unit', label: 'New Unit' },
  { id: 'new_location', label: 'New Location' },
  { id: 'in_use_qty', label: 'In Use Qty' },
  { id: 'in_use_unit', label: 'In Use Unit' },
  { id: 'used_qty', label: 'Used Qty' },
  { id: 'used_unit', label: 'Used Unit' },
  { id: 'used_location', label: 'Used Location' },
  { id: 'min_required_stock', label: 'Min. in Stock' },
  { id: 'action', label: 'Action' },
];

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
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (field) => { setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return field; }); };
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [addToolForm, setAddToolForm] = useState({
    toolName: '',
    particulars: '',
    department: '',
    new_qty: '',
    new_unit: 'PCS',
    new_location: '',
    used_qty: '',
    used_unit: 'PCS',
    used_location: '',
    in_use_qty: '',
    in_use_unit: 'PCS',
    min_required_stock: '',
  });
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('inv-tools', TOOLS_COLUMNS.map((column) => column.id));

  const [issueOpen, setIssueOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ toolId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [issueRequestsLoading, setIssueRequestsLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [issueForm, setIssueForm] = useState({ toolId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '', referenceId: '' });
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsernameRaw, setCurrentUsernameRaw] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const EXPORT_HEADERS = [
    'id',
    'tool_name',
    'particulars',
    'department',
    'new_qty',
    'new_unit',
    'new_location',
    'in_use_qty',
    'in_use_unit',
    'used_qty',
    'used_unit',
    'used_location',
    'min_required_stock',
  ];

  const buildExportRows = () => filteredRows.map((row) => ([
    row.id,
    row.tool_name ?? '',
    row.particulars ?? '',
    row.department ?? '',
    row.new_qty ?? 0,
    row.new_unit ?? '',
    row.new_location ?? '',
    row.in_use_qty ?? 0,
    row.in_use_unit ?? '',
    row.used_qty ?? 0,
    row.used_unit ?? '',
    row.used_location ?? '',
    row.min_required_stock ?? 0,
  ]));

  const exportToExcel = () => {
    const data = [EXPORT_HEADERS, ...buildExportRows()];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tools Inventory');
    XLSX.writeFile(wb, 'tools_inventory.xlsx');
    setExportMenuOpen(false);
  };

  const exportToPDF = () => {
    const rows = buildExportRows();
    const tableRows = rows.map((r) =>
      `<tr>${r.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tools Inventory</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 16px; }
        h2 { margin-bottom: 8px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #e8f5e9; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Tools Inventory</h2>
      <table><thead><tr>${EXPORT_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody></table>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    setExportMenuOpen(false);
  };

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tools?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
      setLastUpdated(new Date());
      setSelectedIds(new Set());
      setEditBuffer({});
      setEditingRowIds(new Set());
      setStatus('Tools inventory refreshed.');
    } catch (err) {
      setStatus(err.message || 'Unable to load tools.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

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

  const loadIssueRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/issue-requests?inventory_type=tools&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadIssueRequests(); }, [loadIssueRequests]);

  const updateRow = (id, key, nextValue) => {
    if (!editingRowIds.has(id)) return;
    setEditBuffer((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: nextValue } }));
  };

  const openAddToolDialog = () => {
    setAddToolForm({ toolName: '', particulars: '', department: '', new_qty: '', new_unit: 'PCS', new_location: '', used_qty: '', used_unit: 'PCS', used_location: '', in_use_qty: '', in_use_unit: 'PCS', min_required_stock: '' });
    setIsAddToolOpen(true);
  };

  const handleAddTool = async () => {
    if (!String(addToolForm.toolName || '').trim()) { setStatus('Tool name is required.'); return; }
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: addToolForm.toolName,
          particulars: addToolForm.particulars,
          department: addToolForm.department,
          new_qty: addToolForm.new_qty || 0,
          new_unit: addToolForm.new_unit,
          new_location: addToolForm.new_location,
          used_qty: addToolForm.used_qty || 0,
          used_unit: addToolForm.used_unit,
          used_location: addToolForm.used_location,
          in_use_qty: addToolForm.in_use_qty || 0,
          in_use_unit: addToolForm.in_use_unit,
          min_required_stock: addToolForm.min_required_stock || 0,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || 'Failed to create tool'); }
      setIsAddToolOpen(false);
      await loadRows();
      setStatus('Tool added.');
    } catch (err) { setStatus(err.message || 'Failed to add tool'); }
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const base = rows.filter((row) => {
      const matchesSearch = !search || [row.tool_name || row.toolName, row.particulars, row.department, row.new_location].some((v) => String(v || '').toLowerCase().includes(search));
      const matchesDepartment = !filterDepartment || filterDepartment.length === 0 || filterDepartment.some(dept => String(row.department || '').toLowerCase().includes(String(dept).toLowerCase()));
      const matchesUnit = !filterUnit || filterUnit.length === 0 || filterUnit.some(unit => String(row.new_unit || '').toLowerCase().includes(String(unit).toLowerCase()));
      return matchesSearch && matchesDepartment && matchesUnit;
    });
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, searchTerm, filterDepartment, filterUnit, sortField, sortDir]);

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

  const unitOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.new_unit || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const allSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const visibleTableColumnCount = 1 + TOOLS_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, safePage, rowsPerPage]);
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
    if (selectedIds.size === 0) {
      setStatus('Select at least one row, then click Edit Row.');
      return;
    }
    const ids = new Set(selectedRows.map((row) => row.id));
    const buffer = {};
    selectedRows.forEach((row) => {
      buffer[row.id] = { tool_name: row.tool_name ?? '', particulars: row.particulars ?? '', department: row.department ?? '', new_qty: row.new_qty ?? '', new_unit: row.new_unit ?? '', new_location: row.new_location ?? '', used_qty: row.used_qty ?? '', used_unit: row.used_unit ?? '', used_location: row.used_location ?? '', in_use_qty: row.in_use_qty ?? '', in_use_unit: row.in_use_unit ?? '', min_required_stock: row.min_required_stock ?? '' };
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
          const res = await fetch(`/api/tools/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
          if (!res.ok) throw new Error(`Error saving tool ${id}`);
        })
      );
      setEditingRowIds(new Set());
      setEditBuffer({});
      await loadRows();
      setStatus(`Saved ${ids.length} row${ids.length !== 1 ? 's' : ''}.`);
    } catch (err) { setStatus(err.message || 'Failed to save edits'); }
  }

  function getRowValue(row, key) {
    if (editingRowIds.has(row.id) && editBuffer[row.id]) {
      return editBuffer[row.id][key] ?? '';
    }
    const numericKeys = ['new_qty', 'in_use_qty', 'used_qty', 'min_required_stock'];
    if (numericKeys.includes(key)) return fmtNum(row[key]);
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
    return row?.tool_name || row?.toolName || `Tool #${row?.id ?? ''}`;
  }

  function openIssuePopup() {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUserName.toLowerCase();
    const lUser = currentUsernameRaw.toLowerCase();
    const matchedMember = workforceMembers.find((w) => lEmail && w.email && w.email.toLowerCase() === lEmail)
      || workforceMembers.find((w) => lName && w.full_name && w.full_name.toLowerCase() === lName)
      || workforceMembers.find((w) => lUser && w.full_name && w.full_name.toLowerCase().startsWith(lUser));
    const issuedBy = matchedMember?.full_name || currentUserName;
    setIssueForm({ toolId: '', quantity: '', issuedTo: '', issuedBy, reason: '', referenceId: '' });
    setIssueOpen(true);
  }

  function openReceivePopup() {
    setReceiveForm({ toolId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
    setReceiveOpen(true);
  }

  async function createReceiveRequest() {
    const toolIdNum = Number(receiveForm.toolId);
    const quantityNum = Number(receiveForm.quantity);
    const employeeVendorName = receiveForm.employeeVendorName.trim();
    const referenceId = receiveForm.referenceId.trim();
    if (!toolIdNum) { setStatus('Please select a tool.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { setStatus('Please enter a valid quantity greater than 0.'); return; }
    if (!employeeVendorName) { setStatus('Please enter employee/vendor name.'); return; }
    if (!referenceId) { setStatus('Please enter a reference ID.'); return; }
    const row = rows.find((r) => r.id === toolIdNum);
    try {
      if (receiveForm.usage === 'used') {
        // Used: add to used_qty only
        const newUsedQty = Number(row?.used_qty || 0) + quantityNum;
        await fetch(`/api/tools/${toolIdNum}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ used_qty: newUsedQty }) });
      } else {
        // New: add to new_qty
        const newQty = Number(row?.new_qty || 0) + quantityNum;
        await fetch(`/api/tools/${toolIdNum}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_qty: newQty }) });
      }
      await fetch('/api/stock-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txn_date: new Date().toISOString().slice(0, 10), inventory_type: 'tools', txn_type: 'received', item_name: row?.tool_name || toolName(row), particulars: row?.particulars || '', qty: quantityNum, qty_unit: row?.new_unit || 'PCS', location: row?.new_location || '', price: receiveForm.price || 0, amount: quantityNum * Number(receiveForm.price || 0), received_from: employeeVendorName, remark: referenceId, usage: receiveForm.usage || 'new', tool: toolIdNum }),
      });
      setReceiveOpen(false);
      setReceiveForm({ toolId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
      await loadRows();
      setStatus(`Received ${quantityNum} of ${toolName(row)} from ${employeeVendorName}.`);
    } catch (err) { setStatus(err.message || 'Receive failed'); }
  }

  async function createIssueRequest() {
    const toolIdNum = Number(issueForm.toolId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!toolIdNum) { setStatus('Please select a tool row for request.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { setStatus('Please enter a valid quantity greater than 0.'); return; }
    if (!issuedTo) { setStatus('Please enter issued to.'); return; }
    if (!issuedBy) { setStatus('Please enter issued by.'); return; }
    if (!reason) { setStatus('Please enter reason of issue.'); return; }
    const row = rows.find((r) => r.id === toolIdNum);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_type: 'tools', item_id: toolIdNum, item_name: row?.tool_name || toolName(row), quantity: quantityNum, issued_to: issuedTo, issued_by: issuedBy, reason, reference_id: issueForm.referenceId.trim() }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setIssueOpen(false);
      setIssueForm({ toolId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '', referenceId: '' });
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
        const msg = data?.message || `Error ${res.status}`;
        setReviewError(msg);
        return;
      }
      // Backend already deducted tool quantity and created stock transaction for 'approved' tools requests.
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
      <tr><th>Reference ID</th><td>${request.reference_id || request.referenceId || '-'}</td></tr>
      <tr><th>Tool</th><td>${request.item_name || request.toolName || '-'}</td></tr>
      <tr><th>Quantity</th><td>${request.quantity}</td></tr>
      <tr><th>Issued To</th><td>${request.issued_to || request.issuedTo || '-'}</td></tr>
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
      const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setStatus('Tool deleted.');
    } catch (err) { setStatus(err.message || 'Delete failed'); }
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">TOOLS INVENTORY</h1>
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
          <Button onClick={loadRows} variant="outline" disabled={loading} className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handlePrintTable} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print
          </Button>
          <SortPopover
            columns={[
              { id: 'tool_name', label: 'Tool Name' },
              { id: 'department', label: 'Department' },
              { id: 'new_qty', label: 'New Qty' },
              { id: 'used_qty', label: 'Used Qty' },
              { id: 'in_use_qty', label: 'In Use Qty' },
              { id: 'min_required_stock', label: 'Min. in Stock' },
            ]}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onClear={() => { setSortField(''); setSortDir('asc'); }}
          />
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Manage Columns
          </Button>
          <Button onClick={handleEditRows} variant="outline" disabled={editingRowIds.size > 0} className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit Row
          </Button>
          <Button onClick={openAddToolDialog} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Tool
          </Button>
          <Button onClick={openReceivePopup} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8">
            Add Tool
          </Button>
          <Button onClick={openIssuePopup} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            Issue Tool
          </Button>
          <BulkUploadButton sheetType="tools" onComplete={loadRows} className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" />
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full px-4 text-sm h-8 gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-soft-border bg-white shadow-lg py-1">
                  <button type="button" onClick={exportToExcel} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6]">Export as Excel (.xlsx)</button>
                  <button type="button" onClick={exportToPDF} className="w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6]">Export as PDF</button>
                </div>
              </>
            )}
          </div>
          <Button onClick={() => setRequestsPanelOpen((prev) => !prev)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Requests
            {pendingIssueRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white leading-none">
                {pendingIssueRequests.length}
              </span>
            )}
          </Button>
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
            <table className="w-full min-w-[1400px] border-collapse text-sm">
              <thead>
                {(() => {
                  const newVisibleCount = ['new_qty','new_unit','new_location'].filter(id => visibleColumns.has(id)).length;
                  const usedVisibleCount = ['used_qty','used_unit','used_location'].filter(id => visibleColumns.has(id)).length;
                  const inUseVisibleCount = ['in_use_qty','in_use_unit'].filter(id => visibleColumns.has(id)).length;
                  const hasSubHeaders = newVisibleCount > 0 || usedVisibleCount > 0 || inUseVisibleCount > 0;
                  return (
                    <>
                      <tr className="bg-[#dbeafe]">
                        <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected; }}
                            onChange={toggleSelectAll}
                            disabled={editingRowIds.size > 0}
                            className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                          />
                        </th>
                        {visibleColumns.has('sno') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-3 py-3 text-left text-xs font-normal text-black w-20">S. No.</th>}
                        {visibleColumns.has('toolName') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black">Tool name</th>}
                        {visibleColumns.has('particulars') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black">Particulars</th>}
                        {visibleColumns.has('department') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black">Department</th>}
                        {newVisibleCount > 0 && <th colSpan={newVisibleCount} className="border border-soft-border bg-emerald-50 px-4 py-2 text-center text-xs font-semibold text-emerald-800">New</th>}
                        {inUseVisibleCount > 0 && <th colSpan={inUseVisibleCount} className="border border-soft-border bg-blue-50 px-4 py-2 text-center text-xs font-semibold text-blue-800">In Use</th>}
                        {usedVisibleCount > 0 && <th colSpan={usedVisibleCount} className="border border-soft-border bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">Used</th>}
                        {visibleColumns.has('min_required_stock') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black">Min. in Stock</th>}
                        {visibleColumns.has('action') && <th rowSpan={hasSubHeaders ? 2 : 1} className="border border-soft-border px-4 py-3 text-left text-xs font-normal text-black w-24">Action</th>}
                      </tr>
                      {hasSubHeaders && (
                        <tr className="bg-[#F8F9FA]">
                          {visibleColumns.has('new_qty') && <th className="border border-soft-border bg-emerald-50 px-4 py-2 text-left text-xs font-normal text-black">Qty</th>}
                          {visibleColumns.has('new_unit') && <th className="border border-soft-border bg-emerald-50 px-4 py-2 text-left text-xs font-normal text-black">Unit</th>}
                          {visibleColumns.has('new_location') && <th className="border border-soft-border bg-emerald-50 px-4 py-2 text-left text-xs font-normal text-black">Location</th>}
                          {visibleColumns.has('in_use_qty') && <th className="border border-soft-border bg-blue-50 px-4 py-2 text-left text-xs font-normal text-black">Qty</th>}
                          {visibleColumns.has('in_use_unit') && <th className="border border-soft-border bg-blue-50 px-4 py-2 text-left text-xs font-normal text-black">Unit</th>}
                          {visibleColumns.has('used_qty') && <th className="border border-soft-border bg-amber-50 px-4 py-2 text-left text-xs font-normal text-black">Qty</th>}
                          {visibleColumns.has('used_unit') && <th className="border border-soft-border bg-amber-50 px-4 py-2 text-left text-xs font-normal text-black">Unit</th>}
                          {visibleColumns.has('used_location') && <th className="border border-soft-border bg-amber-50 px-4 py-2 text-left text-xs font-normal text-black">Location</th>}
                        </tr>
                      )}
                    </>
                  );
                })()}
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="px-4 py-6 text-center text-sm text-cool-gray">
                      No tools found. Add one using the button above.
                    </td>
                  </tr>
                ) : pagedRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#F8F9FA]">
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
                    {visibleColumns.has('toolName') && <td className="border border-soft-border px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'tool_name')}
                        onChange={(e) => updateRow(row.id, 'tool_name', e.target.value)}
                        placeholder="Enter tool name"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default"
                      />
                    </td>}
                    {visibleColumns.has('particulars') && <td className="border border-soft-border px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'particulars')}
                        onChange={(e) => updateRow(row.id, 'particulars', e.target.value)}
                        placeholder="Enter particulars"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default"
                      />
                    </td>}
                    {visibleColumns.has('department') && <td className="border border-soft-border px-4 py-2.5">
                      <input
                        type="text"
                        value={getRowValue(row, 'department')}
                        onChange={(e) => updateRow(row.id, 'department', e.target.value)}
                        placeholder="Enter department"
                        readOnly={!editingRowIds.has(row.id)}
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default"
                      />
                    </td>}
                    {visibleColumns.has('new_qty') && <td className="border border-soft-border bg-emerald-50/30 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'new_qty')} onChange={(e) => updateRow(row.id, 'new_qty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('new_unit') && <td className="border border-soft-border bg-emerald-50/30 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'new_unit')} onChange={(e) => updateRow(row.id, 'new_unit', e.target.value)} placeholder="PCS" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('new_location') && <td className="border border-soft-border bg-emerald-50/30 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'new_location')} onChange={(e) => updateRow(row.id, 'new_location', e.target.value)} placeholder="Location" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('in_use_qty') && <td className="border border-soft-border bg-blue-50/30 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'in_use_qty')} onChange={(e) => updateRow(row.id, 'in_use_qty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('in_use_unit') && <td className="border border-soft-border bg-blue-50/30 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'in_use_unit')} onChange={(e) => updateRow(row.id, 'in_use_unit', e.target.value)} placeholder="PCS" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('used_qty') && <td className="border border-soft-border bg-amber-50/30 px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'used_qty')} onChange={(e) => updateRow(row.id, 'used_qty', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('used_unit') && <td className="border border-soft-border bg-amber-50/30 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'used_unit')} onChange={(e) => updateRow(row.id, 'used_unit', e.target.value)} placeholder="PCS" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('used_location') && <td className="border border-soft-border bg-amber-50/30 px-4 py-2.5">
                      <input type="text" value={getRowValue(row, 'used_location')} onChange={(e) => updateRow(row.id, 'used_location', e.target.value)} placeholder="Location" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
                    </td>}
                    {visibleColumns.has('min_required_stock') && <td className="border border-soft-border px-4 py-2.5">
                      <input type="number" value={getRowValue(row, 'min_required_stock')} onChange={(e) => updateRow(row.id, 'min_required_stock', e.target.value)} placeholder="0" readOnly={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:border-transparent read-only:bg-transparent read-only:text-midnight-ink read-only:cursor-default" />
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
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      return (
                        <div
                          key={req.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setActiveRequestId(req.id); setRequestDetailsOpen(true); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveRequestId(req.id);
                              setRequestDetailsOpen(true);
                            }
                          }}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB] cursor-pointer"
                        >
                          <p className="truncate text-sm text-midnight-ink">
                            <span className="font-semibold">{req.issued_to || req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.item_name || req.toolName}
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
                        </div>
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
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Tool</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Reference ID <span className="text-cool-gray/50 normal-case">(optional)</span></label>
              <input
                type="text"
                value={issueForm.referenceId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, referenceId: e.target.value }))}
                placeholder="e.g. REF-001"
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Tool</label>
              <select
                value={issueForm.toolId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, toolId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select tool</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{toolName(r)}</option>
                ))}
              </select>
              {issueForm.toolId && (() => {
                const _row = rows.find((r) => r.id === Number(issueForm.toolId));
                const _stock = Number(_row?.new_qty ?? 0);
                return (
                  <p className="text-xs text-cool-gray mt-0.5">
                    Current stock: <span className={_stock <= 5 ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>{_stock} {_row?.new_unit || 'PCS'}</span>
                  </p>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                {issueForm.toolId && issueForm.quantity && (() => {
                  const _row = rows.find((r) => r.id === Number(issueForm.toolId));
                  const _stock = Number(_row?.new_qty ?? 0);
                  const _qty = Number(issueForm.quantity);
                  if (_stock > 0 && _qty > _stock) {
                    return <p className="text-xs text-red-600 font-medium mt-0.5">? Exceeds stock by {_qty - _stock}</p>;
                  }
                  return null;
                })()}
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

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Tool</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Tool</label>
              <select
                value={receiveForm.toolId}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, toolId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select tool</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{toolName(r)}</option>
                ))}
              </select>
              {receiveForm.toolId && (() => {
                const _row = rows.find((r) => r.id === Number(receiveForm.toolId));
                const _stock = Number(_row?.new_qty ?? 0);
                return (
                  <p className="text-xs text-cool-gray mt-0.5">
                    Current stock: <span className="font-semibold text-emerald-600">{_stock} {_row?.new_unit || 'PCS'}</span>
                  </p>
                );
              })()}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Employee / Vendor Name</label>
              <select
                value={receiveForm.employeeVendorName}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, employeeVendorName: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select person</option>
                {workforceMembers.map((m) => (
                  <option key={m.id} value={m.full_name}>{m.full_name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline mt-0.5 text-left">+ Quick Enrol Workforce</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Reference ID</label>
                <input
                  type="text"
                  value={receiveForm.referenceId}
                  onChange={(e) => setReceiveForm((prev) => ({ ...prev, referenceId: e.target.value }))}
                  placeholder="e.g. REF-001"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={receiveForm.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') { setReceiveForm((prev) => ({ ...prev, quantity: '' })); return; }
                    const num = Number(value);
                    setReceiveForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                  }}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Price</label>
                <input
                  type="text"
                  value={receiveForm.price}
                  onChange={(e) => setReceiveForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Usage</label>
              <select
                value={receiveForm.usage}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, usage: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={createReceiveRequest}>Receive</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <DialogContent className="max-w-2xl">
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
                  onAddOption={addDepartmentToBackend}
                />
              </div>
            </div>

            {/* New */}
            <div>
              <p className="mb-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide">New</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Qty</label>
                  <input type="number" min={0} value={addToolForm.new_qty} onChange={(e) => setAddToolForm((prev) => ({ ...prev, new_qty: e.target.value }))} placeholder="0" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                  <input type="text" value={addToolForm.new_unit} onChange={(e) => setAddToolForm((prev) => ({ ...prev, new_unit: e.target.value }))} placeholder="PCS" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Location</label>
                  <input type="text" value={addToolForm.new_location} onChange={(e) => setAddToolForm((prev) => ({ ...prev, new_location: e.target.value }))} placeholder="Store room" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
              </div>
            </div>

            {/* Used */}
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">Used</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Qty</label>
                  <input type="number" min={0} value={addToolForm.used_qty} onChange={(e) => setAddToolForm((prev) => ({ ...prev, used_qty: e.target.value }))} placeholder="0" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                  <input type="text" value={addToolForm.used_unit} onChange={(e) => setAddToolForm((prev) => ({ ...prev, used_unit: e.target.value }))} placeholder="PCS" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Location</label>
                  <input type="text" value={addToolForm.used_location} onChange={(e) => setAddToolForm((prev) => ({ ...prev, used_location: e.target.value }))} placeholder="Store room" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
              </div>
            </div>

            {/* In Use */}
            <div>
              <p className="mb-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">In Use</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Qty</label>
                  <input type="number" min={0} value={addToolForm.in_use_qty} onChange={(e) => setAddToolForm((prev) => ({ ...prev, in_use_qty: e.target.value }))} placeholder="0" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                  <input type="text" value={addToolForm.in_use_unit} onChange={(e) => setAddToolForm((prev) => ({ ...prev, in_use_unit: e.target.value }))} placeholder="PCS" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
                </div>
              </div>
            </div>

            {/* Minimum in Stock */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Minimum in Stock</label>
              <input type="number" min={0} value={addToolForm.min_required_stock} onChange={(e) => setAddToolForm((prev) => ({ ...prev, min_required_stock: e.target.value }))} placeholder="0" className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue" />
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
            <Button onClick={saveColumnView} variant="outline" className="ml-auto border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10">{saveViewStatus === 'saved' ? 'Saved ✓' : 'Save View'}</Button>
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
              {activeRequest.reference_id && <div className="text-sm text-midnight-ink"><span className="font-semibold">Reference ID:</span> {activeRequest.reference_id || activeRequest.referenceId}</div>}
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Tool:</span> {activeRequest.item_name || activeRequest.toolName}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Quantity:</span> {activeRequest.quantity}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Issued To:</span> {activeRequest.issued_to || activeRequest.issuedTo}</div>
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Issued By:</span> {activeRequest.issued_by || activeRequest.issuedBy || '-'}</div>
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

      {enrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={enrollWorkforceOpen}
          onEnroll={() => { refreshWorkforce(); setEnrollWorkforceOpen(false); }}
          onClose={() => setEnrollWorkforceOpen(false)}
        />
      )}
      {/* Fixed Footer */}
      {(() => {
        const _tp = totalPages;
        const _sp = safePage;
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
            <DeletionHistoryDrawer appLabel="inventory" modelName="toolitem" sheet="inventory" />
          </div>
        );
      })()}
    </main>
  );
}

