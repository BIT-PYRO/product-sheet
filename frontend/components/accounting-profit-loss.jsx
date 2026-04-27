'use client';

import { useEffect, useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRs = (n) => `₹${fmt(n)}`;

function TxDetailRows({ transactions, colSpan = 2 }) {
  if (!transactions?.length) {
    return (
      <tr>
        <td colSpan={colSpan} className="pl-10 pr-4 py-3 text-xs text-cool-gray italic bg-cloud-gray/40 border-t border-soft-border">
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
        <td className="px-4 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Dr</td>
        <td className="px-4 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Cr</td>
      </tr>
      {transactions.map((tx) => (
        <tr key={tx.id} className="border-t border-soft-border/50 bg-white hover:bg-blue-50/20 transition-colors">
          <td className="pl-10 pr-3 py-2 text-xs text-midnight-ink">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
              <span className="font-mono font-medium">{tx.entry_date}</span>
              {tx.bill_date && tx.bill_date !== tx.entry_date && <span className="text-[10px] text-cool-gray">Bill: {tx.bill_date}</span>}
              {tx.entry_description && <span className="truncate max-w-[160px]" title={tx.entry_description}>{tx.entry_description}</span>}
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

function SectionTable({ title, items, total, colorClass, bgHeaderClass, expanded, onToggle }) {
  return (
    <div className="rounded-xl border border-soft-border overflow-hidden shadow-sm">
      <div className={`px-4 py-3 border-b border-soft-border ${bgHeaderClass}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold uppercase tracking-wide ${colorClass}`}>{title}</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => items.forEach(i => !expanded.has(i.ledger_id) && onToggle(i.ledger_id))}
              className="text-xs px-2 py-0.5 border border-current rounded opacity-60 hover:opacity-100">Expand All</button>
            <button type="button" onClick={() => items.forEach(i => expanded.has(i.ledger_id) && onToggle(i.ledger_id))}
              className="text-xs px-2 py-0.5 border border-current rounded opacity-60 hover:opacity-100">Collapse</button>
          </div>
        </div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cloud-gray text-cool-gray uppercase text-xs">
            <th className="px-4 py-2.5 w-8" />
            <th className="px-4 py-2.5 text-left font-semibold">Ledger Account</th>
            <th className="px-4 py-2.5 text-right font-semibold">Txns</th>
            <th className="px-4 py-2.5 text-right font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-4 text-center text-cool-gray text-xs">No entries found.</td></tr>
          ) : items.map((item) => {
            const isOpen = expanded.has(item.ledger_id);
            return (
              <>
                <tr
                  key={item.ledger_id}
                  onClick={() => onToggle(item.ledger_id)}
                  className="border-t border-soft-border cursor-pointer hover:bg-cloud-gray/50 transition-colors"
                >
                  <td className="px-4 py-3 text-center text-xs text-cool-gray">{isOpen ? '▼' : '▶'}</td>
                  <td className="px-4 py-3 font-medium text-midnight-ink">{item.ledger}</td>
                  <td className="px-4 py-3 text-right text-xs text-cool-gray">{item.transactions?.length || 0}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colorClass}`}>{fmtRs(item.amount)}</td>
                </tr>
                {isOpen && <TxDetailRows key={`tx-${item.ledger_id}`} transactions={item.transactions} colSpan={4} />}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-soft-border bg-white font-bold">
            <td colSpan={3} className="px-4 py-3 text-midnight-ink">Total {title}</td>
            <td className={`px-4 py-3 text-right font-mono ${colorClass}`}>{fmtRs(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function AccountingProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const fetchPL = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/frontend/api/accounting/profit-loss/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) { setError(payload?.message || 'Failed to load P&L.'); return; }
      setData(payload.data);
    } catch { setError('Could not reach P&L API.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPL(); }, []);

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
      <button type="button" onClick={fetchPL} className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray">Retry</button>
    </div>
  );
  if (!data || (!data.income?.length && !data.expenses?.length)) return (
    <div className="max-w-4xl mx-auto text-sm text-cool-gray py-12 text-center">
      No income or expense entries found. Create journal entries with income/expense ledgers first.
    </div>
  );

  const { income, expenses, total_income, total_expense, profit } = data;
  const isProfit = profit >= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-midnight-ink tracking-tight">Profit & Loss Statement</h2>
        <button type="button" onClick={fetchPL}
          className="px-3 py-1.5 text-xs border border-soft-border rounded-lg bg-white hover:bg-cloud-gray font-medium">
          ↻ Refresh
        </button>
      </div>

      {/* Income */}
      <SectionTable
        title="Income"
        items={income}
        total={total_income}
        colorClass="text-green-700"
        bgHeaderClass="bg-green-50"
        expanded={expanded}
        onToggle={toggleExpand}
      />

      {/* Expenses */}
      <SectionTable
        title="Expenses"
        items={expenses}
        total={total_expense}
        colorClass="text-red-600"
        bgHeaderClass="bg-red-50"
        expanded={expanded}
        onToggle={toggleExpand}
      />

      {/* Net summary */}
      <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${isProfit ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-cool-gray text-xs uppercase font-semibold mb-1">Total Income</p>
              <p className="text-lg font-bold text-green-700 font-mono">{fmtRs(total_income)}</p>
            </div>
            <div className="text-right">
              <p className="text-cool-gray text-xs uppercase font-semibold mb-1">Total Expense</p>
              <p className="text-lg font-bold text-red-600 font-mono">{fmtRs(total_expense)}</p>
            </div>
          </div>
          <div className="border-t-2 border-dashed border-current opacity-20 my-3" />
          <div className="flex items-center justify-between">
            <p className={`text-sm font-bold uppercase tracking-wide ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
              {isProfit ? 'Net Profit ✅' : 'Net Loss ❌'}
            </p>
            <p className={`text-2xl font-extrabold font-mono ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
              {isProfit ? '' : '−'}{fmtRs(Math.abs(profit))}
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-cool-gray text-right">Click any ledger row to expand its transaction detail.</p>
    </div>
  );
}
