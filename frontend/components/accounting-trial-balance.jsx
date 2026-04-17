'use client';

import { useEffect, useState } from 'react';

export default function AccountingTrialBalance() {
  const [data, setData] = useState(null);   // { entries, total_debit, total_credit, is_balanced }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrialBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/trial-balance/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.message || 'Failed to load trial balance.');
        return;
      }
      setData(payload.data);
    } catch {
      setError('Could not reach trial balance API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  /* ── number formatter ── */
  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── error ── */
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchTrialBalance}
          className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── empty ── */
  if (!data || !data.entries?.length) {
    return (
      <div className="max-w-3xl mx-auto text-sm text-cool-gray py-12 text-center">
        No journal entries found. Create journal entries first.
      </div>
    );
  }

  const { entries, total_debit, total_credit, is_balanced } = data;

  /* ── ledger type badge colour ── */
  const typeBadge = (type) => {
    const map = {
      asset:     'bg-blue-50 text-blue-700',
      liability: 'bg-yellow-50 text-yellow-700',
      income:    'bg-green-50 text-green-700',
      expense:   'bg-red-50 text-red-700',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="max-w-3xl mx-auto">

      {/* Balance status banner */}
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 mb-5 text-sm font-medium ${
        is_balanced
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-600'
      }`}>
        <span>{is_balanced ? '✅ Trial balance is balanced.' : '❌ Trial balance is NOT balanced — mismatch detected.'}</span>
        <button
          type="button"
          onClick={fetchTrialBalance}
          className="ml-4 text-xs px-3 py-1 rounded border border-current opacity-70 hover:opacity-100 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-soft-border bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-cloud-gray text-cool-gray uppercase text-xs">
              <th className="px-4 py-3 text-left font-semibold">Ledger</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-right font-semibold">Debit (₹)</th>
              <th className="px-4 py-3 text-right font-semibold">Credit (₹)</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((row) => (
              <tr
                key={row.ledger_id}
                className="border-t border-soft-border hover:bg-cloud-gray/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-midnight-ink">{row.ledger}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${typeBadge(row.type)}`}>
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {row.debit > 0 ? fmt(row.debit) : <span className="text-cool-gray">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {row.credit > 0 ? fmt(row.credit) : <span className="text-cool-gray">—</span>}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className={`border-t-2 font-bold text-sm ${
              is_balanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              <td className="px-4 py-3 text-midnight-ink" colSpan={2}>
                Grand Total
              </td>
              <td className={`px-4 py-3 text-right font-mono ${is_balanced ? 'text-green-700' : 'text-red-600'}`}>
                ₹{fmt(total_debit)}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${is_balanced ? 'text-green-700' : 'text-red-600'}`}>
                ₹{fmt(total_credit)}
              </td>
            </tr>
            {!is_balanced && (
              <tr className="bg-red-50 text-red-600 text-xs">
                <td className="px-4 py-2" colSpan={4}>
                  Difference: ₹{fmt(Math.abs(total_debit - total_credit))} — check for missing or duplicate journal items.
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Counts */}
      <p className="mt-3 text-xs text-cool-gray text-right">
        {entries.length} ledger{entries.length !== 1 ? 's' : ''} in trial balance
      </p>
    </div>
  );
}
