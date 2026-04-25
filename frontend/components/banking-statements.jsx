'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const fmt = (n) =>
  `₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_BADGE = {
  unprocessed: 'bg-amber-50 text-amber-700 border-amber-200',
  processed:   'bg-green-50 text-green-700 border-green-200',
  ignored:     'bg-gray-100 text-gray-500 border-gray-200',
};

const TYPE_BADGE = {
  debit:  'text-red-600',
  credit: 'text-green-600',
};

const DEFAULT_DEPARTMENTS = [
  'Marketing', 'Customer Relation Management', 'Operations', 'Design',
  'Logistics', 'Purchase', 'Sales / Business Development', 'Finance',
  'Information Technology', 'Human Resource', 'Production', 'Services',
  'House Keeping', 'Other',
];

export default function BankingStatements() {
  // ── Data
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unprocessed: 0 });

  // ── Filters
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  // ── Selection
  const [selected, setSelected] = useState(new Set());

  // ── Loading
  const [loading, setLoading] = useState(true);

  // ── Convert modal
  const [convertRows, setConvertRows] = useState(null); // null = closed
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  // ── Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load
  const loadData = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterAccount) q.set('bank_account', filterAccount);
    if (filterStatus) q.set('status', filterStatus);
    if (filterFrom) q.set('date_from', filterFrom);
    if (filterTo) q.set('date_to', filterTo);
    if (search) q.set('search', search);

    try {
      const res = await fetch(`/frontend/api/accounting/bank-transactions/?${q}`);
      const data = await res.json();
      if (data?.success) {
        setTransactions(data.data?.transactions || []);
        setSummary({ total: data.data?.total || 0, unprocessed: data.data?.unprocessed || 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [filterAccount, filterStatus, filterFrom, filterTo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    Promise.all([
      fetch('/frontend/api/accounting/bank-accounts/').then(r => r.json()),
      fetch('/frontend/api/accounting/ledgers/').then(r => r.json()),
    ]).then(([ba, led]) => {
      if (ba?.success) setBankAccounts(ba.data || []);
      if (led?.success) setLedgers(led.data || []);
    });
  }, []);

  // ── Selection helpers
  const toggleAll = () => {
    const unprocessed = transactions.filter(t => t.status === 'unprocessed');
    if (selected.size === unprocessed.length && unprocessed.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unprocessed.map(t => t.id)));
    }
  };

  const toggleOne = (id, status) => {
    if (status !== 'unprocessed') return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Bulk delete
  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} transaction(s)? This cannot be undone.`)) return;
    const res = await fetch('/frontend/api/accounting/bank-transactions/bulk-delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    });
    const data = await res.json();
    if (data?.success) {
      showToast(`${data.data?.deleted} transaction(s) deleted.`);
      setSelected(new Set());
      loadData();
    } else {
      showToast(data?.message || 'Delete failed.', 'error');
    }
  };

  // ── Open convert modal — pre-populate with selected unprocessed rows
  const openConvert = () => {
    const rows = transactions
      .filter(t => selected.has(t.id) && t.status === 'unprocessed')
      .map(t => ({
        ...t,
        _ledger_id: t.suggested_ledger ? String(t.suggested_ledger) : '',
        _department: t.department || '',
        _remove: false,
      }));
    if (!rows.length) { showToast('Select unprocessed rows first.', 'error'); return; }
    setConvertRows(rows);
    setConvertError('');
  };

  const updateConvertRow = (id, field, val) =>
    setConvertRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const handleConvert = async () => {
    const active = convertRows.filter(r => !r._remove);
    const missing = active.filter(r => !r._ledger_id);
    if (missing.length) {
      setConvertError(`${missing.length} row(s) have no ledger. Please assign one.`);
      return;
    }
    setConverting(true);
    setConvertError('');
    try {
      const payload = active.map(r => ({
        transaction_id: r.id,
        ledger_id: Number(r._ledger_id),
        department: r._department || '',
      }));
      const res = await fetch('/frontend/api/accounting/bank-transactions/convert/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        showToast(`${data.data?.created} journal entr${data.data?.created !== 1 ? 'ies' : 'y'} created.`);
        setConvertRows(null);
        setSelected(new Set());
        loadData();
      } else {
        setConvertError(data?.message || 'Conversion failed.');
      }
    } finally {
      setConverting(false);
    }
  };

  const unprocessedCount = transactions.filter(t => t.status === 'unprocessed').length;
  const allUnprocessedSelected =
    unprocessedCount > 0 && selected.size === unprocessedCount;

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-midnight-ink font-medium">
          {summary.total} transaction{summary.total !== 1 ? 's' : ''}
        </span>
        {summary.unprocessed > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {summary.unprocessed} unprocessed
          </span>
        )}
        {selected.size > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-trust-blue border border-blue-200">
            {selected.size} selected
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={filterAccount}
          onChange={e => { setFilterAccount(e.target.value); setSelected(new Set()); }}
          className="border border-soft-border rounded-lg px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue"
        >
          <option value="">All accounts</option>
          {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setSelected(new Set()); }}
          className="border border-soft-border rounded-lg px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue"
        >
          <option value="">All statuses</option>
          <option value="unprocessed">Unprocessed</option>
          <option value="processed">Processed</option>
          <option value="ignored">Ignored</option>
        </select>

        <input
          type="date"
          value={filterFrom}
          onChange={e => { setFilterFrom(e.target.value); setSelected(new Set()); }}
          className="border border-soft-border rounded-lg px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue"
        />
        <span className="text-xs text-cool-gray self-center">to</span>
        <input
          type="date"
          value={filterTo}
          onChange={e => { setFilterTo(e.target.value); setSelected(new Set()); }}
          className="border border-soft-border rounded-lg px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue"
        />

        <input
          type="text"
          placeholder="Search description…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
          className="border border-soft-border rounded-lg px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue min-w-48"
        />

        {(filterAccount || filterStatus || filterFrom || filterTo || search) && (
          <button
            type="button"
            onClick={() => { setFilterAccount(''); setFilterStatus(''); setFilterFrom(''); setFilterTo(''); setSearch(''); setSelected(new Set()); }}
            className="text-xs text-cool-gray hover:text-midnight-ink underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-trust-blue font-medium">{selected.size} selected</span>
          <button
            type="button"
            onClick={openConvert}
            className="ml-2 bg-trust-blue text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Convert to Journal
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-cool-gray hover:text-midnight-ink"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-soft-border rounded-xl bg-white">
        {loading ? (
          <div className="py-12 text-center text-sm text-cool-gray">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-cool-gray">No transactions found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-cloud-gray border-b border-soft-border">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={allUnprocessedSelected}
                    onChange={toggleAll}
                    className="accent-trust-blue"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-28">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray">Description</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-36">Account</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-cool-gray w-28">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-cool-gray w-20">Type</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-cool-gray w-28">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-36">Suggested Ledger</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr
                  key={tx.id}
                  onClick={() => toggleOne(tx.id, tx.status)}
                  className={`border-b border-soft-border last:border-0 transition-colors ${
                    tx.status === 'unprocessed' ? 'cursor-pointer hover:bg-blue-50/40' : ''
                  } ${selected.has(tx.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(tx.id)}
                      disabled={tx.status !== 'unprocessed'}
                      onChange={() => toggleOne(tx.id, tx.status)}
                      onClick={e => e.stopPropagation()}
                      className="accent-trust-blue disabled:opacity-30"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-midnight-ink">{tx.date}</td>
                  <td className="px-3 py-2 text-midnight-ink max-w-xs">
                    <span className="block truncate" title={tx.description}>{tx.description}</span>
                    {tx.department && <span className="text-xs text-cool-gray">{tx.department}</span>}
                  </td>
                  <td className="px-3 py-2 text-cool-gray text-xs">{tx.bank_account_name}</td>
                  <td className={`px-3 py-2 text-right font-semibold font-mono ${TYPE_BADGE[tx.type] || ''}`}>
                    {fmt(tx.amount)}
                  </td>
                  <td className={`px-3 py-2 text-center text-xs font-semibold uppercase ${TYPE_BADGE[tx.type] || ''}`}>
                    {tx.type}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[tx.status] || ''}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-cool-gray">
                    {tx.suggested_ledger_name || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Convert Modal */}
      {convertRows && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-soft-border">
              <h3 className="text-base font-semibold text-midnight-ink">
                Convert to Journal — {convertRows.filter(r => !r._remove).length} row{convertRows.filter(r => !r._remove).length !== 1 ? 's' : ''}
              </h3>
              <button type="button" onClick={() => setConvertRows(null)} className="text-cool-gray hover:text-midnight-ink text-lg">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="min-w-full text-sm">
                <thead className="bg-cloud-gray sticky top-0 border-b border-soft-border">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-24">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-40">Ledger *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-36">Department</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-cool-gray w-24">Amount</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {convertRows.map(row => (
                    <tr
                      key={row.id}
                      className={`border-b border-soft-border last:border-0 ${row._remove ? 'opacity-30 line-through' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                      <td className="px-3 py-2 max-w-xs">
                        <span className="block truncate text-xs" title={row.description}>{row.description}</span>
                      </td>
                      <td className="px-3 py-2">
                        {!row._remove && (
                          <select
                            value={row._ledger_id}
                            onChange={e => updateConvertRow(row.id, '_ledger_id', e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-trust-blue ${
                              !row._ledger_id ? 'border-red-300 bg-red-50' : 'border-soft-border'
                            }`}
                          >
                            <option value="">Select ledger…</option>
                            {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!row._remove && (
                          <select
                            value={row._department}
                            onChange={e => updateConvertRow(row.id, '_department', e.target.value)}
                            className="w-full border border-soft-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-trust-blue"
                          >
                            <option value="">No department</option>
                            {DEFAULT_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold font-mono text-xs ${
                        row.type === 'debit' ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {row.type === 'debit' ? '-' : '+'}₹{Math.abs(Number(row.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row._remove ? (
                          <button type="button" onClick={() => updateConvertRow(row.id, '_remove', false)}
                            className="text-xs text-trust-blue hover:underline">Restore</button>
                        ) : (
                          <button type="button" onClick={() => updateConvertRow(row.id, '_remove', true)}
                            className="text-xs text-red-400 hover:text-red-600">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {convertError && (
              <p className="px-6 py-2 text-sm text-red-500">{convertError}</p>
            )}

            <div className="flex gap-3 px-6 py-4 border-t border-soft-border">
              <button
                type="button"
                onClick={handleConvert}
                disabled={converting || convertRows.filter(r => !r._remove).length === 0}
                className="bg-trust-blue text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {converting ? 'Converting…' : `Confirm & Convert ${convertRows.filter(r => !r._remove).length} row${convertRows.filter(r => !r._remove).length !== 1 ? 's' : ''}`}
              </button>
              <button
                type="button"
                onClick={() => setConvertRows(null)}
                className="border border-soft-border text-sm text-cool-gray rounded-lg px-4 py-2 hover:bg-cloud-gray transition-colors"
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
