'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer, RefreshCw, Search, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

const MATERIAL_OPTIONS = ['Gold', 'Silver', 'Brass', 'Alloy', 'Platinum'];
const STAGE_OPTIONS = ['Raw', 'Wax', 'Casting', 'Filing', 'Polish', 'Hand Setting', 'Ready', 'Finished'];
const FINDING_ISSUE_REQUESTS_KEY = 'finding_issue_requests_v1';

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
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Add New Finding dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyFinding());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Row selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Issue request workflow
  const [issueOpen, setIssueOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [issueRequestsReady, setIssueRequestsReady] = useState(false);
  const [issueForm, setIssueForm] = useState({ findingId: '', quantity: '', issuedTo: '', reason: '' });

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
    return findings.filter((f) => {
      const matchSearch =
        !search ||
        (f.finding_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.die_number || '').toLowerCase().includes(search.toLowerCase());
      const matchMaterial = !filterMaterial || (f.material || '') === filterMaterial;
      const matchStage = !filterStage || (f.finding_stage || '') === filterStage;
      return matchSearch && matchMaterial && matchStage;
    });
  }, [findings, search, filterMaterial, filterStage]);

  const allSelected = filtered.length > 0 && filtered.every((f) => selectedIds.has(f.id));
  const someSelected = filtered.some((f) => selectedIds.has(f.id)) && !allSelected;

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
    setIssueForm({ findingId: String(selectedFindings[0].id), quantity: '', issuedTo: '', reason: '' });
    setIssueOpen(true);
  }

  function createIssueRequest() {
    const findingIdNum = Number(issueForm.findingId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
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

  const clearFilters = () => {
    setSearch('');
    setFilterMaterial('');
    setFilterStage('');
  };

  const hasActiveFilters = search || filterMaterial || filterStage;

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

        {/* Filters */}
        <section className="mb-4 rounded-xl border border-soft-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search finding code or die no."
                className="h-9 w-full rounded-lg border border-soft-border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>

            {/* Material filter */}
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
            >
              <option value="">All Materials</option>
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
            >
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-cool-gray hover:border-danger hover:text-danger transition"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
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
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th className="px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Finding Code</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Die No.</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Size</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Material</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Mechanism</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Weight</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Dead Wt.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Mold Qty/Die</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-cool-gray">
                      Loading findings…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-cool-gray">
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
                          className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-cool-gray">{index + 1}</td>
                      <td className="px-3 py-2.5 font-medium">
                        <Link
                          href={`/finding-entry?code=${encodeURIComponent(f.finding_code)}`}
                          className="text-trust-blue hover:underline"
                        >
                          {f.finding_code || '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.die_number || '—'}</td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.size || '—'}</td>
                      <td className="px-3 py-2.5">
                        {f.material ? (
                          <span className="inline-block rounded-full bg-cloud-gray px-2.5 py-0.5 text-xs font-medium text-slate-text">
                            {f.material}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {f.finding_stage ? (
                          <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                            {f.finding_stage}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.mechanism || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink font-medium">
                        {f.quantity || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.weight || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.dead_weight || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.mold_qty_per_die || '—'}</td>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </main>
  );
}
