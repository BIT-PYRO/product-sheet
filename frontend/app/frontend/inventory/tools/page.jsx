'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const STORAGE_KEY = 'inventory_tools_v1';

const createToolRow = (id) => ({
  id,
  toolName: '',
  particulars: '',
  department: '',
  quantity: '',
  unit: '',
  location: '',
});

const normalizeToolRow = (row, id) => {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    ...createToolRow(id),
    ...safeRow,
    id,
    toolName: String(safeRow.toolName ?? ''),
    particulars: String(safeRow.particulars ?? ''),
    department: String(safeRow.department ?? ''),
    quantity: String(safeRow.quantity ?? ''),
    unit: String(safeRow.unit ?? ''),
    location: String(safeRow.location ?? ''),
  };
};

export default function ToolsInventoryPage() {
  const [rows, setRows] = useState([createToolRow(1)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRows = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setRows([createToolRow(1)]);
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setRows([createToolRow(1)]);
        return;
      }
      setRows(parsed.map((row, index) => normalizeToolRow(row, index + 1)));
      setStatus('Tools inventory refreshed.');
    } catch {
      setStatus('Unable to refresh saved tools data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (id, key, nextValue) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...normalizeToolRow(row, id), [key]: nextValue } : normalizeToolRow(row, row.id)))
    );
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition"
            >
              <Plus className="h-4 w-4" />
              Add Tool Row
            </button>
            <button
              type="button"
              onClick={saveRows}
              className="inline-flex items-center gap-2 rounded-lg bg-trust-blue px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </div>

        {status && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#F8F9FA]">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Tool name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Particulars</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border last:border-0 transition hover:bg-[#F8F9FA]">
                    <td className="px-3 py-2.5 text-midnight-ink">{row.id}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.toolName ?? ''}
                        onChange={(e) => updateRow(row.id, 'toolName', e.target.value)}
                        placeholder="Enter tool name"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.particulars ?? ''}
                        onChange={(e) => updateRow(row.id, 'particulars', e.target.value)}
                        placeholder="Enter particulars"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.department ?? ''}
                        onChange={(e) => updateRow(row.id, 'department', e.target.value)}
                        placeholder="Enter department"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={row.quantity ?? ''}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.unit ?? ''}
                        onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                        placeholder="PCS"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.location ?? ''}
                        onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                        placeholder="Store room A"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-4 py-2.5">
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

        </section>
      </div>
    </main>
  );
}
