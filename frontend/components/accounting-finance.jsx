'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FinanceEntryModal from './finance-entry-modal';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

const dateRange = preset => {
  const now = new Date(); const to = today();
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === 'thisMonth') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === 'thisYear') { return { from: `${now.getFullYear()}-01-01`, to }; }
  return { from: '', to: '' };
};

function printRows(rows, columns, title) {
  const html = `<html><head><title>${title}</title><style>
    body{font-family:Inter,Arial,sans-serif;font-size:13px;padding:32px;color:#111827}
    h2{margin:0 0 6px;font-size:18px}p.sub{color:#6b7280;font-size:12px;margin:0 0 20px}
    table{border-collapse:collapse;width:100%}
    th{background:#f9fafb;padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:1px solid #e5e7eb}
    td{padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}
    .r{text-align:right;font-weight:700}
    footer{margin-top:20px;font-size:11px;color:#9ca3af}
  </style></head><body>
    <h2>${title}</h2>
    <p class="sub">Printed on ${new Date().toLocaleString('en-IN')}</p>
    <table><thead><tr>${columns.map(c => `<th class="${c.right ? 'r' : ''}">${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${columns.map(c => `<td class="${c.right ? 'r' : ''}">${c.key === 'amount' ? fmt(r[c.key]) : (r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close();
}

function exportCSV(rows, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(r => columns.map(c => `"${(c.key === 'amount' ? Number(r[c.key]).toFixed(2) : (r[c.key] ?? '')).toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const COLS = [
  { key: 'date', label: 'Date' },
  { key: 'category_name', label: 'Category' },
  { key: 'account_name', label: 'Account' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', right: true },
];

function StatCard({ label, value, color, note }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '18px 22px', flex: 1, minWidth: 160 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</p>
      {note && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af' }}>{note}</p>}
    </div>
  );
}

function SelectableTable({ rows, columns, loading, emptyMsg, onPrint, onExport, accentColor }) {
  const [selected, setSelected] = useState(new Set());
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggleRow = i => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };
  const target = selected.size > 0 ? rows.filter((_, i) => selected.has(i)) : rows;

  const btn = { padding: '7px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {selected.size > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 20 }}>
            {selected.size} row{selected.size > 1 ? 's' : ''} selected
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => onPrint(target)} style={btn}>
            Print{selected.size > 0 ? ` (${selected.size})` : ' All'}
          </button>
          <button onClick={() => exportCSV(target, columns, 'export.csv')} style={btn}>
            Export CSV{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '10px 14px', width: 36 }}>
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
              </th>
              {columns.map(c => (
                <th key={c.key} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: c.right ? 'right' : 'left', borderBottom: '1px solid #e5e7eb' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>{emptyMsg}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id || i} onClick={() => toggleRow(i)} style={{ borderBottom: '1px solid #f3f4f6', background: selected.has(i) ? '#f0f9ff' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}>
                <td style={{ padding: '11px 14px' }}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
                </td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '11px 14px', fontSize: 13, textAlign: c.right ? 'right' : 'left' }}>
                    {c.key === 'amount' ? (
                      <span style={{ fontWeight: 700, color: accentColor }}>{fmt(row[c.key])}</span>
                    ) : c.key === 'category_name' ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f3f4f6', color: '#374151', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {row[c.key]}
                      </span>
                    ) : (
                      <span style={{ color: c.key === 'date' ? '#111827' : '#6b7280' }}>{row[c.key]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterBar({ filter, setFilter, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const presets = [
    { key: 'all', label: 'All Time' }, { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' }, { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 3 Months' }, { key: 'thisMonth', label: 'This Month' },
    { key: 'thisYear', label: 'This Year' }, { key: 'custom', label: 'Custom Range' },
  ];
  const btnStyle = active => ({
    padding: '7px 10px', borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 400,
    textAlign: 'left', cursor: 'pointer', border: 'none', width: '100%',
    background: active ? '#eff6ff' : 'transparent', color: active ? '#2563eb' : '#374151',
    borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
  });
  return (
    <div style={{ width: 190, flexShrink: 0, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Date Range</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {presets.map(p => <button key={p.key} onClick={() => setFilter(p.key)} style={btnStyle(filter === p.key)}>{p.label}</button>)}
      </div>
      {filter === 'custom' && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>From</p>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>To</p>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniList({ rows, loading, accentColor, emptyText }) {
  if (loading) return <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</p>;
  if (!rows.length) return <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{emptyText}</p>;
  return rows.slice(0, 5).map((r, i) => (
    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < 4 && i < rows.length - 1 ? '1px solid #f9fafb' : 'none' }}>
      <div style={{ overflow: 'hidden' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.category_name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{r.date} · {r.account_name}</p>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: accentColor, whiteSpace: 'nowrap', marginLeft: 12 }}>{fmt(r.amount)}</span>
    </div>
  ));
}

export default function AccountingFinance() {
  const [tab, setTab] = useState('dashboard');
  const [filter, setFilter] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [modal, setModal] = useState(null);
  const [modalKey, setModalKey] = useState(0);
  const openModal = (type) => { setModal(type); setModalKey(k => k + 1); };

  const [dashboard, setDashboard] = useState({ total_income: 0, total_expense: 0, net: 0 });
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingExpense, setLoadingExpense] = useState(true);
  const [ledgers, setLedgers] = useState({ income: [], expense: [] });
  const [accounts, setAccounts] = useState([]);

  const params = useMemo(() => {
    const r = filter === 'custom' ? { from: customFrom, to: customTo } : filter === 'all' ? { from: '', to: '' } : dateRange(filter);
    const p = new URLSearchParams();
    if (r.from) p.set('date_from', r.from);
    if (r.to) p.set('date_to', r.to);
    return p.toString();
  }, [filter, customFrom, customTo]);

  const loadData = useCallback(async () => {
    setLoadingDash(true); setLoadingIncome(true); setLoadingExpense(true);
    const q = params ? `?${params}` : '';
    const [d, inc, exp] = await Promise.all([
      fetch(`/api/accounting/finance-dashboard/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/income/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/expenses/${q}`).then(r => r.json()).catch(() => null),
    ]);
    if (d?.success) setDashboard(d.data); setLoadingDash(false);
    if (inc?.success) setIncomeRows(inc.data || []); setLoadingIncome(false);
    if (exp?.success) setExpenseRows(exp.data || []); setLoadingExpense(false);
  }, [params]);

  useEffect(() => {
    loadData();
    Promise.all([
      fetch('/api/accounting/ledgers/').then(r => r.json()),
      fetch('/api/accounting/accounts/').then(r => r.json()),
    ]).then(([l, a]) => {
      if (l?.success) setLedgers({
        income: l.data.filter(x => x.type === 'income').map(x => ({ value: x.id, label: x.name })),
        expense: l.data.filter(x => x.type === 'expense').map(x => ({ value: x.id, label: x.name })),
      });
      if (a?.success) setAccounts(a.data.map(x => ({ value: x.id, label: `${x.name} (${x.type})` })));
    });
  }, [loadData]);

  const tabBtn = active => ({
    padding: '9px 18px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
    border: 'none', background: 'transparent', borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    color: active ? '#111827' : '#9ca3af', transition: 'all 0.15s',
  });

  const net = dashboard.net;
  const incomeTot = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const expenseTot = expenseRows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>Finance</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Track income and expenses — every entry creates a journal automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openModal('income')} style={{ padding: '9px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', letterSpacing: 0.2 }}>
            + Add Income
          </button>
          <button onClick={() => openModal('expense')} style={{ padding: '9px 18px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 22 }}>
        {[['dashboard', 'Dashboard'], ['income', 'Income'], ['expense', 'Expenses']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tabBtn(tab === k)}>{l}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <FilterBar filter={filter} setFilter={setFilter} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Total Income" value={fmt(dashboard.total_income)} color="#16a34a" note="All credit entries" />
                <StatCard label="Total Expenses" value={fmt(dashboard.total_expense)} color="#dc2626" note="All debit entries" />
                <StatCard label="Net Balance" value={fmt(Math.abs(net))} color={net >= 0 ? '#2563eb' : '#dc2626'} note={net >= 0 ? 'Surplus' : 'Deficit'} />
              </div>

              {/* Recent Income */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent Income</h4>
                  <button onClick={() => setTab('income')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <MiniList rows={incomeRows} loading={loadingIncome} accentColor="#16a34a" emptyText="No income entries for this period." />
                </div>
              </div>

              {/* Recent Expenses */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent Expenses</h4>
                  <button onClick={() => setTab('expense')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <MiniList rows={expenseRows} loading={loadingExpense} accentColor="#dc2626" emptyText="No expense entries for this period." />
                </div>
              </div>
            </div>
          )}

          {/* INCOME */}
          {tab === 'income' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Income</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{incomeRows.length} entries · {fmt(incomeTot)}</p>
                </div>
                <button onClick={() => openModal('income')} style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  + Add Income
                </button>
              </div>
              <SelectableTable rows={incomeRows} columns={COLS} loading={loadingIncome} emptyMsg="No income entries for this period."
                accentColor="#16a34a"
                onPrint={r => printRows(r, COLS, 'Income Statement')}
                onExport={r => exportCSV(r, COLS, 'income.csv')}
              />
            </div>
          )}

          {/* EXPENSES */}
          {tab === 'expense' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Expenses</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{expenseRows.length} entries · {fmt(expenseTot)}</p>
                </div>
                <button onClick={() => openModal('expense')} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  + Add Expense
                </button>
              </div>
              <SelectableTable rows={expenseRows} columns={COLS} loading={loadingExpense} emptyMsg="No expense entries for this period."
                accentColor="#dc2626"
                onPrint={r => printRows(r, COLS, 'Expense Report')}
                onExport={r => exportCSV(r, COLS, 'expenses.csv')}
              />
            </div>
          )}
        </div>
      </div>

      {modal && (
        <FinanceEntryModal
          key={modalKey}
          type={modal}
          ledgers={modal === 'income' ? ledgers.income : ledgers.expense}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
