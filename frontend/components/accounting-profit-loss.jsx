'use client';

import { useEffect, useState } from 'react';

export default function AccountingProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPL = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/profit-loss/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.message || 'Failed to load Profit & Loss report.');
        return;
      }
      setData(payload.data);
    } catch {
      setError('Could not reach Profit & Loss API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPL();
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
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchPL}
          className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── empty state ── */
  if (!data || (!data.income?.length && !data.expenses?.length)) {
    return (
      <div className="max-w-3xl mx-auto text-sm text-cool-gray py-12 text-center">
        No income or expense entries found. Create journal entries with income/expense ledgers first.
      </div>
    );
  }

  const { income, expenses, total_income, total_expense, profit } = data;
  const isProfit = profit >= 0;

  /* ── section renderer ── */
  const renderSection = (title, items, total, colorClass, bgClass) => (
    <div className={`rounded-xl border border-soft-border overflow-hidden shadow-sm mb-6 ${bgClass}`}>
      <div className="px-4 py-3 border-b border-soft-border bg-white">
        <h3 className={`text-sm font-bold uppercase tracking-wide ${colorClass}`}>{title}</h3>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cloud-gray text-cool-gray uppercase text-xs">
            <th className="px-4 py-2.5 text-left font-semibold">Ledger</th>
            <th className="px-4 py-2.5 text-right font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-4 py-4 text-center text-cool-gray text-xs">
                No {title.toLowerCase()} entries found.
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
  );

  return (
    <div className="max-w-3xl mx-auto">

      {/* Report title */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-midnight-ink tracking-tight">Profit & Loss Statement</h2>
        <button
          type="button"
          onClick={fetchPL}
          className="px-3 py-1.5 text-xs border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Income section */}
      {renderSection('Income', income, total_income, 'text-green-700', 'bg-white')}

      {/* Expenses section */}
      {renderSection('Expenses', expenses, total_expense, 'text-red-600', 'bg-white')}

      {/* Net Profit / Loss summary */}
      <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${
        isProfit ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
      }`}>
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-cool-gray text-xs uppercase font-semibold mb-1">Total Income</p>
              <p className="text-lg font-bold text-green-700 font-mono">₹{fmt(total_income)}</p>
            </div>
            <div className="text-right">
              <p className="text-cool-gray text-xs uppercase font-semibold mb-1">Total Expense</p>
              <p className="text-lg font-bold text-red-600 font-mono">₹{fmt(total_expense)}</p>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-current opacity-20 my-3" />

          <div className="flex items-center justify-between">
            <p className={`text-sm font-bold uppercase tracking-wide ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
              {isProfit ? 'Net Profit ✅' : 'Net Loss ❌'}
            </p>
            <p className={`text-2xl font-extrabold font-mono ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
              {isProfit ? '' : '−'}₹{fmt(Math.abs(profit))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
