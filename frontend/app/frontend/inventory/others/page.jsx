'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreatableFilterPopover from '@/components/creatable-filter-popover';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';

const UNITS = ['PCS', 'BOX', 'PACKET', 'BOTTLE', 'KG', 'GM', 'LITER'];
const CATEGORIES = ['Pantry', 'Stationery', 'Housekeeping', 'Packaging', 'Utilities', 'Other'];
// ISSUE_REQUESTS_KEY removed — now using API
const OTHERS_COLUMNS = [
  { id: 'sno', label: '#' },
  { id: 'item_name', label: 'Item Name' },
  { id: 'category', label: 'Category' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'unit', label: 'Unit' },
  { id: 'min_level', label: 'Min Level' },
  { id: 'notes', label: 'Notes' },
  { id: 'action', label: 'Action' },
];

export default function OthersInventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [edits, setEdits] = useState({});
  const [newRows, setNewRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterUnit, setFilterUnit] = useState([]);
  const [customCategoryFilter, setCustomCategoryFilter] = useState('');
  const [customUnitFilter, setCustomUnitFilter] = useState('');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(OTHERS_COLUMNS.map((column) => column.id)));
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ itemId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ itemId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsernameRaw, setCurrentUsernameRaw] = useState('');
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [issueRequests, setIssueRequests] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    item_name: '',
    category: '',
    quantity: '',
    unit: 'PCS',
    min_level: '',
    notes: '',
  });

  const showStatus = (msg, type = 'success') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/others?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
      setEdits({});
      setNewRows([]);
      setSelectedIds(new Set());
      setEditingRowIds(new Set());
    } catch (err) {
      showStatus(err.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
      const res = await fetch('/api/issue-requests?inventory_type=others&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.data ?? data?.results ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch {}
  }, []);

  useEffect(() => { loadIssueRequests(); }, [loadIssueRequests]);

  const pendingIssueRequests = useMemo(() => issueRequests.filter((r) => r.status === 'pending'), [issueRequests]);
  const sortedIssueRequests = useMemo(() => [...issueRequests].sort((a, b) => new Date(b.requested_at || b.requestedAt) - new Date(a.requested_at || a.requestedAt)), [issueRequests]);
  const activeRequest = useMemo(() => issueRequests.find((r) => r.id === activeRequestId) || null, [issueRequests, activeRequestId]);

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

  function openRequestDetails(requestId) {
    setActiveRequestId(requestId);
    setRequestDetailsOpen(true);
  }

  async function reviewIssueRequestAsync(nextStatus) {
    if (!activeRequest) return;
    setReviewError('');
    try {
      const res = await fetch(`/api/issue-requests/${activeRequest.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReviewError(data?.message || `Error ${res.status}`); return; }
      setReviewError('');
      await fetchItems();
      setRequestDetailsOpen(false);
      await loadIssueRequests();
      showStatus(`Request ${nextStatus}.`);
    } catch (err) { setReviewError(err.message || 'Review failed'); }
  }

  const getField = (row, key) => edits[row.id]?.[key] !== undefined ? edits[row.id][key] : (row[key] ?? '');

  const setField = (id, key, value) => {
    if (!editingRowIds.has(id)) return;
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const setNewField = (localId, key, value) => {
    setNewRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, [key]: value } : r)));
  };

  const categoryOptions = useMemo(() => {
    const set = new Set(CATEGORIES);
    rows.forEach((row) => {
      const category = String(row.category || '').trim();
      if (category) set.add(category);
    });
    newRows.forEach((row) => {
      const category = String(row.category || '').trim();
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, newRows]);

  const openAddItemDialog = () => {
    setAddItemForm({
      item_name: '',
      category: '',
      quantity: '',
      unit: 'PCS',
      min_level: '',
      notes: '',
    });
    setIsAddItemOpen(true);
  };

  const openReceivePopup = () => {
    setReceiveForm({ itemId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
    setReceiveOpen(true);
  };

  const openIssuePopup = () => {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUserName.toLowerCase();
    const lUser = currentUsernameRaw.toLowerCase();
    const matchedMember = workforceMembers.find((w) => lEmail && w.email && w.email.toLowerCase() === lEmail)
      || workforceMembers.find((w) => lName && w.full_name && w.full_name.toLowerCase() === lName)
      || workforceMembers.find((w) => lUser && w.full_name && w.full_name.toLowerCase().startsWith(lUser));
    const issuedBy = matchedMember?.full_name || currentUserName;
    setIssueForm({ itemId: '', quantity: '', issuedTo: '', issuedBy, reason: '' });
    setIssueOpen(true);
  };

  const createIssueRequest = async () => {
    const itemIdNum = Number(issueForm.itemId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!itemIdNum) { showStatus('Please select an item.', 'error'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { showStatus('Please enter a valid quantity greater than 0.', 'error'); return; }
    if (!issuedTo) { showStatus('Please enter who the item is issued to.', 'error'); return; }
    if (!issuedBy) { showStatus('Please enter who issued the item.', 'error'); return; }
    if (!reason) { showStatus('Please enter a reason for issue.', 'error'); return; }
    const row = rows.find((r) => r.id === itemIdNum);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_type: 'others',
          item_id: itemIdNum,
          item_name: row?.item_name || `Item #${itemIdNum}`,
          quantity: quantityNum,
          issued_to: issuedTo,
          issued_by: issuedBy,
          reason,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); showStatus(d?.message || `Error ${res.status}`, 'error'); return; }
      await loadIssueRequests();
      setIssueOpen(false);
      showStatus(`Issue request created for ${quantityNum} of ${row?.item_name || 'item'} to ${issuedTo}.`);
    } catch (err) { showStatus(err.message || 'Failed to create request', 'error'); }
  };

  const createReceiveRequest = () => {
    const itemIdNum = Number(receiveForm.itemId);
    const quantityNum = Number(receiveForm.quantity);
    const employeeVendorName = receiveForm.employeeVendorName.trim();
    const referenceId = receiveForm.referenceId.trim();
    const price = receiveForm.price.trim();
    if (!itemIdNum) { showStatus('Please select an item.', 'error'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { showStatus('Please enter a valid quantity greater than 0.', 'error'); return; }
    if (!employeeVendorName) { showStatus('Please enter employee/vendor name.', 'error'); return; }
    if (!referenceId) { showStatus('Please enter a reference ID.', 'error'); return; }
    if (!price) { showStatus('Please enter a price.', 'error'); return; }
    const row = rows.find((r) => r.id === itemIdNum);
    setRows((prev) => prev.map((r) => r.id === itemIdNum ? { ...r, quantity: Number(r.quantity || 0) + quantityNum } : r));
    setReceiveOpen(false);
    showStatus(`Received ${quantityNum} of ${row?.item_name || 'Item #' + itemIdNum} from ${employeeVendorName}.`);
  };

  const handleAddItem = () => {
    if (!String(addItemForm.item_name || '').trim()) {
      showStatus('Item name is required.', 'error');
      return;
    }
    setNewRows((prev) => [
      ...prev,
      {
        _localId: Date.now(),
        item_name: String(addItemForm.item_name || '').trim(),
        category: String(addItemForm.category || '').trim(),
        quantity: addItemForm.quantity,
        unit: addItemForm.unit,
        min_level: addItemForm.min_level,
        notes: addItemForm.notes,
      },
    ]);
    setIsAddItemOpen(false);
    showStatus('Item added. Click Save Stock to persist.');
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const effectiveCategory = filterCategory && filterCategory.length > 0 ? filterCategory : [];
    const effectiveUnit = filterUnit && filterUnit.length > 0 ? filterUnit : [];
    return rows.filter(row => {
      const matchesSearch = !search || [row.item_name, row.category].some(v => String(v || '').toLowerCase().includes(search));
      const matchesCategory = effectiveCategory.length === 0 || effectiveCategory.some(f => String(row.category || '').toLowerCase().includes(f.toLowerCase()));
      const matchesUnit = effectiveUnit.length === 0 || effectiveUnit.some(f => String(row.unit || '').toLowerCase().includes(f.toLowerCase()));
      return matchesSearch && matchesCategory && matchesUnit;
    });
  }, [rows, searchTerm, filterCategory, filterUnit]);

  const unitOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.unit || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const allSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const visibleTableColumnCount = 1 + OTHERS_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  const toggleSelectAll = (checked) => {
    if (editingRowIds.size > 0) return;
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => next.add(row.id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((row) => next.delete(row.id));
      return next;
    });
  };

  const toggleRow = (id) => {
    if (editingRowIds.size > 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEditRows = () => {
    if (selectedIds.size === 0) {
      showStatus('Select at least one row, then click Edit Row.', 'error');
      return;
    }
    const nextEdits = {};
    rows.forEach((row) => {
      if (selectedIds.has(row.id)) {
        nextEdits[row.id] = {
          item_name: row.item_name ?? '',
          category: row.category ?? '',
          quantity: row.quantity ?? '',
          unit: row.unit ?? '',
          min_level: row.min_level ?? '',
          notes: row.notes ?? '',
        };
      }
    });
    setEdits(nextEdits);
    setEditingRowIds(new Set(Array.from(selectedIds)));
    showStatus(`Editing ${selectedIds.size} row${selectedIds.size !== 1 ? 's' : ''}.`);
  };

  const handleCancelEdit = () => {
    setEdits({});
    setEditingRowIds(new Set());
    showStatus('Edit canceled.');
  };

  const handleSaveEdit = async () => {
    if (editingRowIds.size === 0) return;
    setSaving(true);
    try {
      const patchPromises = Object.entries(edits).map(async ([id, fields]) => {
        const res = await fetch(`/api/others/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Error updating item ${id}`); }
        return res.json().catch(() => null);
      });
      await Promise.all(patchPromises);
      setEdits({});
      setEditingRowIds(new Set());
      await fetchItems();
      showStatus('Selected rows updated successfully.');
    } catch (err) {
      showStatus(err.message || 'Failed to save edits', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTable = () => {
    window.print();
  };

  const toggleColumnSelection = (columnId) => {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  };

  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === OTHERS_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(OTHERS_COLUMNS.map((column) => column.id)));
    }
  };

  const handleHideColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.delete(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.add(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const deleteRow = async (id) => {
    try {
      const res = await fetch(`/api/others/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const c = { ...prev }; delete c[id]; return c; });
      showStatus('Item deleted.');
    } catch (err) {
      showStatus(err.message || 'Delete failed', 'error');
    }
  };

  const removeNewRow = (localId) => setNewRows((prev) => prev.filter((r) => r._localId !== localId));

  const saveAll = async () => {
    setSaving(true);
    try {
      const patchPromises = Object.entries(edits).map(async ([id, fields]) => {
        const res = await fetch(`/api/others/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Error updating item ${id}`); }
        return res.json();
      });
      const postPromises = newRows.filter((r) => r.item_name.trim()).map(async (r) => {
        const { _localId, ...data } = r;
        const res = await fetch('/api/others/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, quantity: data.quantity || 0, min_level: data.min_level || 0 }) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || 'Error creating item'); }
        return res.json();
      });
      await Promise.all([...patchPromises, ...postPromises]);
      showStatus('Others inventory saved successfully.');
      await fetchItems();
    } catch (err) {
      showStatus(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const lowStockCount = useMemo(() => {
    return rows.filter((row) => {
      const qty = Number(edits[row.id]?.quantity ?? row.quantity ?? 0);
      const min = Number(edits[row.id]?.min_level ?? row.min_level ?? 0);
      return min > 0 && qty <= min;
    }).length;
  }, [rows, edits]);

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">OTHERS INVENTORY</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {status && (
          <div className={`fixed top-16 right-4 z-50 rounded-lg border px-4 py-2 text-sm shadow-md ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        {/* Back + buttons row */}
        <div className="mb-4 flex justify-end">
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
          <Button onClick={fetchItems} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={handlePrintTable} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Manage Columns
          </Button>
          <Button onClick={handleEditRows} variant="outline" disabled={editingRowIds.size > 0} className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Row
          </Button>
          <Button onClick={openAddItemDialog} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Item
          </Button>
          <Button onClick={saveAll} variant="outline" disabled={saving || editingRowIds.size > 0} className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Stock'}
          </Button>
          <Button onClick={openReceivePopup} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8">
            Add Item
          </Button>
          <Button onClick={openIssuePopup} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            Issue Item
          </Button>
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
            <Button onClick={handleSaveEdit} disabled={saving} className="h-8 px-3 bg-success text-white hover:bg-success/90 rounded-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="h-8 px-3 border-danger text-danger hover:bg-danger/10 rounded-full">
              Cancel Edit
            </Button>
          </div>
        )}

        {/* Filters */}
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
              label="Category"
              selectedValues={filterCategory}
              onSelectValues={setFilterCategory}
              options={CATEGORIES}
              storageKey="inventory:others:category"
            />
            <MultiselectFilterPopover
              label="Unit"
              selectedValues={filterUnit}
              onSelectValues={setFilterUnit}
              options={unitOptions}
              storageKey="inventory:others:unit"
            />
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setFilterCategory([]); setFilterUnit([]); }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm mb-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-cool-gray">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#dbeafe] border-b border-soft-border">
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={editingRowIds.size > 0}
                        className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                      />
                    </th>
                    {visibleColumns.has('sno') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-14">#</th>}
                    {visibleColumns.has('item_name') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Item Name</th>}
                    {visibleColumns.has('category') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Category</th>}
                    {visibleColumns.has('quantity') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>}
                    {visibleColumns.has('unit') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Unit</th>}
                    {visibleColumns.has('min_level') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Min Level</th>}
                    {visibleColumns.has('notes') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Notes</th>}
                    {visibleColumns.has('action') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-20">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const qty = Number(getField(row, 'quantity') || 0);
                    const min = Number(getField(row, 'min_level') || 0);
                    const isLow = min > 0 && qty <= min;
                    return (
                      <tr key={row.id} className={`border-b border-soft-border/70 last:border-b-0 ${isLow ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            disabled={editingRowIds.size > 0}
                            className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                          />
                        </td>
                        {visibleColumns.has('sno') && <td className="px-3 py-2 text-midnight-ink">{index + 1}</td>}
                        {visibleColumns.has('item_name') && <td className="px-3 py-2"><input type="text" value={getField(row, 'item_name')} onChange={(e) => setField(row.id, 'item_name', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('category') && <td className="px-3 py-2">
                          <select value={getField(row, 'category')} onChange={(e) => setField(row.id, 'category', e.target.value)} disabled={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue disabled:bg-gray-50 disabled:text-cool-gray">
                            <option value="">Select category</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('quantity') && <td className="px-3 py-2"><input type="number" value={getField(row, 'quantity')} onChange={(e) => setField(row.id, 'quantity', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('unit') && <td className="px-3 py-2">
                          <select value={getField(row, 'unit')} onChange={(e) => setField(row.id, 'unit', e.target.value)} disabled={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue disabled:bg-gray-50 disabled:text-cool-gray">
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('min_level') && <td className="px-3 py-2"><input type="number" value={getField(row, 'min_level')} onChange={(e) => setField(row.id, 'min_level', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="10" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('notes') && <td className="px-3 py-2"><input type="text" value={getField(row, 'notes')} onChange={(e) => setField(row.id, 'notes', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="Any note" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('action') && <td className="px-3 py-2">
                          <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>}
                      </tr>
                    );
                  })}
                  {newRows.map((row, index) => (
                    <tr key={row._localId} className="border-b border-soft-border/70 last:border-b-0 bg-sky-50/40">
                      <td className="px-3 py-2" />
                      {visibleColumns.has('sno') && <td className="px-3 py-2 text-midnight-ink">{rows.length + index + 1}</td>}
                      {visibleColumns.has('item_name') && <td className="px-3 py-2"><input type="text" value={row.item_name} onChange={(e) => setNewField(row._localId, 'item_name', e.target.value)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('category') && <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setNewField(row._localId, 'category', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          <option value="">Select category</option>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('quantity') && <td className="px-3 py-2"><input type="number" value={row.quantity} onChange={(e) => setNewField(row._localId, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('unit') && <td className="px-3 py-2">
                        <select value={row.unit} onChange={(e) => setNewField(row._localId, 'unit', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('min_level') && <td className="px-3 py-2"><input type="number" value={row.min_level} onChange={(e) => setNewField(row._localId, 'min_level', e.target.value)} placeholder="10" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('notes') && <td className="px-3 py-2"><input type="text" value={row.notes} onChange={(e) => setNewField(row._localId, 'notes', e.target.value)} placeholder="Any note" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('action') && <td className="px-3 py-2">
                        <button type="button" onClick={() => removeNewRow(row._localId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && newRows.length === 0 && (
                    <tr><td colSpan={visibleTableColumnCount} className="px-4 py-10 text-center text-sm text-cool-gray">No items found. Add an item to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Item</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Item Name</label>
              <input
                type="text"
                value={addItemForm.item_name}
                onChange={(e) => setAddItemForm((prev) => ({ ...prev, item_name: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Category</label>
                <div className="w-fit">
                  <CreatableFilterPopover
                    label="Category"
                    selectedValue={addItemForm.category}
                    onSelectValue={(value) => setAddItemForm((prev) => ({ ...prev, category: value }))}
                    options={categoryOptions}
                    storageKey="inventory:others:category"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                <select
                  value={addItemForm.unit}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={addItemForm.quantity}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Min Level</label>
                <input
                  type="number"
                  min={0}
                  value={addItemForm.min_level}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, min_level: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Notes</label>
              <input
                type="text"
                value={addItemForm.notes}
                onChange={(e) => setAddItemForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddItemOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
              Cancel
            </button>
            <button type="button" onClick={handleAddItem} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition">
              Add Item
            </button>
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
                  id="select-all-others-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === OTHERS_COLUMNS.length && OTHERS_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-others-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {OTHERS_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`others-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`others-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
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
            <button type="button" onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} className="rounded-md border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50">Hide</button>
            <button type="button" onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-success hover:bg-success/10 disabled:opacity-50">Show</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Item</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Item</label>
              <select
                value={receiveForm.itemId}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, itemId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select item</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.item_name || `Item #${r.id}`}</option>
                ))}
              </select>
              {receiveForm.itemId && (() => {
                const _row = rows.find((r) => r.id === Number(receiveForm.itemId));
                const _stock = Number(_row?.quantity ?? 0);
                return (
                  <p className="text-xs text-cool-gray mt-0.5">
                    Current stock: <span className="font-semibold text-emerald-600">{_stock} {_row?.unit || 'PCS'}</span>
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
            <button type="button" onClick={() => setReceiveOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
              Cancel
            </button>
            <button type="button" onClick={createReceiveRequest} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition">
              Receive
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Item</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Item</label>
              <select
                value={issueForm.itemId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, itemId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select item</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.item_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  value={issueForm.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { setIssueForm((prev) => ({ ...prev, quantity: '' })); return; }
                    const num = Number(val);
                    setIssueForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                  }}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
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
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIssueOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
              Cancel
            </button>
            <button type="button" onClick={createIssueRequest} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition">
              Request
            </button>
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

      {requestsPanelOpen && (
        <>
          <div className="fixed inset-0 z-[75] bg-black/20" onClick={() => setRequestsPanelOpen(false)} />
          <aside className="fixed right-2 top-[64px] z-[80] h-[calc(100vh-72px)] w-full max-w-[390px] rounded-2xl border border-soft-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-midnight-ink">Notifications</h3>
                  <p className="text-xs text-cool-gray">Issue requests for items</p>
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
                    {sortedIssueRequests.map((req, idx) => {
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      return (
                        <button key={req.id ?? idx} onClick={() => openRequestDetails(req.id)} className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-trust-blue">
                              {String(req.itemName || 'I').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-midnight-ink">
                                <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.itemName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{req.status}</span>
                                <span className="text-[11px] text-cool-gray">{relativeTime(req.requestedAt)}</span>
                              </div>
                            </div>
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

      <Dialog open={requestDetailsOpen} onOpenChange={(open) => { setRequestDetailsOpen(open); if (!open) setReviewError(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3 text-sm">
              <div><span className="font-medium text-cool-gray">Item:</span> {activeRequest.item_name || activeRequest.itemName}</div>
              <div><span className="font-medium text-cool-gray">Quantity:</span> {activeRequest.quantity}</div>
              <div><span className="font-medium text-cool-gray">Issued To:</span> {activeRequest.issued_to || activeRequest.issuedTo}</div>
              <div><span className="font-medium text-cool-gray">Issued By:</span> {activeRequest.issued_by || activeRequest.issuedBy || '-'}</div>
              <div><span className="font-medium text-cool-gray">Reason:</span> {activeRequest.reason || '-'}</div>
              <div><span className="font-medium text-cool-gray">Status:</span> {activeRequest.status.toUpperCase()}</div>
              <div><span className="font-medium text-cool-gray">Requested At:</span> {new Date(activeRequest.requested_at || activeRequest.requestedAt).toLocaleString()}</div>
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
                <Button variant="destructive" onClick={() => reviewIssueRequestAsync('rejected')}>Decline</Button>
                <Button onClick={() => reviewIssueRequestAsync('approved')}>Approve</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
