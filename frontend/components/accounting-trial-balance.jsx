'use client';

import { useEffect, useState } from 'react';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRs = (n) => `₹${fmt(n)}`;

const TYPE_BADGE = {
  asset:     'bg-blue-50 text-blue-700',
  liability: 'bg-yellow-50 text-yellow-700',
  income:    'bg-green-50 text-green-700',
  expense:   'bg-red-50 text-red-700',
};

function TxDetailRows({ transactions }) {
  if (!transactions?.length) {
    return (
      <tr>
        <td colSpan={4} className="pl-10 pr-4 py-3 text-xs text-cool-gray italic bg-cloud-gray/40 border-t border-soft-border">
          No transactions recorded.
        </td>
      </tr>
    );
  }
  return (
    <>
      <tr className="bg-slate-50">
        <td className="pl-10 pr-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide" colSpan={2}>
          Date · Description · Dept · Method · Vendor · Ref
        </td>
        <td className="px-4 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Debit</td>
        <td className="px-4 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Credit</td>
      </tr>
      {transactions.map((tx) => (
        <tr key={tx.id} className="border-t border-soft-border/50 bg-white hover:bg-blue-50/20 transition-colors">
          <td className="pl-10 pr-3 py-2 text-xs text-midnight-ink" colSpan={2}>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
              <span className="font-mono font-medium whitespace-nowrap">{tx.entry_date}</span>
              {tx.bill_date && tx.bill_date !== tx.entry_date && (
                <span className="text-[10px] text-cool-gray">Bill: {tx.bill_date}</span>
              )}
              {tx.entry_description && (
                <span className="truncate max-w-[180px] text-midnight-ink" title={tx.entry_description}>{tx.entry_description}</span>
              )}
              {tx.notes && <span className="text-cool-gray text-[10px] truncate max-w-[120px]" title={tx.notes}>{tx.notes}</span>}
              {tx.department && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{tx.department}</span>}
              {tx.payment_method && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.payment_method}</span>}
              {tx.vendor_payee && <span className="text-[10px] truncate max-w-[100px]" title={tx.vendor_payee}>↳ {tx.vendor_payee}</span>}
              {tx.ref_id && <span className="text-[10px] font-mono text-gray-400">#{tx.ref_id}</span>}
            </div>
          </td>
          <td className="px-4 py-2 text-xs text-right font-mono font-medium text-red-600">
            {tx.debit > 0 ? fmtRs(tx.debit) : <span className="text-cool-gray/40">—</span>}
          </td>
          <td className="px-4 py-2 text-xs text-right font-mono font-medium text-green-600">
            {tx.credit > 0 ? fmtRs(tx.credit) : <span className="text-cool-gray/40">—</span>}
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AccountingTrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const fetchTrialBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/frontend/api/accounting/trial-balance/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) { setError(payload?.message || 'Failed to load trial balance.'); return; }
      setData(payload.data);
    } catch { setError('Could not reach trial balance API.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrialBalance(); }, []);

  const toggleExpand = (id) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">{error}</div>
      <button type="button" onClick={fetchTrialBalance}
        className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray transition">Retry</button>
    </div>
  );

  if (!data || !data.entries?.length) return (
    <div className="max-w-4xl mx-auto text-sm text-cool-gray py-12 text-center">
      No journal entries found. Create journal entries first.
    </div>
  );

  const { entries, total_debit, total_credit, is_balanced } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Balance status banner */}
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${
        is_balanced ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
      }`}>
        <span>{is_balanced ? '✅ Trial balance is balanced.' : '❌ Trial balance is NOT balanced — mismatch detected.'}</span>
        <div className="flex gap-2 ml-4">
          <button type="button" onClick={() => setExpanded(new Set(entries.map(e => e.ledger_id)))}
            className="text-xs px-2.5 py-1 rounded border border-current opacity-60 hover:opacity-100">Expand All</button>
          <button type="button" onClick={() => setExpanded(new Set())}
            className="text-xs px-2.5 py-1 rounded border border-current opacity-60 hover:opacity-100">Collapse</button>
          <button type="button" onClick={fetchTrialBalance}
            className="text-xs px-2.5 py-1 rounded border border-current opacity-60 hover:opacity-100">↻ Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-soft-border bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-cloud-gray text-cool-gray uppercase text-xs">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 text-left font-semibold">Ledger Account</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-right font-semibold">Txns</th>
              <th className="px-4 py-3 text-right font-semibold">Debit (₹)</th>
              <th className="px-4 py-3 text-right font-semibold">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => {
              const isOpen = expanded.has(row.ledger_id);
              return (
                <>
                  <tr
                    key={row.ledger_id}
                    onClick={() => toggleExpand(row.ledger_id)}
                    className="border-t border-soft-border cursor-pointer hover:bg-cloud-gray/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-xs text-cool-gray">{isOpen ? '▼' : '▶'}</td>
                    <td className="px-4 py-3 font-medium text-midnight-ink">{row.ledger}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${TYPE_BADGE[row.type] || 'bg-gray-100 text-gray-600'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-cool-gray">{row.transactions?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-red-600">
                      {row.debit > 0 ? fmt(row.debit) : <span className="text-cool-gray">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-green-600">
                      {row.credit > 0 ? fmt(row.credit) : <span className="text-cool-gray">—</span>}
                    </td>
                  </tr>
                  {isOpen && <TxDetailRows key={`tx-${row.ledger_id}`} transactions={row.transactions} />}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`border-t-2 font-bold text-sm ${is_balanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <td colSpan={4} className="px-4 py-3 text-midnight-ink">Grand Total</td>
              <td className={`px-4 py-3 text-right font-mono ${is_balanced ? 'text-green-700' : 'text-red-600'}`}>₹{fmt(total_debit)}</td>
              <td className={`px-4 py-3 text-right font-mono ${is_balanced ? 'text-green-700' : 'text-red-600'}`}>₹{fmt(total_credit)}</td>
            </tr>
            {!is_balanced && (
              <tr className="bg-red-50 text-red-600 text-xs">
                <td className="px-4 py-2" colSpan={6}>
                  Difference: ₹{fmt(Math.abs(total_debit - total_credit))} — check for missing or duplicate journal items.
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-cool-gray text-right">
        {entries.length} ledger{entries.length !== 1 ? 's' : ''} · Click a row to expand transactions.
      </p>
    </div>
  );
}
