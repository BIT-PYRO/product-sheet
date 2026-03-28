'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const STORAGE_KEY = 'inventory_tools_v1';

const createToolRow = (id) => ({
  id,
  toolName: '',
  particulars: '',
  department: '',
  quantity: '',
  price: '',
});

export default function ToolsInventoryPage() {
  const [rows, setRows] = useState([createToolRow(1)]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setRows(
        parsed.map((row, index) => ({
          id: index + 1,
          toolName: String(row.toolName || ''),
          particulars: String(row.particulars || ''),
          department: String(row.department || ''),
          quantity: String(row.quantity || ''),
          price: String(row.price || ''),
        }))
      );
    } catch {
      // Keep the page usable if stored data is malformed.
    }
  }, []);

  const updateRow = (id, key, nextValue) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: nextValue } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createToolRow(prev.length + 1)]);
  };

  const deleteRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) return [createToolRow(1)];
      return next.map((row, index) => ({ ...row, id: index + 1 }));
    });
  };

  const saveRows = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    setStatus('Tools inventory saved locally.');
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">TOOLS INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base text-cool-gray">Manage tools with details, owning department, quantity, and price</p>
          </div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        </div>

        {status && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Tool name</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Particulars</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Department</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border/70 last:border-b-0">
                    <td className="px-3 py-2 text-midnight-ink">{row.id}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.toolName}
                        onChange={(e) => updateRow(row.id, 'toolName', e.target.value)}
                        placeholder="Enter tool name"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.particulars}
                        onChange={(e) => updateRow(row.id, 'particulars', e.target.value)}
                        placeholder="Enter particulars"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.department}
                        onChange={(e) => updateRow(row.id, 'department', e.target.value)}
                        placeholder="Enter department"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.price}
                        onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                        placeholder="0.00"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        aria-label={`Delete row ${row.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
            <button
              type="button"
              onClick={saveRows}
              className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              Save
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
