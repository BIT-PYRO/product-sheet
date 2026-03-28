'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const STOCK_KEY = 'inventory_others_stock_v1';

const createStockRow = (id) => ({
  id,
  itemName: '',
  category: '',
  quantity: '',
  unit: 'PCS',
  minLevel: '',
  notes: '',
});

const UNITS = ['PCS', 'BOX', 'PACKET', 'BOTTLE', 'KG', 'GM', 'LITER'];
const CATEGORIES = ['Pantry', 'Stationery', 'Housekeeping', 'Packaging', 'Utilities', 'Other'];

export default function OthersInventoryPage() {
  const [stockRows, setStockRows] = useState([createStockRow(1)]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try {
      const rawStock = localStorage.getItem(STOCK_KEY);

      if (rawStock) {
        const parsed = JSON.parse(rawStock);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStockRows(
            parsed.map((row, index) => ({
              id: index + 1,
              itemName: String(row.itemName || ''),
              category: String(row.category || ''),
              quantity: String(row.quantity || ''),
              unit: String(row.unit || 'PCS'),
              minLevel: String(row.minLevel || ''),
              notes: String(row.notes || ''),
            }))
          );
        }
      }
    } catch {
      // Keep page usable if cached data is malformed.
    }
  }, []);

  const lowStockCount = useMemo(() => {
    return stockRows.filter((row) => {
      const qty = Number(row.quantity || 0);
      const min = Number(row.minLevel || 0);
      return min > 0 && qty <= min;
    }).length;
  }, [stockRows]);

  const setStockValue = (id, key, value) => {
    setStockRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addStockRow = () => {
    setStockRows((prev) => [...prev, createStockRow(prev.length + 1)]);
  };

  const deleteStockRow = (id) => {
    setStockRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) return [createStockRow(1)];
      return next.map((row, index) => ({ ...row, id: index + 1 }));
    });
  };

  const saveStock = () => {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stockRows));
    setStatus('Others inventory stock saved locally.');
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">OTHERS INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base text-cool-gray">Track consumables and purchased items like coffee powder, water bottles, tissue, and more.</p>
          </div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-full bg-white border border-soft-border px-3 py-1 text-xs font-semibold text-midnight-ink">
            Total Items: {stockRows.length}
          </span>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
            Low Stock: {lowStockCount}
          </span>
        </div>

        {status && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-midnight-ink">Current Stock</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addStockRow}
                className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
              <button
                type="button"
                onClick={saveStock}
                className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition"
              >
                Save Stock
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-14">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Item Name</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Min Level</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Notes</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border/70 last:border-b-0">
                    <td className="px-3 py-2 text-midnight-ink">{row.id}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.itemName}
                        onChange={(e) => setStockValue(row.id, 'itemName', e.target.value)}
                        placeholder="Coffee powder"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.category}
                        onChange={(e) => setStockValue(row.id, 'category', e.target.value)}
                        className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => setStockValue(row.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.unit}
                        onChange={(e) => setStockValue(row.id, 'unit', e.target.value)}
                        className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      >
                        {UNITS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.minLevel}
                        onChange={(e) => setStockValue(row.id, 'minLevel', e.target.value)}
                        placeholder="10"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => setStockValue(row.id, 'notes', e.target.value)}
                        placeholder="Any note"
                        className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => deleteStockRow(row.id)}
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
