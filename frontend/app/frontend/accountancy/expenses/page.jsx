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

  return (
    <div className="max-w-5xl mx-auto px-5 py-5 font-sans">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="m-0 text-2xl font-bold text-midnight-ink">Expenses</h2>
          <p className="mt-1 text-sm text-cool-gray">Track and manage all business expenses.</p>
        </div>
        <Link
          href="/accountancy/expenses/add"
          className="px-4 py-2.5 bg-trust-blue hover:bg-deep-blue text-white rounded-lg text-sm font-semibold no-underline transition"
        >
          ＋ Add Expense
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-lg text-danger mb-5 text-sm">
          {error}
        </div>
      )}

      <div className="bg-background border border-soft-border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-cloud-gray border-b border-soft-border">
              <th className="px-4 py-3 text-xs font-semibold text-cool-gray uppercase">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-cool-gray uppercase">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-cool-gray uppercase">Account</th>
              <th className="px-4 py-3 text-xs font-semibold text-cool-gray uppercase">Description</th>
              <th className="px-4 py-3 text-xs font-semibold text-cool-gray uppercase text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-cool-gray text-sm">Loading expenses...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-cool-gray text-sm">No expenses found. Click &apos;Add Expense&apos; to create one.</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-soft-border last:border-0 hover:bg-muted transition">
                  <td className="px-4 py-3.5 text-sm text-midnight-ink">{exp.date}</td>
                  <td className="px-4 py-3.5 text-sm text-midnight-ink font-medium">
                    <span className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                      {exp.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-text">{exp.account_name}</td>
                  <td className="px-4 py-3.5 text-sm text-cool-gray">{exp.description}</td>
                  <td className="px-4 py-3.5 text-[15px] text-midnight-ink font-bold text-right">
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
