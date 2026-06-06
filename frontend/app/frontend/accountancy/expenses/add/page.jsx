'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff',
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5
};

// Reused AddableSelect for dynamic creation of ledgers and accounts
function AddableSelect({ value, onChange, options, placeholder, style, disabled }) {
  const [custom, setCustom] = useState([]);       // extra { value, label } entries
  const [adding, setAdding] = useState(false);    // show inline input
  const [draft, setDraft]   = useState('');
  const inputRef = useRef(null);

  const normalizedOptions = React.useMemo(() => {
    return options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  }, [options]);
  
  const allOptions = [...normalizedOptions, ...custom];
  const ADD_SENTINEL = '__add_new__';

  const handleChange = (e) => {
    if (e.target.value === ADD_SENTINEL) {
      setAdding(true);
      setDraft('');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    onChange(e.target.value);
  };

  const confirmNew = () => {
    const trimmed = draft.trim();
    if (!trimmed) { setAdding(false); return; }
    
    if (!allOptions.find(o => o.label.toLowerCase() === trimmed.toLowerCase())) {
      setCustom((p) => [...p, { value: trimmed, label: trimmed }]);
    }
    onChange(trimmed);
    setAdding(false);
    setDraft('');
  };

  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } if (e.key === 'Escape') setAdding(false); }}
          placeholder="Type and press Enter…"
          style={{ ...style, flex: 1, border: '2px solid #2563eb' }}
          autoFocus
        />
        <button type="button" onClick={confirmNew}
          style={{ padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          ✓
        </button>
        <button type="button" onClick={() => setAdding(false)}
          style={{ padding: '0 10px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <select value={value} onChange={handleChange} style={style} disabled={disabled}>
      <option value="">{placeholder || '— Select —'}</option>
      {allOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      <option value={ADD_SENTINEL} style={{ color: '#2563eb', fontWeight: 600 }}>＋ Add new…</option>
    </select>
  );
}

export default function AddExpensePage() {
  const router = useRouter();
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  
  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
    
    // Fetch expense ledgers and accounts
    Promise.all([
      fetch('/api/accounting/ledgers/', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/accounting/accounts/', { cache: 'no-store' }).then(r => r.json())
    ]).then(([ledgerData, accountData]) => {
      if (ledgerData?.success) {
        setLedgers(ledgerData.data.filter(l => l.type === 'expense'));
      }
      if (accountData?.success) {
        setAccounts(accountData.data);
      }
    }).catch(err => {
      console.error('Failed to load form data:', err);
      setStatus({ type: 'error', message: 'Failed to load options. Backend may be unreachable.' });
    });
  }, []);

  const handleFile = (e) => {
    setReceipt(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || Number(amount) <= 0) return setStatus({ type: 'error', message: 'Amount must be positive.' });
    if (!category) return setStatus({ type: 'error', message: 'Please select an expense category.' });
    if (!account) return setStatus({ type: 'error', message: 'Please select a payment account.' });
    if (!date) return setStatus({ type: 'error', message: 'Date is required.' });
    if (!description.trim()) return setStatus({ type: 'error', message: 'Description is required.' });

    setSubmitting(true);
    setStatus({ type: 'info', message: 'Submitting expense...' });
    
    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('account', account);
      formData.append('date', date);
      formData.append('description', description);
      if (receipt) {
        formData.append('receipt', receipt);
      }

      const res = await fetch('/api/accounting/expenses/create/', {
        method: 'POST',
        body: formData,
      });
      
      const result = await res.json().catch(() => null);
      
      if (!res.ok || !result?.success) {
        setStatus({ type: 'error', message: result?.message || 'Failed to record expense.' });
        setSubmitting(false);
        return;
      }
      
      setStatus({ type: 'success', message: '✓ Expense recorded successfully!' });
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/accountancy/expenses');
      }, 1500);
      
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error while submitting.' });
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/accountancy/expenses" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 24 }}>←</Link>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Record Expense</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>This will automatically generate a journal entry.</p>
        </div>
      </div>

      {status && (
        <div style={{ 
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 500,
          background: status.type === 'error' ? '#fef2f2' : status.type === 'success' ? '#f0fdf4' : '#eff6ff',
          color: status.type === 'error' ? '#dc2626' : status.type === 'success' ? '#16a34a' : '#2563eb',
          border: `1px solid ${status.type === 'error' ? '#fca5a5' : status.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
        }}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 30, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Amount (₹) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            required
            style={{ ...inputStyle, fontSize: 18, fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Expense Category *</label>
            <AddableSelect
              value={category}
              onChange={setCategory}
              options={ledgers.map(l => ({ value: l.id, label: l.name }))}
              placeholder="— Select Category —"
              style={inputStyle}
              disabled={submitting || ledgers.length === 0}
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Account *</label>
            <AddableSelect
              value={account}
              onChange={setAccount}
              options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type})` }))}
              placeholder="— Select Account —"
              style={inputStyle}
              disabled={submitting || accounts.length === 0}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description / Notes *</label>
          <textarea
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Receipt / Attachment (Optional)</label>
          <div
            onClick={() => !submitting && fileRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db', borderRadius: 8, padding: '16px', textAlign: 'center',
              cursor: submitting ? 'not-allowed' : 'pointer', background: '#f9fafb', color: '#6b7280', fontSize: 14,
            }}
          >
            {receipt ? `📎 ${receipt.name}` : '📎 Click to upload receipt image or PDF'}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            disabled={submitting}
            style={{ display: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '12px', background: submitting ? '#93c5fd' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
          }}
        >
          {submitting ? 'Saving Expense...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
