'use client';

import { useEffect, useState } from 'react';

export default function AccountingLedgerSummary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/accounting/ledger-summary/', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.message || 'Failed to load ledger summary.');
        return;
      }

      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      setError('Could not reach ledger summary API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

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
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      borderBottom: '2px solid #e5e7eb',
      fontSize: 12,
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
    },
    td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
    numCell: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
    badge: (type) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      background:
        type === 'asset' ? '#dbeafe' :
        type === 'liability' ? '#fef3c7' :
        type === 'income' ? '#dcfce7' :
        type === 'expense' ? '#fee2e2' : '#f3f4f6',
      color:
        type === 'asset' ? '#1d4ed8' :
        type === 'liability' ? '#a16207' :
        type === 'income' ? '#16a34a' :
        type === 'expense' ? '#dc2626' : '#374151',
    }),
    refreshBtn: {
      padding: '6px 14px',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      background: '#f9fafb',
      cursor: 'pointer',
      fontSize: 13,
    },
    error: {
      padding: '10px 14px',
      borderRadius: 6,
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fca5a5',
      fontSize: 14,
    },
    footerRow: {
      fontWeight: 700,
      background: '#f9fafb',
    },
  };

  const formatAmount = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <p style={{ color: '#6b7280' }}>Loading ledger summary…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.error}>{error}</div>
        <button type="button" onClick={fetchSummary} style={{ ...styles.refreshBtn, marginTop: 12 }}>
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={styles.card}>
        <p style={{ color: '#6b7280' }}>No journal entries found. Create a journal entry first.</p>
      </div>
    );
  }

  /* ── compute totals ── */
  const grandDebit = rows.reduce((sum, r) => sum + Number(r.total_debit || 0), 0);
  const grandCredit = rows.reduce((sum, r) => sum + Number(r.total_credit || 0), 0);

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{rows.length} ledger(s)</span>
        <button type="button" onClick={fetchSummary} style={styles.refreshBtn}>
          ↻ Refresh
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Ledger</th>
            <th style={styles.th}>Type</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Total Debit</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Total Credit</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const balance = Number(row.total_debit || 0) - Number(row.total_credit || 0);
            return (
              <tr key={row.ledger_id}>
                <td style={styles.td}><strong>{row.ledger}</strong></td>
                <td style={styles.td}><span style={styles.badge(row.type)}>{row.type}</span></td>
                <td style={styles.numCell}>{formatAmount(row.total_debit)}</td>
                <td style={styles.numCell}>{formatAmount(row.total_credit)}</td>
                <td style={{ ...styles.numCell, color: balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {formatAmount(Math.abs(balance))} {balance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={styles.footerRow}>
            <td style={styles.td} colSpan={2}>Grand Total</td>
            <td style={styles.numCell}>{formatAmount(grandDebit)}</td>
            <td style={styles.numCell}>{formatAmount(grandCredit)}</td>
            <td style={styles.numCell}>
              {formatAmount(Math.abs(grandDebit - grandCredit))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
