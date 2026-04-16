'use client';

import { useEffect, useMemo, useState } from 'react';

/* ── helpers ─────────────────────────────────────────────── */

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createRow() {
  return { ledger: '', debit: '', credit: '' };
}

/* ── component ───────────────────────────────────────────── */

export default function AccountingJournalForm() {
  const [date, setDate] = useState(todayDate());
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([createRow(), createRow()]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  /* ── fetch ledgers on mount ── */
  useEffect(() => {
    const loadLedgers = async () => {
      setLoadingLedgers(true);
      try {
        const response = await fetch('/api/accounting/ledgers/', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          setLedgers([]);
          setStatus({ type: 'error', message: payload?.message || 'Failed to load ledgers.' });
          return;
        }
        setLedgers(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        setLedgers([]);
        setStatus({ type: 'error', message: 'Could not reach ledger API.' });
      } finally {
        setLoadingLedgers(false);
      }
    };

    loadLedgers();
  }, []);

  /* ── derived state ── */
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const d = Number(row.debit || 0);
        const c = Number(row.credit || 0);
        return {
          debit: acc.debit + (Number.isFinite(d) ? d : 0),
          credit: acc.credit + (Number.isFinite(c) ? c : 0),
        };
      },
      { debit: 0, credit: 0 },
    );
  }, [rows]);

  const isBalanced = totals.debit > 0 && totals.debit === totals.credit;
  const hasEnoughRows = rows.length >= 2;
  const allLedgersSelected = rows.every((r) => r.ledger !== '');
  const canSubmit = isBalanced && hasEnoughRows && allLedgersSelected && !submitting && !loadingLedgers;

  /* ── row manipulation ── */
  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);

  const removeRow = (index) => {
    if (rows.length <= 2) return; // keep minimum 2 rows
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── submit handler ── */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!canSubmit) return;

    const payload = {
      date,
      description,
      items: rows.map((row) => ({
        ledger: row.ledger ? Number(row.ledger) : null,
        debit: row.debit === '' ? 0 : Number(row.debit),
        credit: row.credit === '' ? 0 : Number(row.credit),
      })),
    };

    setSubmitting(true);
    try {
      const response = await fetch('/api/accounting/journal/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errors = result?.errors ? JSON.stringify(result.errors) : '';
        setStatus({
          type: 'error',
          message: result?.message || errors || 'Failed to create journal entry.',
        });
        return;
      }

      const entryId = result.data?.entry_id || result.data?.id;
      setStatus({
        type: 'success',
        message: `Journal entry #${entryId} created successfully.`,
      });
      setDescription('');
      setDate(todayDate());
      setRows([createRow(), createRow()]);
    } catch {
      setStatus({ type: 'error', message: 'Network error while creating journal entry.' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── styles ── */
  const styles = {
    card: {
      maxWidth: 800,
      margin: '0 auto',
      background: '#fff',
      borderRadius: 8,
      padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    },
    label: { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 14 },
    input: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      fontSize: 14,
      outline: 'none',
    },
    textarea: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      fontSize: 14,
      resize: 'vertical',
      outline: 'none',
    },
    select: {
      flex: 2,
      minWidth: 160,
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      fontSize: 14,
      outline: 'none',
    },
    numInput: {
      flex: 1,
      minWidth: 100,
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      fontSize: 14,
      outline: 'none',
    },
    deleteBtn: {
      padding: '6px 12px',
      border: '1px solid #fca5a5',
      borderRadius: 6,
      background: '#fef2f2',
      color: '#dc2626',
      cursor: 'pointer',
      fontSize: 14,
    },
    addBtn: {
      padding: '8px 16px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      background: '#f9fafb',
      cursor: 'pointer',
      fontSize: 14,
    },
    submitBtn: (disabled) => ({
      padding: '10px 24px',
      border: 'none',
      borderRadius: 6,
      background: disabled ? '#9ca3af' : '#2563eb',
      color: '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 15,
      fontWeight: 600,
    }),
    totalsBar: (balanced) => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: 6,
      marginTop: 12,
      border: `1px solid ${balanced ? '#86efac' : '#fca5a5'}`,
      background: balanced ? '#f0fdf4' : '#fef2f2',
    }),
    statusMsg: (type) => ({
      marginTop: 12,
      padding: '10px 14px',
      borderRadius: 6,
      background: type === 'error' ? '#fef2f2' : '#f0fdf4',
      color: type === 'error' ? '#dc2626' : '#16a34a',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#86efac'}`,
      fontSize: 14,
    }),
    colHeader: { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' },
  };

  /* ── render ── */
  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      {/* Header fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label htmlFor="journal-date" style={styles.label}>Date</label>
          <input
            id="journal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div>
          <label htmlFor="journal-description" style={styles.label}>Description</label>
          <textarea
            id="journal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Paid rent for April"
            style={styles.textarea}
          />
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 2 }}>
        <span style={{ ...styles.colHeader, flex: 2, minWidth: 160 }}>Ledger</span>
        <span style={{ ...styles.colHeader, flex: 1, minWidth: 100 }}>Debit (₹)</span>
        <span style={{ ...styles.colHeader, flex: 1, minWidth: 100 }}>Credit (₹)</span>
        <span style={{ width: 70 }} />
      </div>

      {/* Item rows */}
      {rows.map((row, index) => (
        <div key={`row-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select
            value={row.ledger}
            onChange={(e) => updateRow(index, 'ledger', e.target.value)}
            required
            disabled={loadingLedgers}
            style={styles.select}
          >
            <option value="">Select ledger</option>
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={row.debit}
            onChange={(e) => updateRow(index, 'debit', e.target.value)}
            style={styles.numInput}
          />

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={row.credit}
            onChange={(e) => updateRow(index, 'credit', e.target.value)}
            style={styles.numInput}
          />

          <button
            type="button"
            onClick={() => removeRow(index)}
            disabled={rows.length <= 2}
            title="Remove row"
            style={{
              ...styles.deleteBtn,
              opacity: rows.length <= 2 ? 0.4 : 1,
              cursor: rows.length <= 2 ? 'not-allowed' : 'pointer',
              width: 70,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add row */}
      <button type="button" onClick={addRow} style={styles.addBtn}>
        + Add Row
      </button>

      {/* Totals bar */}
      <div style={styles.totalsBar(isBalanced)}>
        <span>
          <strong>Total Debit:</strong> ₹{totals.debit.toFixed(2)}
        </span>
        <span style={{ fontSize: 18 }}>{isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
        <span>
          <strong>Total Credit:</strong> ₹{totals.credit.toFixed(2)}
        </span>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={!canSubmit} style={styles.submitBtn(!canSubmit)}>
          {submitting ? 'Submitting…' : 'Submit Journal Entry'}
        </button>
        {!isBalanced && totals.debit + totals.credit > 0 && (
          <span style={{ color: '#dc2626', fontSize: 13 }}>
            Difference: ₹{Math.abs(totals.debit - totals.credit).toFixed(2)}
          </span>
        )}
      </div>

      {/* Status message */}
      {status && <div style={styles.statusMsg(status.type)}>{status.message}</div>}
    </form>
  );
}
