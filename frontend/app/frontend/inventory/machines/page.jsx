'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
const STATE_OPTIONS = [
  { key: 'running', label: 'Running' },
  { key: 'idle', label: 'Idle' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'maintenance', label: 'Under Maintenance' },
];

const STATE_FIELDS = {
  running:     { qty: 'running_qty',     unit: 'running_unit',     location: 'running_location' },
  idle:        { qty: 'idle_qty',        unit: 'idle_unit',        location: 'idle_location' },
  breakdown:   { qty: 'breakdown_qty',   unit: 'breakdown_unit',   location: 'breakdown_location' },
  maintenance: { qty: 'maintenance_qty', unit: 'maintenance_unit', location: 'maintenance_location' },
};

// camelCase frontend key → snake_case API field
const FIELD_MAP = {
  machineName:       'machine_name',
  particulars:       'particulars',
  department:        'department',
  minRequiredStock:  'min_required_stock',
  runningQty:        'running_qty',
  runningUnit:       'running_unit',
  runningLocation:   'running_location',
  idleQty:           'idle_qty',
  idleUnit:          'idle_unit',
  idleLocation:      'idle_location',
  breakdownQty:      'breakdown_qty',
  breakdownUnit:     'breakdown_unit',
  breakdownLocation: 'breakdown_location',
  maintenanceQty:    'maintenance_qty',
  maintenanceUnit:   'maintenance_unit',
  maintenanceLocation:'maintenance_location',
};

const fromApi = (item) => ({
  id:                  item.id,
  machineName:         item.machine_name        ?? '',
  particulars:         item.particulars         ?? '',
  department:          item.department          ?? '',
  minRequiredStock:    item.min_required_stock  ?? '',
  runningQty:          item.running_qty         ?? '',
  runningUnit:         item.running_unit        ?? '',
  runningLocation:     item.running_location    ?? '',
  idleQty:             item.idle_qty            ?? '',
  idleUnit:            item.idle_unit           ?? '',
  idleLocation:        item.idle_location       ?? '',
  breakdownQty:        item.breakdown_qty       ?? '',
  breakdownUnit:       item.breakdown_unit      ?? '',
  breakdownLocation:   item.breakdown_location  ?? '',
  maintenanceQty:      item.maintenance_qty     ?? '',
  maintenanceUnit:     item.maintenance_unit    ?? '',
  maintenanceLocation: item.maintenance_location ?? '',
});

export default function MachinesInventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [edits, setEdits] = useState({});
  const [activePanel, setActivePanel] = useState('');
  const [newMachine, setNewMachine] = useState({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
  const [addStockForm, setAddStockForm] = useState({ machineId: '', stateKey: 'running', qty: '', unit: '', location: '' });
  const [updateStockForm, setUpdateStockForm] = useState({ machineId: '', fromState: 'idle', toState: 'running', qty: '' });

  const showStatus = (msg, type = 'success') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 3000);
  };

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/machines?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.results ?? []);
      setRows(items.map(fromApi));
      setEdits({});
    } catch (e) {
      showStatus(`Failed to load machines: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);

  // Merge persisted row with any pending in-memory edits
  const getRow = (id) => {
    const base = rows.find((r) => r.id === id) ?? {};
    return { ...base, ...(edits[id] ?? {}) };
  };

  const updateEdit = (id, key, value) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));
  };

  const handleAddMachine = async () => {
    const machineName = newMachine.machineName.trim();
    if (!machineName) { showStatus('Machine Name is required.', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        machine_name:       machineName,
        particulars:        newMachine.particulars.trim(),
        department:         newMachine.department.trim(),
        min_required_stock: newMachine.minRequiredStock || '0',
      };
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setNewMachine({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
      setActivePanel('');
      await fetchMachines();
      showStatus('Machine added.');
    } catch (e) {
      showStatus(`Failed to add machine: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMachineStock = async () => {
    const machineId = Number(addStockForm.machineId);
    const qtyToAdd = Number(addStockForm.qty);
    const target = STATE_FIELDS[addStockForm.stateKey];
    if (!machineId || !target) { showStatus('Select a machine and stock state.', 'error'); return; }
    if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) { showStatus('Enter a valid quantity greater than 0.', 'error'); return; }
    const row = getRow(machineId);
    const currentQty = Number(row[addStockForm.stateKey + 'Qty'] || 0);
    const body = {
      [target.qty]: String(currentQty + qtyToAdd),
      ...(addStockForm.unit.trim()     ? { [target.unit]:     addStockForm.unit.trim() }     : {}),
      ...(addStockForm.location.trim() ? { [target.location]: addStockForm.location.trim() } : {}),
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setAddStockForm((prev) => ({ ...prev, qty: '', unit: '', location: '' }));
      await fetchMachines();
      showStatus('Stock added.');
    } catch (e) {
      showStatus(`Failed to add stock: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMachineStock = async () => {
    const machineId = Number(updateStockForm.machineId);
    const qtyToMove = Number(updateStockForm.qty);
    const from = STATE_FIELDS[updateStockForm.fromState];
    const to   = STATE_FIELDS[updateStockForm.toState];
    if (!machineId || !from || !to) { showStatus('Select machine and valid from/to states.', 'error'); return; }
    if (updateStockForm.fromState === updateStockForm.toState) { showStatus('From and To states must be different.', 'error'); return; }
    if (!Number.isFinite(qtyToMove) || qtyToMove <= 0) { showStatus('Enter a valid transfer quantity greater than 0.', 'error'); return; }
    const row = getRow(machineId);
    const fromQty = Number(row[updateStockForm.fromState + 'Qty'] || 0);
    const toQty   = Number(row[updateStockForm.toState   + 'Qty'] || 0);
    if (fromQty < qtyToMove) { showStatus('Not enough quantity in source state.', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        [from.qty]: String(fromQty - qtyToMove),
        [to.qty]:   String(toQty   + qtyToMove),
      };
      const res = await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setUpdateStockForm((prev) => ({ ...prev, qty: '' }));
      await fetchMachines();
      showStatus('Stock state updated.');
    } catch (e) {
      showStatus(`Failed to update stock: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRow = async (id) => {
    const changes = edits[id];
    if (!changes || Object.keys(changes).length === 0) return;
    setSaving(true);
    try {
      const body = {};
      for (const [k, v] of Object.entries(changes)) {
        body[FIELD_MAP[k] ?? k] = v;
      }
      const res = await fetch(`/api/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await fetchMachines();
      showStatus('Machine saved.');
    } catch (e) {
      showStatus(`Failed to save: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      showStatus(`Failed to delete: ${e.message}`, 'error');
    }
  };

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MACHINES INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base text-cool-gray">Track machine stock and condition-wise quantities, units, and locations.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMachines}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Link>
          </div>
        </div>

        {status && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        <section className="mb-4 rounded-xl border border-soft-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'addMachine' ? '' : 'addMachine'))}
              className="rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-semibold text-midnight-ink hover:border-trust-blue transition"
            >
              Add Machine
            </button>
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'addStock' ? '' : 'addStock'))}
              className="rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-semibold text-midnight-ink hover:border-trust-blue transition"
            >
              Add Machine Stock
            </button>
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'updateStock' ? '' : 'updateStock'))}
              className="rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-semibold text-midnight-ink hover:border-trust-blue transition"
            >
              Update Machine Stock
            </button>
          </div>

          {activePanel === 'addMachine' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input type="text" value={newMachine.machineName} onChange={(e) => setNewMachine((prev) => ({ ...prev, machineName: e.target.value }))} placeholder="Machine Name" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <input type="text" value={newMachine.particulars} onChange={(e) => setNewMachine((prev) => ({ ...prev, particulars: e.target.value }))} placeholder="Particulars" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <input type="text" value={newMachine.department} onChange={(e) => setNewMachine((prev) => ({ ...prev, department: e.target.value }))} placeholder="Department" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <input type="number" value={newMachine.minRequiredStock} onChange={(e) => setNewMachine((prev) => ({ ...prev, minRequiredStock: e.target.value }))} placeholder="Minimum Required in Stock" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <button type="button" onClick={handleAddMachine} disabled={saving} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-50">Add Machine</button>
            </div>
          )}

          {activePanel === 'addStock' && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <select value={addStockForm.machineId} onChange={(e) => setAddStockForm((prev) => ({ ...prev, machineId: e.target.value }))} className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select Machine</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>{row.machineName || `Machine ${row.id}`}</option>
                ))}
              </select>
              <select value={addStockForm.stateKey} onChange={(e) => setAddStockForm((prev) => ({ ...prev, stateKey: e.target.value }))} className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                {STATE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <input type="number" value={addStockForm.qty} onChange={(e) => setAddStockForm((prev) => ({ ...prev, qty: e.target.value }))} placeholder="Qty to add" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <input type="text" value={addStockForm.unit} onChange={(e) => setAddStockForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="Unit (optional)" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <input type="text" value={addStockForm.location} onChange={(e) => setAddStockForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location (optional)" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <button type="button" onClick={handleAddMachineStock} disabled={saving} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-50">Add Stock</button>
            </div>
          )}

          {activePanel === 'updateStock' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select value={updateStockForm.machineId} onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, machineId: e.target.value }))} className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select Machine</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>{row.machineName || `Machine ${row.id}`}</option>
                ))}
              </select>
              <select value={updateStockForm.fromState} onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, fromState: e.target.value }))} className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                {STATE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>From: {option.label}</option>
                ))}
              </select>
              <select value={updateStockForm.toState} onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, toState: e.target.value }))} className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                {STATE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>To: {option.label}</option>
                ))}
              </select>
              <input type="number" value={updateStockForm.qty} onChange={(e) => setUpdateStockForm((prev) => ({ ...prev, qty: e.target.value }))} placeholder="Qty to move" className="h-9 rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              <button type="button" onClick={handleUpdateMachineStock} disabled={saving} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-50">Update Stock</button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm">
          {loading ? (
            <div className="py-10 text-center text-sm text-cool-gray">Loading machines...</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2360px] border-collapse text-sm">
              <thead>
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[170px]">Machine Name</th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[170px]">Particulars</th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[170px]">Department</th>
                  <th colSpan={3} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-midnight-ink">Running</th>
                  <th colSpan={3} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-midnight-ink">Idle</th>
                  <th colSpan={3} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-midnight-ink">Breakdown</th>
                  <th colSpan={3} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-midnight-ink">Under Maintenance</th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[210px]">Minimum Required in Stock</th>
                  <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-28">Action</th>
                </tr>
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const e = edits[row.id] ?? {};
                  const d = { ...row, ...e };
                  const isDirty = Object.keys(e).length > 0;
                  return (
                    <tr key={row.id} className={`border-b border-soft-border/70 last:border-b-0 ${isDirty ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-3 py-2 text-midnight-ink">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.machineName} onChange={(ev) => updateEdit(row.id, 'machineName', ev.target.value)} placeholder="Enter machine name" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.particulars} onChange={(ev) => updateEdit(row.id, 'particulars', ev.target.value)} placeholder="Enter particulars" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.department} onChange={(ev) => updateEdit(row.id, 'department', ev.target.value)} placeholder="Enter department" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <input type="number" value={d.runningQty} onChange={(ev) => updateEdit(row.id, 'runningQty', ev.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.runningUnit} onChange={(ev) => updateEdit(row.id, 'runningUnit', ev.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.runningLocation} onChange={(ev) => updateEdit(row.id, 'runningLocation', ev.target.value)} placeholder="Line 1" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <input type="number" value={d.idleQty} onChange={(ev) => updateEdit(row.id, 'idleQty', ev.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.idleUnit} onChange={(ev) => updateEdit(row.id, 'idleUnit', ev.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.idleLocation} onChange={(ev) => updateEdit(row.id, 'idleLocation', ev.target.value)} placeholder="Warehouse" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <input type="number" value={d.breakdownQty} onChange={(ev) => updateEdit(row.id, 'breakdownQty', ev.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.breakdownUnit} onChange={(ev) => updateEdit(row.id, 'breakdownUnit', ev.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.breakdownLocation} onChange={(ev) => updateEdit(row.id, 'breakdownLocation', ev.target.value)} placeholder="Repair bay" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <input type="number" value={d.maintenanceQty} onChange={(ev) => updateEdit(row.id, 'maintenanceQty', ev.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.maintenanceUnit} onChange={(ev) => updateEdit(row.id, 'maintenanceUnit', ev.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={d.maintenanceLocation} onChange={(ev) => updateEdit(row.id, 'maintenanceLocation', ev.target.value)} placeholder="Service center" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <input type="number" value={d.minRequiredStock} onChange={(ev) => updateEdit(row.id, 'minRequiredStock', ev.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => handleSaveRow(row.id)}
                              disabled={saving}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-trust-blue bg-trust-blue px-2 text-xs font-semibold text-white hover:opacity-95 transition disabled:opacity-50"
                            >
                              Save
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                            aria-label={`Delete row ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={18} className="px-4 py-10 text-center text-sm text-cool-gray">No machines found. Use Add Machine to add one.</td></tr>
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
