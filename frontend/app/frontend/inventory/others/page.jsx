'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreatableFilterPopover from '@/components/creatable-filter-popover';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';

const UNITS = ['PCS', 'BOX', 'PACKET', 'BOTTLE', 'KG', 'GM', 'LITER'];
const CATEGORIES = ['Pantry', 'Stationery', 'Housekeeping', 'Packaging', 'Utilities', 'Other'];
const OTHERS_COLUMNS = [
  { id: 'sno', label: '#' },
  { id: 'item_name', label: 'Item Name' },
  { id: 'category', label: 'Category' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'unit', label: 'Unit' },
  { id: 'min_level', label: 'Min Level' },
  { id: 'notes', label: 'Notes' },
  { id: 'action', label: 'Action' },
];

export default function OthersInventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [edits, setEdits] = useState({});
  const [newRows, setNewRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterUnit, setFilterUnit] = useState([]);
  const [customCategoryFilter, setCustomCategoryFilter] = useState('');
  const [customUnitFilter, setCustomUnitFilter] = useState('');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(OTHERS_COLUMNS.map((column) => column.id)));
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    item_name: '',
    category: '',
    quantity: '',
    unit: 'PCS',
    min_level: '',
    notes: '',
  });

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
      setSelectedIds(new Set());
      setEditingRowIds(new Set());
    } catch (err) {
      showStatus(err.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getField = (row, key) => edits[row.id]?.[key] !== undefined ? edits[row.id][key] : (row[key] ?? '');

  const setField = (id, key, value) => {
    if (!editingRowIds.has(id)) return;
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const setNewField = (localId, key, value) => {
    setNewRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, [key]: value } : r)));
  };

  const categoryOptions = useMemo(() => {
    const set = new Set(CATEGORIES);
    rows.forEach((row) => {
      const category = String(row.category || '').trim();
      if (category) set.add(category);
    });
    newRows.forEach((row) => {
      const category = String(row.category || '').trim();
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, newRows]);

  const openAddItemDialog = () => {
    setAddItemForm({
      item_name: '',
      category: '',
      quantity: '',
      unit: 'PCS',
      min_level: '',
      notes: '',
    });
    setIsAddItemOpen(true);
  };

  const handleAddItem = () => {
    if (!String(addItemForm.item_name || '').trim()) {
      showStatus('Item name is required.', 'error');
      return;
    }
    setNewRows((prev) => [
      ...prev,
      {
        _localId: Date.now(),
        item_name: String(addItemForm.item_name || '').trim(),
        category: String(addItemForm.category || '').trim(),
        quantity: addItemForm.quantity,
        unit: addItemForm.unit,
        min_level: addItemForm.min_level,
        notes: addItemForm.notes,
      },
    ]);
    setIsAddItemOpen(false);
    showStatus('Item added. Click Save Stock to persist.');
  };

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const effectiveCategory = filterCategory && filterCategory.length > 0 ? filterCategory : [];
    const effectiveUnit = filterUnit && filterUnit.length > 0 ? filterUnit : [];
    return rows.filter(row => {
      const matchesSearch = !search || [row.item_name, row.category].some(v => String(v || '').toLowerCase().includes(search));
      const matchesCategory = effectiveCategory.length === 0 || effectiveCategory.some(f => String(row.category || '').toLowerCase().includes(f.toLowerCase()));
      const matchesUnit = effectiveUnit.length === 0 || effectiveUnit.some(f => String(row.unit || '').toLowerCase().includes(f.toLowerCase()));
      return matchesSearch && matchesCategory && matchesUnit;
    });
  }, [rows, searchTerm, filterCategory, filterUnit]);

  const unitOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.unit || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const allSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const visibleTableColumnCount = 1 + OTHERS_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  const toggleSelectAll = (checked) => {
    if (editingRowIds.size > 0) return;
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => next.add(row.id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((row) => next.delete(row.id));
      return next;
    });
  };

  const toggleRow = (id) => {
    if (editingRowIds.size > 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEditRows = () => {
    if (selectedIds.size === 0) {
      showStatus('Select at least one row, then click Edit Row.', 'error');
      return;
    }
    const nextEdits = {};
    rows.forEach((row) => {
      if (selectedIds.has(row.id)) {
        nextEdits[row.id] = {
          item_name: row.item_name ?? '',
          category: row.category ?? '',
          quantity: row.quantity ?? '',
          unit: row.unit ?? '',
          min_level: row.min_level ?? '',
          notes: row.notes ?? '',
        };
      }
    });
    setEdits(nextEdits);
    setEditingRowIds(new Set(Array.from(selectedIds)));
    showStatus(`Editing ${selectedIds.size} row${selectedIds.size !== 1 ? 's' : ''}.`);
  };

  const handleCancelEdit = () => {
    setEdits({});
    setEditingRowIds(new Set());
    showStatus('Edit canceled.');
  };

  const handleSaveEdit = async () => {
    if (editingRowIds.size === 0) return;
    setSaving(true);
    try {
      const patchPromises = Object.entries(edits).map(async ([id, fields]) => {
        const res = await fetch(`/api/others/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Error updating item ${id}`); }
        return res.json().catch(() => null);
      });
      await Promise.all(patchPromises);
      setEdits({});
      setEditingRowIds(new Set());
      await fetchItems();
      showStatus('Selected rows updated successfully.');
    } catch (err) {
      showStatus(err.message || 'Failed to save edits', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTable = () => {
    window.print();
  };

  const toggleColumnSelection = (columnId) => {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  };

  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === OTHERS_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(OTHERS_COLUMNS.map((column) => column.id)));
    }
  };

  const handleHideColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.delete(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.add(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
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
            <ArrowLeft className="h-4 w-4" /> Back
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

        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <MultiselectFilterPopover
              label="Category"
              selectedValues={filterCategory}
              onSelectValues={setFilterCategory}
              options={CATEGORIES}
              storageKey="inventory:others:category"
            />
            <MultiselectFilterPopover
              label="Unit"
              selectedValues={filterUnit}
              onSelectValues={setFilterUnit}
              options={unitOptions}
              storageKey="inventory:others:unit"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory([]);
                setFilterUnit([]);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-soft-border bg-white p-4 md:p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-midnight-ink">Current Stock</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePrintTable} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button type="button" onClick={() => setIsManageColumnsOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
                Manage Columns
              </button>
              <button type="button" onClick={handleEditRows} disabled={editingRowIds.size > 0} className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition disabled:opacity-40">
                <Pencil className="h-4 w-4" /> Edit Row
              </button>
              <button type="button" onClick={openAddItemDialog} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
                <Plus className="h-4 w-4" /> Add Item
              </button>
              <button type="button" onClick={saveAll} disabled={saving || editingRowIds.size > 0} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Stock'}
              </button>
            </div>
          </div>

          {editingRowIds.size > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={handleSaveEdit} disabled={saving} className="rounded-lg border border-success bg-success px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleCancelEdit} disabled={saving} className="rounded-lg border border-danger bg-white px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition disabled:opacity-60">
                Cancel Edit
              </button>
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-sm text-cool-gray">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#dbeafe] border-b border-soft-border">
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={editingRowIds.size > 0}
                        className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                      />
                    </th>
                    {visibleColumns.has('sno') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-14">#</th>}
                    {visibleColumns.has('item_name') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Item Name</th>}
                    {visibleColumns.has('category') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Category</th>}
                    {visibleColumns.has('quantity') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>}
                    {visibleColumns.has('unit') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Unit</th>}
                    {visibleColumns.has('min_level') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Min Level</th>}
                    {visibleColumns.has('notes') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Notes</th>}
                    {visibleColumns.has('action') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-20">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const qty = Number(getField(row, 'quantity') || 0);
                    const min = Number(getField(row, 'min_level') || 0);
                    const isLow = min > 0 && qty <= min;
                    return (
                      <tr key={row.id} className={`border-b border-soft-border/70 last:border-b-0 ${isLow ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            disabled={editingRowIds.size > 0}
                            className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                          />
                        </td>
                        {visibleColumns.has('sno') && <td className="px-3 py-2 text-midnight-ink">{index + 1}</td>}
                        {visibleColumns.has('item_name') && <td className="px-3 py-2"><input type="text" value={getField(row, 'item_name')} onChange={(e) => setField(row.id, 'item_name', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('category') && <td className="px-3 py-2">
                          <select value={getField(row, 'category')} onChange={(e) => setField(row.id, 'category', e.target.value)} disabled={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue disabled:bg-gray-50 disabled:text-cool-gray">
                            <option value="">Select category</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('quantity') && <td className="px-3 py-2"><input type="number" value={getField(row, 'quantity')} onChange={(e) => setField(row.id, 'quantity', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="0" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('unit') && <td className="px-3 py-2">
                          <select value={getField(row, 'unit')} onChange={(e) => setField(row.id, 'unit', e.target.value)} disabled={!editingRowIds.has(row.id)} className="h-9 w-full rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue disabled:bg-gray-50 disabled:text-cool-gray">
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('min_level') && <td className="px-3 py-2"><input type="number" value={getField(row, 'min_level')} onChange={(e) => setField(row.id, 'min_level', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="10" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('notes') && <td className="px-3 py-2"><input type="text" value={getField(row, 'notes')} onChange={(e) => setField(row.id, 'notes', e.target.value)} readOnly={!editingRowIds.has(row.id)} placeholder="Any note" className="h-9 w-full rounded-lg border border-soft-border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue read-only:bg-gray-50 read-only:text-cool-gray" /></td>}
                        {visibleColumns.has('action') && <td className="px-3 py-2">
                          <button type="button" onClick={() => deleteRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>}
                      </tr>
                    );
                  })}
                  {newRows.map((row, index) => (
                    <tr key={row._localId} className="border-b border-soft-border/70 last:border-b-0 bg-sky-50/40">
                      <td className="px-3 py-2" />
                      {visibleColumns.has('sno') && <td className="px-3 py-2 text-midnight-ink">{rows.length + index + 1}</td>}
                      {visibleColumns.has('item_name') && <td className="px-3 py-2"><input type="text" value={row.item_name} onChange={(e) => setNewField(row._localId, 'item_name', e.target.value)} placeholder="Coffee powder" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('category') && <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setNewField(row._localId, 'category', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          <option value="">Select category</option>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('quantity') && <td className="px-3 py-2"><input type="number" value={row.quantity} onChange={(e) => setNewField(row._localId, 'quantity', e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('unit') && <td className="px-3 py-2">
                        <select value={row.unit} onChange={(e) => setNewField(row._localId, 'unit', e.target.value)} className="h-9 w-full rounded-lg border border-trust-blue/40 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('min_level') && <td className="px-3 py-2"><input type="number" value={row.min_level} onChange={(e) => setNewField(row._localId, 'min_level', e.target.value)} placeholder="10" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('notes') && <td className="px-3 py-2"><input type="text" value={row.notes} onChange={(e) => setNewField(row._localId, 'notes', e.target.value)} placeholder="Any note" className="h-9 w-full rounded-lg border border-trust-blue/40 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" /></td>}
                      {visibleColumns.has('action') && <td className="px-3 py-2">
                        <button type="button" onClick={() => removeNewRow(row._localId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && newRows.length === 0 && (
                    <tr><td colSpan={visibleTableColumnCount} className="px-4 py-10 text-center text-sm text-cool-gray">No items found. Add an item to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Item</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Item Name</label>
              <input
                type="text"
                value={addItemForm.item_name}
                onChange={(e) => setAddItemForm((prev) => ({ ...prev, item_name: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Category</label>
                <div className="w-fit">
                  <CreatableFilterPopover
                    label="Category"
                    selectedValue={addItemForm.category}
                    onSelectValue={(value) => setAddItemForm((prev) => ({ ...prev, category: value }))}
                    options={categoryOptions}
                    storageKey="inventory:others:category"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Unit</label>
                <select
                  value={addItemForm.unit}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={addItemForm.quantity}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Min Level</label>
                <input
                  type="number"
                  min={0}
                  value={addItemForm.min_level}
                  onChange={(e) => setAddItemForm((prev) => ({ ...prev, min_level: e.target.value }))}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Notes</label>
              <input
                type="text"
                value={addItemForm.notes}
                onChange={(e) => setAddItemForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddItemOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
              Cancel
            </button>
            <button type="button" onClick={handleAddItem} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition">
              Add Item
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <input
                  id="select-all-others-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === OTHERS_COLUMNS.length && OTHERS_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-others-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {OTHERS_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`others-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`others-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id)
                    ? <span className="bg-danger/10 text-danger-dark px-2 py-1 rounded-full text-sm">Hidden</span>
                    : <span className="bg-success/10 text-success-dark px-2 py-1 rounded-full text-sm">Visible</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} className="rounded-md border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50">Hide</button>
            <button type="button" onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-success hover:bg-success/10 disabled:opacity-50">Show</button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
