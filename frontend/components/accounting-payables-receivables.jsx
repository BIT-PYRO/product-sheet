'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_DEPARTMENTS = [
  'Marketing', 'Customer Relation Management', 'Operations', 'Design',
  'Logistics', 'Purchase', 'Sales / Business Development', 'Finance',
  'Information Technology', 'Human Resource', 'Production', 'Services',
  'House Keeping', 'Other',
];

const S = {
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 },
};

function AddableSelect({ value, onChange, options, placeholder, disabled }) {
  const [custom, setCustom] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef(null);
  const norm = useMemo(() => options.map(o => typeof o === 'string' ? { value: o, label: o } : o), [options]);
  const all = [...norm, ...custom];
  const SENTINEL = '__add__';
  const handle = e => {
    if (e.target.value === SENTINEL) { setAdding(true); setDraft(''); setTimeout(() => ref.current?.focus(), 50); return; }
    onChange(e.target.value);
  };
  const confirm = () => {
    const t = draft.trim(); if (!t) { setAdding(false); return; }
    if (!all.find(o => o.label.toLowerCase() === t.toLowerCase())) setCustom(p => [...p, { value: t, label: t }]);
    onChange(t); setAdding(false); setDraft('');
  };
  if (adding) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') setAdding(false); }}
        placeholder="Type & press Enter…" style={{ ...S.input, flex: 1, borderColor: '#2563eb' }} autoFocus />
      <button type="button" onClick={confirm} style={{ padding: '0 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
      <button type="button" onClick={() => setAdding(false)} style={{ padding: '0 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
    </div>
  );
  return (
    <select value={value} onChange={handle} style={S.input} disabled={disabled}>
      <option value="">{placeholder || '— Select —'}</option>
      {all.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value={SENTINEL} style={{ color: '#2563eb', fontWeight: 600 }}>+ Add new…</option>
    </select>
  );
}

function printRows(rows, title) {
  const cols = [
    { key: 'party_name', label: 'Party' }, { key: 'amount', label: 'Amount' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' }, { key: 'due_date', label: 'Due Date' },
    { key: 'description', label: 'Description' },
  ];
  const html = `<html><head><title>${title}</title><style>
    body{font-family:Inter,Arial,sans-serif;font-size:13px;padding:32px;color:#111827}
    h2{margin:0 0 6px;font-size:18px}p.sub{color:#6b7280;font-size:12px;margin:0 0 20px}
    table{border-collapse:collapse;width:100%}
    th{background:#f9fafb;padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px;border-bottom:1px solid #e5e7eb}
    td{padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
    .pending{background:#fef9c3;color:#854d0e}.paid{background:#dcfce7;color:#166534}
  </style></head><body>
    <h2>${title}</h2><p class="sub">Printed on ${new Date().toLocaleString('en-IN')}</p>
    <table><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c.key === 'amount' ? fmt(r[c.key]) : c.key === 'status' ? `<span class="badge ${r[c.key]}">${r[c.key]}</span>` : (r[c.key] ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close();
}

function exportCSV(rows, filename) {
  const cols = ['party_name', 'amount', 'department', 'status', 'due_date', 'description'];
  const header = 'Party,Amount,Department,Status,Due Date,Description';
  const body = rows.map(r => cols.map(k => `"${(k === 'amount' ? Number(r[k]).toFixed(2) : (r[k] ?? '')).toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div style={{ background: bg || '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 22px', flex: 1, minWidth: 150 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: color || '#111827' }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
    </div>
  );
}

function Badge({ status }) {
  const styles = {
    pending: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' },
    paid: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  };
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, ...styles[status] }}>{status.toUpperCase()}</span>;
}


// -- Workforce Party Selector -------------------------------------
function PartySelect({ value, onChange, workforce, onAddNew }) {
  const [custom, setCustom] = useState([]);
  const allOptions = [...workforce.map(w => w.full_name), ...custom];
  const SENTINEL = '__add_new__';
  const handleChange = e => {
    if (e.target.value === SENTINEL) { onAddNew(); return; }
    onChange(e.target.value);
  };
  return (
    <select value={value} onChange={handleChange} style={S.input}>
      <option value="">— Select Party —</option>
      {allOptions.map((name, i) => <option key={i} value={name}>{name}</option>)}
      <option value={SENTINEL} style={{ color: '#2563eb', fontWeight: 700 }}>+ Add New Person-</option>
    </select>
  );
}

// -- Quick Add Party Modal ----------------------------------------
function AddPartyModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ full_name: '', phone: '', designation: '', department: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) return setError('Full name is required.');
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/workforce/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setError(data?.message || 'Failed to add.'); setSubmitting(false); return; }
      onAdded(data.data?.full_name || form.full_name);
    } catch { setError('Network error.'); setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: '28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ marginBottom: 22 }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', background: '#f0f9ff', color: '#0284c7', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Workforce</span>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Add New Person</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>This person will be added to the Workforce sheet.</p>
        </div>
        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Full Name *</label>
            <input style={S.input} placeholder="e.g. Rajesh Kumar" value={form.full_name} onChange={set('full_name')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={S.label}>Phone</label>
              <input style={S.input} placeholder="Mobile number" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label style={S.label}>Designation</label>
              <input style={S.input} placeholder="e.g. Vendor" value={form.designation} onChange={set('designation')} />
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={S.label}>Department</label>
            <input style={S.input} placeholder="e.g. Procurement" value={form.department} onChange={set('department')} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: '11px 0', background: submitting ? '#9ca3af' : '#0284c7', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15 }}>
              {submitting ? 'Adding-' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function CreateModal({ type, accounts, workforce, onClose, onSuccess, onAddParty }) {
  const [form, setForm] = useState({ party_name: '', amount: '', description: '', due_date: '', date: today(), department: '' });
  const [receipts, setReceipts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const isReceivable = type === 'receivable';
  const accent = isReceivable ? '#2563eb' : '#dc2626';

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const removeReceipt = i => setReceipts(r => r.filter((_, idx) => idx !== i));

  async function submit(e) {
    e.preventDefault();
    if (!form.party_name.trim()) return setError('Party name is required.');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return setError('Enter a valid positive amount.');
    if (!form.date) return setError('Date is required.');
    if (!form.department) return setError('Department is required.');
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/accounting/outstandings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form, amount: amt }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/frontend/login';
        return;
      }
      if (!res.ok || !data?.success) { setError(data?.message || 'Failed.'); setSubmitting(false); return; }
      // Upload receipts if any
      if (receipts.length > 0 && data.data?.id) {
        const fd = new FormData();
        receipts.forEach(f => fd.append('receipts', f));
        await fetch(`/api/accounting/outstandings/${data.data.id}/receipts/`, { method: 'POST', body: fd }).catch(() => {});
      }
      onSuccess();
    } catch { setError('Network error.'); setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, padding: '28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <span style={{ display: 'inline-block', padding: '3px 10px', background: isReceivable ? '#eff6ff' : '#fef2f2', color: accent, borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
              {isReceivable ? 'New Receivable' : 'New Payable'}
            </span>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
              {isReceivable ? 'Record Receivable' : 'Record Payable'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Creates a journal entry automatically.</p>
          </div>
          <button onClick={onClose} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>✕</button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 18 }}>{error}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Party Name *</label>
            <PartySelect value={form.party_name} onChange={v => setForm(f => ({...f, party_name: v}))} workforce={workforce} onAddNew={onAddParty} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Amount (₹) *</label>
              <input type="number" min="0.01" step="0.01" style={S.input} placeholder="0.00" value={form.amount} onChange={set('amount')} />
            </div>
            <div>
              <label style={S.label}>Date *</label>
              <input type="date" style={S.input} value={form.date} onChange={set('date')} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Department *</label>
            <AddableSelect value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} options={DEFAULT_DEPARTMENTS} placeholder="— Select Department —" disabled={submitting} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Due Date (optional)</label>
            <input type="date" style={S.input} value={form.due_date} onChange={set('due_date')} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Description</label>
            <textarea rows={2} style={{ ...S.input, resize: 'vertical' }} placeholder={isReceivable ? 'e.g. Invoice #123 for services' : 'e.g. Supplier bill for materials'} value={form.description} onChange={set('description')} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Receipts (optional)</label>
            <div onClick={() => fileRef.current?.click()} style={{ ...S.input, cursor: 'pointer', color: '#9ca3af', textAlign: 'center', border: '1px dashed #d1d5db', padding: 12 }}>
              Click to add receipts...
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={e => setReceipts(r => [...r, ...Array.from(e.target.files)])} style={{ display: 'none' }} />
            {receipts.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {receipts.map((f, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#374151' }}>
                    {f.name}
                    <button type="button" onClick={() => removeReceipt(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 0, lineHeight: 1 }}>x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: '11px 0', background: submitting ? '#9ca3af' : accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15 }}>
              {submitting ? 'Saving...' : `Save ${isReceivable ? 'Receivable' : 'Payable'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -- Addable Account Select for Settle Modal ----------------------
function AddableAccountSelect({ accounts, value, onChange }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('bank');
  const [saving, setSaving] = useState(false);
  const SENTINEL = '__add_new_account__';

  const handleChange = e => {
    if (e.target.value === SENTINEL) { setAdding(true); return; }
    onChange(e.target.value);
  };

  async function createAccount() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/accounts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success && data.data?.id) {
        onChange(String(data.data.id));
        setAdding(false); setNewName(''); setSaving(false);
        window.location.reload();
      } else {
        setSaving(false);
      }
    } catch { setSaving(false); }
  }

  if (adding) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Account name..." style={S.input} autoFocus />
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={newType} onChange={e => setNewType(e.target.value)} style={{ ...S.input, flex: 1 }}>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
          </select>
          <button type="button" onClick={createAccount} disabled={saving} style={{ padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{saving ? '...' : 'Add'}</button>
          <button type="button" onClick={() => setAdding(false)} style={{ padding: '0 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>x</button>
        </div>
      </div>
    );
  }

  return (
    <select style={S.input} value={value} onChange={handleChange}>
      <option value="">-- Select Account --</option>
      {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
      <option value={SENTINEL} style={{ color: '#2563eb', fontWeight: 700 }}>+ Add new...</option>
    </select>
  );
}

function SettleModal({ item, accounts, onClose, onSuccess }) {
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isReceivable = item.type === 'receivable';

  async function submit(e) {
    e.preventDefault();
    if (!accountId) return setError('Please select a payment account.');
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`/api/accounting/outstandings/${item.id}/settle/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_account_id: parseInt(accountId), date }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/frontend/login';
        return;
      }
      if (!res.ok || !data?.success) { setError(data?.message || 'Failed.'); setSubmitting(false); return; }
      onSuccess();
    } catch { setError('Network error.'); setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: '28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', background: '#f0fdf4', color: '#166534', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Settle Payment</span>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Mark as Paid</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
            {isReceivable ? 'Receive' : 'Pay'} <strong>{fmt(item.amount)}</strong> {isReceivable ? 'from' : 'to'} <strong>{item.party_name}</strong>
          </p>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
          <p style={{ margin: 0, color: '#475569' }}>
            <strong>Journal Entry:</strong> {isReceivable ? 'Bank Dr / Accounts Receivable Cr' : 'Accounts Payable Dr / Bank Cr'}
          </p>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 18 }}>{error}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Payment Account *</label>
            <AddableAccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Settlement Date</label>
            <input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: '11px 0', background: submitting ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15 }}>
              {submitting ? 'Processing…' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OutstandingTable({ rows, loading, onSettle, selected, setSelected }) {
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggleRow = i => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '10px 14px', width: 36 }}>
              <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
            </th>
            {['Party', 'Amount', 'Department', 'Due Date', 'Description', 'Status', 'Action'].map(h => (
              <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>No records found.</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id} onClick={() => toggleRow(i)} style={{ borderBottom: '1px solid #f3f4f6', background: selected.has(i) ? '#f0f9ff' : 'transparent', cursor: 'pointer' }}>
              <td style={{ padding: '11px 14px' }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer' }} />
              </td>
              <td style={{ padding: '11px 14px', fontWeight: 600, color: '#111827', fontSize: 13 }}>{row.party_name}</td>
              <td style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: row.type === 'receivable' ? '#2563eb' : '#dc2626', fontSize: 13 }}>{fmt(row.amount)}</td>
              <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151', fontWeight: 600 }}>
                {row.department ? (
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f3f4f6', borderRadius: 20, fontSize: 11 }}>
                    {row.department}
                  </span>
                ) : '—'}
              </td>
              <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{row.due_date || '—'}</td>
              <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280', maxWidth: 200 }}><span style={{ overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description || '—'}</span></td>
              <td style={{ padding: '11px 14px' }}><Badge status={row.status} /></td>
              <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                {row.status === 'pending' ? (
                  <button onClick={() => onSettle(row)} style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Settle
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ {row.type === 'receivable' ? 'Received' : 'Paid'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AccountingPayablesReceivables({ embedded = false }) {
  const [tab, setTab] = useState('receivables');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null);
  const [workforce, setWorkforce] = useState([]);
  const [showAddParty, setShowAddParty] = useState(false); // 'receivable' | 'payable' | {settle: item}
  const [selected, setSelected] = useState(new Set());

  // Inline filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const type = tab === 'receivables' ? 'receivable' : 'payable';
  const accentColor = tab === 'receivables' ? '#2563eb' : '#dc2626';

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [r, dash, accs, wf] = await Promise.all([
      fetch(`/api/accounting/outstandings/?type=${type}`).then(r => r.json()).catch(() => null),
      fetch('/api/accounting/outstandings/dashboard/').then(r => r.json()).catch(() => null),
      fetch('/api/accounting/accounts/').then(r => r.json()).catch(() => null),
      fetch('/api/workforce/?active=true').then(r => r.json()).catch(() => null),
    ]);
    if (r?.success) setRows(r.data || []);
    if (dash?.success) setDashboard(dash.data);
    if (accs?.success) setAccounts(accs.data || []);
    if (wf?.success) setWorkforce(wf.data?.results || wf.data || []);
    setLoading(false);
    setSelected(new Set());
  }, [type]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    let r = statusFilter === 'all' ? rows : rows.filter(x => x.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => (x.party_name || '').toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q));
    }
    if (deptFilter) {
      r = r.filter(x => (x.department || '') === deptFilter);
    }
    return r;
  }, [rows, statusFilter, search, deptFilter]);

  const availableDepts = useMemo(() => {
    const base = statusFilter === 'all' ? rows : rows.filter(x => x.status === statusFilter);
    return [...new Set(base.map(r => r.department).filter(Boolean))].sort();
  }, [rows, statusFilter]);

  const target = selected.size > 0 ? filtered.filter((_, i) => selected.has(i)) : filtered;
  const pendingTotal = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
  const paidTotal = filtered.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  const btn = { padding: '7px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' };
  const tabBtn = k => ({
    padding: '9px 18px', fontSize: 13, fontWeight: tab === k ? 700 : 500, cursor: 'pointer',
    border: 'none', background: 'transparent', borderBottom: tab === k ? `2px solid ${tab === 'receivables' ? '#2563eb' : '#dc2626'}` : '2px solid transparent',
    color: tab === k ? (tab === 'receivables' ? '#2563eb' : '#dc2626') : '#9ca3af', transition: 'all 0.15s',
  });

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>Payables & Receivables</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Track outstanding amounts — every entry creates a journal automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModal('receivable')} style={{ padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Receivable
          </button>
          <button onClick={() => setModal('payable')} style={{ padding: '9px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Payable
          </button>
        </div>
      </div>




      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button style={tabBtn('receivables')} onClick={() => { setTab('receivables'); setStatusFilter('all'); }}>Receivables</button>
        <button style={tabBtn('payables')} onClick={() => { setTab('payables'); setStatusFilter('all'); }}>Payables</button>
      </div>

      {/* Sub-summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'pending', 'paid'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderColor: statusFilter === s ? accentColor : '#e5e7eb', background: statusFilter === s ? accentColor : '#fff', color: statusFilter === s ? '#fff' : '#6b7280' }}>
              {s === 'paid' && tab === 'receivables' ? 'Received' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 20 }}>
              {selected.size} selected
            </span>
          )}
          <button onClick={() => printRows(target, tab === 'receivables' ? 'Receivables Report' : 'Payables Report')} style={btn}>
            Print{selected.size > 0 ? ` (${selected.size})` : ' All'}
          </button>
          <button onClick={() => exportCSV(target, tab === 'receivables' ? 'receivables.csv' : 'payables.csv')} style={btn}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
        <span><strong style={{ color: '#111827' }}>{filtered.length}</strong> records</span>
        <span>Pending: <strong style={{ color: accentColor }}>{fmt(pendingTotal)}</strong></span>
        <span>Settled: <strong style={{ color: '#16a34a' }}>{fmt(paidTotal)}</strong></span>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Search party or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 140px', minWidth: 120, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fff', color: '#111827', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
        />

        <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />

        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '6px 8px', border: 'none', borderRadius: 6, fontSize: 12, background: deptFilter ? (tab === 'receivables' ? '#eff6ff' : '#fef2f2') : '#fff', color: deptFilter ? (tab === 'receivables' ? '#2563eb' : '#dc2626') : '#6b7280', cursor: 'pointer', outline: 'none', fontWeight: deptFilter ? 600 : 400, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
        >
          <option value="">Department</option>
          {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {(search || deptFilter) && (
          <>
            <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />
            <button
              onClick={() => { setSearch(''); setDeptFilter(''); }}
              style={{ padding: '4px 8px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#9ca3af', cursor: 'pointer', letterSpacing: 0.2 }}
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <OutstandingTable
        rows={filtered}
        loading={loading}
        onSettle={item => setModal({ settle: item })}
        selected={selected}
        setSelected={setSelected}
      />

      {/* Modals */}
      {(modal === 'receivable' || modal === 'payable') && (
        <CreateModal
          type={modal}
          accounts={accounts}
          workforce={workforce}
          onAddParty={() => setShowAddParty(true)}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); loadAll(); }}
        />
      )}
      {showAddParty && (
        <AddPartyModal
          onClose={() => setShowAddParty(false)}
          onAdded={name => {
            setWorkforce(w => [...w, { full_name: name }]);
            setShowAddParty(false);
          }}
        />
      )}
      {modal?.settle && (
        <SettleModal
          item={modal.settle}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); loadAll(); }}
        />
      )}
    </div>
  );
}





