'use client';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ReceiptsBadge } from './receipts-viewer';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => { if (!d) return '—'; const [y,m,dy] = String(d).substring(0,10).split('-'); return `${dy}-${m}-${y}`; };

const C = {
  green: '#059669', greenBg: '#ecfdf5', greenBorder: '#a7f3d0',
  red:   '#dc2626', redBg:   '#fef2f2', redBorder:   '#fecaca',
  blue:  '#2563eb', blueBg:  '#eff6ff', blueBorder:  '#bfdbfe',
  slate: '#64748b', slateBg: '#f8fafc', slateBorder: '#e2e8f0',
  text:  '#0f172a', muted: '#64748b', border: '#e2e8f0', surface: '#ffffff',
};

const DEPARTMENTS = [
  'Marketing', 'Customer Relation Management', 'Operations', 'Design',
  'Logistics', 'Purchase', 'Sales / Business Development', 'Finance',
  'Information Technology', 'Human Resource', 'Production', 'Services',
  'House Keeping', 'Other'
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

/* ── Custom Party Select ──────────────────────────────────────── */
function AddableSelect({ value, onChange, options, placeholder, disabled }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [custom, setCustom] = useState([]);
  const ref = useRef(null);

  const all = [...options, ...custom];
  const SENTINEL = '__add__';

  const handle = e => {
    if (e.target.value === SENTINEL) { setAdding(true); setDraft(''); setTimeout(() => ref.current?.focus(), 50); return; }
    onChange(e.target.value);
  };

  const confirm = () => {
    const t = draft.trim();
    if (!t) { setAdding(false); return; }
    if (!all.includes(t)) setCustom(p => [...p, t]);
    onChange(t); setAdding(false); setDraft('');
  };

  if (adding) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') setAdding(false); }}
        placeholder="Type & press Enter…" style={{ ...inputStyle, flex: 1, borderColor: C.blue }} autoFocus />
      <button type="button" onClick={confirm} style={{ padding: '0 10px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
      <button type="button" onClick={() => setAdding(false)} style={{ padding: '0 8px', background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.muted }}>✕</button>
    </div>
  );

  return (
    <select value={value} onChange={handle} style={inputStyle} disabled={disabled}>
      <option value="">{placeholder || '— Select —'}</option>
      {all.map(o => <option key={o} value={o}>{o}</option>)}
      <option value={SENTINEL} style={{ color: C.blue, fontWeight: 600 }}>+ Add new…</option>
    </select>
  );
}

/* ── Custom Party Select ──────────────────────────────────────── */
function AddablePartySelect({ value, onChange, options, placeholder, disabled }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [custom, setCustom] = useState([]);
  const ref = useRef(null);

  const all = [...options, ...custom];
  const SENTINEL = '__add__';

  const handle = e => {
    if (e.target.value === SENTINEL) { setAdding(true); setDraft(''); setTimeout(() => ref.current?.focus(), 50); return; }
    onChange(e.target.value);
  };

  const confirm = () => {
    const t = draft.trim();
    if (!t) { setAdding(false); return; }
    if (!all.includes(t)) setCustom(p => [...p, t]);
    onChange(t); setAdding(false); setDraft('');
  };

  if (adding) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') setAdding(false); }}
        placeholder="Type & press Enter…" style={{ ...inputStyle, flex: 1, borderColor: C.blue }} autoFocus />
      <button type="button" onClick={confirm} style={{ padding: '0 10px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
      <button type="button" onClick={() => setAdding(false)} style={{ padding: '0 8px', background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.muted }}>✕</button>
    </div>
  );

  return (
    <select value={value} onChange={handle} style={inputStyle} disabled={disabled}>
      <option value="">{placeholder || '— Select Party —'}</option>
      {all.map(o => <option key={o} value={o}>{o}</option>)}
      <option value={SENTINEL} style={{ color: C.blue, fontWeight: 600 }}>+ Add new…</option>
    </select>
  );
}

/* ── Create Invoice Modal ─────────────────────────────────────── */
function CreateInvoiceModal({ onClose, onSuccess, accounts }) {
  const [form, setForm] = useState({
    type: 'sales', party_name: '', amount: '', department: '', due_date: today(), description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [receipts, setReceipts] = useState([]);
  const fileRef = useRef(null);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([
      fetch('/api/customers?limit=100').then(r => r.json()).catch(() => null),
      fetch('/api/workforce?limit=100').then(r => r.json()).catch(() => null)
    ]).then(([custData, wfData]) => {
      const parties = new Set();
      if (custData?.success) {
        const arr = Array.isArray(custData.data) ? custData.data : (Array.isArray(custData.data?.results) ? custData.data.results : []);
        arr.forEach(c => c.company_name && parties.add(c.company_name));
      }
      if (wfData?.success) {
        const arr = Array.isArray(wfData.data) ? wfData.data : (Array.isArray(wfData.data?.results) ? wfData.data.results : []);
        arr.forEach(w => w.full_name && parties.add(w.full_name));
      }
      setPartySuggestions([...parties].sort());
    });
  }, []);

  const handleAmountChange = e => {
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    let formatted = parts[0];
    if (formatted.length > 3) {
      formatted = formatted.substring(0, formatted.length - 3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + formatted.substring(formatted.length - 3);
    }
    if (parts.length > 1) formatted += '.' + parts[1];
    set('amount', formatted);
  };

  const submit = async () => {
    if (!form.party_name.trim()) return setErr('Party name is required.');
    const rawAmount = parseFloat(String(form.amount).replace(/,/g, ''));
    if (form.amount === '' || isNaN(rawAmount) || rawAmount < 0) return setErr('Enter a valid amount (0 or greater).');
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/accounting/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: rawAmount }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/frontend/login';
        return;
      }
      
      console.log('Invoice create response:', res.status, data);
      if (data?.success) {
        // Upload receipts if any and if outstanding was created
        const outstandingId = data.data?.outstanding_id;
        if (receipts.length > 0 && outstandingId) {
          const fd = new FormData();
          receipts.forEach(f => fd.append('receipts', f));
          await fetch(`/api/accounting/outstandings/${outstandingId}/receipts/`, { method: 'POST', body: fd }).catch(() => {});
        }
        onSuccess(); onClose();
      }
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
            <AddablePartySelect value={form.party_name} onChange={v => set('party_name', v)} options={partySuggestions} placeholder="— Select Party —" disabled={saving} />
          </div>
          <div>
            <label style={labelStyle}>Amount (₹) *</label>
            <input style={inputStyle} type="text" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={handleAmountChange} />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input style={inputStyle} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <AddableSelect value={form.department} onChange={v => set('department', v)} options={DEPARTMENTS} placeholder="— Select Department —" disabled={saving} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} placeholder="Optional note…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Receipts / Invoice Files (optional)</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ ...inputStyle, cursor: 'pointer', color: '#9ca3af', textAlign: 'center', border: '1px dashed #d1d5db', padding: 10 }}
            >
              Click to attach receipts or invoice files…
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ods,.csv,.ppt,.pptx,.txt,.rtf,.odt" multiple style={{ display: 'none' }}
              onChange={e => setReceipts(r => [...r, ...Array.from(e.target.files)])} />
            {receipts.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {receipts.map((f, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#374151' }}>
                    {f.name}
                    <button type="button" onClick={() => setReceipts(r => r.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 0 }}>x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {err && <p style={{ margin: '14px 0 0', fontSize: 13, color: C.red, fontWeight: 600 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${C.border}`, background: C.slateBg, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.text }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: '10px 24px', background: saving ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Invoice'}
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

/* ── Invoice Print Helper ─────────────────────────────────────── */
/* ── Amount to Words (Indian system) ─────────────────────────── */
function amountToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function b100(n) { return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); }
  function b1000(n) { return n < 100 ? b100(n) : ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + b100(n % 100) : ''); }
  const n = Math.floor(amount);
  const paise = Math.round((amount - n) * 100);
  let r = n, parts = [];
  if (r >= 10000000) { parts.push(b100(Math.floor(r / 10000000)) + ' Crore');   r %= 10000000; }
  if (r >= 100000)   { parts.push(b100(Math.floor(r / 100000)) + ' Lakh');      r %= 100000;   }
  if (r >= 1000)     { parts.push(b100(Math.floor(r / 1000)) + ' Thousand');    r %= 1000;     }
  if (r > 0)         { parts.push(b1000(r)); }
  let words = n === 0 ? 'Zero' : parts.join(' ');
  if (paise > 0) words += ' and ' + b100(paise) + ' Paise';
  return 'INR ' + words + ' Only';
}

/* ── Unit label from units field ─────────────────────────────── */
function perLabel(units) {
  if (!units) return 'Pcs.';
  const u = String(units).toLowerCase();
  if (u.includes('gm') || u.includes('gram') || u.includes('weight')) return 'Gms.';
  if (u.includes('hour') || u.includes('hr') || u.includes('time') || u.includes('duration') || u.includes('min')) return 'Hrs.';
  return 'Pcs.';
}

function openInvoicePrint(invoice) {
  const fmtD = d => { if (!d) return '—'; const [y, m, dy] = String(d).substring(0, 10).split('-'); return `${dy}-${m}-${y}`; };
  const fmtAmt = n => `&#x20B9;${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtNum = n => (n != null && n !== '' && Number(n) > 0) ? Number(n).toLocaleString('en-IN') : '—';

  // Build line item rows
  const refs = invoice.order_refs?.length ? invoice.order_refs : null;
  const rows = refs
    ? refs.map((ref, i) => {
        const qty   = ref.quantity != null && Number(ref.quantity) > 0 ? Number(ref.quantity) : null;
        const rate  = ref.rate != null && Number(ref.rate) > 0 ? Number(ref.rate) : null;
        const total = ref.total != null ? Number(ref.total) : Number(invoice.amount);
        const per   = perLabel(ref.units);
        return `<tr>
          <td style="border:1px solid #bbb;padding:9px 12px;text-align:center;color:#555">${i + 1}</td>
          <td style="border:1px solid #bbb;padding:9px 12px">${ref.name || '—'}</td>
          <td style="border:1px solid #bbb;padding:9px 12px;text-align:center">${qty != null ? fmtNum(qty) : '—'}</td>
          <td style="border:1px solid #bbb;padding:9px 12px;text-align:center">${qty != null ? per : '—'}</td>
          <td style="border:1px solid #bbb;padding:9px 12px;text-align:right">${rate != null ? fmtAmt(rate) : '—'}</td>
          <td style="border:1px solid #bbb;padding:9px 12px;text-align:right;font-weight:600">${fmtAmt(total)}</td>
        </tr>`;
      }).join('')
    : `<tr>
        <td style="border:1px solid #bbb;padding:9px 12px;text-align:center;color:#555">1</td>
        <td style="border:1px solid #bbb;padding:9px 12px">${invoice.description || 'Design & Production Services'}</td>
        <td style="border:1px solid #bbb;padding:9px 12px;text-align:center">—</td>
        <td style="border:1px solid #bbb;padding:9px 12px;text-align:center">—</td>
        <td style="border:1px solid #bbb;padding:9px 12px;text-align:right">—</td>
        <td style="border:1px solid #bbb;padding:9px 12px;text-align:right;font-weight:600">${fmtAmt(invoice.amount)}</td>
      </tr>`;

  const wordsLine = amountToWords(Number(invoice.amount));
  const invDesc = invoice.description || (refs ? refs.map(r => r.name).join(', ') : 'Design & Production Services');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${invoice.id} — ${invoice.party_name || ''}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px 48px; background: #fff; max-width: 860px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #111; }
    .company-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .company-tagline { font-size: 11px; color: #666; margin-top: 3px; }
    .inv-label { font-size: 26px; font-weight: 800; color: #444; letter-spacing: 3px; text-align: right; }
    .inv-meta-table { width: auto; margin-top: 8px; border-collapse: collapse; float: right; }
    .inv-meta-table td { font-size: 12px; padding: 2px 0; }
    .inv-meta-table td:first-child { color: #777; padding-right: 12px; }
    .inv-meta-table td:last-child { font-weight: 700; text-align: right; }
    .bill-section { display: flex; gap: 32px; padding: 14px 0; border-bottom: 1px solid #ddd; }
    .bill-block { flex: 1; }
    .bill-block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
    .bill-block-name { font-size: 15px; font-weight: 800; margin-bottom: 2px; }
    .bill-block-sub { font-size: 12px; color: #555; }
    .desc-section { padding: 10px 0; border-bottom: 1px solid #ddd; font-size: 12px; }
    .desc-section span { font-weight: 600; color: #333; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table.items th { border: 1px solid #999; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #f3f4f6; white-space: nowrap; }
    table.items td { border: 1px solid #bbb; padding: 9px 10px; font-size: 12px; }
    table.items tfoot td { border: 1px solid #999; padding: 10px 10px; font-weight: 700; background: #f9fafb; border-top: 2px solid #111; }
    .amount-words { margin-top: 14px; padding: 10px 14px; background: #f9fafb; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
    .amount-words span { font-weight: 700; }
    .status-strip { margin-top: 14px; font-size: 12px; color: #555; display: flex; gap: 24px; flex-wrap: wrap; }
    .status-strip b { color: #111; }
    .footer { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-left { font-size: 11px; color: #666; line-height: 1.7; }
    .footer-left strong { color: #333; }
    .footer-right { text-align: right; font-size: 11px; color: #888; }
    .sign-box { border-top: 1px solid #999; margin-top: 28px; padding-top: 6px; width: 160px; font-size: 11px; text-align: center; color: #555; }
    .thank-you { text-align: center; font-size: 13px; font-weight: 700; color: #222; margin-top: 30px; letter-spacing: 0.3px; }
    @media print { body { padding: 20px 26px; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">Product Sheet Design</div>
      <div class="company-tagline">Design &amp; Production Services</div>
    </div>
    <div style="text-align:right">
      <div class="inv-label">SALES INVOICE</div>
      <table class="inv-meta-table">
        <tr><td>Invoice No.</td><td>INV-${invoice.id}</td></tr>
        <tr><td>Date</td><td>${fmtD(invoice.created_at)}</td></tr>
        ${invoice.due_date ? `<tr><td>Due Date</td><td>${fmtD(invoice.due_date)}</td></tr>` : ''}
        <tr><td>Status</td><td>${invoice.status === 'settled' ? '&#10003; Settled' : '&#8987; Pending'}</td></tr>
      </table>
    </div>
  </div>

  <!-- Bill To / Service Info -->
  <div class="bill-section">
    <div class="bill-block">
      <div class="bill-block-label">Bill To</div>
      <div class="bill-block-name">${invoice.party_name || '—'}</div>
      ${invoice.department ? `<div class="bill-block-sub">${invoice.department} Department</div>` : ''}
    </div>
    <div class="bill-block">
      <div class="bill-block-label">Service Provider</div>
      <div class="bill-block-name">Product Sheet Design</div>
      <div class="bill-block-sub">Design &amp; Production Studio</div>
    </div>
  </div>

  <!-- Description -->
  <div class="desc-section">
    <span>Description of Services: </span>${invDesc}
  </div>

  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr>
        <th style="width:5%;text-align:center">SI No.</th>
        <th style="text-align:left">Description of Goods / Services</th>
        <th style="width:10%;text-align:center">Quantity</th>
        <th style="width:8%;text-align:center">Per</th>
        <th style="width:14%;text-align:right">Rate</th>
        <th style="width:16%;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Total</td>
        <td style="text-align:right;font-size:14px">${fmtAmt(invoice.amount)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Amount in Words -->
  <div class="amount-words">
    Amount Chargeable (in words): <span>${wordsLine}</span>
  </div>

  <!-- Status strip -->
  <div class="status-strip">
    <span>Status: <b>${invoice.status === 'settled' ? 'Settled' : 'Pending'}</b></span>
    ${invoice.department ? `<span>Department: <b>${invoice.department}</b></span>` : ''}
    ${invoice.due_date ? `<span>Payment Due: <b>${fmtD(invoice.due_date)}</b></span>` : ''}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <strong>For Product Sheet Design</strong><br>
      Make all payments payable to <strong>Product Sheet Design</strong>.<br>
      Total due${invoice.due_date ? ` by <strong>${fmtD(invoice.due_date)}</strong>` : ' upon receipt'}.<br>
      Overdue accounts subject to a service charge of 1% per month.
    </div>
    <div class="sign-box">
      <br><br>
      Authorized Signatory
    </div>
  </div>

  <div class="thank-you">Thank you for your business!</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/* ── Invoice Detail Modal ──────────────────────────────────────── */
function InvoiceDetailModal({ invoice, onClose }) {
  const fmtAmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtD = d => { if (!d) return '—'; const [y, m, dy] = String(d).substring(0, 10).split('-'); return `${dy}-${m}-${y}`; };
  const fmtNum = n => (n != null && Number(n) > 0) ? Number(n).toLocaleString('en-IN') : '—';

  const refs = invoice.order_refs?.length ? invoice.order_refs : null;
  const invDesc = invoice.description || (refs ? refs.map(r => r.name).join(', ') : 'Design & Production Services');
  const wordsLine = amountToWords(Number(invoice.amount));

  const itemRows = refs
    ? refs
    : [{ id: 'desc', name: invoice.description || 'Design & Production Services', order_source: null, quantity: null, units: null, rate: null, total: invoice.amount }];

  // border styles
  const cellBorder = '1px solid #d1d5db';
  const hdrStyle = { border: cellBorder, padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', background: '#f3f4f6', whiteSpace: 'nowrap' };
  const cellStyle = { border: cellBorder, padding: '9px 10px', fontSize: 12, color: '#222' };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Arial, sans-serif' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 4, width: '100%', maxWidth: 720, maxHeight: '94vh', overflowY: 'auto', boxShadow: '0 28px 80px rgba(0,0,0,0.28)', border: '1px solid #d1d5db' }}
      >
        {/* ── Document Header ── */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '2px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111', letterSpacing: -0.5 }}>Product Sheet Design</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>Design &amp; Production Services</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#555', letterSpacing: 3 }}>SALES INVOICE</div>
              <table style={{ borderCollapse: 'collapse', marginTop: 6, marginLeft: 'auto' }}>
                <tbody>
                  {[
                    ['Invoice No.', `INV-${invoice.id}`],
                    ['Date', fmtD(invoice.created_at)],
                    ...(invoice.due_date ? [['Due Date', fmtD(invoice.due_date)]] : []),
                  ].map(([lbl, val]) => (
                    <tr key={lbl}>
                      <td style={{ fontSize: 11, color: '#888', paddingRight: 10, paddingBottom: 2 }}>{lbl}</td>
                      <td style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', paddingBottom: 2 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={onClose} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: '#6b7280', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✕</button>
          </div>
        </div>

        {/* ── Bill To / From ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ flex: 1, padding: '14px 28px', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, borderBottom: '1px solid #f0f0f0', paddingBottom: 3 }}>Bill To</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>{invoice.party_name || '—'}</div>
            {invoice.department && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{invoice.department} Department</div>}
          </div>
          <div style={{ flex: 1, padding: '14px 28px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, borderBottom: '1px solid #f0f0f0', paddingBottom: 3 }}>Service Provider</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>Product Sheet Design</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Design &amp; Production Studio</div>
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ padding: '10px 28px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#333' }}>
          <span style={{ fontWeight: 700, color: '#555' }}>Description of Services: </span>{invDesc}
        </div>

        {/* ── Items Table ── */}
        <div style={{ padding: '0 28px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ ...hdrStyle, textAlign: 'center', width: '5%' }}>SI No.</th>
                <th style={{ ...hdrStyle, textAlign: 'left' }}>Description of Goods / Services</th>
                <th style={{ ...hdrStyle, textAlign: 'center', width: '10%' }}>Quantity</th>
                <th style={{ ...hdrStyle, textAlign: 'center', width: '8%' }}>Per</th>
                <th style={{ ...hdrStyle, textAlign: 'right', width: '14%' }}>Rate</th>
                <th style={{ ...hdrStyle, textAlign: 'right', width: '16%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map((ref, i) => {
                const qty   = ref.quantity != null && Number(ref.quantity) > 0 ? Number(ref.quantity) : null;
                const rate  = ref.rate != null && Number(ref.rate) > 0 ? Number(ref.rate) : null;
                const total = ref.total != null ? Number(ref.total) : Number(invoice.amount);
                const per   = perLabel(ref.units);
                return (
                  <tr key={ref.id ?? i}>
                    <td style={{ ...cellStyle, textAlign: 'center', color: '#888' }}>{i + 1}</td>
                    <td style={{ ...cellStyle }}>{ref.name || invDesc}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{qty != null ? fmtNum(qty) : '—'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', color: '#555' }}>{qty != null ? per : '—'}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{rate != null ? fmtAmt(rate) : '—'}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#059669' }}>{fmtAmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ border: cellBorder, padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555', borderTop: '2px solid #111', background: '#f9fafb' }}>Total</td>
                <td style={{ border: cellBorder, padding: '10px 10px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#059669', borderTop: '2px solid #111', background: '#f9fafb' }}>{fmtAmt(invoice.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Amount in words ── */}
        <div style={{ margin: '12px 28px 0', padding: '9px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12, color: '#444' }}>
          Amount Chargeable (in words): <strong>{wordsLine}</strong>
        </div>

        {/* ── Metadata strip ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '12px 28px', borderTop: '1px solid #e5e7eb', marginTop: 12, alignItems: 'center' }}>
          <StatusBadge status={invoice.status} />
          {invoice.department && (
            <span style={{ padding: '3px 10px', background: '#f1f5f9', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#475569' }}>{invoice.department}</span>
          )}
          {invoice.due_date && (
            <span style={{ fontSize: 12, color: '#64748b' }}>Due: <strong>{fmtD(invoice.due_date)}</strong></span>
          )}
        </div>

        {/* ── Receipts & linked picklists ── */}
        <div style={{ padding: '10px 28px', borderTop: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 }}>Receipts:</span>
          <ReceiptsBadge
            receipts={invoice.receipts || []}
            title={`Receipts — ${invoice.party_name}`}
            accentColor={C.green}
          />
          {(invoice.order_refs || []).filter(r => r.order_source === 'picklist').map((ref) => {
            const picklistNum = ref.picklist_number ?? ref.id;
            return (
              <a
                key={ref.id}
                href={`/frontend/orders?view=orders&picklist=${picklistNum}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 20, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
              >
                🔗 {ref.name}
              </a>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <div style={{ padding: '10px 28px', background: '#fafafa', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#777', lineHeight: 1.6 }}>
          <strong>For Product Sheet Design</strong> — Make all payments payable to <strong>Product Sheet Design</strong>.
          Total due{invoice.due_date ? ` by ${fmtD(invoice.due_date)}` : ' upon receipt'}.
          Overdue accounts subject to a service charge of 1% per month.
        </div>

        {/* ── Thank you + action bar ── */}
        <div style={{ padding: '14px 28px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>Thank you for your business!</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button
              onClick={() => openInvoicePrint(invoice)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              🖨 Print Invoice
            </button>
            <button
              onClick={onClose}
              style={{ padding: '9px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function exportCSV(rows, filename) {
  const cols = ['S.No', 'party_name', 'department', 'amount', 'due_date', 'status'];
  const header = 'S.No,Party Name,Department,Amount,Due Date,Status';
  const body = rows.map((r, i) => cols.map(k => `"${(k === 'S.No' ? (i + 1) : k === 'amount' ? Number(r[k]).toFixed(2) : (r[k] ?? '')).toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ── Main Component ───────────────────────────────────────────── */
export default function AccountingInvoicesSales({ onRefresh, dateParams }) {
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewInvoice, setViewInvoice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = dateParams ? `&${dateParams}` : '';
    const [inv, acc] = await Promise.all([
      fetch(`/api/accounting/invoices?type=sales${q}`).then(r => r.json()).catch(() => null),
      fetch('/api/accounting/accounts/').then(r => r.json()).catch(() => null),
    ]);
    if (inv?.success) setInvoices(inv.data || []);
    if (acc?.success) setAccounts(acc.data || []);
    setLoading(false);
  }, [dateParams]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let rows = invoices;
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    if (deptFilter.length > 0) rows = rows.filter(r => deptFilter.includes(r.department || 'None'));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.party_name || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date || b.due_date || b.created_at) - new Date(a.date || a.due_date || a.created_at);
      if (sortBy === 'date_asc') return new Date(a.date || a.due_date || a.created_at) - new Date(b.date || b.due_date || b.created_at);
      if (sortBy === 'amount_high') return b.amount - a.amount;
      if (sortBy === 'amount_low') return a.amount - b.amount;
      return 0;
    });
    return rows;
  }, [invoices, search, statusFilter, deptFilter, sortBy]);

  const totalPending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);
  const totalSettled  = invoices.filter(i => i.status === 'settled').reduce((s, i) => s + Number(i.amount), 0);
  const depts = [...new Set(invoices.map(i => i.department || 'None'))].sort();

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(s => s.id)));
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  useEffect(() => { setSelectedIds(new Set()); }, [filtered]);

  const target = selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id)) : filtered;

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
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>Sales Invoices</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Receivables — journal entries created only at settlement.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3, background: '#fff', borderRadius: 8, padding: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            {[['date_desc', 'Newest'], ['date_asc', 'Oldest'], ['amount_high', 'Amount: High to Low'], ['amount_low', 'Amount: Low to High']].map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: sortBy === k ? 700 : 500,
                border: 'none', cursor: 'pointer',
                background: sortBy === k ? C.blue : 'transparent',
                color: sortBy === k ? '#fff' : C.muted,
                transition: 'all 0.14s',
              }}>{l}</button>
            ))}
          </div>
          <button onClick={() => exportCSV(target, 'sales_invoices.csv')} style={{ padding: '9px 14px', background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Export CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
          <button
            onClick={() => {
              if (selectedIds.size > 0) {
                // Print each selected invoice as a proper document
                const selected = filtered.filter(inv => selectedIds.has(inv.id));
                selected.forEach((inv, i) => {
                  // Stagger slightly so browser doesn't block multiple popups
                  setTimeout(() => openInvoicePrint(inv), i * 300);
                });
              } else {
                window.print();
              }
            }}
            style={{ padding: '9px 14px', background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Print {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
          <button onClick={() => setShowCreate(true)} style={{ padding: '8px 16px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + New Invoice
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
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
      <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: C.slateBg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search party or description…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 180px', minWidth: 140, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fff', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }} />
        <div style={{ width: 1, height: 20, background: C.border }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 8px', border: 'none', borderRadius: 6, fontSize: 12, background: statusFilter ? C.blueBg : '#fff', color: statusFilter ? C.blue : C.muted, cursor: 'pointer', outline: 'none', fontWeight: statusFilter ? 600 : 400, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
        <MultiSelectDropdown label="Department" options={depts} selected={deptFilter} onChange={setDeptFilter} activeBgColor={C.blueBg} activeColor={C.blue} />
        {(search || statusFilter || deptFilter.length > 0) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDeptFilter([]); }}
            style={{ padding: '4px 10px', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: C.red, cursor: 'pointer' }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, fontWeight: 600 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="print-area" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.slateBg }}>
              <th className="no-print" style={{ padding: '10px 14px', width: 40, borderBottom: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
              </th>
              <th className="print-only" style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, textAlign: 'left', display: 'none' }}>S.No</th>
              {['#', 'Party Name', 'Department', 'Amount', 'Due Date', 'Receipts', 'Status'].map((h, i) => (
                <th key={i} className={h === '#' ? 'no-print' : ''} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i >= 3 ? 'right' : 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: C.muted, fontSize: 13 }}>No invoices found.</td></tr>
            ) : filtered.map((inv, i) => {
              const isSelected = selectedIds.has(inv.id);
              const hideInPrintClass = selectedIds.size > 0 && !isSelected ? 'hide-in-print' : '';

              return (
              <tr key={inv.id} className={hideInPrintClass} style={{ borderBottom: `1px solid ${C.slateBg}`, background: isSelected ? C.blueBg : 'transparent', transition: 'background 0.1s', cursor: 'pointer' }}
                onClick={() => toggleSelect(inv.id)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.slateBg; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <td className="no-print" style={{ padding: '12px 14px' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inv.id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                </td>
                <td className="print-only" style={{ padding: '12px 14px', fontSize: 13, color: C.text, display: 'none' }}>{i + 1}</td>
                <td className="no-print" style={{ padding: '12px 14px', fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>#{inv.id}</span>
                    <button
                      title="View invoice details"
                      onClick={e => { e.stopPropagation(); setViewInvoice(inv); }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, cursor: 'pointer', color: C.blue, fontSize: 13, flexShrink: 0 }}
                    >
                      👁
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{inv.party_name}</p>
                  {inv.description && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{inv.description}</p>}
                  {inv.order_refs?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {inv.order_refs.map((ref) => (
                        <span
                          key={ref.id}
                          style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                            background: ref.order_source === 'picklist' ? '#EFF6FF' : '#F1F5F9',
                            color: ref.order_source === 'picklist' ? '#2563EB' : '#64748B',
                            border: `1px solid ${ref.order_source === 'picklist' ? '#BFDBFE' : '#CBD5E1'}`,
                          }}
                        >
                          {ref.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {inv.department ? (
                    <span style={{ padding: '2px 9px', background: C.slateBg, borderRadius: 20, fontSize: 11, fontWeight: 600, color: C.slate }}>{inv.department}</span>
                  ) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: C.green }}>{fmt(inv.amount)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: C.muted }}>{fmtDate(inv.due_date)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <ReceiptsBadge
                      receipts={inv.receipts || []}
                      title={`Receipts — ${inv.party_name}`}
                      accentColor={C.green}
                    />
                    {(inv.order_refs || []).filter(r => r.order_source === 'picklist').map((ref) => {
                      const picklistNum = ref.picklist_number ?? ref.id;
                      return (
                        <a
                          key={ref.id}
                          href={`/frontend/orders?view=orders&picklist=${picklistNum}`}
                          target="_blank"
                          rel="noreferrer"
                          title={`Open ${ref.name} in Orders`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          🔗 {ref.name}
                        </a>
                      );
                    })}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}><StatusBadge status={inv.status} /></td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateInvoiceModal accounts={accounts} onClose={() => setShowCreate(false)} onSuccess={() => { load(); if (onRefresh) onRefresh(); }} />}
      {viewInvoice && <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  );
}
