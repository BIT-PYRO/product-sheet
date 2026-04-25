'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExpensesListPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const res = await fetch('/api/accounting/expenses/', { cache: 'no-store' });
        const result = await res.json().catch(() => null);
        if (res.ok && result?.success) {
          setExpenses(result.data || []);
        } else {
          setError(result?.message || 'Failed to fetch expenses.');
        }
      } catch (err) {
        setError('Network error while fetching expenses.');
      } finally {
        setLoading(false);
      }
    }
    fetchExpenses();
  }, []);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalThisMonth = expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Expenses Dashboard</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>Track and manage all business expenses.</p>
        </div>
        <Link 
          href="/accountancy/expenses/add"
          style={{
            background: '#2563eb', color: '#fff', padding: '10px 18px', 
            borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none'
          }}
        >
          ＋ Add Expense
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>This Month</p>
          <h3 style={{ margin: 0, fontSize: 24, color: '#111827' }}>₹{totalThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses (All Time)</p>
          <h3 style={{ margin: 0, fontSize: 24, color: '#111827' }}>₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Account</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading expenses...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No expenses found. Click 'Add Expense' to create one.</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#111827' }}>{exp.date}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#111827', fontWeight: 500 }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: 12, fontSize: 12 }}>
                      {exp.category_name}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>{exp.account_name}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#4b5563' }}>{exp.description}</td>
                  <td style={{ padding: '14px 16px', fontSize: 15, color: '#111827', fontWeight: 700, textAlign: 'right' }}>
                    ₹{Number(exp.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
