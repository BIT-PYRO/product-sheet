'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import FinanceEntryModal from './finance-entry-modal';
import AccountingPayablesReceivables from './accounting-payables-receivables';
import AccountingDepartmentDashboard from './accounting-department-dashboard';
import AccountingInvoices from './accounting-invoices';
import AccountingSettlements from './accounting-settlements';
import BankingAccounts from './banking-accounts';
import BankingStatements from './banking-statements';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

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

function MultiSelectDropdown({ label, options, selected, onChange, activeColor, activeBgColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handleClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 12, background: selected.length ? activeBgColor : '#fff', color: selected.length ? activeColor : C.muted, cursor: 'pointer', outline: 'none', fontWeight: selected.length ? 600 : 400, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {label} {selected.length > 0 && `(${selected.length})`}
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 180, maxHeight: 250, overflowY: 'auto', padding: 6 }}>
          {options.length === 0 ? <div style={{ padding: '8px 12px', fontSize: 12, color: C.muted }}>No options</div> : null}
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = C.slateBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} style={{ cursor: 'pointer' }} />
              <span style={{ color: C.text }}>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function exportCSV(rows, columns, filename) {
  const header = 'S.No,' + columns.map(c => c.label).join(',');
  const body = rows.map((r, i) => '"' + (i+1) + '",' + columns.map(c => `"${(c.key === 'amount' ? Number(r[c.key]).toFixed(2) : (r[c.key] ?? '')).toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const COLS = [
  { key: 'date', label: 'Date' },
  { key: 'department', label: 'Department' },
  { key: 'account_name', label: 'Account' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', right: true },
];

// Design tokens
const C = {
  green: '#059669', greenBg: '#ecfdf5', greenBorder: '#a7f3d0',
  red:   '#dc2626', redBg:   '#fef2f2', redBorder:   '#fecaca',
  blue:  '#2563eb', blueBg:  '#eff6ff', blueBorder:  '#bfdbfe',
  slate: '#64748b', slateBg: '#f8fafc', slateBorder: '#e2e8f0',
  text:  '#0f172a', muted: '#64748b', border: '#e2e8f0', surface: '#ffffff',
};

function SectionLabel({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </p>
  );
}

function StatCard({ label, value, color, bg, note, icon }) {
  return (
    <div style={{ background: bg || C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '18px 20px', flex: 1, minWidth: 155, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
        {icon && <span style={{ fontSize: 16, opacity: 0.6 }}>{icon}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color, letterSpacing: -0.5, lineHeight: 1 }}>{value}</p>
      {note && <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{note}</p>}
    </div>
  );
}

function SelectableTable({ rows, columns, loading, emptyMsg, exportName, accentColor }) {
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
          <button onClick={() => window.print()} style={btn}>
            Print{selected.size > 0 ? ` (${selected.size})` : ' All'}
          </button>
          <button onClick={() => exportCSV(target, columns, exportName || 'export.csv')} style={btn}>
            Export CSV{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      <div className="print-area" style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th className="no-print" style={{ padding: '10px 14px', width: 36 }}>
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
              </th>
              <th className="print-only" style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid #e5e7eb', display: 'none' }}>S.No</th>
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
            ) : rows.map((row, i) => {
              const isSelected = selected.has(i);
              const hideInPrintClass = selected.size > 0 && !isSelected ? 'hide-in-print' : '';

              return (
              <tr key={row.id || i} className={hideInPrintClass} onClick={() => toggleRow(i)} style={{ borderBottom: '1px solid #f3f4f6', background: isSelected ? '#f0f9ff' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}>
                <td className="no-print" style={{ padding: '11px 14px' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
                </td>
                <td className="print-only" style={{ padding: '11px 14px', fontSize: 13, display: 'none' }}>{i + 1}</td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '11px 14px', fontSize: 13, textAlign: c.right ? 'right' : 'left' }}>
                    {c.key === 'amount' ? (
                      <span style={{ fontWeight: 700, color: accentColor }}>{fmt(row[c.key])}</span>
                    ) : c.key === 'department' ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f3f4f6', color: '#374151', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {row[c.key] || '—'}
                      </span>
                    ) : (
                      <span style={{ color: c.key === 'date' ? '#111827' : '#6b7280' }}>{row[c.key]}</span>
                    )}
                  </td>
                ))}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatePickerInput({ value, onChange }) {
  const date = value ? parseISO(value) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button style={{ width: '100%', padding: '7px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box', outline: 'none', background: '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: value ? C.text : C.muted, cursor: 'pointer' }}>
          {isValid(date) ? format(date, 'PPP') : 'Pick a date'}
          <CalendarIcon size={14} style={{ opacity: 0.5 }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          fromYear={2015}
          toYear={2050}
          classNames={{
            caption_label: 'hidden',
            caption_dropdowns: 'flex justify-center gap-2 w-full',
            dropdown: 'p-1 bg-slate-50 border border-slate-200 rounded-md text-sm cursor-pointer hover:bg-slate-100',
            vhidden: 'hidden',
          }}
          onSelect={(d) => {
            if (d) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              onChange(`${year}-${month}-${day}`);
            } else {
              onChange('');
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
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
    padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 400,
    textAlign: 'left', cursor: 'pointer', border: 'none', width: '100%',
    background: active ? C.blueBg : 'transparent',
    color: active ? C.blue : C.muted,
    transition: 'all 0.12s',
  });
  return (
    <div style={{ width: 180, flexShrink: 0, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Date Range</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {presets.map(p => <button key={p.key} onClick={() => setFilter(p.key)} style={btnStyle(filter === p.key)}>{p.label}</button>)}
      </div>
      {filter === 'custom' && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>From</p>
            <DatePickerInput value={customFrom} onChange={setCustomFrom} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>To</p>
            <DatePickerInput value={customTo} onChange={setCustomTo} />
          </div>
        </div>
      )}
    </div>
  );
}

function SortBar({ options, current, onChange, activeColor = C.blue }) {
  const sortBtnStyle = active => ({
    padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 500,
    border: 'none', cursor: 'pointer',
    background: active ? activeColor : 'transparent',
    color: active ? '#fff' : C.muted,
    transition: 'all 0.14s',
  });
  return (
    <div style={{ display: 'flex', gap: 3, background: '#fff', borderRadius: 8, padding: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={sortBtnStyle(current === k)}>{l}</button>
      ))}
    </div>
  );
}

function MiniList({ rows, loading, accentColor, emptyText }) {
  if (loading) return <p style={{ padding: '20px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading...</p>;
  if (!rows.length) return <p style={{ padding: '20px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>{emptyText}</p>;
  return rows.slice(0, 5).map((r, i) => (
    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: i < Math.min(4, rows.length - 1) ? `1px solid ${C.slateBg}` : 'none' }}>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', padding: '2px 8px', background: C.slateBg, color: C.muted, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.department || '—'}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{r.date}</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.account_name}{r.description ? ` — ${r.description}` : ''}</p>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: accentColor, whiteSpace: 'nowrap', marginLeft: 16 }}>{fmt(r.amount)}</span>
    </div>
  ));
}

export default function AccountingFinance() {
  const [tab, setTab] = useState('dashboard');
  const [tabRefreshKey, setTabRefreshKey] = useState(0);
  const switchTab = (k) => { setTab(k); setTabRefreshKey(n => n + 1); };
  const [filter, setFilter] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [modal, setModal] = useState(null);
  const [modalKey, setModalKey] = useState(0);
  const openModal = (type) => { setModal(type); setModalKey(k => k + 1); };

  // Income inline filters
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeDeptFilter, setIncomeDeptFilter] = useState([]);
  const [incomeAccountFilter, setIncomeAccountFilter] = useState([]);
  const [incomeSortBy, setIncomeSortBy] = useState('date_desc');

  // Expense inline filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseDeptFilter, setExpenseDeptFilter] = useState([]);
  const [expenseAccountFilter, setExpenseAccountFilter] = useState([]);
  const [expenseSortBy, setExpenseSortBy] = useState('date_desc');

  const [dashboard, setDashboard] = useState({ total_income: 0, total_expense: 0, net: 0 });
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingExpense, setLoadingExpense] = useState(true);
  const [ledgers, setLedgers] = useState({ income: [], expense: [] });
  const [accounts, setAccounts] = useState([]);
  const [outstandingDash, setOutstandingDash] = useState(null);

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
    const [d, inc, exp, outstanding] = await Promise.all([
      fetch(`/api/accounting/finance-dashboard/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/income/${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/accounting/expenses/${q}`).then(r => r.json()).catch(() => null),
      fetch('/api/accounting/outstandings/dashboard/').then(r => r.json()).catch(() => null),
    ]);
    if (d?.success) setDashboard(d.data); setLoadingDash(false);
    if (inc?.success) setIncomeRows(inc.data || []); setLoadingIncome(false);
    if (exp?.success) setExpenseRows(exp.data || []); setLoadingExpense(false);
    if (outstanding?.success) setOutstandingDash(outstanding.data);
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
    border: 'none', background: 'transparent',
    borderBottom: active ? `2px solid ${C.blue}` : '2px solid transparent',
    color: active ? C.blue : C.muted, transition: 'all 0.15s',
  });

  const net = dashboard.net;

  // Derived income list after inline filters
  const filteredIncomeRows = useMemo(() => {
    let rows = incomeRows;
    if (incomeSearch.trim()) {
      const q = incomeSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.account_name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
      );
    }
    if (incomeDeptFilter.length > 0) {
      rows = rows.filter(r => incomeDeptFilter.includes(r.department || 'None'));
    }
    if (incomeAccountFilter.length > 0) {
      rows = rows.filter(r => incomeAccountFilter.includes(r.account_name || 'None'));
    }
    rows.sort((a, b) => {
      if (incomeSortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (incomeSortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (incomeSortBy === 'amount_high') return b.amount - a.amount;
      if (incomeSortBy === 'amount_low') return a.amount - b.amount;
      return 0;
    });
    return rows;
  }, [incomeRows, incomeSearch, incomeDeptFilter, incomeAccountFilter, incomeSortBy]);

  // Unique department / account values for dropdowns
  const incomeDepts = useMemo(() => [...new Set(incomeRows.map(r => r.department || 'None'))].sort(), [incomeRows]);
  const incomeAccounts = useMemo(() => [...new Set(incomeRows.map(r => r.account_name || 'None'))].sort(), [incomeRows]);
  const incomeFiltersActive = incomeSearch || incomeDeptFilter.length > 0 || incomeAccountFilter.length > 0;

  // Derived expense list after inline filters
  const filteredExpenseRows = useMemo(() => {
    let rows = expenseRows;
    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.account_name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
      );
    }
    if (expenseDeptFilter.length > 0) {
      rows = rows.filter(r => expenseDeptFilter.includes(r.department || 'None'));
    }
    if (expenseAccountFilter.length > 0) {
      rows = rows.filter(r => expenseAccountFilter.includes(r.account_name || 'None'));
    }
    rows.sort((a, b) => {
      if (expenseSortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (expenseSortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (expenseSortBy === 'amount_high') return b.amount - a.amount;
      if (expenseSortBy === 'amount_low') return a.amount - b.amount;
      return 0;
    });
    return rows;
  }, [expenseRows, expenseSearch, expenseDeptFilter, expenseAccountFilter, expenseSortBy]);

  // Unique department / account values for Expense dropdowns
  const expenseDepts = useMemo(() => [...new Set(expenseRows.map(r => r.department || 'None'))].sort(), [expenseRows]);
  const expenseAccounts = useMemo(() => [...new Set(expenseRows.map(r => r.account_name || 'None'))].sort(), [expenseRows]);
  const expenseFiltersActive = expenseSearch || expenseDeptFilter.length > 0 || expenseAccountFilter.length > 0;

  const incomeTot = filteredIncomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const expenseTot = expenseRows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @media print { 
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: table-cell !important; }
          .hide-in-print { display: none !important; }
        }
      `}</style>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>Finance</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Track income and expenses — every entry creates a journal automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'dashboard' && (
            <>
              <button onClick={() => openModal('income')} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                + Add Income
              </button>
              <button onClick={() => openModal('expense')} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                + Add Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 22 }}>
        {[['dashboard', 'Dashboard'], ['income', 'Income'], ['expense', 'Expenses'], ['payables', 'Payables & Receivables'], ['settlements', 'Settlements'], ['dept', 'Department Dashboard'], ['invoices', 'Invoices'], ['banking', 'Banking']].map(([k, l]) => (
          <button key={k} onClick={() => switchTab(k)} style={tabBtn(tab === k)}>{l}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="no-print"><FilterBar filter={filter} setFilter={setFilter} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} /></div>

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div>

              {/* Row 1: Overview — uniform white cards */}
              <SectionLabel>Overview</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Income',   value: fmt(dashboard.total_income),  note: `${incomeRows.length} entries`,  color: C.green, tab: 'income' },
                  { label: 'Total Expenses', value: fmt(dashboard.total_expense), note: `${expenseRows.length} entries`, color: C.red,   tab: 'expense' },
                ].map((item, i) => (
                  <div key={i}
                    onClick={() => setTab(item.tab)}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                  >
                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: item.color, letterSpacing: -1, lineHeight: 1 }}>{item.value}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: C.muted }}>{item.note}</p>
                  </div>
                ))}
                {/* Net Balance — black amount with arrow indicator */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Net Balance</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, lineHeight: 1, color: net >= 0 ? C.green : C.red, fontWeight: 900 }}>{net >= 0 ? '↑' : '↓'}</span>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -1, lineHeight: 1 }}>{fmt(Math.abs(net))}</p>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: net >= 0 ? C.green : C.red, fontWeight: 600 }}>{net >= 0 ? 'Surplus' : 'Deficit'}</p>
                </div>
              </div>

              {/* Row 2: Account-wise — neutral cards, only amounts colored */}
              {dashboard.account_breakdown?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <SectionLabel>Account-wise Summary</SectionLabel>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {dashboard.account_breakdown.map((acc, i) => {
                      const isPos = acc.net >= 0;
                      return (
                        <div key={i}
                          onClick={() => setTab('income')}
                          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', flex: 1, minWidth: 165, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{acc.account_name}</p>
                              <span style={{ display: 'inline-block', marginTop: 4, padding: '1px 8px', background: C.slateBg, borderRadius: 20, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{acc.account_type}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 13, color: isPos ? C.green : C.red, fontWeight: 900 }}>{isPos ? '↑' : '↓'}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmt(Math.abs(acc.net))}</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${C.border}`, paddingTop: 12, gap: 0 }}>
                            <div style={{ paddingRight: 14, borderRight: `1px solid ${C.border}` }}>
                              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Income</p>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.green }}>{fmt(acc.income_total)}</p>
                            </div>
                            <div style={{ paddingLeft: 14 }}>
                              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Expense</p>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.red }}>{fmt(acc.expense_total)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 3: P&R — order: Rec Pending | Pay Pending | Rec Settled | Pay Settled */}
              {outstandingDash && (
                <div style={{ marginBottom: 24 }}>
                  <SectionLabel>Payables &amp; Receivables</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                    {[
                      { label: 'Receivable Pending', val: outstandingDash.receivable_pending, amtColor: C.blue  },
                      { label: 'Payable Pending',    val: outstandingDash.payable_pending,    amtColor: C.red   },
                      { label: 'Receivable Settled', val: outstandingDash.receivable_paid,    amtColor: C.green },
                      { label: 'Payable Settled',    val: outstandingDash.payable_paid,       amtColor: C.slate },
                    ].map((item, i) => (
                      <div key={i}
                        onClick={() => setTab('payables')}
                        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                      >
                        <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>{fmt(item.val?.total || 0)}</p>
                        <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{item.val?.count || 0} {item.val?.count === 1 ? 'entry' : 'entries'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 4+5: Recent Income & Expenses side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Recent Income</p>
                    <button onClick={() => setTab('income')} style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                  </div>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <MiniList rows={incomeRows} loading={loadingIncome} accentColor={C.green} emptyText="No income this period" />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Recent Expenses</p>
                    <button onClick={() => setTab('expense')} style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                  </div>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <MiniList rows={expenseRows} loading={loadingExpense} accentColor={C.red} emptyText="No expenses this period" />
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* INCOME */}
          {tab === 'income' && (
            <div>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Income</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    {filteredIncomeRows.length}{filteredIncomeRows.length !== incomeRows.length ? ` of ${incomeRows.length}` : ''} entries · {fmt(incomeTot)}
                    {incomeFiltersActive && <span style={{ marginLeft: 6, color: C.blue, fontWeight: 600 }}>· filtered</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="no-print">
                    <SortBar
                      options={[['date_desc', 'Newest'], ['date_asc', 'Oldest'], ['amount_high', 'Amount: High to Low'], ['amount_low', 'Amount: Low to High']]}
                      current={incomeSortBy}
                      onChange={setIncomeSortBy}
                      activeColor={C.blue}
                    />
                  </div>
                  <button onClick={() => openModal('income')} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    + Add Income
                  </button>
                </div>
              </div>

              {/* Inline filter bar */}
              <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: C.slateBg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <input
                  type="text"
                  placeholder="Search…"
                  value={incomeSearch}
                  onChange={e => setIncomeSearch(e.target.value)}
                  style={{ flex: '1 1 140px', minWidth: 120, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fff', color: C.text, outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                />

                <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

                <MultiSelectDropdown label="Department" options={incomeDepts} selected={incomeDeptFilter} onChange={setIncomeDeptFilter} activeColor={C.blue} activeBgColor={C.blueBg} />
                <MultiSelectDropdown label="Account" options={incomeAccounts} selected={incomeAccountFilter} onChange={setIncomeAccountFilter} activeColor={C.blue} activeBgColor={C.blueBg} />

                {incomeFiltersActive && (
                  <>
                    <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
                    <button
                      onClick={() => { setIncomeSearch(''); setIncomeDeptFilter([]); setIncomeAccountFilter([]); }}
                      style={{ padding: '4px 8px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: C.muted, cursor: 'pointer', letterSpacing: 0.2 }}
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>

              <SelectableTable rows={filteredIncomeRows} columns={COLS} loading={loadingIncome} emptyMsg="No income entries match your filters."
                accentColor="#16a34a" exportName="income.csv"
              />
            </div>
          )}

          {/* EXPENSES */}
          {tab === 'expense' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Expenses</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{filteredExpenseRows.length} entries · {fmt(filteredExpenseRows.reduce((a, r) => a + Number(r.amount), 0))}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="no-print">
                    <SortBar
                      options={[['date_desc', 'Newest'], ['date_asc', 'Oldest'], ['amount_high', 'Amount: High to Low'], ['amount_low', 'Amount: Low to High']]}
                      current={expenseSortBy}
                      onChange={setExpenseSortBy}
                      activeColor={C.blue}
                    />
                  </div>
                  <button onClick={() => openModal('expense')} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    + Add Expense
                  </button>
                </div>
              </div>

              {/* Expense Filter Bar */}
              <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: C.slateBg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <input
                  type="text"
                  placeholder="Search…"
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  style={{ flex: '1 1 140px', minWidth: 120, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fff', color: C.text, outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                />

                <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

                <MultiSelectDropdown label="Department" options={expenseDepts} selected={expenseDeptFilter} onChange={setExpenseDeptFilter} activeColor={C.red} activeBgColor={C.redBg} />
                <MultiSelectDropdown label="Account" options={expenseAccounts} selected={expenseAccountFilter} onChange={setExpenseAccountFilter} activeColor={C.red} activeBgColor={C.redBg} />

                {expenseFiltersActive && (
                  <>
                    <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
                    <button
                      onClick={() => { setExpenseSearch(''); setExpenseDeptFilter([]); setExpenseAccountFilter([]); }}
                      style={{ padding: '4px 8px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: C.muted, cursor: 'pointer', letterSpacing: 0.2 }}
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>

              <SelectableTable rows={filteredExpenseRows} columns={COLS} loading={loadingExpense} emptyMsg="No expense entries match your filters."
                accentColor="#dc2626" exportName="expenses.csv"
              />
            </div>
          )}

          {/* PAYABLES & RECEIVABLES */}
          {tab === 'payables' && <AccountingPayablesReceivables embedded onRefresh={loadData} dateParams={params} />}

          {/* DEPARTMENT DASHBOARD */}
          {tab === 'dept' && <AccountingDepartmentDashboard dateParams={params} />}

          {/* INVOICES (Sales Invoices + Purchase Bills sub-tabs) */}
          {tab === 'invoices' && <AccountingInvoices key={`inv-${tabRefreshKey}`} onRefresh={loadData} dateParams={params} />}

          {/* BANKING */}
          {tab === 'banking' && (
            <div className="space-y-6">
              <BankingAccounts dateParams={params} />
              <hr className="border-soft-border" />
              <div>
                <h3 className="text-base font-semibold text-midnight-ink mb-3">Imported Transactions</h3>
                <BankingStatements dateParams={params} />
              </div>
            </div>
          )}

          {/* SETTLEMENTS */}
          {tab === 'settlements' && <AccountingSettlements dateParams={params} />}
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
