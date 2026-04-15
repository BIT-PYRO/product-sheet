'use client';

import { useEffect, useMemo, useState } from 'react';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createRow() {
  return {
    ledger: '',
    debit: '',
    credit: '',
  };
}

export default function AccountingJournalForm() {
  const [date, setDate] = useState(todayDate());
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([createRow(), createRow()]);
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const loadLedgers = async () => {
      setLoadingLedgers(true);
      try {
        const response = await fetch('/api/accounting/ledgers/', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          setLedgers([]);
          setStatus({
            type: 'error',
            message: payload?.message || 'Failed to load ledgers.',
          });
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

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const debit = Number(row.debit || 0);
        const credit = Number(row.credit || 0);
        return {
          debit: acc.debit + (Number.isFinite(debit) ? debit : 0),
          credit: acc.credit + (Number.isFinite(credit) ? credit : 0),
        };
      },
      { debit: 0, credit: 0 }
    );
  }, [rows]);

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createRow()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

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
        headers: {
          'Content-Type': 'application/json',
        },
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

      setStatus({ type: 'success', message: 'Journal entry created successfully.' });
      setDescription('');
      setRows([createRow(), createRow()]);
    } catch {
      setStatus({ type: 'error', message: 'Network error while creating journal entry.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="journal-date">Date</label>
        <br />
        <input
          id="journal-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="journal-description">Description</label>
        <br />
        <textarea
          id="journal-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
      </div>

      <h2>Items</h2>
      {rows.map((row, index) => (
        <div key={`row-${index}`} style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={row.ledger}
            onChange={(event) => updateRow(index, 'ledger', event.target.value)}
            required
            disabled={loadingLedgers}
          >
            <option value="">Select ledger</option>
            {ledgers.map((ledger) => (
              <option key={ledger.id} value={ledger.id}>
                {ledger.name} ({ledger.type})
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Debit"
            value={row.debit}
            onChange={(event) => updateRow(index, 'debit', event.target.value)}
          />

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Credit"
            value={row.credit}
            onChange={(event) => updateRow(index, 'credit', event.target.value)}
          />
        </div>
      ))}

      <button type="button" onClick={addRow}>
        Add row
      </button>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <strong>Total Debit:</strong> {totals.debit.toFixed(2)}
        {' | '}
        <strong>Total Credit:</strong> {totals.credit.toFixed(2)}
      </div>

      <button type="submit" disabled={submitting || loadingLedgers}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>

      {status && (
        <p style={{ marginTop: 12, color: status.type === 'error' ? 'red' : 'green' }}>
          {status.message}
        </p>
      )}
    </form>
  );
}
