'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const STORAGE_KEY = 'inventory_machines_v1';
const STATE_OPTIONS = [
  { key: 'running', label: 'Running' },
  { key: 'idle', label: 'Idle' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'maintenance', label: 'Under Maintenance' },
];

const STATE_FIELDS = {
  running: { qty: 'runningQty', unit: 'runningUnit', location: 'runningLocation' },
  idle: { qty: 'idleQty', unit: 'idleUnit', location: 'idleLocation' },
  breakdown: { qty: 'breakdownQty', unit: 'breakdownUnit', location: 'breakdownLocation' },
  maintenance: { qty: 'maintenanceQty', unit: 'maintenanceUnit', location: 'maintenanceLocation' },
};

const createMachineRow = (id) => ({
  id,
  machineName: '',
  particulars: '',
  department: '',
  minRequiredStock: '',
  runningQty: '',
  runningUnit: '',
  runningLocation: '',
  idleQty: '',
  idleUnit: '',
  idleLocation: '',
  breakdownQty: '',
  breakdownUnit: '',
  breakdownLocation: '',
  maintenanceQty: '',
  maintenanceUnit: '',
  maintenanceLocation: '',
});

const normalizeMachineRow = (row, id) => {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    ...createMachineRow(id),
    ...safeRow,
    id,
    machineName: String(safeRow.machineName ?? ''),
    particulars: String(safeRow.particulars ?? ''),
    department: String(safeRow.department ?? ''),
    minRequiredStock: String(safeRow.minRequiredStock ?? ''),
    runningQty: String(safeRow.runningQty ?? ''),
    runningUnit: String(safeRow.runningUnit ?? ''),
    runningLocation: String(safeRow.runningLocation ?? ''),
    idleQty: String(safeRow.idleQty ?? ''),
    idleUnit: String(safeRow.idleUnit ?? ''),
    idleLocation: String(safeRow.idleLocation ?? ''),
    breakdownQty: String(safeRow.breakdownQty ?? ''),
    breakdownUnit: String(safeRow.breakdownUnit ?? ''),
    breakdownLocation: String(safeRow.breakdownLocation ?? ''),
    maintenanceQty: String(safeRow.maintenanceQty ?? ''),
    maintenanceUnit: String(safeRow.maintenanceUnit ?? ''),
    maintenanceLocation: String(safeRow.maintenanceLocation ?? ''),
  };
};

export default function MachinesInventoryPage() {
  const [rows, setRows] = useState([createMachineRow(1)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState('');
  const [newMachine, setNewMachine] = useState({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
  const [addStockForm, setAddStockForm] = useState({ machineId: '', stateKey: 'running', qty: '', unit: '', location: '' });
  const [updateStockForm, setUpdateStockForm] = useState({ machineId: '', fromState: 'idle', toState: 'running', qty: '' });

  const loadRows = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setRows([createMachineRow(1)]);
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setRows([createMachineRow(1)]);
        return;
      }
      setRows(parsed.map((row, index) => normalizeMachineRow(row, index + 1)));
      setStatus('Machines inventory refreshed.');
    } catch {
      setStatus('Unable to refresh saved machines data.');
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
      prev.map((row) => (row.id === id ? { ...normalizeMachineRow(row, id), [key]: nextValue } : normalizeMachineRow(row, row.id)))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createMachineRow(prev.length + 1)]);
  };

  const deleteRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) return [createMachineRow(1)];
      return next.map((row, index) => ({ ...row, id: index + 1 }));
    });
  };

  const saveRows = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    setStatus('Machines inventory saved locally.');
  };

  const handleAddMachine = () => {
    const machineName = newMachine.machineName.trim();
    if (!machineName) {
      setStatus('Machine Name is required to add a machine.');
      return;
    }

    const nextRow = {
      ...createMachineRow(rows.length + 1),
      machineName,
      particulars: newMachine.particulars.trim(),
      department: newMachine.department.trim(),
      minRequiredStock: String(newMachine.minRequiredStock || ''),
    };

    setRows((prev) => [...prev, nextRow]);
    setNewMachine({ machineName: '', particulars: '', department: '', minRequiredStock: '' });
    setStatus('Machine added. You can now update stock and save.');
  };

  const handleAddMachineStock = () => {
    const machineId = Number(addStockForm.machineId);
    const qtyToAdd = Number(addStockForm.qty);
    const target = STATE_FIELDS[addStockForm.stateKey];

    if (!machineId || !target) {
      setStatus('Select a machine and stock state.');
      return;
    }
    if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) {
      setStatus('Enter a valid quantity greater than 0.');
      return;
    }

    let found = false;
    setRows((prev) =>
      prev.map((row) => {
        const safeRow = normalizeMachineRow(row, row.id);
        if (safeRow.id !== machineId) return safeRow;
        found = true;

        const currentQty = Number(safeRow[target.qty] || 0);
        return {
          ...safeRow,
          [target.qty]: String(currentQty + qtyToAdd),
          [target.unit]: addStockForm.unit.trim() || safeRow[target.unit],
          [target.location]: addStockForm.location.trim() || safeRow[target.location],
        };
      })
    );

    if (!found) {
      setStatus('Selected machine was not found.');
      return;
    }

    setAddStockForm((prev) => ({ ...prev, qty: '', unit: '', location: '' }));
    setStatus('Machine stock added successfully.');
  };

  const handleUpdateMachineStock = () => {
    const machineId = Number(updateStockForm.machineId);
    const qtyToMove = Number(updateStockForm.qty);
    const from = STATE_FIELDS[updateStockForm.fromState];
    const to = STATE_FIELDS[updateStockForm.toState];

    if (!machineId || !from || !to) {
      setStatus('Select machine and valid from/to states.');
      return;
    }
    if (updateStockForm.fromState === updateStockForm.toState) {
      setStatus('From and To states must be different.');
      return;
    }
    if (!Number.isFinite(qtyToMove) || qtyToMove <= 0) {
      setStatus('Enter a valid transfer quantity greater than 0.');
      return;
    }

    let found = false;
    let insufficient = false;

    setRows((prev) =>
      prev.map((row) => {
        const safeRow = normalizeMachineRow(row, row.id);
        if (safeRow.id !== machineId) return safeRow;
        found = true;

        const fromQty = Number(safeRow[from.qty] || 0);
        const toQty = Number(safeRow[to.qty] || 0);

        if (fromQty < qtyToMove) {
          insufficient = true;
          return safeRow;
        }

        return {
          ...safeRow,
          [from.qty]: String(fromQty - qtyToMove),
          [to.qty]: String(toQty + qtyToMove),
        };
      })
    );

    if (!found) {
      setStatus('Selected machine was not found.');
      return;
    }
    if (insufficient) {
      setStatus('Not enough quantity in source state.');
      return;
    }

    setUpdateStockForm((prev) => ({ ...prev, qty: '' }));
    setStatus('Machine stock state updated successfully.');
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
              Add Machine Row
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

        <section className="mb-4 rounded-xl border border-soft-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'addMachine' ? '' : 'addMachine'))}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              Add Machine
            </button>
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'addStock' ? '' : 'addStock'))}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              Add Machine Stock
            </button>
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'updateStock' ? '' : 'updateStock'))}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
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
              <button type="button" onClick={handleAddMachine} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition">Add Machine</button>
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
              <button type="button" onClick={handleAddMachineStock} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition">Add Stock</button>
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
              <button type="button" onClick={handleUpdateMachineStock} className="h-9 rounded-lg border border-trust-blue bg-trust-blue px-3 text-sm font-semibold text-white hover:opacity-95 transition">Update Stock</button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-soft-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2360px] text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#F8F9FA]">
                  <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-16">S. No.</th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Machine Name</th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Particulars</th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[170px]">Department</th>
                  <th colSpan={3} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-midnight-ink">Running</th>
                  <th colSpan={3} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-midnight-ink">Idle</th>
                  <th colSpan={3} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-midnight-ink">Breakdown</th>
                  <th colSpan={3} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-midnight-ink">Under Maintenance</th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[210px]">Minimum Required in Stock</th>
                  <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray w-24">Action</th>
                </tr>
                <tr className="border-b border-soft-border bg-[#F8F9FA]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray min-w-[140px]">Location</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-soft-border last:border-0 transition hover:bg-[#F8F9FA]">
                    <td className="px-3 py-2.5 text-midnight-ink">{row.id}</td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.machineName ?? ''} onChange={(e) => updateRow(row.id, 'machineName', e.target.value)} placeholder="Enter machine name" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.particulars ?? ''} onChange={(e) => updateRow(row.id, 'particulars', e.target.value)} placeholder="Enter particulars" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.department ?? ''} onChange={(e) => updateRow(row.id, 'department', e.target.value)} placeholder="Enter department" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <input type="number" value={row.runningQty ?? ''} onChange={(e) => updateRow(row.id, 'runningQty', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.runningUnit ?? ''} onChange={(e) => updateRow(row.id, 'runningUnit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.runningLocation ?? ''} onChange={(e) => updateRow(row.id, 'runningLocation', e.target.value)} placeholder="Line 1" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <input type="number" value={row.idleQty ?? ''} onChange={(e) => updateRow(row.id, 'idleQty', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.idleUnit ?? ''} onChange={(e) => updateRow(row.id, 'idleUnit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.idleLocation ?? ''} onChange={(e) => updateRow(row.id, 'idleLocation', e.target.value)} placeholder="Warehouse" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <input type="number" value={row.breakdownQty ?? ''} onChange={(e) => updateRow(row.id, 'breakdownQty', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.breakdownUnit ?? ''} onChange={(e) => updateRow(row.id, 'breakdownUnit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.breakdownLocation ?? ''} onChange={(e) => updateRow(row.id, 'breakdownLocation', e.target.value)} placeholder="Repair bay" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <input type="number" value={row.maintenanceQty ?? ''} onChange={(e) => updateRow(row.id, 'maintenanceQty', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.maintenanceUnit ?? ''} onChange={(e) => updateRow(row.id, 'maintenanceUnit', e.target.value)} placeholder="PCS" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="text" value={row.maintenanceLocation ?? ''} onChange={(e) => updateRow(row.id, 'maintenanceLocation', e.target.value)} placeholder="Service center" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <input type="number" value={row.minRequiredStock ?? ''} onChange={(e) => updateRow(row.id, 'minRequiredStock', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
                    </td>

                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label={`Delete row ${row.id}`}>
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
