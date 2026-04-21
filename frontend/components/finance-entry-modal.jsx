'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';

const S = {
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
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
        placeholder="Type & press Enter…" style={{ ...S.input, flex: 1, border: '2px solid #2563eb' }} autoFocus />
      <button type="button" onClick={confirm} style={{ padding: '0 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>✓</button>
      <button type="button" onClick={() => setAdding(false)} style={{ padding: '0 8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>✕</button>
    </div>
  );
  return (
    <select value={value} onChange={handle} style={S.input} disabled={disabled}>
      <option value="">{placeholder || '— Select —'}</option>
      {all.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value={SENTINEL} style={{ color: '#2563eb', fontWeight: 600 }}>＋ Add new…</option>
    </select>
  );
}

export default function FinanceEntryModal({ type, ledgers, accounts, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const isIncome = type === 'income';
  const accent = isIncome ? '#16a34a' : '#dc2626';
  const title = isIncome ? '＋ Record Income' : '＋ Record Expense';
  const apiUrl = isIncome ? '/api/accounting/income/create/' : '/api/accounting/expenses/create/';

  async function submit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError('Amount must be positive.');
    if (!category) return setError('Please select a category.');
    if (!account) return setError('Please select a payment account.');
    if (!description.trim()) return setError('Description is required.');
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('amount', amount); fd.append('category', category);
      fd.append('account', account); fd.append('date', date);
      fd.append('description', description);
      if (receipt) fd.append('receipt', receipt);
      const res = await fetch(apiUrl, { method: 'POST', body: fd });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) { setError(result?.message || 'Failed. Try again.'); setSubmitting(false); return; }
      onSuccess();
    } catch { setError('Network error.'); setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: accent }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>Creates a journal entry automatically.</p>
        </div>
        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Amount (₹) *</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...S.input, fontSize: 20, fontWeight: 700 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Category *</label>
              <AddableSelect value={category} onChange={setCategory} options={ledgers} placeholder="— Category —" disabled={submitting} />
            </div>
            <div>
              <label style={S.label}>Account *</label>
              <AddableSelect value={account} onChange={setAccount} options={accounts} placeholder="— Account —" disabled={submitting} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Receipt (optional)</label>
              <div onClick={() => fileRef.current?.click()} style={{ ...S.input, cursor: 'pointer', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {receipt ? `📎 ${receipt.name}` : '📎 Upload file'}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setReceipt(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Description *</label>
            <textarea rows={2} placeholder="What is this for?" value={description} onChange={e => setDescription(e.target.value)} style={{ ...S.input, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: 12, background: submitting ? '#9ca3af' : accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15 }}>
              {submitting ? 'Saving…' : `Save ${isIncome ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
