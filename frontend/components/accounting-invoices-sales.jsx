'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

const C = {
  green: '#059669', greenBg: '#ecfdf5', greenBorder: '#a7f3d0',
  red:   '#dc2626', redBg:   '#fef2f2', redBorder:   '#fecaca',
  blue:  '#2563eb', blueBg:  '#eff6ff', blueBorder:  '#bfdbfe',
  slate: '#64748b', slateBg: '#f8fafc', slateBorder: '#e2e8f0',
  text:  '#0f172a', muted: '#64748b', border: '#e2e8f0', surface: '#ffffff',
};

const DEPARTMENTS = [
  'Sales','Operations','HR & Admin','Marketing','Finance',
  'Logistics','Purchase','Information Technology','Production','Other',
];

const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 13, color: C.text, background: '#fff',
  outline: 'none', boxSizing: 'border-box', minHeight: 38,
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
};

/* ── Create Invoice Modal ─────────────────────────────────────── */
function CreateInvoiceModal({ onClose, onSuccess, accounts }) {
  const [form, setForm] = useState({
    type: 'sales', party_name: '', amount: '', department: '', due_date: today(), description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.party_name.trim()) return setErr('Party name is required.');
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return setErr('Enter a valid amount.');
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/accounting/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/frontend/login';
        return;
      }
      
      console.log('Invoice create response:', res.status, data);
      if (data?.success) { onSuccess(); onClose(); }
      else {
        // Handle both DRF error wrapper {error:{message,details}} and direct {message,errors} formats
        let msg = data?.message || data?.error?.message || 'Failed to create invoice.';
        const errors = data?.errors || data?.error?.details;
        if (errors && typeof errors === 'object') {
          const details = Object.entries(errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          if (details) msg += ` (${details})`;
        }
        setErr(msg);
      }
    } catch (e) { console.error('Invoice create error:', e); setErr('Network error.'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>New Sales Invoice</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Creates a receivable. Journal entry at settlement.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Party Name (Customer) *</label>
            <input style={inputStyle} placeholder="e.g. Sharma Enterprises" value={form.party_name} onChange={e => set('party_name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input style={inputStyle} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <select style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">— Select Department —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} placeholder="Optional note…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        {err && <p style={{ margin: '14px 0 0', fontSize: 13, color: C.red, fontWeight: 600 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${C.border}`, background: C.slateBg, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.text }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: '10px 24px', background: saving ? '#9ca3af' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Settle Modal ─────────────────────────────────────────────── */
function SettleModal({ invoice, accounts, onClose, onSuccess }) {
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!accountId) return setErr('Select a payment account.');
    setSaving(true); setErr('');
    try {
      const res = await fetch(`/api/accounting/invoices/${invoice.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_account: Number(accountId) }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/frontend/login';
        return;
      }
      
      if (data?.success) { onSuccess(); onClose(); }
      else {
        let msg = data?.message || data?.error?.message || 'Settlement failed.';
        const errors = data?.errors || data?.error?.details;
        if (errors && typeof errors === 'object') {
          const details = Object.entries(errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          if (details) msg += ` (${details})`;
        }
        setErr(msg);
      }
    } catch (e) { console.error('Settle error:', e); setErr('Network error.'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: C.text }}>Settle Invoice #{invoice.id}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: C.muted }}>{invoice.party_name} · {fmt(invoice.amount)}</p>
        <label style={labelStyle}>Payment Account *</label>
        <select style={{ ...inputStyle, marginBottom: 14 }} value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">— Select Account —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
        </select>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted, background: C.greenBg, padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>
          ✓ Bank Dr / Sales Income Cr — Journal entry will be created automatically.
        </p>
        {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: C.red, fontWeight: 600 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: `1px solid ${C.border}`, background: C.slateBg, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: '9px 20px', background: saving ? '#9ca3af' : C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Settling…' : 'Confirm Settle'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const s = status === 'settled'
    ? { bg: C.greenBg, color: C.green, label: '✓ Settled' }
    : { bg: '#fef3c7', color: '#b45309', label: '⏳ Pending' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

/* ── Main Component ───────────────────────────────────────────── */
export default function AccountingInvoicesSales() {
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [settling, setSettling] = useState(null);  // invoice object
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [inv, acc] = await Promise.all([
      fetch('/api/accounting/invoices?type=sales').then(r => r.json()).catch(() => null),
      fetch('/api/accounting/accounts/').then(r => r.json()).catch(() => null),
    ]);
    if (inv?.success) setInvoices(inv.data || []);
    if (acc?.success) setAccounts(acc.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    if (deptFilter)   rows = rows.filter(r => r.department === deptFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.party_name || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    return rows;
  }, [invoices, search, statusFilter, deptFilter]);

  const totalPending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);
  const totalSettled  = invoices.filter(i => i.status === 'settled').reduce((s, i) => s + Number(i.amount), 0);
  const depts = [...new Set(invoices.map(i => i.department).filter(Boolean))].sort();

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Sales Invoices</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Receivables — journal entries created only at settlement.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
          + New Invoice
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Invoices',   value: invoices.length,                color: C.text,  note: 'all time' },
          { label: 'Pending',          value: fmt(totalPending),              color: '#b45309', note: `${invoices.filter(i=>i.status==='pending').length} invoices` },
          { label: 'Settled',          value: fmt(totalSettled),              color: C.green,  note: `${invoices.filter(i=>i.status==='settled').length} invoices` },
        ].map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: -0.5 }}>{k.value}</p>
            <p style={{ margin: '5px 0 0', fontSize: 11, color: C.muted }}>{k.note}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search party or description…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 180px', minWidth: 140, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fff', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
        <div style={{ width: 1, height: 20, background: C.border }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 8px', border: 'none', borderRadius: 6, fontSize: 12, background: statusFilter ? C.blueBg : '#fff', color: statusFilter ? C.blue : C.muted, cursor: 'pointer', outline: 'none', fontWeight: statusFilter ? 600 : 400, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '6px 8px', border: 'none', borderRadius: 6, fontSize: 12, background: deptFilter ? C.blueBg : '#fff', color: deptFilter ? C.blue : C.muted, cursor: 'pointer', outline: 'none', fontWeight: deptFilter ? 600 : 400, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <option value="">Department</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || statusFilter || deptFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDeptFilter(''); }}
            style={{ padding: '4px 10px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: C.red, cursor: 'pointer' }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, fontWeight: 600 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.slateBg }}>
              {['#', 'Party Name', 'Department', 'Amount', 'Due Date', 'Status', 'Action'].map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i >= 3 ? 'right' : 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: C.muted, fontSize: 13 }}>No invoices found.</td></tr>
            ) : filtered.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: `1px solid ${C.slateBg}`, transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.slateBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 14px', fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>#{inv.id}</td>
                <td style={{ padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{inv.party_name}</p>
                  {inv.description && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{inv.description}</p>}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {inv.department ? (
                    <span style={{ padding: '2px 9px', background: C.slateBg, borderRadius: 20, fontSize: 11, fontWeight: 600, color: C.slate }}>{inv.department}</span>
                  ) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: C.green }}>{fmt(inv.amount)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: inv.due_date ? C.muted : C.muted }}>{inv.due_date || '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}><StatusBadge status={inv.status} /></td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {inv.status === 'pending' ? (
                    <button onClick={() => setSettling(inv)}
                      style={{ padding: '6px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Settle
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: C.muted }}>JE #{inv.journal_entry_id}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateInvoiceModal accounts={accounts} onClose={() => setShowCreate(false)} onSuccess={load} />}
      {settling && <SettleModal invoice={settling} accounts={accounts} onClose={() => setSettling(null)} onSuccess={load} />}
    </div>
  );
}
