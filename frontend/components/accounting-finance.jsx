'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FinanceEntryModal from './finance-entry-modal';

/* ── helpers ── */
const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const dateRange = preset => {
  const now = new Date();
  const to = today();
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === 'thisMonth') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: d.toISOString().slice(0, 10), to }; }
  if (preset === 'thisYear') { return { from: `${now.getFullYear()}-01-01`, to }; }
  return { from: '', to: '' };
};

/* ── print helper ── */
function printRows(rows, columns, title) {
  const html = `<html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;font-size:13px;padding:24px}
    h2{margin:0 0 16px}
    table{border-collapse:collapse;width:100%}
    th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb}
    .amt{text-align:right;font-weight:700}
    @media print{button{display:none}}
  </style></head><body>
    <h2>${title}</h2>
    <table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${columns.map(c => `<td class="${c.cls || ''}">${r[c.key] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p style="margin-top:16px;font-size:11px;color:#9ca3af">Printed on ${new Date().toLocaleString()}</p>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close();
}

/* ── export CSV helper ── */
function exportCSV(rows, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(r => columns.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const INCOME_COLS = [
  { key: 'date', label: 'Date' }, { key: 'category_name', label: 'Category' },
  { key: 'account_name', label: 'Account' }, { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', cls: 'amt' },
];
const EXPENSE_COLS = [
  { key: 'date', label: 'Date' }, { key: 'category_name', label: 'Category' },
  { key: 'account_name', label: 'Account' }, { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', cls: 'amt' },
];

/* ── Stat Card ── */
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px', flex: 1, minWidth: 180 }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
    </div>
  );
}

/* ── SelectableTable ── */
function SelectableTable({ rows, columns, loading, emptyMsg, onPrint, onExport, type }) {
  const [selected, setSelected] = useState(new Set());
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggleRow = i => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };
  const selectedRows = rows.filter((_, i) => selected.has(i));
  const printTarget = selectedRows.length > 0 ? selectedRows : rows;
  const accent = type === 'income' ? '#16a34a' : '#dc2626';
  const badgeBg = type === 'income' ? '#f0fdf4' : '#fef2f2';
  const badgeColor = type === 'income' ? '#16a34a' : '#dc2626';

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {selected.size > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', background: '#f3f4f6', padding: '4px 10px', borderRadius: 6 }}>
            {selected.size} selected
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => onPrint(printTarget)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
            🖨 {selected.size > 0 ? `Print (${selected.size})` : 'Print All'}
          </button>
          <button onClick={() => onExport(printTarget)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⬇ {selected.size > 0 ? `Export (${selected.size})` : 'Export CSV'}
          </button>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '10px 14px', width: 36 }}>
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
              </th>
              {columns.map(c => (
                <th key={c.key} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: c.cls === 'amt' ? 'right' : 'left' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>{emptyMsg}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id || i} onClick={() => toggleRow(i)} style={{ borderBottom: '1px solid #f3f4f6', background: selected.has(i) ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'background 0.1s' }}>
                <td style={{ padding: '12px 14px' }}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                </td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '12px 14px', fontSize: 14, color: '#374151', textAlign: c.cls === 'amt' ? 'right' : 'left' }}>
                    {c.key === 'amount' ? (
                      <span style={{ fontWeight: 700, color: accent }}>{fmt(row[c.key])}</span>
                    ) : c.key === 'category_name' ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', background: badgeBg, color: badgeColor, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{row[c.key]}</span>
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

/* ── Date Filter Sidebar ── */
function FilterBar({ filter, setFilter, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const presets = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 3 Months' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'custom', label: 'Custom Range' },
  ];
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filter by Date</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {presets.map(p => (
          <button key={p.key} onClick={() => setFilter(p.key)} style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: filter === p.key ? 700 : 500,
            textAlign: 'left', cursor: 'pointer', border: filter === p.key ? '2px solid #2563eb' : '1px solid transparent',
            background: filter === p.key ? '#eff6ff' : 'transparent', color: filter === p.key ? '#2563eb' : '#374151',
          }}>{p.label}</button>
        ))}
      </div>
      {filter === 'custom' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>From</p>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>To</p>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ MAIN COMPONENT ══ */
export default function AccountingFinance() {
  const [tab, setTab] = useState('dashboard');
  const [filter, setFilter] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [modal, setModal] = useState(null); // 'income' | 'expense'

  const [dashboard, setDashboard] = useState({ total_income: 0, total_expense: 0, net: 0 });
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingExpense, setLoadingExpense] = useState(true);

  const [ledgers, setLedgers] = useState({ income: [], expense: [] });
  const [accounts, setAccounts] = useState([]);

  // Build query string from filter
  const params = useMemo(() => {
    let r = filter === 'custom' ? { from: customFrom, to: customTo } : filter === 'all' ? { from: '', to: '' } : dateRange(filter);
    const p = new URLSearchParams();
    if (r.from) p.set('date_from', r.from);
    if (r.to) p.set('date_to', r.to);
    return p.toString();
  }, [filter, customFrom, customTo]);

  const loadData = useCallback(async () => {
    setLoadingDash(true); setLoadingIncome(true); setLoadingExpense(true);
    const q = params ? `?${params}` : '';
    const [dashRes, incRes, expRes] = await Promise.all([
      fetch(`/api/accounting/finance-dashboard/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/income/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/expenses/${q}`).then(r => r.json()).catch(() => null),
    ]);
    if (dashRes?.success) setDashboard(dashRes.data);
    setLoadingDash(false);
    if (incRes?.success) setIncomeRows(incRes.data || []);
    setLoadingIncome(false);
    if (expRes?.success) setExpenseRows(expRes.data || []);
    setLoadingExpense(false);
  }, [params]);

  useEffect(() => {
    loadData();
    Promise.all([
      fetch('/api/accounting/ledgers/').then(r => r.json()),
      fetch('/api/accounting/accounts/').then(r => r.json()),
    ]).then(([l, a]) => {
      if (l?.success) {
        setLedgers({
          income: l.data.filter(x => x.type === 'income').map(x => ({ value: x.id, label: x.name })),
          expense: l.data.filter(x => x.type === 'expense').map(x => ({ value: x.id, label: x.name })),
        });
      }
      if (a?.success) setAccounts(a.data.map(x => ({ value: x.id, label: `${x.name} (${x.type})` })));
    });
  }, [loadData]);

  const tabStyle = active => ({
    padding: '10px 20px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
    border: 'none', background: 'transparent', borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    color: active ? '#2563eb' : '#6b7280', transition: 'all 0.15s',
  });

  const net = dashboard.net;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Finance</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>Track income and expenses with full accounting integration.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setModal('income')} style={{ padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>＋ Income</button>
          <button onClick={() => setModal('expense')} style={{ padding: '9px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>＋ Expense</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20, display: 'flex' }}>
        {[['dashboard', '📊 Dashboard'], ['income', '📈 Income'], ['expense', '📉 Expenses']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tabStyle(tab === k)}>{l}</button>
        ))}
      </div>

      {/* Layout: filter sidebar + content */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <FilterBar filter={filter} setFilter={setFilter} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* DASHBOARD TAB */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Total Income" value={fmt(dashboard.total_income)} color="#16a34a" sub="Credit entries" />
                <StatCard label="Total Expenses" value={fmt(dashboard.total_expense)} color="#dc2626" sub="Debit entries" />
                <StatCard label="Net Balance" value={fmt(Math.abs(net))} color={net >= 0 ? '#2563eb' : '#dc2626'} sub={net >= 0 ? '▲ Surplus' : '▼ Deficit'} />
              </div>

              {/* Mini income preview */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Recent Income</h4>
                  <button onClick={() => setTab('income')} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {loadingIncome ? <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</p> :
                    incomeRows.slice(0, 4).length === 0 ? <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No income entries.</p> :
                    incomeRows.slice(0, 4).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.category_name}</span>
                          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{r.date} · {r.account_name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{fmt(r.amount)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Mini expense preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Recent Expenses</h4>
                  <button onClick={() => setTab('expense')} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {loadingExpense ? <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</p> :
                    expenseRows.slice(0, 4).length === 0 ? <p style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No expense entries.</p> :
                    expenseRows.slice(0, 4).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.category_name}</span>
                          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{r.date} · {r.account_name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{fmt(r.amount)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* INCOME TAB */}
          {tab === 'income' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Income</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>{incomeRows.length} entries · Total {fmt(incomeRows.reduce((s, r) => s + Number(r.amount), 0))}</p>
                </div>
                <button onClick={() => setModal('income')} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>＋ Add Income</button>
              </div>
              <SelectableTable
                rows={incomeRows} columns={INCOME_COLS} loading={loadingIncome} type="income"
                emptyMsg="No income entries for this period."
                onPrint={rows => printRows(rows, INCOME_COLS, 'Income Statement')}
                onExport={rows => exportCSV(rows, INCOME_COLS, 'income.csv')}
              />
            </div>
          )}

          {/* EXPENSE TAB */}
          {tab === 'expense' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Expenses</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>{expenseRows.length} entries · Total {fmt(expenseRows.reduce((s, r) => s + Number(r.amount), 0))}</p>
                </div>
                <button onClick={() => setModal('expense')} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>＋ Add Expense</button>
              </div>
              <SelectableTable
                rows={expenseRows} columns={EXPENSE_COLS} loading={loadingExpense} type="expense"
                emptyMsg="No expense entries for this period."
                onPrint={rows => printRows(rows, EXPENSE_COLS, 'Expense Report')}
                onExport={rows => exportCSV(rows, EXPENSE_COLS, 'expenses.csv')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <FinanceEntryModal
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
