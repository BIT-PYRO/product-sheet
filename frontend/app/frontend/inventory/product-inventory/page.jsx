'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'inventory_product_final_stock_v1';
const PRODUCT_ISSUE_REQUESTS_KEY = 'product_issue_requests_v1';

const createRow = (id) => ({
  id,
  finalSku: '',
  value: '',
  unit: '',
});

const isEmptyProductRow = (row) => {
  return [row.finalSku, row.value, row.unit].every((value) => String(value ?? '').trim() === '');
};

const UNIT_OPTIONS = ['PCS', 'GM', 'KG', 'CT'];

export default function ProductInventoryPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [issueOpen, setIssueOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [issueRequestsReady, setIssueRequestsReady] = useState(false);
  const [issueForm, setIssueForm] = useState({ productId: '', quantity: '', issuedTo: '', reason: '' });

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
      const normalizedRows = parsed.map((row, index) => ({
        id: index + 1,
        finalSku: String(row.finalSku || ''),
        value: String(row.value || ''),
        unit: String(row.unit || ''),
      }));
      const filteredRows = normalizedRows.filter((row) => !isEmptyProductRow(row));
      setRows(filteredRows.map((row, index) => ({ ...row, id: index + 1 })));
      setSelectedIds(new Set());
      setStatus('Product inventory refreshed.');
    } catch {
      setStatus('Unable to refresh saved product inventory data.');
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
      const stored = localStorage.getItem(PRODUCT_ISSUE_REQUESTS_KEY);
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
    localStorage.setItem(PRODUCT_ISSUE_REQUESTS_KEY, JSON.stringify(issueRequests));
  }, [issueRequests, issueRequestsReady]);

  const updateRow = (id, key, nextValue) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: nextValue } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createRow(prev.length + 1)]);
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const pendingIssueRequests = issueRequests.filter((r) => r.status === 'pending');
  const sortedIssueRequests = [...issueRequests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  const activeRequest = issueRequests.find((r) => r.id === activeRequestId) || null;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function productName(row) {
    return row?.finalSku ? row.finalSku : `Product #${row?.id ?? ''}`;
  }

  function openIssuePopup() {
    if (selectedRows.length === 0) {
      setStatus('Select at least one product row to raise issue request.');
      return;
    }
    setIssueForm({ productId: String(selectedRows[0].id), quantity: '', issuedTo: '', reason: '' });
    setIssueOpen(true);
  }

  function createIssueRequest() {
    const productIdNum = Number(issueForm.productId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const reason = issueForm.reason.trim();
    if (!productIdNum) {
      setStatus('Please select a product row for request.');
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
    const row = rows.find((r) => r.id === productIdNum);
    const request = {
      id: Date.now(),
      productId: productIdNum,
      productName: productName(row),
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
      <html><head><title>Product Issue Voucher</title>
      <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #E5E7EB;padding:10px;text-align:left;font-size:14px}
      th{background:#F8F9FA;width:220px}
      .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#DCFCE7;color:#166534;font-weight:600}
      </style></head><body>
      <h1>Product Issue Voucher</h1>
      <table>
      <tr><th>Request ID</th><td>${request.id}</td></tr>
      <tr><th>Product</th><td>${request.productName}</td></tr>
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
    setStatus('Product inventory saved locally.');
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT INVENTORY</h1>
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
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition"
            >
              <Plus className="h-4 w-4" />
              Add Row
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
              Issue Product
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
            {selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected — click "Issue Product" to create a request.
          </p>
        )}

        {status && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#F8F9FA]">
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Final SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-cool-gray">
                      No product rows found. Add one using the button above.
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border last:border-0 transition hover:bg-[#F8F9FA]">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-midnight-ink">{row.id}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.finalSku}
                        onChange={(e) => updateRow(row.id, 'finalSku', e.target.value)}
                        placeholder="Enter final SKU"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                        placeholder="0"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={row.unit}
                        onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                        className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      >
                        <option value="">Select unit</option>
                        {UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        aria-label={`Delete row ${row.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
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
                  <p className="text-xs text-cool-gray">Issue requests for products</p>
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
                            <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.productName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{req.status}</span>
                            {req.status === 'approved' && (
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
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Product Request</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Product</label>
              <select
                value={issueForm.productId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select product</option>
                {selectedRows.map((r) => (
                  <option key={r.id} value={r.id}>{productName(r)}</option>
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

      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3">
              <div className="text-sm text-midnight-ink"><span className="font-semibold">Product:</span> {activeRequest.productName}</div>
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
            {activeRequest?.status === 'approved' && (
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
