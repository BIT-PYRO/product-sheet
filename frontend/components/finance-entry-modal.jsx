'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';

const S = {
  input: {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
    borderRadius: 6, fontSize: 14, color: '#111827', background: '#fff',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6,
  },
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
  const accent = isIncome ? '#0ea472' : '#e53e3e';
  const apiUrl = isIncome ? '/api/accounting/income/create/' : '/api/accounting/expenses/create/';

  // Clear error whenever amount changes
  useEffect(() => { setError(''); }, [amount]);

  // Block non-numeric keys on amount input
  const handleAmountKey = e => {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  };
  // Prevent scroll changing the value
  const handleAmountWheel = e => e.target.blur();

  async function submit(e) {
    e.preventDefault();
    setError(''); // Always clear first

    const parsed = parseFloat(String(amount).trim());
    if (!amount || String(amount).trim() === '' || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!category) { setError('Please select a category.'); return; }
    if (!account) { setError('Please select a payment account.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', parsed); fd.append('category', category);
      fd.append('account', account); fd.append('date', date);
      fd.append('description', description);
      if (receipt) fd.append('receipt', receipt);
      const res = await fetch(apiUrl, { method: 'POST', body: fd });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) { setError(result?.message || 'Failed. Please try again.'); setSubmitting(false); return; }
      onSuccess();
    } catch { setError('Network error. Please try again.'); setSubmitting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, padding: '28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ display: 'inline-block', padding: '3px 10px', background: isIncome ? '#f0fdf4' : '#fef2f2', color: accent, borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                {isIncome ? 'Income Entry' : 'Expense Entry'}
              </span>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                {isIncome ? 'Record Income' : 'Record Expense'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Creates a journal entry automatically.</p>
            </div>
            <button onClick={onClose} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#6b7280', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          {/* Amount */}
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>Amount (INR) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                onKeyDown={handleAmountKey}
                onWheel={handleAmountWheel}
                style={{ ...S.input, paddingLeft: 28, fontSize: 22, fontWeight: 700, borderColor: amount && parseFloat(amount) > 0 ? '#d1fae5' : '#e5e7eb' }}
              />
            </div>
          </div>

          {/* Category + Account */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={S.label}>Category *</label>
              <AddableSelect value={category} onChange={v => { setCategory(v); setError(''); }} options={ledgers} placeholder="— Select —" disabled={submitting} />
            </div>
            <div>
              <label style={S.label}>Payment Account *</label>
              <AddableSelect value={account} onChange={v => { setAccount(v); setError(''); }} options={accounts} placeholder="— Select —" disabled={submitting} />
            </div>
          </div>

          {/* Date + Receipt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={S.label}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Receipt (optional)</label>
              <div onClick={() => fileRef.current?.click()} style={{ ...S.input, cursor: 'pointer', color: receipt ? '#374151' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {receipt ? `${receipt.name}` : 'Click to upload…'}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setReceipt(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Description *</label>
            <textarea
              rows={2}
              placeholder={isIncome ? 'e.g. Invoice payment from client' : 'e.g. Paid electricity bill'}
              value={description}
              onChange={e => { setDescription(e.target.value); setError(''); }}
              style={{ ...S.input, resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{ flex: 2, padding: '11px 0', background: submitting ? '#9ca3af' : accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15, letterSpacing: 0.3 }}>
              {submitting ? 'Saving…' : `Save ${isIncome ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
