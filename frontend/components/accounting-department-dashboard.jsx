'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const todayLabel = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fileDate  = () => new Date().toISOString().slice(0, 10);
const btnS = { padding: '7px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' };

// ── Design tokens (mirror accounting-finance.jsx) ────────────────────────────
const C = {
  green: '#059669', greenBg: '#ecfdf5', greenBorder: '#a7f3d0',
  red:   '#dc2626', redBg:   '#fef2f2', redBorder:   '#fecaca',
  blue:  '#2563eb', blueBg:  '#eff6ff', blueBorder:  '#bfdbfe',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  violet:'#7c3aed', violetBg:'#f5f3ff', violetBorder:'#ddd6fe',
  slate: '#64748b', slateBg: '#f8fafc', slateBorder: '#e2e8f0',
  text:  '#0f172a', muted: '#64748b', border: '#e2e8f0', surface: '#ffffff',
};


// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </p>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg || C.slateBg, color: color || C.muted }}>
      {label}
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ── Department Card ───────────────────────────────────────────────────────────
function DeptCard({ dept, maxExpense, onClick, selected }) {
  const net = dept.income - dept.expense;
  const isPos = net >= 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(dept.name)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surface,
        border: `1.5px solid ${selected ? dept.color : hovered ? '#94a3b8' : C.border}`,
        borderRadius: 14,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.18s',
        boxShadow: selected
          ? `0 0 0 3px ${dept.bg}, 0 4px 16px rgba(0,0,0,0.08)`
          : hovered
          ? '0 4px 14px rgba(0,0,0,0.09)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: dept.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {dept.icon}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{dept.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>
              {dept.income_entries + dept.expense_entries} entries
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, color: isPos ? C.green : C.red, fontWeight: 900 }}>{isPos ? '↑' : '↓'}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: isPos ? C.green : C.red }}>{fmt(Math.abs(net))}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: isPos ? C.green : C.red, background: isPos ? C.greenBg : C.redBg, padding: '1px 7px', borderRadius: 99 }}>
            {isPos ? 'Surplus' : 'Deficit'}
          </span>
        </div>
      </div>

      {/* Income / Expense split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 14 }}>
        <div style={{ paddingRight: 14, borderRight: `1px solid ${C.border}` }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Income</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.green }}>{fmt(dept.income)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: C.muted }}>{dept.income_entries} entries</p>
        </div>
        <div style={{ paddingLeft: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Expense</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.red }}>{fmt(dept.expense)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: C.muted }}>{dept.expense_entries} entries</p>
        </div>
      </div>


    </div>
  );
}

// ── Department Detail Panel ───────────────────────────────────────────────────
function DeptDetail({ dept }) {
  if (!dept) return null;
  const [sel, setSel] = useState(new Set());
  const net = dept.income - dept.expense;
  const isPos = net >= 0;
  const today = todayLabel();
  const accs = dept.top_accounts;
  const selCount = sel.size;
  const togAcc = i => { const s = new Set(sel); s.has(i) ? s.delete(i) : s.add(i); setSel(s); };
  const togAll = () => setSel(selCount === accs.length ? new Set() : new Set(accs.map((_, i) => i)));
  const target = selCount > 0 ? accs.filter((_, i) => sel.has(i)) : accs;

  const doCSV = () => {
    const header = `Department: ${dept.name},Date: ${today},,,,`;
    const summary = `Total Income: ${dept.income},Total Expense: ${dept.expense},Net: ${Math.abs(net)} ${isPos?'Surplus':'Deficit'},,, `;
    const rows = [
      'Account,Type,Date,Description,Receipt,Amount',
      ...target.map(a => `${a.name},${a.type==='income'?'Income':'Expense'},${a.date||today},"${a.description||''}",${a.receipt||''},${a.amount}`)
    ];
    const csv = [header, summary, '', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `dept_${dept.name.replace(/\s+/g,'_').toLowerCase()}_${fileDate()}.csv`;
    a.click();
  };

  const doPrint = () => window.print();

  return (
    <div id="dept-print-area" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <style>{`@media print{body *{visibility:hidden}#dept-print-area,#dept-print-area *{visibility:visible}#dept-print-area{position:absolute;left:0;top:0;width:100%}.no-dept-print{display:none!important}.hide-dept-row{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: dept.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{dept.icon}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{dept.name} Department</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>
            {dept.income_entries + dept.expense_entries} total entries &middot; Net{' '}
            <span style={{ color: isPos ? C.green : C.red, fontWeight: 700 }}>{fmt(Math.abs(net))} {isPos ? 'surplus' : 'deficit'}</span>
            <span style={{ marginLeft: 10, color: C.muted }}>· {today}</span>
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Income',  value: fmt(dept.income),   color: C.green, bg: C.greenBg },
          { label: 'Total Expense', value: fmt(dept.expense),  color: C.red,   bg: C.redBg },
          { label: 'Net Balance',   value: fmt(Math.abs(net)), color: isPos ? C.green : C.red, bg: isPos ? C.greenBg : C.redBg },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Top Accounts — Print/Export bar + checkboxes */}
      <SectionLabel>Top Accounts</SectionLabel>
      <div className="no-dept-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {selCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 20 }}>
            {selCount} row{selCount > 1 ? 's' : ''} selected
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={doPrint} style={btnS}>Print{selCount > 0 ? ` (${selCount})` : ' All'}</button>
          <button onClick={doCSV}   style={btnS}>Export CSV{selCount > 0 ? ` (${selCount})` : ''}</button>
        </div>
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th className="no-dept-print" style={{ width: 36, padding: '9px 12px', borderBottom: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={selCount === accs.length && accs.length > 0} onChange={togAll} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
              </th>
              {['Account', 'Type', 'Date', 'Description', 'Receipt', 'Amount'].map(h => (
                <th key={h} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: h === 'Amount' ? 'right' : 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accs.map((acc, i) => {
              const isSel = sel.has(i);
              const hide = selCount > 0 && !isSel ? 'hide-dept-row' : '';
              return (
                <tr key={i} className={hide}
                  onClick={() => togAcc(i)}
                  style={{ borderBottom: i < accs.length - 1 ? `1px solid #f3f4f6` : 'none', background: isSel ? C.blueBg : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? C.blueBg : 'transparent'; }}
                >
                  <td className="no-dept-print" style={{ padding: '11px 12px' }}>
                    <input type="checkbox" checked={isSel} onChange={() => togAcc(i)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: acc.type === 'income' ? C.greenBg : C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: acc.type === 'income' ? C.green : C.red, fontWeight: 900 }}>
                        {acc.type === 'income' ? '↑' : '↓'}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{acc.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge label={acc.type === 'income' ? 'Income' : 'Expense'} color={acc.type === 'income' ? C.green : C.red} bg={acc.type === 'income' ? C.greenBg : C.redBg} />
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{acc.date || today}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: C.text, maxWidth: 200 }}>{acc.description || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {acc.receipt
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, background: C.blueBg, border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6 }}>{acc.receipt}</span>
                      : <span style={{ fontSize: 12, color: C.muted }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: acc.type === 'income' ? C.green : C.red }}>{fmt(acc.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AccountingDepartmentDashboard() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [sortBy, setSortBy] = useState('expense');
  const [filterDepts, setFilterDepts] = useState(new Set()); // empty = show all
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch('/api/accounting/departments/dashboard/', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDepartments(data.data);
        }
      })
      .catch(err => console.error("Failed to load department dashboard:", err))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const maxExpense = useMemo(() => Math.max(...departments.map(d => d.expense), 0), [departments]);

  const sortedDepts = useMemo(() => {
    return [...departments]
      .filter(d => filterDepts.size === 0 || filterDepts.has(d.name))
      .sort((a, b) => {
        if (sortBy === 'expense') return b.expense - a.expense;
        if (sortBy === 'income')  return b.income - a.income;
        if (sortBy === 'name')    return a.name.localeCompare(b.name);
        return 0;
      });
  }, [departments, sortBy, filterDepts]);

  const toggleFilter = name => {
    setFilterDepts(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const totalIncome  = departments.reduce((s, d) => s + d.income, 0);
  const totalExpense = departments.reduce((s, d) => s + d.expense, 0);
  const totalNet     = totalIncome - totalExpense;

  const activeDetail = selectedDept ? departments.find(d => d.name === selectedDept) : null;

  const sortBtnStyle = active => ({
    padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 500,
    border: 'none', cursor: 'pointer',
    background: active ? C.blue : 'transparent',
    color: active ? '#fff' : C.muted,
    transition: 'all 0.14s',
  });

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading department dashboard...</div>;
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Overview KPIs ── */}
      <SectionLabel>Company-wide Overview</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 26 }}>
        {[
          { label: 'Total Income',     value: fmt(totalIncome),            color: C.green, bg: '#fff', note: `${departments.reduce((s,d)=>s+d.income_entries,0)} entries` },
          { label: 'Total Expense',    value: fmt(totalExpense),           color: C.red,   bg: '#fff', note: `${departments.reduce((s,d)=>s+d.expense_entries,0)} entries` },
          { label: 'Net Balance',      value: fmt(Math.abs(totalNet)),     color: totalNet >= 0 ? C.green : C.red, bg: '#fff', note: totalNet >= 0 ? 'Surplus' : 'Deficit' },
          { label: 'Departments',      value: departments.length,     color: C.blue,  bg: '#fff', note: 'Tracked departments' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: k.color, letterSpacing: -1, lineHeight: 1 }}>{k.value}</p>
            <p style={{ margin: '7px 0 0', fontSize: 11, color: C.muted }}>{k.note}</p>
          </div>
        ))}
      </div>

      {/* ── Department Cards ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionLabel>Department Breakdown</SectionLabel>
      </div>

      {/* Filter + Sort bar */}
      <div style={{ marginBottom: 16, padding: '10px 12px', background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 10 }}>

        {/* Row 1: dropdown + spacer + divider + sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Multi-select dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', background: '#fff', border: 'none',
                borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: filterDepts.size > 0 ? C.blue : C.muted,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                outline: dropdownOpen ? `2px solid ${C.blueBorder}` : 'none',
                transition: 'all 0.14s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                <path d="M3 5h14M6 10h8M9 15h2" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {filterDepts.size === 0 ? 'All Departments' : `${filterDepts.size} selected`}
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.4, marginLeft: 2 }}>
                <path d="M5 8l5 5 5-5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 200, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: `1px solid ${C.border}`, background: C.slateBg }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Filter Departments</span>
                  {filterDepts.size > 0 && (
                    <button onClick={() => setFilterDepts(new Set())} style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear all</button>
                  )}
                </div>
                {departments.map(dept => {
                  const checked = filterDepts.has(dept.name);
                  return (
                    <div
                      key={dept.name}
                      onClick={() => toggleFilter(dept.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                        cursor: 'pointer', background: checked ? dept.bg : 'transparent',
                        borderBottom: `1px solid ${C.slateBg}`, transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${checked ? dept.color : C.border}`,
                        background: checked ? dept.color : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}>
                        {checked && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: checked ? dept.color : C.text }}>{dept.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inline badges — shown right after dropdown in same row */}
          {[...filterDepts].map(name => {
            const meta = departments.find(d => d.name === name);
            return (
              <span key={name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                color: meta?.color || C.muted, background: meta?.bg || C.slateBg,
                padding: '3px 8px 3px 10px', borderRadius: 7, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: meta?.color || C.muted, flexShrink: 0 }} />
                {name}
                <button
                  onClick={e => { e.stopPropagation(); toggleFilter(name); }}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 11, color: meta?.color || C.muted, lineHeight: 1,
                    display: 'flex', alignItems: 'center', opacity: 0.7,
                  }}
                >✕</button>
              </span>
            );
          })}

          {/* Clear all — inline, only when filters active */}
          {filterDepts.size > 0 && (
            <button
              onClick={() => setFilterDepts(new Set())}
              style={{
                fontSize: 11, fontWeight: 600, color: C.red, background: C.redBg,
                border: `1px solid ${C.redBorder}`, borderRadius: 7,
                padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Clear all
            </button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: C.border, flexShrink: 0 }} />

          {/* Sort buttons */}
          <div style={{ display: 'flex', gap: 3, background: '#fff', borderRadius: 8, padding: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            {[['expense','By Expense'],['income','By Income'],['name','A–Z']].map(([k,l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={sortBtnStyle(sortBy === k)}>{l}</button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: C.border, flexShrink: 0 }} />

          {/* Print / Export — uses currently filtered sortedDepts */}
          <button onClick={() => window.print()} style={btnS}>Print All</button>
          <button onClick={() => {
            const today = todayLabel();
            const rows = [
              `Department Summary,Date: ${today},,`,
              'Department,Income,Expense,Net,Status',
              ...sortedDepts.map(d => `${d.name},${d.income},${d.expense},${d.income-d.expense},${d.income>=d.expense?'Surplus':'Deficit'}`)
            ].join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
            a.download = `departments_${fileDate()}.csv`;
            a.click();
          }} style={btnS}>Export CSV</button>

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {sortedDepts.length > 0 ? sortedDepts.map(dept => (
          <DeptCard
            key={dept.name}
            dept={dept}
            maxExpense={maxExpense}
            selected={selectedDept === dept.name}
            onClick={name => setSelectedDept(prev => prev === name ? null : name)}
          />
        )) : (
          <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: C.text }}>No departments selected</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Your filter returned no results. Try selecting different departments.</p>
          </div>
        )}
      </div>

      {/* ── Detail Panel (when a card is selected) ── */}
      {activeDetail && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionLabel>Department Detail</SectionLabel>
            <button
              onClick={() => setSelectedDept(null)}
              style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              ✕ Close
            </button>
          </div>
          <DeptDetail dept={activeDetail} />
        </div>
      )}


    </div>
  );
}
