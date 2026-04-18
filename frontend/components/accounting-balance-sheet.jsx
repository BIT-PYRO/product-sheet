'use client';

import { useEffect, useState } from 'react';

export default function AccountingBalanceSheet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBS = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/balance-sheet/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.message || 'Failed to load Balance Sheet.');
        return;
      }
      setData(payload.data);
    } catch {
      setError('Could not reach Balance Sheet API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBS();
  }, []);

  /* ── currency formatter ── */
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
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchBS}
          className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── empty state ── */
  if (!data || (!data.assets?.length && !data.liabilities?.length && data.equity === 0)) {
    return (
      <div className="max-w-4xl mx-auto text-sm text-cool-gray py-12 text-center">
        No asset or liability entries found. Create journal entries with asset/liability ledgers first.
      </div>
    );
  }

  const { assets, liabilities, equity, total_assets, total_liabilities, is_balanced } = data;
  const liabPlusEquity = Math.round((total_liabilities + equity) * 100) / 100;

  /* ── column table renderer ── */
  const renderColumn = (title, items, total, colorClass, icon) => (
    <div className="rounded-xl border border-soft-border bg-white overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-soft-border bg-cloud-gray">
        <h3 className={`text-sm font-bold uppercase tracking-wide ${colorClass}`}>{title}</h3>
      </div>
      <div className="flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-cool-gray uppercase text-xs">
              <th className="px-4 py-2.5 text-left font-semibold">Ledger</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-4 text-center text-cool-gray text-xs">
                  No {title.toLowerCase()} entries.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.ledger_id}
                  className="border-t border-soft-border hover:bg-cloud-gray/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-midnight-ink">{item.ledger}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-soft-border bg-white font-bold">
              <td className="px-4 py-3 text-midnight-ink">Total {title}</td>
              <td className={`px-4 py-3 text-right font-mono ${colorClass}`}>₹{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-midnight-ink tracking-tight">Balance Sheet</h2>
        <button
          type="button"
          onClick={fetchBS}
          className="px-3 py-1.5 text-xs border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Two-column layout: Assets | Liabilities + Equity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

        {/* LEFT — Assets */}
        {renderColumn('Assets', assets, total_assets, 'text-blue-700', '')}

        {/* RIGHT — Liabilities + Equity */}
        <div className="flex flex-col gap-5">
          {renderColumn('Liabilities', liabilities, total_liabilities, 'text-amber-700', '')}

          {/* Equity card */}
          <div className="rounded-xl border border-soft-border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-soft-border bg-cloud-gray">
              <h3 className="text-sm font-bold uppercase tracking-wide text-purple-700">Equity (Retained Profit)</h3>
            </div>
            <div className="px-4 py-4 flex items-center justify-between">
              <span className="text-sm font-medium text-midnight-ink">Net Profit</span>
              <span className={`text-lg font-bold font-mono ${equity >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {equity < 0 ? '−' : ''}₹{fmt(Math.abs(equity))}
              </span>
            </div>
          </div>

          {/* Liabilities + Equity total */}
          <div className="rounded-lg border border-soft-border bg-white px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-sm font-bold text-midnight-ink">Liabilities + Equity</span>
            <span className="text-base font-bold font-mono text-amber-700">₹{fmt(liabPlusEquity)}</span>
          </div>
        </div>
      </div>

      {/* Balancing check banner */}
      <div className={`rounded-xl border-2 px-5 py-4 flex items-center justify-between ${
        is_balanced
          ? 'border-green-300 bg-green-50'
          : 'border-red-300 bg-red-50'
      }`}>
        <div>
          <p className={`text-sm font-bold ${is_balanced ? 'text-green-700' : 'text-red-600'}`}>
            {is_balanced ? 'Balanced ✅' : 'Mismatch ❌'}
          </p>
          <p className="text-xs text-cool-gray mt-0.5">
            Assets = Liabilities + Equity
          </p>
        </div>
        <div className="text-right text-sm font-mono">
          <p className="text-blue-700">Assets: ₹{fmt(total_assets)}</p>
          <p className="text-amber-700">L + E: ₹{fmt(liabPlusEquity)}</p>
          {!is_balanced && (
            <p className="text-red-600 text-xs mt-1">
              Diff: ₹{fmt(Math.abs(total_assets - liabPlusEquity))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
