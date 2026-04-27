'use client';

import { useEffect, useState } from 'react';

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <td colSpan={7} className="pl-10 pr-4 py-3 text-xs text-cool-gray italic bg-cloud-gray/40 border-t border-soft-border">
          No transactions recorded.
        </td>
      </tr>
    );
  }
  return (
    <>
      <tr className="bg-slate-50">
        <td className="pl-10 pr-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide">Date</td>
        <td className="px-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide">Description / Notes</td>
        <td className="px-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide" colSpan={2}>Dept · Method · Vendor · Ref</td>
        <td className="px-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Debit</td>
        <td className="px-3 py-1.5 text-[10px] font-bold text-cool-gray uppercase tracking-wide text-right">Credit</td>
        <td />
      </tr>
      {transactions.map((tx) => (
        <tr key={tx.id} className="border-t border-soft-border/50 bg-white hover:bg-blue-50/20 transition-colors">
          <td className="pl-10 pr-3 py-2 font-mono text-xs text-midnight-ink whitespace-nowrap">
            {tx.entry_date}
            {tx.bill_date && tx.bill_date !== tx.entry_date && (
              <div className="text-cool-gray text-[10px]">Bill: {tx.bill_date}</div>
            )}
          </td>
          <td className="px-3 py-2 text-xs text-midnight-ink max-w-[200px]">
            <div className="font-medium truncate" title={tx.entry_description}>{tx.entry_description || '—'}</div>
            {tx.notes && <div className="text-cool-gray text-[10px] truncate" title={tx.notes}>{tx.notes}</div>}
          </td>
          <td className="px-3 py-2 text-xs text-cool-gray" colSpan={2}>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {tx.department && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{tx.department}</span>}
              {tx.payment_method && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.payment_method}</span>}
              {tx.vendor_payee && <span className="text-[10px] truncate max-w-[120px]" title={tx.vendor_payee}>↳ {tx.vendor_payee}</span>}
              {tx.ref_id && <span className="text-[10px] font-mono text-gray-400">#{tx.ref_id}</span>}
            </div>
          </td>
          <td className="px-3 py-2 text-xs text-right font-mono font-medium text-red-600">
            {tx.debit > 0 ? fmt(tx.debit) : <span className="text-cool-gray/40">—</span>}
          </td>
          <td className="px-3 py-2 text-xs text-right font-mono font-medium text-green-600">
            {tx.credit > 0 ? fmt(tx.credit) : <span className="text-cool-gray/40">—</span>}
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export default function AccountingLedgerSummary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/frontend/api/accounting/ledger-summary/', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) { setError(payload?.message || 'Failed to load ledger summary.'); return; }
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch { setError('Could not reach ledger summary API.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, []);

  const toggleExpand = (id) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = rows.filter(r =>
    (!typeFilter || r.type === typeFilter) &&
    (!search || r.ledger.toLowerCase().includes(search.toLowerCase()))
  );

  const grandDebit = filtered.reduce((s, r) => s + Number(r.total_debit || 0), 0);
  const grandCredit = filtered.reduce((s, r) => s + Number(r.total_credit || 0), 0);

  if (loading) return <div className="py-16 text-center text-sm text-cool-gray">Loading ledger summary…</div>;
  if (error) return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">{error}</div>
      <button type="button" onClick={fetchSummary} className="px-4 py-2 text-sm border border-soft-border rounded-lg bg-white hover:bg-cloud-gray">Retry</button>
    </div>
  );
  if (rows.length === 0) return (
    <div className="py-12 text-center text-sm text-cool-gray">No journal entries found. Create a journal entry first.</div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search ledger…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
          >
            <option value="">All types</option>
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setExpanded(new Set(rows.map(r => r.ledger_id)))}
            className="text-xs px-3 py-1.5 border border-soft-border rounded-lg hover:bg-cloud-gray">Expand All</button>
          <button type="button" onClick={() => setExpanded(new Set())}
            className="text-xs px-3 py-1.5 border border-soft-border rounded-lg hover:bg-cloud-gray">Collapse All</button>
          <button type="button" onClick={fetchSummary}
            className="text-xs px-3 py-1.5 border border-soft-border rounded-lg hover:bg-cloud-gray">↻ Refresh</button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ledgers', val: filtered.length, cls: 'text-midnight-ink' },
          { label: 'Total Debit', val: fmt(grandDebit), cls: 'text-red-600' },
          { label: 'Total Credit', val: fmt(grandCredit), cls: 'text-green-600' },
          { label: 'Net Balance', val: fmt(Math.abs(grandDebit - grandCredit)) + (grandDebit >= grandCredit ? ' Dr' : ' Cr'), cls: grandDebit >= grandCredit ? 'text-blue-700' : 'text-amber-700' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="border border-soft-border rounded-xl bg-white px-4 py-3">
            <div className="text-xs text-cool-gray uppercase font-semibold mb-1">{label}</div>
            <div className={`text-base font-bold font-mono ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div className="border border-soft-border rounded-xl bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-cloud-gray">
            <tr>
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray uppercase">Ledger Account</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray uppercase">Txns</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray uppercase">Total Debit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray uppercase">Total Credit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray uppercase">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isOpen = expanded.has(row.ledger_id);
              const balance = Number(row.total_debit || 0) - Number(row.total_credit || 0);
              return (
                <>
                  <tr
                    key={row.ledger_id}
                    onClick={() => toggleExpand(row.ledger_id)}
                    className="border-t border-soft-border cursor-pointer hover:bg-cloud-gray/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-xs text-cool-gray">{isOpen ? '▼' : '▶'}</td>
                    <td className="px-4 py-3 font-semibold text-midnight-ink">{row.ledger}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${TYPE_BADGE[row.type] || 'bg-gray-100 text-gray-600'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-cool-gray">{row.transactions?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-red-600">{fmt(row.total_debit)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-green-600">{fmt(row.total_credit)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                      {fmt(Math.abs(balance))} {balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                  {isOpen && <TxDetailRows key={`tx-${row.ledger_id}`} transactions={row.transactions} />}
                </>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-soft-border">
            <tr className="bg-cloud-gray font-bold">
              <td colSpan={4} className="px-4 py-3 text-midnight-ink">Grand Total ({filtered.length} ledgers)</td>
              <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(grandDebit)}</td>
              <td className="px-4 py-3 text-right font-mono text-green-600">{fmt(grandCredit)}</td>
              <td className="px-4 py-3 text-right font-mono text-midnight-ink">{fmt(Math.abs(grandDebit - grandCredit))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-cool-gray text-right">Click any ledger row to expand its transaction detail.</p>
    </div>
  );
}
