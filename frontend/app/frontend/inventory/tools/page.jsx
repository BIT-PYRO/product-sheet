'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

export default function ToolsInventoryPage() {
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

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tools?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
      setEdits({});
      setNewRows([]);
    } catch (err) {
      showStatus(err.message || 'Failed to load tools', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const getField = (row, key) => edits[row.id]?.[key] !== undefined ? edits[row.id][key] : (row[key] ?? '');

  const setField = (id, key, value) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const setNewField = (localId, key, value) => {
    setNewRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    setNewRows((prev) => [...prev, { _localId: Date.now(), tool_name: '', particulars: '', department: '', quantity: '', unit: '', location: '' }]);
  };

  const deleteRow = async (id) => {
    try {
      const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const c = { ...prev }; delete c[id]; return c; });
      showStatus('Tool deleted.');
    } catch (err) {
      showStatus(err.message || 'Delete failed', 'error');
    }
  };

  const removeNewRow = (localId) => setNewRows((prev) => prev.filter((r) => r._localId !== localId));

  const saveAll = async () => {
    setSaving(true);
    try {
      const patchPromises = Object.entries(edits).map(async ([id, fields]) => {
        const res = await fetch(`/api/tools/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Error updating tool ${id}`); }
        return res.json();
      });
      const postPromises = newRows.filter((r) => r.tool_name.trim()).map(async (r) => {
        const { _localId, ...data } = r;
        const res = await fetch('/api/tools/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, quantity: data.quantity || 0 }) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || 'Error creating tool'); }
        return res.json();
      });
      await Promise.all([...patchPromises, ...postPromises]);
      showStatus('Tools saved successfully.');
      await fetchTools();
    } catch (err) {
      showStatus(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">TOOLS INVENTORY</h1>
          </div>
          <button type="button" onClick={fetchTools} className="inline-flex items-center gap-1.5 rounded-lg border border-soft-border bg-white px-3 py-1.5 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-cool-gray">Manage tools with details, owning department, quantity, unit, and location</p>
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
        </div>

        {status && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm">
          {loading ? (
            <p className="py-10 text-center text-sm text-cool-gray">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead>
                  <tr className="bg-cloud-gray border-b border-soft-border">
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Tool name</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Particulars</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Department</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Unit</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Location</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-soft-border/70 last:border-b-0">
                      <td className="px-3 py-2 text-midnight-ink">{index + 1}</td>
                      <td className="px-3 py-2"><input type="text" value={getField(row, 'tool_name')} onChange={(e) => setField(row.id, 'tool_name', e.target.value)} placeholder="Enter tool name" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={getField(row, 'particulars')} onChange={(e) => setField(row.id, 'particulars', e.target.value)} placeholder="Enter particulars" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={getField(row, 'department')} onChange={(e) => setField(row.id, 'department', e.target.value)} placeholder="Enter department" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="number" value={getField(row, 'quantity')} onChange={(e) => setField(row.id, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={getField(row, 'unit')} onChange={(e) => setField(row.id, 'unit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={getField(row, 'location')} onChange={(e) => setField(row.id, 'location', e.target.value)} placeholder="Store room A" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {newRows.map((row, index) => (
                    <tr key={row._localId} className="border-b border-soft-border/70 last:border-b-0 bg-sky-50/40">
                      <td className="px-3 py-2 text-midnight-ink">{rows.length + index + 1}</td>
                      <td className="px-3 py-2"><input type="text" value={row.tool_name} onChange={(e) => setNewField(row._localId, 'tool_name', e.target.value)} placeholder="Enter tool name" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={row.particulars} onChange={(e) => setNewField(row._localId, 'particulars', e.target.value)} placeholder="Enter particulars" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={row.department} onChange={(e) => setNewField(row._localId, 'department', e.target.value)} placeholder="Enter department" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="number" value={row.quantity} onChange={(e) => setNewField(row._localId, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={row.unit} onChange={(e) => setNewField(row._localId, 'unit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2"><input type="text" value={row.location} onChange={(e) => setNewField(row._localId, 'location', e.target.value)} placeholder="Store room A" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeNewRow(row._localId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && newRows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-cool-gray">No tools found. Add a row to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
                <Plus className="h-4 w-4" /> Add Row
              </button>
              <button type="button" onClick={saveAll} disabled={saving} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
