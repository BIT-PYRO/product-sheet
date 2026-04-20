'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import LastUpdatedFooter from '@/components/last-updated-footer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';

const DIE_COLUMNS = [
  { id: 'sno', label: '#' },
  { id: 'image', label: 'Image' },
  { id: 'die_code', label: 'Die Code' },
  { id: 'master_skus', label: 'Master SKU' },
  { id: 'designer_skus', label: 'Designer SKU' },
  { id: 'location', label: 'Location' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'wax_piece_qty', label: 'Wax Piece Qty' },
  { id: 'wax_piece_location', label: 'Wax Piece Location' },
  { id: 'wax_setting_qty', label: 'Wax Setting Qty' },
  { id: 'wax_setting_location', label: 'Wax Setting Location' },
  { id: 'casting_qty', label: 'Casting Qty' },
  { id: 'casting_location', label: 'Casting Location' },
  { id: 'notes', label: 'Notes' },
];

function emptyDie() {
  return {
    die_code: '',
    image: '',
    master_skus: '',
    designer_skus: '',
    location: '',
    quantity: '',
    wax_piece_qty: '',
    wax_piece_location: '',
    wax_setting_qty: '',
    wax_setting_location: '',
    casting_qty: '',
    casting_location: '',
    notes: '',
    min_level: '',
  };
}

function Field({ label, value, onChange, type = 'text', textarea = false }) {
  const base =
    'w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink placeholder:text-cool-gray focus:outline-none focus:ring-1 focus:ring-trust-blue bg-white';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea
          className={`${base} resize-none`}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={base}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function skuList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function DieInventoryPage() {
  const { canExport } = useSheetPermissions('inventory');

  const [dies, setDies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState([]);
  const [filterWaxPiece, setFilterWaxPiece] = useState([]);
  const [filterWaxSetting, setFilterWaxSetting] = useState([]);
  const [filterCasting, setFilterCasting] = useState([]);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyDie());
  const [saving, setSaving] = useState(false);
  const [editingDieId, setEditingDieId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [savingEdits, setSavingEdits] = useState(false);

  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(DIE_COLUMNS.map((c) => c.id)));

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ dieId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });
  const [issueRequests, setIssueRequests] = useState([]);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [reviewError, setReviewError] = useState('');

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchDies = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/die-inventory?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setDies(Array.isArray(results) ? results : []);
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError(err.message || 'Failed to load die inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueRequests = async () => {
    try {
      const res = await fetch('/api/issue-requests?inventory_type=die&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    fetchDies();
    fetchIssueRequests();
  }, []);

  useEffect(() => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data?.results ?? d?.data ?? d?.results ?? d ?? [];
        setWorkforceMembers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
        setCurrentUserName(fullName);
        setCurrentUserEmail(u.email || '');
        setCurrentUsername(u.username || '');
      })
      .catch(() => {});
  }, []);

  // ── Derived / memos ─────────────────────────────────────────────────────────

  const locationOptions = useMemo(
    () => Array.from(new Set(dies.map((d) => String(d.location || '').trim()).filter(Boolean))).sort(),
    [dies]
  );
  const waxPieceOptions = useMemo(
    () => Array.from(new Set(dies.map((d) => String(d.wax_piece_qty || '').trim()).filter(Boolean))).sort(),
    [dies]
  );
  const waxSettingOptions = useMemo(
    () => Array.from(new Set(dies.map((d) => String(d.wax_setting_qty || '').trim()).filter(Boolean))).sort(),
    [dies]
  );
  const castingOptions = useMemo(
    () => Array.from(new Set(dies.map((d) => String(d.casting_qty || '').trim()).filter(Boolean))).sort(),
    [dies]
  );

  const filtered = useMemo(() => {
    return dies.filter((d) => {
      const matchSearch =
        !search ||
        (d.die_code || '').toLowerCase().includes(search.toLowerCase()) ||
        skuList(d.master_skus).some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        skuList(d.designer_skus).some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchLocation =
        filterLocation.length === 0 ||
        filterLocation.some((v) => String(d.location || '').toLowerCase().includes(v.toLowerCase()));

      const matchWaxPiece =
        filterWaxPiece.length === 0 ||
        filterWaxPiece.some((v) => String(d.wax_piece_qty || '').toLowerCase().includes(v.toLowerCase()));

      const matchWax =
        filterWaxSetting.length === 0 ||
        filterWaxSetting.some((v) => String(d.wax_setting_qty || '').toLowerCase().includes(v.toLowerCase()));

      const matchCasting =
        filterCasting.length === 0 ||
        filterCasting.some((v) => String(d.casting_qty || '').toLowerCase().includes(v.toLowerCase()));

      return matchSearch && matchLocation && matchWaxPiece && matchWax && matchCasting;
    });
  }, [dies, search, filterLocation, filterWaxPiece, filterWaxSetting, filterCasting]);

  const allSelected = filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));
  const someSelected = filtered.some((d) => selectedIds.has(d.id)) && !allSelected;
  const visibleColCount = 1 + DIE_COLUMNS.filter((c) => visibleColumns.has(c.id)).length;

  const selectedDies = useMemo(() => dies.filter((d) => selectedIds.has(d.id)), [dies, selectedIds]);

  const pendingIssueRequests = useMemo(
    () => issueRequests.filter((r) => r.status === 'pending'),
    [issueRequests]
  );

  const sortedIssueRequests = useMemo(
    () => [...issueRequests].sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0)),
    [issueRequests]
  );

  const activeRequest = useMemo(
    () => issueRequests.find((r) => r.id === activeRequestId) || null,
    [issueRequests, activeRequestId]
  );

  // ── Selection helpers ───────────────────────────────────────────────────────

  function toggleSelectAll() {
    if (editingRowIds.size > 0) return;
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((d) => next.add(d.id));
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

  // ── Edit ────────────────────────────────────────────────────────────────────

  function handleEditRows() {
    if (selectedDies.length === 0) {
      setStatusMsg('Select a die row first, then click Edit Row.');
      return;
    }
    if (selectedDies.length > 1) {
      setStatusMsg('Please select only one die at a time to edit.');
      return;
    }
    const d = selectedDies[0];
    setEditingDieId(d.id);
    setForm({
      die_code: d.die_code || '',
      image: d.image || '',
      master_skus: Array.isArray(d.master_skus) ? d.master_skus.join(', ') : d.master_skus || '',
      designer_skus: Array.isArray(d.designer_skus) ? d.designer_skus.join(', ') : d.designer_skus || '',
      location: d.location || '',
      quantity: d.quantity ?? '',
      wax_piece_qty: d.wax_piece_qty ?? '',
      wax_piece_location: d.wax_piece_location || '',
      wax_setting_qty: d.wax_setting_qty || '',
      wax_setting_location: d.wax_setting_location || '',
      casting_qty: d.casting_qty || '',
      casting_location: d.casting_location || '',
      notes: d.notes || '',
      min_level: d.min_level ?? '',
    });
    setStatusMsg('');
    setAddOpen(true);
  }

  function updateEditBuffer(id, key, value) {
    setEditBuffer((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  }

  async function handleSaveEdit() {
    const ids = Array.from(editingRowIds);
    setSavingEdits(true);
    try {
      for (const id of ids) {
        const payload = { ...editBuffer[id] };
        if (typeof payload.master_skus === 'string') {
          payload.master_skus = payload.master_skus.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (typeof payload.designer_skus === 'string') {
          payload.designer_skus = payload.designer_skus.split(',').map((s) => s.trim()).filter(Boolean);
        }
        const res = await fetch(`/api/die-inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || `Failed to update die ${id}`);
        }
      }
      setEditingRowIds(new Set());
      setEditBuffer({});
      await fetchDies();
      setStatusMsg('Selected die rows updated successfully.');
    } catch (err) {
      setStatusMsg(err.message || 'Failed to save edits.');
    } finally {
      setSavingEdits(false);
    }
  }

  function handleCancelEdit() {
    setEditingRowIds(new Set());
    setEditBuffer({});
    setStatusMsg('Edit canceled.');
  }

  // ── Add Die ─────────────────────────────────────────────────────────────────

  async function handleSaveDie() {
    if (!form.die_code.trim()) {
      setStatusMsg('Die Code is required.');
      return;
    }
    setSaving(true);
    setStatusMsg('');
    try {
      const payload = {
        ...form,
        master_skus: typeof form.master_skus === 'string'
          ? form.master_skus.split(',').map((s) => s.trim()).filter(Boolean)
          : form.master_skus,
        designer_skus: typeof form.designer_skus === 'string'
          ? form.designer_skus.split(',').map((s) => s.trim()).filter(Boolean)
          : form.designer_skus,
        quantity: form.quantity || 0,
        min_level: form.min_level || 0,
      };
      const isEditing = editingDieId !== null;
      const res = await fetch(
        isEditing ? `/api/die-inventory/${editingDieId}` : '/api/die-inventory',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      setStatusMsg(isEditing ? 'Die updated successfully.' : 'Die added successfully.');
      setAddOpen(false);
      setEditingDieId(null);
      setForm(emptyDie());
      fetchDies();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDeleteSelected() {
    if (selectedDies.length === 0) {
      setStatusMsg('Select at least one row to delete.');
      return;
    }
    if (!window.confirm(`Delete ${selectedDies.length} selected die(s)?`)) return;
    try {
      for (const d of selectedDies) {
        await fetch(`/api/die-inventory/${d.id}`, { method: 'DELETE' });
      }
      setSelectedIds(new Set());
      await fetchDies();
      setStatusMsg(`${selectedDies.length} die(s) deleted.`);
    } catch (err) {
      setStatusMsg(err.message || 'Delete failed.');
    }
  }

  // ── Issue ───────────────────────────────────────────────────────────────────

  function openIssuePopup() {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUserName.toLowerCase();
    const lUser = currentUsername.toLowerCase();
    const matched = workforceMembers.find(
      (w) => (lEmail && w.email?.toLowerCase() === lEmail) ||
              (lName && w.full_name?.toLowerCase() === lName) ||
              (lUser && w.full_name?.toLowerCase().startsWith(lUser))
    );
    setIssueForm({ dieId: '', quantity: '', issuedTo: '', issuedBy: matched?.full_name || currentUserName, reason: '' });
    setIssueOpen(true);
  }

  async function createIssueRequest() {
    const dieIdNum = Number(issueForm.dieId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!dieIdNum) { setStatusMsg('Please select a die.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { setStatusMsg('Please enter a valid quantity.'); return; }
    if (!issuedTo) { setStatusMsg('Please enter who the die is issued to.'); return; }
    if (!issuedBy) { setStatusMsg('Please enter who issued the die.'); return; }
    if (!reason) { setStatusMsg('Please enter reason of issue.'); return; }
    const die = dies.find((d) => d.id === dieIdNum);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_type: 'die',
          item_id: dieIdNum,
          item_name: die?.die_code || `Die #${dieIdNum}`,
          quantity: quantityNum,
          issued_to: issuedTo,
          issued_by: issuedBy,
          reason,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setIssueOpen(false);
      await fetchIssueRequests();
      setStatusMsg('Issue request created.');
    } catch (err) { setStatusMsg(err.message || 'Failed to create issue request'); }
  }

  function openRequestDetails(requestId) {
    setActiveRequestId(requestId);
    setRequestDetailsOpen(true);
  }

  async function reviewIssueRequest(nextStatus) {
    if (!activeRequest) return;
    setReviewError('');
    try {
      const res = await fetch(`/api/issue-requests/${activeRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReviewError(data?.message || `Error ${res.status}`); return; }
      setReviewError('');
      await fetchDies();
      setRequestDetailsOpen(false);
      await fetchIssueRequests();
      setStatusMsg(`Request ${nextStatus}.`);
    } catch (err) { setReviewError(err.message || 'Review failed'); }
  }

  // ── Bulk upload ──────────────────────────────────────────────────────────────

  async function handleBulkUpload() {
    if (!bulkFile) { setStatusMsg('Please select a file.'); return; }
    setBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await fetch('/api/bulk-upload?type=die-inventory', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      setBulkUploadOpen(false);
      setBulkFile(null);
      await fetchDies();
      setStatusMsg(data?.message || 'Bulk upload complete.');
    } catch (err) {
      setStatusMsg(err.message || 'Bulk upload failed.');
    } finally {
      setBulkUploading(false);
    }
  }

  // ── Manage columns ───────────────────────────────────────────────────────────

  function toggleColumnSelection(columnId) {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  }

  function handleHideColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((id) => next.delete(id));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  function handleShowColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((id) => next.add(id));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  // ── Misc ─────────────────────────────────────────────────────────────────────

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

  const ff = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));
  const hasActiveFilters = search || filterLocation.length || filterWaxPiece.length || filterWaxSetting.length || filterCasting.length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">DIE INVENTORY</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-3 md:px-4 pt-16 pb-16">
        {/* Status toast */}
        {statusMsg && (
          <div className="fixed top-16 right-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-soft-border bg-white px-4 py-2 text-sm text-midnight-ink shadow-md">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')}><X className="h-3.5 w-3.5 text-cool-gray hover:text-midnight-ink" /></button>
          </div>
        )}

        {/* Back */}
        <div className="mb-4 flex justify-end">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Action buttons */}
        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
          <Button onClick={fetchDies} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print
          </Button>
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Manage Columns
          </Button>
          <Button
            onClick={handleEditRows}
            variant="outline"
            disabled={editingRowIds.size > 0}
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit Row
          </Button>
          <Button
            onClick={() => { setForm(emptyDie()); setEditingDieId(null); setStatusMsg(''); setAddOpen(true); }}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Die
          </Button>
          <Button
            onClick={openIssuePopup}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
          >
            Issue Die
          </Button>
          <Button
            onClick={() => setRequestsPanelOpen((prev) => !prev)}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Requests
            {pendingIssueRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white leading-none">
                {pendingIssueRequests.length}
              </span>
            )}
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="outline"
            disabled={selectedDies.length === 0}
            className="border-red-400 text-red-500 hover:bg-red-50 rounded-full px-4 text-sm h-8"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
          <Button
            onClick={() => { setBulkFile(null); setBulkUploadOpen(true); }}
            variant="outline"
            className="border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10 rounded-full px-4 text-sm h-8"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Bulk Upload
          </Button>
        </div>

        {/* Inline edit action bar */}
        {editingRowIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdits}
              className="h-8 px-3 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {savingEdits ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={savingEdits}
              className="h-8 px-3 border-red-400 text-red-500 hover:bg-red-50"
            >
              Cancel Edit
            </Button>
          </div>
        )}

        {/* Filters */}
        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search die code / SKU"
                className="h-8 text-sm w-56 bg-white rounded-md border border-trust-blue/40 px-3"
              />
            </div>
            <MultiselectFilterPopover
              label="Location"
              selectedValues={filterLocation}
              onSelectValues={setFilterLocation}
              options={locationOptions}
              storageKey="inventory:die:location"
            />
            <MultiselectFilterPopover
              label="Wax Piece"
              selectedValues={filterWaxPiece}
              onSelectValues={setFilterWaxPiece}
              options={waxPieceOptions}
              storageKey="inventory:die:wax_piece"
            />
            <MultiselectFilterPopover
              label="Wax Setting"
              selectedValues={filterWaxSetting}
              onSelectValues={setFilterWaxSetting}
              options={waxSettingOptions}
              storageKey="inventory:die:wax_setting"
            />
            <MultiselectFilterPopover
              label="Casting"
              selectedValues={filterCasting}
              onSelectValues={setFilterCasting}
              options={castingOptions}
              storageKey="inventory:die:casting"
            />
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterLocation([]); setFilterWaxPiece([]); setFilterWaxSetting([]); setFilterCasting([]); }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Table */}
        <section className="rounded-xl border border-soft-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#dbeafe] border-b border-soft-border">
                  <th className="border border-soft-border px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      disabled={editingRowIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black w-10">#</th>}
                  {visibleColumns.has('image') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Image</th>}
                  {visibleColumns.has('die_code') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Die Code</th>}
                  {visibleColumns.has('master_skus') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Master SKU</th>}
                  {visibleColumns.has('designer_skus') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Designer SKU</th>}
                  {visibleColumns.has('location') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Location</th>}
                  {visibleColumns.has('quantity') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Quantity</th>}
                  {visibleColumns.has('wax_piece_qty') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Wax Piece Qty</th>}
                  {visibleColumns.has('wax_piece_location') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Wax Piece Location</th>}
                  {visibleColumns.has('wax_setting_qty') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Wax Setting Qty</th>}
                  {visibleColumns.has('wax_setting_location') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Wax Setting Location</th>}
                  {visibleColumns.has('casting_qty') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Casting Qty</th>}
                  {visibleColumns.has('casting_location') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Casting Location</th>}
                  {visibleColumns.has('notes') && <th className="border border-soft-border px-3 py-2.5 text-center text-xs font-normal text-black">Notes</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={visibleColCount} className="border border-soft-border px-4 py-10 text-center text-sm text-cool-gray">
                      Loading die inventory…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColCount} className="border border-soft-border px-4 py-10 text-center text-sm text-cool-gray">
                      {hasActiveFilters ? 'No dies match your filters.' : 'No dies found. Click "Add Die" to create one.'}
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((d, index) => {
                  const isSelected = selectedIds.has(d.id);
                  const isEditing = editingRowIds.has(d.id);
                  const masterSkus = skuList(d.master_skus);
                  const designerSkus = skuList(d.designer_skus);
                  const subRowCount = Math.max(masterSkus.length, designerSkus.length, 1);

                  return Array.from({ length: subRowCount }).map((_, subIdx) => {
                    const isFirstSubRow = subIdx === 0;

                    return (
                      <tr
                        key={`${d.id}-${subIdx}`}
                        className={`border-b border-soft-border/60 last:border-b-0 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-cloud-gray/50'}`}
                      >
                        {/* Checkbox & sno only on first sub-row */}
                        {isFirstSubRow ? (
                          <>
                            <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(d.id)}
                                disabled={editingRowIds.size > 0}
                                className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                              />
                            </td>
                            {visibleColumns.has('sno') && (
                              <td className="border border-soft-border px-3 py-2 text-cool-gray" rowSpan={subRowCount}>{index + 1}</td>
                            )}
                            {visibleColumns.has('image') && (
                              <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                {d.image ? (
                                  <img src={d.image} alt={d.die_code} className="h-10 w-10 object-cover rounded" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-cloud-gray flex items-center justify-center text-[10px] text-cool-gray">No img</div>
                                )}
                              </td>
                            )}
                            {visibleColumns.has('die_code') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.die_code ?? ''} onChange={(e) => updateEditBuffer(d.id, 'die_code', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 font-medium text-midnight-ink" rowSpan={subRowCount}>{d.die_code || '—'}</td>
                              )
                            )}
                          </>
                        ) : null}

                        {/* Sub-row: Master SKU */}
                        {visibleColumns.has('master_skus') && (
                          isEditing && isFirstSubRow ? (
                            <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                              <input type="text" placeholder="Comma-separated" value={editBuffer[d.id]?.master_skus ?? ''} onChange={(e) => updateEditBuffer(d.id, 'master_skus', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                            </td>
                          ) : isEditing ? null : (
                            <td className="border border-soft-border px-3 py-2 text-midnight-ink text-xs">
                              {masterSkus[subIdx] || (isFirstSubRow && masterSkus.length === 0 ? '—' : '')}
                            </td>
                          )
                        )}

                        {/* Sub-row: Designer SKU */}
                        {visibleColumns.has('designer_skus') && (
                          isEditing && isFirstSubRow ? (
                            <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                              <input type="text" placeholder="Comma-separated" value={editBuffer[d.id]?.designer_skus ?? ''} onChange={(e) => updateEditBuffer(d.id, 'designer_skus', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                            </td>
                          ) : isEditing ? null : (
                            <td className="border border-soft-border px-3 py-2 text-midnight-ink text-xs">
                              {designerSkus[subIdx] || (isFirstSubRow && designerSkus.length === 0 ? '—' : '')}
                            </td>
                          )
                        )}

                        {/* Remaining cols only on first sub-row */}
                        {isFirstSubRow && (
                          <>
                            {visibleColumns.has('location') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.location ?? ''} onChange={(e) => updateEditBuffer(d.id, 'location', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.location || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('quantity') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="number" value={editBuffer[d.id]?.quantity ?? ''} onChange={(e) => updateEditBuffer(d.id, 'quantity', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-right font-medium text-midnight-ink" rowSpan={subRowCount}>{d.quantity ?? '—'}</td>
                              )
                            )}
                            {visibleColumns.has('wax_piece_qty') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="number" value={editBuffer[d.id]?.wax_piece_qty ?? ''} onChange={(e) => updateEditBuffer(d.id, 'wax_piece_qty', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-right text-midnight-ink" rowSpan={subRowCount}>{d.wax_piece_qty ?? '—'}</td>
                              )
                            )}
                            {visibleColumns.has('wax_piece_location') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.wax_piece_location ?? ''} onChange={(e) => updateEditBuffer(d.id, 'wax_piece_location', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.wax_piece_location || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('wax_setting_qty') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.wax_setting_qty ?? ''} onChange={(e) => updateEditBuffer(d.id, 'wax_setting_qty', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.wax_setting_qty || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('wax_setting_location') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.wax_setting_location ?? ''} onChange={(e) => updateEditBuffer(d.id, 'wax_setting_location', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.wax_setting_location || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('casting_qty') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.casting_qty ?? ''} onChange={(e) => updateEditBuffer(d.id, 'casting_qty', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.casting_qty || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('casting_location') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.casting_location ?? ''} onChange={(e) => updateEditBuffer(d.id, 'casting_location', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink" rowSpan={subRowCount}>{d.casting_location || '—'}</td>
                              )
                            )}
                            {visibleColumns.has('notes') && (
                              isEditing ? (
                                <td className="border border-soft-border px-3 py-2" rowSpan={subRowCount}>
                                  <input type="text" value={editBuffer[d.id]?.notes ?? ''} onChange={(e) => updateEditBuffer(d.id, 'notes', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" />
                                </td>
                              ) : (
                                <td className="border border-soft-border px-3 py-2 text-midnight-ink text-xs max-w-[180px] truncate" rowSpan={subRowCount}>{d.notes || '—'}</td>
                              )
                            )}
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="border-t border-soft-border px-4 py-3">
              <span className="text-xs text-cool-gray">
                Showing {filtered.length} of {dies.length} dies
              </span>
            </div>
          )}
        </section>
      </div>

      {/* ── Requests panel ────────────────────────────────────────────────────── */}
      {requestsPanelOpen && (
        <>
          <div className="fixed inset-0 z-[75] bg-black/20" onClick={() => setRequestsPanelOpen(false)} />
          <aside className="fixed right-2 top-[64px] z-[80] h-[calc(100vh-72px)] w-full max-w-[390px] rounded-2xl border border-soft-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-midnight-ink">Notifications</h3>
                  <p className="text-xs text-cool-gray">Issue requests for dies</p>
                </div>
                <button onClick={() => setRequestsPanelOpen(false)} className="rounded-md p-1 text-cool-gray hover:bg-cloud-gray hover:text-midnight-ink">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sortedIssueRequests.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-cool-gray">No requests yet.</div>
                ) : (
                  <div className="divide-y divide-soft-border">
                    {sortedIssueRequests.map((req) => {
                      const statusClass =
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800';
                      return (
                        <button
                          key={req.id}
                          onClick={() => openRequestDetails(req.id)}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-cloud-gray"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-trust-blue">
                              {String(req.issued_to || '').slice(0, 2).toUpperCase() || 'RQ'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-midnight-ink truncate">{req.item_name || 'Die'}</span>
                                <span className="text-xs text-cool-gray ml-2 shrink-0">{relativeTime(req.requested_at)}</span>
                              </div>
                              <p className="text-xs text-cool-gray mt-0.5 truncate">
                                {req.issued_to} · Qty: {req.quantity}
                              </p>
                              <span className={`mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
                                {String(req.status || '').toUpperCase()}
                              </span>
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

      {/* ── Request details dialog ─────────────────────────────────────────────── */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Request Details</DialogTitle>
            <DialogDescription className="sr-only">Review and approve or reject a die issue request.</DialogDescription>
          </DialogHeader>
          {activeRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-cool-gray text-xs">Die</span><p className="font-medium">{activeRequest.item_name}</p></div>
                <div><span className="text-cool-gray text-xs">Quantity</span><p className="font-medium">{activeRequest.quantity}</p></div>
                <div><span className="text-cool-gray text-xs">Issued To</span><p>{activeRequest.issued_to}</p></div>
                <div><span className="text-cool-gray text-xs">Issued By</span><p>{activeRequest.issued_by || '—'}</p></div>
                <div className="col-span-2"><span className="text-cool-gray text-xs">Reason</span><p>{activeRequest.reason || '—'}</p></div>
                <div><span className="text-cool-gray text-xs">Status</span><p className="capitalize font-medium">{activeRequest.status}</p></div>
              </div>
              {reviewError && <p className="text-red-500 text-xs">{reviewError}</p>}
              {activeRequest.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => reviewIssueRequest('approved')} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 h-8">
                    Approve
                  </Button>
                  <Button onClick={() => reviewIssueRequest('rejected')} variant="outline" className="flex-1 border-red-400 text-red-500 hover:bg-red-50 h-8">
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Issue Die dialog ──────────────────────────────────────────────────── */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Die</DialogTitle>
            <DialogDescription className="sr-only">Issue a die to a person or department.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Die</label>
              <select
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-trust-blue"
                value={issueForm.dieId}
                onChange={(e) => setIssueForm((p) => ({ ...p, dieId: e.target.value }))}
              >
                <option value="">Select die…</option>
                {dies.map((d) => (
                  <option key={d.id} value={d.id}>{d.die_code} (qty: {d.quantity})</option>
                ))}
              </select>
            </div>
            <Field label="Quantity" type="number" value={issueForm.quantity} onChange={(v) => setIssueForm((p) => ({ ...p, quantity: v }))} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Issued To</label>
              <input
                list="workforce-list-issue"
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-trust-blue"
                value={issueForm.issuedTo}
                onChange={(e) => setIssueForm((p) => ({ ...p, issuedTo: e.target.value }))}
                placeholder="Enter name or select…"
              />
              <datalist id="workforce-list-issue">
                {workforceMembers.map((w) => <option key={w.id} value={w.full_name} />)}
              </datalist>
            </div>
            <Field label="Issued By" value={issueForm.issuedBy} onChange={(v) => setIssueForm((p) => ({ ...p, issuedBy: v }))} />
            <Field label="Reason" textarea value={issueForm.reason} onChange={(v) => setIssueForm((p) => ({ ...p, reason: v }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)} className="h-8">Cancel</Button>
            <Button onClick={createIssueRequest} className="h-8 bg-trust-blue text-white hover:bg-trust-blue/90">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Die dialog ────────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setEditingDieId(null); setForm(emptyDie()); setStatusMsg(''); } setAddOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDieId !== null ? 'Edit Die' : 'Add Die'}</DialogTitle>
            <DialogDescription className="sr-only">{editingDieId !== null ? 'Edit the details of an existing die.' : 'Add a new die to inventory.'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Die Code *" value={form.die_code} onChange={ff('die_code')} />
            <Field label="Location" value={form.location} onChange={ff('location')} />
            <Field label="Quantity" type="number" value={form.quantity} onChange={ff('quantity')} />
            <Field label="Min Level" type="number" value={form.min_level} onChange={ff('min_level')} />
            <Field label="Wax Piece Qty" type="number" value={form.wax_piece_qty} onChange={ff('wax_piece_qty')} />
            <Field label="Wax Piece Location" value={form.wax_piece_location} onChange={ff('wax_piece_location')} />
            <Field label="Wax Setting Qty" value={form.wax_setting_qty} onChange={ff('wax_setting_qty')} />
            <Field label="Wax Setting Location" value={form.wax_setting_location} onChange={ff('wax_setting_location')} />
            <Field label="Casting Qty" value={form.casting_qty} onChange={ff('casting_qty')} />
            <Field label="Casting Location" value={form.casting_location} onChange={ff('casting_location')} />
            <div className="col-span-2">
              <Field label="Master SKUs (comma-separated)" value={form.master_skus} onChange={ff('master_skus')} />
            </div>
            <div className="col-span-2">
              <Field label="Designer SKUs (comma-separated)" value={form.designer_skus} onChange={ff('designer_skus')} />
            </div>
            {/* Image picker: upload or paste on hover */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Image</label>
              <div
                className="relative flex items-center justify-center rounded-md border-2 border-dashed border-soft-border bg-cloud-gray/40 transition hover:border-trust-blue/60 cursor-pointer"
                style={{ minHeight: 90 }}
                onPaste={(e) => {
                  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
                  if (!item) return;
                  const file = item.getAsFile();
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => ff('image')(ev.target.result);
                  reader.readAsDataURL(file);
                }}
                tabIndex={0}
                title="Hover here and press Ctrl+V to paste an image, or click to upload"
              >
                {form.image ? (
                  <>
                    <img src={form.image} alt="preview" className="max-h-24 max-w-full rounded object-contain" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); ff('image')(''); }}
                      className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-rose-500 hover:bg-rose-50 shadow"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center gap-1 cursor-pointer px-4 py-4 w-full text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cool-gray/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
                    </svg>
                    <span className="text-xs text-cool-gray">Click to upload <span className="font-medium text-trust-blue">or hover &amp; paste</span></span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => ff('image')(ev.target.result);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <Field label="Notes" textarea value={form.notes} onChange={ff('notes')} />
            </div>
          </div>
          {statusMsg && <p className="text-xs text-red-500 mt-1">{statusMsg}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditingDieId(null); setForm(emptyDie()); setStatusMsg(''); }} className="h-8">Cancel</Button>
            <Button onClick={handleSaveDie} disabled={saving} className="h-8 bg-trust-blue text-white hover:bg-trust-blue/90">
              {saving ? 'Saving…' : editingDieId !== null ? 'Update Die' : 'Save Die'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload dialog ────────────────────────────────────────────────── */}
      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Upload Dies</DialogTitle>
            <DialogDescription className="sr-only">Upload an Excel file to add multiple dies at once.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-cool-gray mb-2">
            Upload an Excel file (.xlsx) with columns: die_code, location, quantity, wax_setting, casting, notes, master_skus, designer_skus
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setBulkUploadOpen(false)} className="h-8">Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile} className="h-8 bg-emerald-600 text-white hover:bg-emerald-700">
              {bulkUploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manage Columns dialog ─────────────────────────────────────────────── */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription className="sr-only">Show or hide columns in the die inventory table.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {DIE_COLUMNS.map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedColumnsForAction.has(col.id)}
                  onChange={() => toggleColumnSelection(col.id)}
                  className="h-4 w-4 accent-trust-blue"
                />
                <span className={visibleColumns.has(col.id) ? 'text-midnight-ink' : 'text-cool-gray line-through'}>
                  {col.label}
                </span>
                {!visibleColumns.has(col.id) && <span className="text-[10px] text-cool-gray">(hidden)</span>}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} className="h-8 text-sm">Hide Selected</Button>
            <Button variant="outline" onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} className="h-8 text-sm">Show Selected</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Fixed Footer */}
      {(() => {
        const _tp = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
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
              <span>{filtered.length === 0 ? '0' : `${(_sp - 1) * rowsPerPage + 1}-${Math.min(_sp * rowsPerPage, filtered.length)}`} of {filtered.length}</span>
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
