'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const UNITS = ['PCS', 'BOX', 'PACKET', 'BOTTLE', 'KG', 'GM', 'LITER'];
const CATEGORIES = ['Pantry', 'Stationery', 'Housekeeping', 'Packaging', 'Utilities', 'Other'];

export default function OthersInventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [edits, setEdits] = useState({});
  const [newRows, setNewRows] = useState([]);

  const showStatus = (msg, type = 'success') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/others?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
      setEdits({});
      setNewRows([]);
    } catch (err) {
      showStatus(err.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getField = (row, key) => edits[row.id]?.[key] !== undefined ? edits[row.id][key] : (row[key] ?? '');

  const setField = (id, key, value) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const setNewField = (localId, key, value) => {
    setNewRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    setNewRows((prev) => [...prev, { _localId: Date.now(), item_name: '', category: '', quantity: '', unit: 'PCS', min_level: '', notes: '' }]);
  };

  const deleteRow = async (id) => {
    try {
      const res = await fetch(`/api/others/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const c = { ...prev }; delete c[id]; return c; });
      showStatus('Item deleted.');
    } catch (err) {
      showStatus(err.message || 'Delete failed', 'error');
    }
  };

  const removeNewRow = (localId) => setNewRows((prev) => prev.filter((r) => r._localId !== localId));

  const saveAll = async () => {
    setSaving(true);
    try {
      const patchPromises = Object.entries(edits).map(async ([id, fields]) => {
        const res = await fetch(`/api/others/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Error updating item ${id}`); }
        return res.json();
      });
      const postPromises = newRows.filter((r) => r.item_name.trim()).map(async (r) => {
        const { _localId, ...data } = r;
        const res = await fetch('/api/others/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, quantity: data.quantity || 0, min_level: data.min_level || 0 }) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || 'Error creating item'); }
        return res.json();
      });
      await Promise.all([...patchPromises, ...postPromises]);
      showStatus('Others inventory saved successfully.');
      await fetchItems();
    } catch (err) {
      showStatus(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const lowStockCount = useMemo(() => {
    return rows.filter((row) => {
      const qty = Number(edits[row.id]?.quantity ?? row.quantity ?? 0);
      const min = Number(edits[row.id]?.min_level ?? row.min_level ?? 0);
      return min > 0 && qty <= min;
    }).length;
  }, [rows, edits]);

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">OTHERS INVENTORY</h1>
          </div>
          <button type="button" onClick={fetchItems} className="inline-flex items-center gap-1.5 rounded-lg border border-soft-border bg-white px-3 py-1.5 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <p className="text-base text-cool-gray">Track consumables and purchased items like coffee powder, water bottles, tissue, and more.</p>
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
        </div>

        {!loading && (
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full bg-white border border-soft-border px-3 py-1 text-xs font-semibold text-midnight-ink">Total Items: {rows.length}</span>
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">Low Stock: {lowStockCount}</span>
          </div>
        )}

        {status && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-midnight-ink">Current Stock</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
                <Plus className="h-4 w-4" /> Add Item
              </button>
              <button type="button" onClick={saveAll} disabled={saving} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Stock'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-cool-gray">Loading…</p>
          ) : (
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
                  {rows.map((row, index) => {
                    const qty = Number(getField(row, 'quantity') || 0);
                    const min = Number(getField(row, 'min_level') || 0);
                    const isLow = min > 0 && qty <= min;
                    return (
                      <tr key={row.id} className={`border-b border-soft-border/70 last:border-b-0 ${isLow ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-3 py-2 text-midnight-ink">{index + 1}</td>
                        <td className="px-3 py-2"><input type="text" value={getField(row, 'item_name')} onChange={(e) => setField(row.id, 'item_name', e.target.value)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                        <td className="px-3 py-2">
                          <select value={getField(row, 'category')} onChange={(e) => setField(row.id, 'category', e.target.value)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                            <option value="">Select category</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" value={getField(row, 'quantity')} onChange={(e) => setField(row.id, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                        <td className="px-3 py-2">
                          <select value={getField(row, 'unit')} onChange={(e) => setField(row.id, 'unit', e.target.value)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" value={getField(row, 'min_level')} onChange={(e) => setField(row.id, 'min_level', e.target.value)} placeholder="10" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                        <td className="px-3 py-2"><input type="text" value={getField(row, 'notes')} onChange={(e) => setField(row.id, 'notes', e.target.value)} placeholder="Any note" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {newRows.map((row, index) => (
                    <tr key={row._localId} className="border-b border-soft-border/70 last:border-b-0 bg-sky-50/40">
                      <td className="px-3 py-2 text-midnight-ink">{rows.length + index + 1}</td>
                      <td className="px-3 py-2"><input type="text" value={row.item_name} onChange={(e) => setNewField(row._localId, 'item_name', e.target.value)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setNewField(row._localId, 'category', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          <option value="">Select category</option>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" value={row.quantity} onChange={(e) => setNewField(row._localId, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2">
                        <select value={row.unit} onChange={(e) => setNewField(row._localId, 'unit', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" value={row.min_level} onChange={(e) => setNewField(row._localId, 'min_level', e.target.value)} placeholder="10" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={row.notes} onChange={(e) => setNewField(row._localId, 'notes', e.target.value)} placeholder="Any note" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeNewRow(row._localId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && newRows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-cool-gray">No items found. Add an item to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
