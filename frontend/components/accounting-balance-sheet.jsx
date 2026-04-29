'use client';

import { useEffect, useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRs = (n) => `₹${fmt(n)}`;

function TxDetailRows({ transactions }) {
  if (!transactions?.length) {
    return (
      <tr>
        <td colSpan={2} className="pl-10 pr-4 py-3 text-xs text-cool-gray italic bg-cloud-gray/40 border-t border-soft-border">
          No transactions recorded.
        </td>
      </tr>
    );
  }
  return (
    <>
      <tr className="bg-slate-50">
        <td className="pl-10 pr-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide">
          Date · Description · Dept · Method · Vendor · Ref
        </td>
        <td className="px-4 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Amount</td>
      </tr>
      {transactions.map((tx) => (
        <tr key={tx.id} className="border-t border-soft-border/50 bg-white hover:bg-blue-50/20 transition-colors">
          <td className="pl-10 pr-3 py-2 text-xs text-midnight-ink">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
              <span className="font-mono font-medium">{tx.entry_date}</span>
              {tx.bill_date && tx.bill_date !== tx.entry_date && <span className="text-[10px] text-cool-gray">Bill: {tx.bill_date}</span>}
              {tx.entry_description && <span className="truncate max-w-[150px]" title={tx.entry_description}>{tx.entry_description}</span>}
              {tx.notes && <span className="text-cool-gray text-[10px] truncate max-w-[100px]" title={tx.notes}>{tx.notes}</span>}
              {tx.department && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{tx.department}</span>}
              {tx.payment_method && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.payment_method}</span>}
              {tx.vendor_payee && <span className="text-[10px] truncate max-w-[90px]" title={tx.vendor_payee}>↳ {tx.vendor_payee}</span>}
              {tx.ref_id && <span className="text-[10px] font-mono text-gray-400">#{tx.ref_id}</span>}
            </div>
          </td>
          <td className="px-4 py-2 text-xs text-right font-mono font-medium text-midnight-ink">
            {tx.debit > 0 ? fmtRs(tx.debit) : tx.credit > 0 ? fmtRs(tx.credit) : '—'}
          </td>
        </tr>
      ))}
    </>
  );
}

function SideTable({ title, items, total, colorClass, bgHeaderClass, expanded, onToggle }) {
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-soft-border overflow-hidden shadow-sm">
      <div className={`px-4 py-3 border-b border-soft-border ${bgHeaderClass}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-sm font-bold uppercase tracking-wide ${colorClass}`}>{title}</h3>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => items.forEach(i => !expanded.has(i.ledger_id) && onToggle(i.ledger_id))}
              className="text-[10px] px-2 py-0.5 border border-current rounded opacity-60 hover:opacity-100">Expand</button>
            <button type="button" onClick={() => items.forEach(i => expanded.has(i.ledger_id) && onToggle(i.ledger_id))}
              className="text-[10px] px-2 py-0.5 border border-current rounded opacity-60 hover:opacity-100">Collapse</button>
          </div>
        </div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cloud-gray text-cool-gray text-xs uppercase">
            <th className="px-3 py-2 w-6" />
            <th className="px-3 py-2 text-left font-semibold">Account</th>
            <th className="px-3 py-2 text-right font-semibold">Txns</th>
            <th className="px-3 py-2 text-right font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4} className="px-3 py-4 text-center text-cool-gray text-xs">No entries.</td></tr>
          ) : items.map((item) => {
            const isOpen = expanded.has(item.ledger_id);
            return (
              <>
                <tr
                  key={item.ledger_id}
                  onClick={() => onToggle(item.ledger_id)}
                  className="border-t border-soft-border cursor-pointer hover:bg-cloud-gray/50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center text-xs text-cool-gray">{isOpen ? '▼' : '▶'}</td>
                  <td className="px-3 py-2.5 font-medium text-midnight-ink">{item.ledger}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-cool-gray">{item.transactions?.length || 0}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold ${colorClass}`}>{fmtRs(item.amount)}</td>
                </tr>
                {isOpen && <TxDetailRows key={`tx-${item.ledger_id}`} transactions={item.transactions} />}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-soft-border bg-white font-bold">
            <td colSpan={3} className="px-3 py-3 text-midnight-ink text-xs">Total {title}</td>
            <td className={`px-3 py-3 text-right font-mono ${colorClass}`}>{fmtRs(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function AccountingBalanceSheet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const fetchBS = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/frontend/api/accounting/balance-sheet/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) { setError(payload?.message || 'Failed to load balance sheet.'); return; }
      setData(payload.data);
    } catch { setError('Could not reach balance sheet API.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBS(); }, []);

  const toggleExpand = (id) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">{error}</div>
      <button type="button" onClick={fetchBS} className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray">Retry</button>
    </div>
  );
  if (!data) return null;

  const { assets, liabilities, total_assets, total_liabilities, equity, is_balanced } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header + balance status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-midnight-ink tracking-tight">Balance Sheet</h2>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            is_balanced ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
          }`}>
            {is_balanced ? '✅ Balanced' : '❌ Imbalanced'}
          </span>
          <button type="button" onClick={fetchBS}
            className="px-3 py-1.5 text-xs border border-soft-border rounded-lg bg-white hover:bg-cloud-gray font-medium">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        <SideTable
          title="Assets"
          items={assets}
          total={total_assets}
          colorClass="text-blue-700"
          bgHeaderClass="bg-blue-50"
          expanded={expanded}
          onToggle={toggleExpand}
        />
        <SideTable
          title="Liabilities & Equity"
          items={liabilities}
          total={total_liabilities + (equity || 0)}
          colorClass="text-yellow-700"
          bgHeaderClass="bg-yellow-50"
          expanded={expanded}
          onToggle={toggleExpand}
        />
      </div>

      {/* Accounting equation summary */}
      <div className={`rounded-xl border-2 px-5 py-4 shadow-sm ${is_balanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <p className="text-xs font-semibold text-cool-gray uppercase mb-2 tracking-wide">Accounting Equation</p>
        <div className="flex flex-wrap items-center gap-4 text-sm font-mono">
          <span className="text-blue-700 font-bold">Assets: {fmtRs(total_assets)}</span>
          <span className="text-cool-gray">=</span>
          <span className="text-yellow-700 font-bold">Liabilities: {fmtRs(total_liabilities)}</span>
          <span className="text-cool-gray">+</span>
          <span className="text-gray-700 font-bold">Equity: {fmtRs(equity || 0)}</span>
          {!is_balanced && (
            <span className="ml-auto text-red-600 text-xs font-semibold bg-red-100 px-2 py-0.5 rounded">
              Diff: {fmtRs(Math.abs(total_assets - total_liabilities - (equity || 0)))}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-cool-gray text-right">Click any ledger row to expand its transaction detail.</p>
    </div>
  );
}
