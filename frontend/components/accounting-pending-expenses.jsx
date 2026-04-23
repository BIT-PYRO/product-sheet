'use client';

import { useCallback, useEffect, useState } from 'react';

const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export default function AccountingPendingExpenses() {
  const [expenses, setExpenses]         = useState([]);
  const [ledgers, setLedgers]           = useState([]);   // asset/liability ledgers for payment selector
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [toast, setToast]               = useState(null);  // { type: 'success'|'error', message }

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState(null);  // { expense } | null
  const [paymentLedger, setPaymentLedger] = useState('');
  const [approving, setApproving]         = useState(false);

  /* ── helpers ── */
  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── fetch expenses ── */
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/accounting/pending-expenses/${qs}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Failed to load expenses.');
      setExpenses(payload.data);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  /* ── fetch asset/liability ledgers for payment dropdown ── */
  const fetchLedgers = useCallback(async () => {
    try {
      const res = await fetch('/api/accounting/ledgers/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setLedgers(payload.data.filter((l) => l.type === 'asset' || l.type === 'liability'));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchLedgers(); }, [fetchLedgers]);

  /* ── sync ── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/accounting/pending-expenses/sync/', { method: 'POST', cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Sync failed.');
      showToast('success', payload.message);
      fetchExpenses();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setSyncing(false);
    }
  };

  /* ── approve ── */
  const handleApprove = async () => {
    if (!paymentLedger) { showToast('error', 'Please select a payment account.'); return; }
    setApproving(true);
    try {
      const res = await fetch(`/api/accounting/pending-expenses/${approvalModal.expense.id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ledger: Number(paymentLedger) }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Approval failed.');
      showToast('success', `Expense approved. Journal entry #${payload.data.journal_entry_id} created.`);
      setApprovalModal(null);
      setPaymentLedger('');
      fetchExpenses();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setApproving(false);
    }
  };

  /* ── reject ── */
  const handleReject = async (expense) => {
    try {
      const res = await fetch(`/api/accounting/pending-expenses/${expense.id}/reject/`, {
        method: 'POST',
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Rejection failed.');
      showToast('success', 'Expense rejected.');
      fetchExpenses();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  /* ── render ── */
  return (
    <div className="max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-midnight-ink tracking-tight">Pending Expenses</h2>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-soft-border rounded-lg px-3 py-1.5 bg-white text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue/30"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {/* Sync button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-1.5 text-sm font-medium rounded-lg border border-trust-blue text-trust-blue hover:bg-trust-blue hover:text-white transition disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : '↻ Sync Expenses'}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center text-sm text-cool-gray py-14">
          No expenses found. Click "Sync Expenses" to pull from the external system.
        </div>
      ) : (
        <div className="rounded-xl border border-soft-border bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-cloud-gray text-cool-gray uppercase text-xs">
                <th className="px-4 py-3 text-left font-semibold">Employee</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr
                  key={exp.id}
                  className={`border-t border-soft-border transition-colors ${
                    exp.status === 'pending' ? 'hover:bg-yellow-50/40' : 'opacity-70'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-midnight-ink">{exp.employee_name}</td>
                  <td className="px-4 py-3 text-midnight-ink">
                    {exp.category_name || (
                      <span className="text-red-500 text-xs italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-cool-gray max-w-[180px] truncate" title={exp.description}>
                    {exp.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">₹{fmt(exp.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_COLORS[exp.status]}`}>
                      {STATUS_LABELS[exp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {exp.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setApprovalModal({ expense: exp }); setPaymentLedger(''); }}
                          className="px-3 py-1 text-xs font-medium rounded border border-green-300 text-green-700 hover:bg-green-50 transition"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(exp)}
                          className="px-3 py-1 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-cool-gray">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-soft-border w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-bold text-midnight-ink mb-1">Approve Expense</h3>
            <p className="text-sm text-cool-gray mb-5">
              <span className="font-medium text-midnight-ink">{approvalModal.expense.employee_name}</span>
              {' — '}{approvalModal.expense.category_name || 'Unknown category'}
              {' — '}
              <span className="font-mono font-semibold">₹{fmt(approvalModal.expense.amount)}</span>
            </p>

            <label className="block text-xs font-semibold text-cool-gray uppercase mb-1.5">
              Payment Account (will be credited)
            </label>
            <select
              value={paymentLedger}
              onChange={(e) => setPaymentLedger(e.target.value)}
              className="w-full text-sm border border-soft-border rounded-lg px-3 py-2 bg-white text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue/30 mb-5"
            >
              <option value="">Select account…</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving || !paymentLedger}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                {approving ? 'Approving…' : 'Confirm Approve'}
              </button>
              <button
                type="button"
                onClick={() => setApprovalModal(null)}
                disabled={approving}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-soft-border text-cool-gray hover:bg-cloud-gray transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
