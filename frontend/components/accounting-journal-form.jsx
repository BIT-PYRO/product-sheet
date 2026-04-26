'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/* ── constants ───────────────────────────────────────────────── */
const DEFAULT_DEPARTMENTS = [
  'Marketing',
  'Customer Relation Management',
  'Operations',
  'Design',
  'Logistics',
  'Purchase',
  'Sales / Business Development',
  'Finance',
  'Information Technology',
  'Human Resource',
  'Production',
  'Services',
  'House Keeping',
  'Other',
];

const DEFAULT_PAYMENT_METHODS = [
  'Cash', 'Bank Transfer', 'NEFT', 'RTGS', 'IMPS',
  'Cheque', 'UPI', 'Credit Card', 'Debit Card', 'Other',
];

/* ── helpers ─────────────────────────────────────────────────── */
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(id) {
  return {
    id: id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString()),
    ledger: '',
    amount: '',
    department: '',
    paymentMethod: '',
    vendorPayee: '',
    billDate: '',
    attachments: [],
    refId: '',
    notes: '',
  };
}

/* ── AddableSelect ───────────────────────────────────────────── */
// A <select> wrapper that appends a "+ Add new…" option.
// When chosen, shows an inline text input to add a custom entry.
function AddableSelect({ value, onChange, options, placeholder, style, disabled }) {
  const [custom, setCustom] = useState([]);       // extra { value, label } entries
  const [adding, setAdding] = useState(false);    // show inline input
  const [draft, setDraft]   = useState('');
  const inputRef = useRef(null);

  // Normalise options. If array of strings, convert to objects.
  const normalizedOptions = useMemo(() => {
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
    
    // Check if it exists
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

/* ── sub-component: SectionLine ─────────────────────────────── */
function SectionLine({ line, index, type, ledgers, loadingLedgers, onChange, onRemove, canRemove }) {
  const fileRef = useRef(null);
  const isDebit = type === 'debit';

  const accent = isDebit
    ? { bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb', badgeTxt: '#fff', sectionBg: '#dbeafe' }
    : { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', badgeTxt: '#fff', sectionBg: '#dcfce7' };

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const newAttachments = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    const merged = [...(line.attachments || []), ...newAttachments];
    onChange(index, 'attachments', merged);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (id) => {
    const updated = (line.attachments || []).filter((a) => a.id !== id);
    onChange(index, 'attachments', updated);
  };

  const openAttachment = (att) => {
    if (att.url) window.open(att.url, '_blank');
  };

  const isImage = (att) => att.type?.startsWith('image/');

  return (
    <div style={{
      background: accent.bg,
      border: `1px solid ${accent.border}`,
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 12,
      position: 'relative',
    }}>
      {/* Line header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{
          background: accent.badge, color: accent.badgeTxt,
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase',
        }}>
          {isDebit ? '▲ Debit' : '▼ Credit'} Line {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            title="Remove line"
            style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#dc2626', borderRadius: 8, padding: '4px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* Row 1: Ledger + Amount */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Ledger Account *</label>
          <AddableSelect
            value={line.ledger}
            onChange={(val) => onChange(index, 'ledger', val)}
            options={ledgers.map((l) => ({ value: l.id, label: `${l.name} (${l.type})` }))}
            placeholder="— Select Ledger —"
            style={inputStyle}
            disabled={loadingLedgers}
          />
        </div>
        <div>
          <label style={labelStyle}>{isDebit ? 'Debit Amount (₹) *' : 'Credit Amount (₹) *'}</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={line.amount}
              onChange={(e) => {
                let raw = e.target.value.replace(/[^0-9.]/g, '');
                const parts = raw.split('.');
                if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
                let formatted = parts[0];
                if (formatted.length > 3) {
                  formatted = formatted.substring(0, formatted.length - 3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + formatted.substring(formatted.length - 3);
                }
                if (parts.length > 1) formatted += '.' + parts[1];
                onChange(index, 'amount', formatted);
              }}
              required
              style={{ ...inputStyle, fontWeight: 600, fontSize: 15 }}
            />
        </div>
      </div>

      {/* Row 2: Date + Description */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Date *</label>
          <input
            type="date"
            value={line.billDate || todayDate()}
            onChange={(e) => onChange(index, 'billDate', e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            placeholder="e.g. Paid rent for April"
            value={line.notes}
            onChange={(e) => onChange(index, 'notes', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Row 3: Department + Payment Method */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Department</label>
          <AddableSelect
            value={line.department}
            onChange={(val) => onChange(index, 'department', val)}
            options={DEFAULT_DEPARTMENTS}
            placeholder="— Select Department —"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Payment Method</label>
          <AddableSelect
            value={line.paymentMethod}
            onChange={(val) => onChange(index, 'paymentMethod', val)}
            options={DEFAULT_PAYMENT_METHODS}
            placeholder="— Select Method —"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Row 4: Vendor/Payee + Bill Date (only for debit) + Ref ID */}
      <div style={{ display: 'grid', gridTemplateColumns: isDebit ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {isDebit && (
          <div>
            <label style={labelStyle}>Vendor / Payee</label>
            <input
              type="text"
              placeholder="e.g. Sharma Traders"
              value={line.vendorPayee}
              onChange={(e) => onChange(index, 'vendorPayee', e.target.value)}
              style={inputStyle}
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>Bill Date</label>
          <input
            type="date"
            value={line.billDate}
            onChange={(e) => onChange(index, 'billDate', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Reference ID</label>
          <input
            type="text"
            placeholder="Enter reference ID manually"
            value={line.refId}
            onChange={(e) => onChange(index, 'refId', e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, color: '#374151' }}
          />
        </div>
      </div>

      {/* Row 5: Attachments — multiple files */}
      <div>
        <label style={labelStyle}>Attachments ({(line.attachments || []).length})</label>

        {/* Existing attachments list */}
        {(line.attachments || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {line.attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#fff', border: `1px solid ${accent.border}`,
                  borderRadius: 8, padding: '5px 10px', maxWidth: 220,
                }}
              >
                {/* Thumbnail or icon */}
                {isImage(att) ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    onClick={() => openAttachment(att)}
                    style={{
                      width: 32, height: 32, objectFit: 'cover',
                      borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => openAttachment(att)}
                    style={{ fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
                    title="Open file"
                  >📄</span>
                )}
                <span
                  onClick={() => openAttachment(att)}
                  style={{
                    flex: 1, fontSize: 11, color: accent.badge,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                  title={att.name}
                >{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}
                  title="Remove"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone / add more */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed #d1d5db', borderRadius: 8,
            padding: '10px 16px', cursor: 'pointer', textAlign: 'center',
            color: '#6b7280', fontSize: 13, background: '#fff',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent.badge; e.currentTarget.style.color = accent.badge; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}
        >
          📎 {(line.attachments || []).length > 0 ? 'Add more files' : 'Attach receipts, invoices, or documents'}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
      </div>
    </div>
  );
}

/* ── shared micro-styles ──────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 5,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 13,
  color: '#111827',
  background: '#fff',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  minHeight: 40,
};

/* ── main component ──────────────────────────────────────────── */
export default function AccountingJournalForm() {
  const [entryDate, setEntryDate] = useState('');
  const [narration, setNarration] = useState('');
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const [debitLines, setDebitLines] = useState([emptyLine('initial-debit')]);
  const [creditLines, setCreditLines] = useState([emptyLine('initial-credit')]);

  /* ── fetch ledgers and set date ── */
  useEffect(() => {
    setEntryDate(todayDate());

    (async () => {
      setLoadingLedgers(true);
      try {
        const res = await fetch('/api/accounting/ledgers/', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);
        if (res.ok && payload?.success) {
          setLedgers(Array.isArray(payload.data) ? payload.data : []);
        } else {
          setLedgers([]);
          setStatus({ type: 'warning', message: 'Could not load ledgers — you can still fill in other fields.' });
        }
      } catch {
        setLedgers([]);
        setStatus({ type: 'warning', message: 'Backend unreachable — ledger dropdown unavailable.' });
      } finally {
        setLoadingLedgers(false);
      }
    })();
  }, []);

  /* ── totals ── */
  const totalDebit = useMemo(
    () => debitLines.reduce((s, l) => s + (Number(String(l.amount).replace(/,/g, '')) || 0), 0),
    [debitLines],
  );
  const totalCredit = useMemo(
    () => creditLines.reduce((s, l) => s + (Number(String(l.amount).replace(/,/g, '')) || 0), 0),
    [creditLines],
  );
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
  const difference = Math.abs(totalDebit - totalCredit);

  /* ── line handlers ── */
  const updateLine = (setter) => (index, field, value) => {
    setter((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };
  const addLine = (setter) => () => setter((prev) => [...prev, emptyLine()]);
  const removeLine = (setter) => (index) => setter((prev) => prev.filter((_, i) => i !== index));

  /* ── reset ── */
  const resetForm = () => {
    setEntryDate(todayDate());
    setNarration('');
    setDebitLines([emptyLine()]);
    setCreditLines([emptyLine()]);
    setStatus(null);
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!isBalanced) {
      setStatus({ type: 'error', message: `Journal entry is unbalanced. Difference: ₹${difference.toFixed(2)}` });
      return;
    }

    const formData = new FormData();
    formData.append('date', entryDate);
    formData.append('narration', narration);

    const buildLineData = (lines, type) =>
      lines.map((l) => {
        const amt = Number(String(l.amount).replace(/,/g, '')) || 0;
        return {
          type,
          ledger: l.ledger ? (isNaN(Number(l.ledger)) ? l.ledger : Number(l.ledger)) : null,
          debit: type === 'debit' ? amt : 0,
          credit: type === 'credit' ? amt : 0,
          department: l.department || '',
          payment_method: l.paymentMethod || '',
          vendor_payee: l.vendorPayee || '',
          bill_date: l.billDate || null,
          ref_id: l.refId || '',
          notes: l.notes || '',
        };
      });

    formData.append('items', JSON.stringify([
      ...buildLineData(debitLines, 'debit'),
      ...buildLineData(creditLines, 'credit'),
    ]));

    debitLines.forEach((l, i) => {
      (l.attachments || []).forEach((att, j) => {
        if (att.file) formData.append(`debit_${i}_attachment_${j}`, att.file, att.name);
      });
    });
    creditLines.forEach((l, i) => {
      (l.attachments || []).forEach((att, j) => {
        if (att.file) formData.append(`credit_${i}_attachment_${j}`, att.file, att.name);
      });
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/journal/create/', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        let errMsg = result?.message || 'Failed to create journal entry.';
        if (result?.errors) {
          errMsg += ' Details: ' + JSON.stringify(result.errors);
        }
        setStatus({ type: 'error', message: errMsg });
        return;
      }

      const entryId = result.data?.entry_id || result.data?.id;
      setStatus({ type: 'success', message: `✓ Journal entry #${entryId} created successfully.` });
      resetForm();
    } catch {
      setStatus({ type: 'error', message: 'Network error — could not reach the server.' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ── */
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '0' }}>

      {/* ── Entry Header Card ── */}
      <div style={cardStyle}>
        

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Entry Date *</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Narration / Overall Description</label>
            <input
              type="text"
              placeholder="Brief description of this journal entry…"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Balance Bar ── */}
      <BalanceBar totalDebit={totalDebit} totalCredit={totalCredit} isBalanced={isBalanced} difference={difference} />

      {/* ── Debit + Credit side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 0 }}>

        {/* Debit */}
        <SectionCard
          title="Debit Entries"
          subtitle="Assets increase / liabilities decrease"
          color="#2563eb"
          bg="linear-gradient(135deg, #eff6ff, #dbeafe)"
          icon="▲"
        >
          {debitLines.map((line, i) => (
            <SectionLine
              key={line.id}
              line={line}
              index={i}
              type="debit"
              ledgers={ledgers}
              loadingLedgers={loadingLedgers}
              onChange={updateLine(setDebitLines)}
              onRemove={removeLine(setDebitLines)}
              canRemove={debitLines.length > 1}
            />
          ))}
          <button type="button" onClick={addLine(setDebitLines)} style={addLineBtn('#2563eb')}>
            + Add Debit Line
          </button>
          <div style={lineTotalStyle('#dbeafe', '#2563eb')}>
            <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 600 }}>Total Debit</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>₹{totalDebit.toFixed(2)}</span>
          </div>
        </SectionCard>

        {/* Credit */}
        <SectionCard
          title="Credit Entries"
          subtitle="Liabilities increase / assets decrease"
          color="#16a34a"
          bg="linear-gradient(135deg, #f0fdf4, #dcfce7)"
          icon="▼"
        >
          {creditLines.map((line, i) => (
            <SectionLine
              key={line.id}
              line={line}
              index={i}
              type="credit"
              ledgers={ledgers}
              loadingLedgers={loadingLedgers}
              onChange={updateLine(setCreditLines)}
              onRemove={removeLine(setCreditLines)}
              canRemove={creditLines.length > 1}
            />
          ))}
          <button type="button" onClick={addLine(setCreditLines)} style={addLineBtn('#16a34a')}>
            + Add Credit Line
          </button>
          <div style={lineTotalStyle('#dcfce7', '#16a34a')}>
            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Total Credit</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>₹{totalCredit.toFixed(2)}</span>
          </div>
        </SectionCard>

      </div>

      {/* ── Submit Card ── */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          {isBalanced ? (
            <p style={{ margin: 0, color: '#16a34a', fontWeight: 600, fontSize: 14 }}>✓ Entry is balanced — ready to submit</p>
          ) : totalDebit + totalCredit > 0 ? (
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 600, fontSize: 14 }}>✗ Unbalanced — difference: ₹{difference.toFixed(2)}</p>
          ) : (
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Enter debit and credit amounts above.</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={resetForm} style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isBalanced || submitting}
            style={{
              padding: '11px 28px', borderRadius: 10, border: 'none',
              background: !isBalanced || submitting ? '#9ca3af' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: !isBalanced || submitting ? 'not-allowed' : 'pointer',
              boxShadow: isBalanced && !submitting ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
              transition: 'all 0.2s', minWidth: 160,
            }}
          >
            {submitting ? '⏳ Submitting…' : '✓ Submit Journal Entry'}
          </button>
        </div>
      </div>

      {/* ── Status Message ── */}
      {status && (
        <div style={{
          marginTop: 12, padding: '14px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
          background: status.type === 'success' ? '#f0fdf4' : status.type === 'warning' ? '#fffbeb' : '#fef2f2',
          color: status.type === 'success' ? '#16a34a' : status.type === 'warning' ? '#b45309' : '#dc2626',
          border: `1px solid ${status.type === 'success' ? '#86efac' : status.type === 'warning' ? '#fde68a' : '#fca5a5'}`,
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

/* ── helper sub-components ───────────────────────────────────── */

function SectionCard({ title, subtitle, color, bg, icon, children }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{
        background: bg, padding: '14px 20px',
        borderBottom: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: color, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900,
        }}>{icon}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px' }}>{children}</div>
    </div>
  );
}

function BalanceBar({ totalDebit, totalCredit, isBalanced, difference }) {
  const hasValues = totalDebit + totalCredit > 0;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px', borderRadius: 12, marginBottom: 16,
      background: !hasValues ? '#f9fafb' : isBalanced ? '#f0fdf4' : '#fef2f2',
      border: `2px solid ${!hasValues ? '#e5e7eb' : isBalanced ? '#86efac' : '#fca5a5'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Debit</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>₹{totalDebit.toFixed(2)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: !hasValues ? '#9ca3af' : isBalanced ? '#16a34a' : '#dc2626',
        }}>
          {!hasValues ? '⚖ Awaiting Input' : isBalanced ? '✓ Balanced' : `✗ Difference: ₹${difference.toFixed(2)}`}
        </div>
        {hasValues && !isBalanced && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
            {totalDebit > totalCredit ? `Add ₹${difference.toFixed(2)} to credit` : `Add ₹${difference.toFixed(2)} to debit`}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Credit</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>₹{totalCredit.toFixed(2)}</div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  borderRadius: 14,
  padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
  border: '1px solid #f3f4f6',
  marginBottom: 16,
};

const addLineBtn = (color) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 8,
  border: `1.5px dashed ${color}88`,
  background: `${color}0d`, color,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  marginBottom: 14, transition: 'all 0.15s',
});

const lineTotalStyle = (bg, color) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: bg, borderRadius: 10,
  padding: '10px 16px',
  border: `1px solid ${color}33`,
});
