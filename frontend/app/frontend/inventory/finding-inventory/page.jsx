'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Search, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';

const MATERIAL_OPTIONS = ['Gold', 'Silver', 'Brass', 'Alloy', 'Platinum'];
const STAGE_OPTIONS = ['Raw', 'Wax', 'Casting', 'Filing', 'Polish', 'Hand Setting', 'Ready', 'Finished'];
const FINDING_ISSUE_REQUESTS_KEY = 'finding_issue_requests_v1';
const FINDING_COLUMNS = [
  { id: 'sno', label: '#' },
  { id: 'finding_code', label: 'Finding Code' },
  { id: 'die_number', label: 'Die No.' },
  { id: 'size', label: 'Size' },
  { id: 'material', label: 'Material' },
  { id: 'finding_stage', label: 'Stage' },
  { id: 'mechanism', label: 'Mechanism' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'weight', label: 'Weight' },
  { id: 'dead_weight', label: 'Dead Wt.' },
  { id: 'mold_qty_per_die', label: 'Mold Qty/Die' },
];

function emptyFinding() {
  return {
    finding_code: '',
    die_number: '',
    size: '',
    material: '',
    finding_stage: '',
    mechanism: '',
    quantity: '',
    weight: '',
    dead_weight: '',
    mold_qty_per_die: '',
    polish: '',
    total_measurements: '',
    design_material: '',
    notes: '',
  };
}

function Field({ label, value, onChange, textarea = false, type = 'text', children }) {
  const base = 'w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink placeholder:text-cool-gray focus:outline-none focus:ring-1 focus:ring-trust-blue bg-white';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
      {children ? children : textarea ? (
        <textarea className={`${base} resize-none`} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={base} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function FindingInventoryPage() {
  const { canExport } = useSheetPermissions('inventory');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [filterMaterial, setFilterMaterial] = useState([]);
  const [filterStage, setFilterStage] = useState([]);
  const [filterMechanism, setFilterMechanism] = useState([]);

  // Add New Finding dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyFinding());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Row selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(FINDING_COLUMNS.map((column) => column.id)));

  // Issue request workflow
  const [issueOpen, setIssueOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [issueRequestsReady, setIssueRequestsReady] = useState(false);
  const [issueForm, setIssueForm] = useState({ findingId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });

  const fetchFindings = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/findings?is_active=true&page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setFindings(Array.isArray(results) ? results : []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FINDING_ISSUE_REQUESTS_KEY);
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
    localStorage.setItem(FINDING_ISSUE_REQUESTS_KEY, JSON.stringify(issueRequests));
  }, [issueRequests, issueRequestsReady]);

  const filtered = useMemo(() => {
    const materialFilters = Array.isArray(filterMaterial) ? filterMaterial : [];
    const stageFilters = Array.isArray(filterStage) ? filterStage : [];
    const mechanismFilters = Array.isArray(filterMechanism) ? filterMechanism : [];
    return findings.filter((f) => {
      const matchSearch =
        !search ||
        (f.finding_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.die_number || '').toLowerCase().includes(search.toLowerCase());
      const matchMaterial =
        materialFilters.length === 0 ||
        materialFilters.some((value) => String(f.material || '').toLowerCase().includes(String(value || '').toLowerCase()));
      const matchStage =
        stageFilters.length === 0 ||
        stageFilters.some((value) => String(f.finding_stage || '').toLowerCase().includes(String(value || '').toLowerCase()));
      const matchMechanism =
        mechanismFilters.length === 0 ||
        mechanismFilters.some((value) => String(f.mechanism || '').toLowerCase().includes(String(value || '').toLowerCase()));
      return matchSearch && matchMaterial && matchStage && matchMechanism;
    });
  }, [
    findings,
    search,
    filterMaterial,
    filterStage,
    filterMechanism,
  ]);

  const mechanismOptions = useMemo(
    () => Array.from(new Set(findings.map((finding) => String(finding.mechanism || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [findings]
  );

  const allSelected = filtered.length > 0 && filtered.every((f) => selectedIds.has(f.id));
  const someSelected = filtered.some((f) => selectedIds.has(f.id)) && !allSelected;
  const visibleTableColumnCount = 1 + FINDING_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  const selectedFindings = useMemo(
    () => findings.filter((f) => selectedIds.has(f.id)),
    [findings, selectedIds]
  );

  const pendingIssueRequests = useMemo(
    () => issueRequests.filter((r) => r.status === 'pending'),
    [issueRequests]
  );

  const sortedIssueRequests = useMemo(
    () => [...issueRequests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
    [issueRequests]
  );

  const activeRequest = useMemo(
    () => issueRequests.find((r) => r.id === activeRequestId) || null,
    [issueRequests, activeRequestId]
  );

  function findingName(finding) {
    if (!finding) return 'Finding';
    return finding.finding_code || finding.die_number || `Finding #${finding.id}`;
  }

  function toggleSelectAll() {
    if (editingRowIds.size > 0) return;
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((f) => next.delete(f.id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((f) => next.add(f.id));
      return next;
    });
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

  function openIssuePopup() {
    if (selectedFindings.length === 0) {
      setStatusMsg('Select at least one finding to raise an issue request.');
      return;
    }
    setIssueForm({ findingId: String(selectedFindings[0].id), quantity: '', issuedTo: '', issuedBy: '', reason: '' });
    setIssueOpen(true);
  }

  function handleEditRows() {
    if (selectedFindings.length === 0) {
      setStatusMsg('Select at least one finding row, then click Edit Row.');
      return;
    }
    const buffer = {};
    selectedFindings.forEach((finding) => {
      buffer[finding.id] = {
        finding_code: finding.finding_code || '',
        die_number: finding.die_number || '',
        size: finding.size || '',
        material: finding.material || '',
        finding_stage: finding.finding_stage || '',
        mechanism: finding.mechanism || '',
        quantity: finding.quantity || '',
        weight: finding.weight || '',
        dead_weight: finding.dead_weight || '',
        mold_qty_per_die: finding.mold_qty_per_die || '',
      };
    });
    setEditBuffer(buffer);
    setEditingRowIds(new Set(selectedFindings.map((finding) => finding.id)));
    setStatusMsg(`Editing ${selectedFindings.length} finding${selectedFindings.length !== 1 ? 's' : ''}.`);
  }

  function updateEditBuffer(id, key, value) {
    if (!editingRowIds.has(id)) return;
    setEditBuffer((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value,
      },
    }));
  }

  async function handleSaveEdit() {
    const ids = Array.from(editingRowIds);
    if (ids.length === 0) return;
    setSavingEdits(true);
    try {
      for (const id of ids) {
        const payload = editBuffer[id];
        if (!payload) continue;
        const res = await fetch(`/api/findings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || `Failed to update finding ${id}`);
        }
      }
      setEditingRowIds(new Set());
      setEditBuffer({});
      await fetchFindings();
      setStatusMsg('Selected finding rows updated successfully.');
    } catch (err) {
      setStatusMsg(err.message || 'Failed to save finding edits.');
    } finally {
      setSavingEdits(false);
    }
  }

  function handleCancelEdit() {
    setEditingRowIds(new Set());
    setEditBuffer({});
    setStatusMsg('Edit canceled.');
  }

  function createIssueRequest() {
    const findingIdNum = Number(issueForm.findingId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();

    if (!findingIdNum) {
      setStatusMsg('Please select a finding for the request.');
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setStatusMsg('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!issuedTo) {
      setStatusMsg('Please enter who the finding is issued to.');
      return;
    }
    if (!issuedBy) {
      setStatusMsg('Please enter who issued the finding.');
      return;
    }
    if (!reason) {
      setStatusMsg('Please enter reason of issue.');
      return;
    }

    const finding = findings.find((f) => f.id === findingIdNum);
    const request = {
      id: Date.now(),
      findingId: findingIdNum,
      findingName: findingName(finding),
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
    setStatusMsg('Issue request created.');
  }

  function openRequestDetails(requestId) {
    setActiveRequestId(requestId);
    setRequestDetailsOpen(true);
  }

  function reviewIssueRequest(nextStatus) {
    if (!activeRequest) return;
    setIssueRequests((prev) =>
      prev.map((r) => (r.id === activeRequest.id ? { ...r, status: nextStatus, reviewedAt: new Date().toISOString() } : r))
    );
    setRequestDetailsOpen(false);
    setStatusMsg(`Request ${nextStatus}.`);
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    return `${day}d`;
  }

  function printIssueVoucher(request) {
    if (!request) return;
    const opened = window.open('', '_blank', 'width=900,height=700');
    if (!opened) {
      setStatusMsg('Popup blocked. Please allow popups to print voucher.');
      return;
    }
    const requestedAt = request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '-';
    const reviewedAt = request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-';
    const html = `
      <html>
        <head>
          <title>Finding Issue Voucher</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 16px; color: #6B7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #F8F9FA; width: 220px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #DCFCE7; color: #166534; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Finding Issue Voucher</h1>
          <p>Generated from Finding Inventory requests panel</p>
          <table>
            <tr><th>Request ID</th><td>${request.id}</td></tr>
            <tr><th>Finding Name</th><td>${request.findingName}</td></tr>
            <tr><th>Quantity</th><td>${request.quantity}</td></tr>
            <tr><th>Issued To</th><td>${request.issuedTo}</td></tr>
            <tr><th>Issued By</th><td>${request.issuedBy || '-'}</td></tr>
            <tr><th>Reason of Issue</th><td>${request.reason || '-'}</td></tr>
            <tr><th>Status</th><td><span class="badge">${String(request.status || '').toUpperCase()}</span></td></tr>
            <tr><th>Requested At</th><td>${requestedAt}</td></tr>
            <tr><th>Reviewed At</th><td>${reviewedAt}</td></tr>
          </table>
        </body>
      </html>
    `;
    opened.document.open();
    opened.document.write(html);
    opened.document.close();
    opened.focus();
    opened.print();
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
    if (selectedColumnsForAction.size === FINDING_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(FINDING_COLUMNS.map((column) => column.id)));
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

  const clearFilters = () => {
    setSearch('');
    setFilterMaterial('');
    setFilterStage('');
    setFilterMechanism('');
    setCustomMaterialFilter('');
    setCustomStageFilter('');
    setCustomMechanismFilter('');
  };

  const hasActiveFilters = search || filterMaterial || filterStage || filterMechanism || customMaterialFilter || customStageFilter || customMechanismFilter;

  function ff(key) {
    return (val) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSaveFinding() {
    if (!form.finding_code.trim()) {
      setStatusMsg('Finding Code is required.');
      return;
    }
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      setStatusMsg('Finding added successfully.');
      setAddOpen(false);
      setForm(emptyFinding());
      fetchFindings();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">FINDING INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {/* Status message */}
        {statusMsg && (
          <div className="fixed top-16 right-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-soft-border bg-white px-4 py-2 text-sm text-midnight-ink shadow-md">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')}><X className="h-3.5 w-3.5 text-cool-gray hover:text-midnight-ink" /></button>
          </div>
        )}

        {/* Back + summary row */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-sm text-cool-gray">
              {loading ? 'Loading…' : `${filtered.length} finding${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchFindings}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <RefreshCw className="h-4 w-4" />
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
              onClick={() => { setForm(emptyFinding()); setStatusMsg(''); setAddOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-trust-blue px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add New Finding
            </button>
            <button
              type="button"
              onClick={openIssuePopup}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Issue Finding
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
            {selectedIds.size} finding{selectedIds.size !== 1 ? 's' : ''} selected — click "Issue Finding" to create a request.
          </p>
        )}

        {editingRowIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button onClick={handleSaveEdit} disabled={savingEdits} className="h-8 px-3 bg-success text-white hover:bg-success/90">
              {savingEdits ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit} disabled={savingEdits} className="h-8 px-3 border-danger text-danger hover:bg-danger/10">
              Cancel Edit
            </Button>
          </div>
        )}

        {/* Filters */}
        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
              />
            </div>

            <MultiselectFilterPopover
              label="Material"
              selectedValues={filterMaterial}
              onSelectValues={setFilterMaterial}
              options={MATERIAL_OPTIONS}
              storageKey="inventory:finding:material"
            />

            <MultiselectFilterPopover
              label="Stage"
              selectedValues={filterStage}
              onSelectValues={setFilterStage}
              options={STAGE_OPTIONS}
              storageKey="inventory:finding:stage"
            />

            <MultiselectFilterPopover
              label="Mechanism"
              selectedValues={filterMechanism}
              onSelectValues={setFilterMechanism}
              options={mechanismOptions}
              storageKey="inventory:finding:mechanism"
            />
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterMaterial([]);
                setFilterStage([]);
                setFilterMechanism([]);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-lg border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {fetchError}
          </div>
        )}

        {/* Table */}
        <section className="rounded-xl border border-soft-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#dbeafe] border-b border-soft-border">
                  <th className="px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      disabled={editingRowIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">#</th>}
                  {visibleColumns.has('finding_code') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Finding Code</th>}
                  {visibleColumns.has('die_number') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Die No.</th>}
                  {visibleColumns.has('size') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Size</th>}
                  {visibleColumns.has('material') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Material</th>}
                  {visibleColumns.has('finding_stage') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Stage</th>}
                  {visibleColumns.has('mechanism') && <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Mechanism</th>}
                  {visibleColumns.has('quantity') && <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>}
                  {visibleColumns.has('weight') && <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Weight</th>}
                  {visibleColumns.has('dead_weight') && <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Dead Wt.</th>}
                  {visibleColumns.has('mold_qty_per_die') && <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Mold Qty/Die</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="px-4 py-10 text-center text-sm text-cool-gray">
                      Loading findings…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="px-4 py-10 text-center text-sm text-cool-gray">
                      {hasActiveFilters ? 'No findings match your filters.' : 'No findings found.'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((f, index) => {
                    const isSelected = selectedIds.has(f.id);
                    return (
                    <tr
                      key={f.id}
                      className={`border-b border-soft-border/70 last:border-b-0 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-cloud-gray/50'}`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(f.id)}
                          disabled={editingRowIds.size > 0}
                          className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                        />
                      </td>
                      {visibleColumns.has('sno') && <td className="px-3 py-2.5 text-cool-gray">{index + 1}</td>}
                      {editingRowIds.has(f.id) ? (
                        <>
                          {visibleColumns.has('finding_code') && <td className="px-3 py-2.5"><input type="text" value={editBuffer[f.id]?.finding_code ?? ''} onChange={(e) => updateEditBuffer(f.id, 'finding_code', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" /></td>}
                          {visibleColumns.has('die_number') && <td className="px-3 py-2.5"><input type="text" value={editBuffer[f.id]?.die_number ?? ''} onChange={(e) => updateEditBuffer(f.id, 'die_number', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" /></td>}
                          {visibleColumns.has('size') && <td className="px-3 py-2.5"><input type="text" value={editBuffer[f.id]?.size ?? ''} onChange={(e) => updateEditBuffer(f.id, 'size', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" /></td>}
                          {visibleColumns.has('material') && <td className="px-3 py-2.5">
                            <select value={editBuffer[f.id]?.material ?? ''} onChange={(e) => updateEditBuffer(f.id, 'material', e.target.value)} className="h-8 w-full rounded border border-soft-border bg-white px-2 text-sm">
                              <option value="">Select</option>
                              {MATERIAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>}
                          {visibleColumns.has('finding_stage') && <td className="px-3 py-2.5">
                            <select value={editBuffer[f.id]?.finding_stage ?? ''} onChange={(e) => updateEditBuffer(f.id, 'finding_stage', e.target.value)} className="h-8 w-full rounded border border-soft-border bg-white px-2 text-sm">
                              <option value="">Select</option>
                              {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>}
                          {visibleColumns.has('mechanism') && <td className="px-3 py-2.5"><input type="text" value={editBuffer[f.id]?.mechanism ?? ''} onChange={(e) => updateEditBuffer(f.id, 'mechanism', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm" /></td>}
                          {visibleColumns.has('quantity') && <td className="px-3 py-2.5"><input type="number" value={editBuffer[f.id]?.quantity ?? ''} onChange={(e) => updateEditBuffer(f.id, 'quantity', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" /></td>}
                          {visibleColumns.has('weight') && <td className="px-3 py-2.5"><input type="number" value={editBuffer[f.id]?.weight ?? ''} onChange={(e) => updateEditBuffer(f.id, 'weight', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" /></td>}
                          {visibleColumns.has('dead_weight') && <td className="px-3 py-2.5"><input type="number" value={editBuffer[f.id]?.dead_weight ?? ''} onChange={(e) => updateEditBuffer(f.id, 'dead_weight', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" /></td>}
                          {visibleColumns.has('mold_qty_per_die') && <td className="px-3 py-2.5"><input type="number" value={editBuffer[f.id]?.mold_qty_per_die ?? ''} onChange={(e) => updateEditBuffer(f.id, 'mold_qty_per_die', e.target.value)} className="h-8 w-full rounded border border-soft-border px-2 text-sm text-right" /></td>}
                        </>
                      ) : (
                        <>
                          {visibleColumns.has('finding_code') && <td className="px-3 py-2.5 font-medium">
                            <Link
                              href={`/finding-entry?code=${encodeURIComponent(f.finding_code)}`}
                              className="text-trust-blue hover:underline"
                            >
                              {f.finding_code || '—'}
                            </Link>
                          </td>}
                          {visibleColumns.has('die_number') && <td className="px-3 py-2.5 text-midnight-ink">{f.die_number || '—'}</td>}
                          {visibleColumns.has('size') && <td className="px-3 py-2.5 text-midnight-ink">{f.size || '—'}</td>}
                          {visibleColumns.has('material') && <td className="px-3 py-2.5">
                            {f.material ? (
                              <span className="inline-block rounded-full bg-cloud-gray px-2.5 py-0.5 text-xs font-medium text-slate-text">
                                {f.material}
                              </span>
                            ) : '—'}
                          </td>}
                          {visibleColumns.has('finding_stage') && <td className="px-3 py-2.5">
                            {f.finding_stage ? (
                              <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                {f.finding_stage}
                              </span>
                            ) : '—'}
                          </td>}
                          {visibleColumns.has('mechanism') && <td className="px-3 py-2.5 text-midnight-ink">{f.mechanism || '—'}</td>}
                          {visibleColumns.has('quantity') && <td className="px-3 py-2.5 text-right text-midnight-ink font-medium">
                            {f.quantity || '—'}
                          </td>}
                          {visibleColumns.has('weight') && <td className="px-3 py-2.5 text-right text-midnight-ink">{f.weight || '—'}</td>}
                          {visibleColumns.has('dead_weight') && <td className="px-3 py-2.5 text-right text-midnight-ink">{f.dead_weight || '—'}</td>}
                          {visibleColumns.has('mold_qty_per_die') && <td className="px-3 py-2.5 text-right text-midnight-ink">{f.mold_qty_per_die || '—'}</td>}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-soft-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-cool-gray">
                Showing {filtered.length} of {findings.length} findings
              </span>
              <Link
                href="/finding-entry"
                className="inline-flex items-center gap-1.5 rounded-lg border border-trust-blue bg-trust-blue px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                + Add Finding
              </Link>
            </div>
          )}
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
                  <p className="text-xs text-cool-gray">Issue requests for findings</p>
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
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-trust-blue">
                              {String(req.findingName || 'F').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-midnight-ink">
                                <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.findingName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>
                                  {req.status}
                                </span>
                                {req.status === 'approved' && canExport && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printIssueVoucher(req);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-soft-border px-2 py-0.5 text-[10px] font-semibold text-midnight-ink hover:border-trust-blue"
                                  >
                                    <Printer size={10} />
                                    Print
                                  </button>
                                )}
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

      {/* ── Add New Finding dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add New Finding</DialogTitle>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Finding Code *" value={form.finding_code} onChange={ff('finding_code')} />
            <Field label="Die Number" value={form.die_number} onChange={ff('die_number')} />
            <Field label="Size" value={form.size} onChange={ff('size')} />

            <Field label="Material">
              <select
                value={form.material}
                onChange={(e) => ff('material')(e.target.value)}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select material</option>
                {MATERIAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Stage">
              <select
                value={form.finding_stage}
                onChange={(e) => ff('finding_stage')(e.target.value)}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select stage</option>
                {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Mechanism" value={form.mechanism} onChange={ff('mechanism')} />
            <Field label="Quantity" value={form.quantity} onChange={ff('quantity')} />
            <Field label="Weight" value={form.weight} onChange={ff('weight')} />
            <Field label="Dead Weight" value={form.dead_weight} onChange={ff('dead_weight')} />
            <Field label="Mold Qty / Die" value={form.mold_qty_per_die} onChange={ff('mold_qty_per_die')} />
            <Field label="Polish" value={form.polish} onChange={ff('polish')} />
            <Field label="Total Measurements" value={form.total_measurements} onChange={ff('total_measurements')} />
            <Field label="Design Material" value={form.design_material} onChange={ff('design_material')} />
            <div className="sm:col-span-2 md:col-span-3">
              <Field label="Notes" value={form.notes} onChange={ff('notes')} textarea />
            </div>
          </div>

          {statusMsg && !addOpen && null}

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveFinding} disabled={saving}>
              {saving ? 'Saving...' : 'Save Finding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Finding Request</DialogTitle>
          </DialogHeader>

          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Name of Finding</label>
              <select
                value={issueForm.findingId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, findingId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select finding</option>
                {selectedFindings.map((finding) => (
                  <option key={finding.id} value={finding.id}>{findingName(finding)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Quantity"
                type="number"
                value={issueForm.quantity}
                onChange={(value) => {
                  if (value === '') {
                    setIssueForm((prev) => ({ ...prev, quantity: '' }));
                    return;
                  }
                  const num = Number(value);
                  setIssueForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                }}
              />
              <Field
                label="Issued To"
                value={issueForm.issuedTo}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, issuedTo: value }))}
              />
              <Field
                label="Issued By"
                value={issueForm.issuedBy}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, issuedBy: value }))}
              />
            </div>

            <Field
              label="Reason of Issue"
              value={issueForm.reason}
              onChange={(value) => setIssueForm((prev) => ({ ...prev, reason: value }))}
            />
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={createIssueRequest}>Request</Button>
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
              <Field label="Finding Code" value={activeRequest.findingName} disabled />
              <Field label="Quantity" value={String(activeRequest.quantity)} disabled />
              <Field label="Issued To" value={activeRequest.issuedTo} disabled />
              <Field label="Issued By" value={activeRequest.issuedBy || '-'} disabled />
              <Field label="Reason of Issue" value={activeRequest.reason || '-'} disabled />
              <Field label="Status" value={activeRequest.status.toUpperCase()} disabled />
              <Field label="Requested At" value={new Date(activeRequest.requestedAt).toLocaleString()} disabled />
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
                  id="select-all-finding-inventory-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === FINDING_COLUMNS.length && FINDING_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-finding-inventory-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {FINDING_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`finding-inventory-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`finding-inventory-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
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
    </main>
  );
}
