'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function emptyStone() {
  return {
    stone_type: '',
    species: '',
    variety: '',
    color: '',
    quality: '',
    wax_setting: false,
    cut: '',
    dos: '',
    donts: '',
    shape: '',
    length: '',
    width: '',
    height: '',
  };
}

function calcAmount(price, qty, weight, priceBy) {
  const p = parseFloat(price) || 0;
  const q = parseFloat(qty) || 0;
  const w = parseFloat(weight) || 0;
  const val = priceBy === 'weight' ? p * w : p * q;
  return val > 0 ? val.toFixed(2) : '';
}

// â”€â”€â”€ tiny form-field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, value, onChange, textarea = false, type = 'text', disabled = false }) {
  const base =
    'w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink placeholder:text-cool-gray focus:outline-none focus:ring-1 focus:ring-trust-blue';
  const cls = `${base} ${disabled ? 'bg-[#F8F9FA] cursor-not-allowed text-cool-gray' : 'bg-white'}`;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea
          className={`${cls} resize-none`}
          rows={2}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          className={cls}
          type={type}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ inline cell input (for the stock popup table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CellInput({ value, onChange, type = 'text', disabled = false, placeholder = '' }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`w-full min-w-[80px] rounded border px-2 py-1 text-xs text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue ${
        disabled
          ? 'border-transparent bg-[#F8F9FA] text-cool-gray cursor-default'
          : 'border-soft-border bg-white'
      }`}
    />
  );
}

// â”€â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function StoneInventoryPage() {
  const [stones, setStones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Row selection (main table checkboxes)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Add New Stone dialog
  const [addStoneOpen, setAddStoneOpen] = useState(false);
  const [stoneForm, setStoneForm] = useState(emptyStone());
  const [savingStone, setSavingStone] = useState(false);

  // Add Stone Stock dialog
  const [addStockOpen, setAddStockOpen] = useState(false);
  // stockRows: [{ stoneId, qty_added, weight_cts_added, price, price_by, amount, remark }]
  const [stockRows, setStockRows] = useState([]);
  const [savingStock, setSavingStock] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // â”€â”€ load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadStones = useCallback(async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/stone-inventory', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
      setStones(items);
    } catch (err) {
      setStatusMsg(`Failed to load stones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStones();
  }, [loadStones]);

  // â”€â”€ row selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const allSelected = stones.length > 0 && selectedIds.size === stones.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stones.map((s) => s.id)));
    }
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // â”€â”€ open stock popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openStockPopup() {
    const selected = stones.filter((s) => selectedIds.has(s.id));
    setStockRows(
      selected.map((s) => ({
        stoneId: s.id,
        // pre-filled editable stone properties
        cut: s.cut || '',
        shape: s.shape || '',
        length: s.length || '',
        width: s.width || '',
        height: s.height || '',
        // transaction fields
        qty_added: '',
        weight_cts_added: '',
        price: '',
        price_by: 'pcs',
        amount: '',
        remark: '',
      }))
    );
    setAddStockOpen(true);
  }

  // â”€â”€ update a stock row field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function updateStockRow(stoneId, key, value) {
    setStockRows((prev) =>
      prev.map((row) => {
        if (row.stoneId !== stoneId) return row;
        const updated = { ...row, [key]: value };
        updated.amount = calcAmount(
          updated.price,
          updated.qty_added,
          updated.weight_cts_added,
          updated.price_by
        );
        return updated;
      })
    );
  }

  // selected stone objects for the popup (preserving order)
  const selectedStones = useMemo(
    () => stones.filter((s) => selectedIds.has(s.id)),
    [stones, selectedIds]
  );

  // â”€â”€ add new stone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function stoneField(key) {
    return (val) => setStoneForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSaveStone() {
    setSavingStone(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/stone-inventory', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stoneForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      setStatusMsg('Stone added successfully.');
      setAddStoneOpen(false);
      setStoneForm(emptyStone());
      await loadStones();
    } catch (err) {
      setStatusMsg(`Error adding stone: ${err.message}`);
    } finally {
      setSavingStone(false);
    }
  }

  // â”€â”€ save stock entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleSaveStock() {
    const toSave = stockRows.filter(
      (r) => String(r.qty_added).trim() !== '' || String(r.weight_cts_added).trim() !== ''
    );
    if (toSave.length === 0) {
      setStatusMsg('Enter qty or weight for at least one stone.');
      return;
    }
    setSavingStock(true);
    setStatusMsg('');
    try {
      for (const row of toSave) {
        // 1. PATCH the stone item with the editable stone properties
        const stoneUpdate = {
          cut: row.cut,
          shape: row.shape,
          length: row.length,
          width: row.width,
          height: row.height,
        };
        const patchRes = await fetch(`/api/stone-inventory/${row.stoneId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stoneUpdate),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          throw new Error(JSON.stringify(err));
        }

        // 2. POST the stock transaction
        const payload = {
          stone: row.stoneId,
          qty_added: row.qty_added || '0',
          weight_cts_added: row.weight_cts_added || '0',
          price: row.price || '0',
          price_by: row.price_by,
          amount: row.amount || '0',
          remark: row.remark,
        };
        const res = await fetch('/api/stone-transactions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(JSON.stringify(err));
        }
      }
      setStatusMsg(`Stock updated for ${toSave.length} stone(s).`);
      setAddStockOpen(false);
      setSelectedIds(new Set());
      await loadStones();
    } catch (err) {
      setStatusMsg(`Error saving stock: ${err.message}`);
    } finally {
      setSavingStock(false);
    }
  }

  // â”€â”€ delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stone-inventory/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setStatusMsg('Stone deleted.');
      setDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      await loadStones();
    } catch (err) {
      setStatusMsg(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  // â”€â”€ main table columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const COLS = [
    { key: 'stone_type', label: 'Type' },
    { key: 'species', label: 'Species' },
    { key: 'variety', label: 'Variety' },
    { key: 'color', label: 'Color' },
    { key: 'quality', label: 'Quality' },
    { key: 'wax_setting', label: 'Wax Setting', render: (v) => (v ? 'Yes' : 'No') },
    { key: 'cut', label: 'Cut' },
    { key: 'shape', label: 'Shape' },
    { key: 'length', label: 'Length' },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'qty', label: 'Qty' },
    { key: 'weight_cts', label: 'Weight (cts)' },
    { key: 'averageWeightStock', label: 'Avg Weight of Stock' },
    { key: 'dos', label: "Do's" },
    { key: 'donts', label: "Don'ts" },
  ];

  // locked fields = same as Add New Stone
  const LOCKED_KEYS = [
    { key: 'stone_type', label: 'Type', minW: 'min-w-[80px]' },
    { key: 'species', label: 'Species', minW: 'min-w-[80px]' },
    { key: 'variety', label: 'Variety', minW: 'min-w-[80px]' },
    { key: 'color', label: 'Color', minW: 'min-w-[70px]' },
    { key: 'quality', label: 'Quality', minW: 'min-w-[70px]' },
    { key: 'wax_setting', label: 'Wax Setting', minW: 'min-w-[80px]', render: (v) => (v ? 'Yes' : 'No') },
    { key: 'dos', label: "Do's", minW: 'min-w-[80px]' },
    { key: 'donts', label: "Don'ts", minW: 'min-w-[80px]' },
  ];

  // editable stone-property fields in the stock popup
  const EDITABLE_STONE_KEYS = [
    { key: 'cut', label: 'Cut', minW: 'min-w-[60px]' },
    { key: 'shape', label: 'Shape', minW: 'min-w-[70px]' },
    { key: 'length', label: 'Length', minW: 'min-w-[60px]' },
    { key: 'width', label: 'Width', minW: 'min-w-[60px]' },
    { key: 'height', label: 'Height', minW: 'min-w-[60px]' },
  ];

  // â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* â”€â”€ header â”€â”€ */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">STONE INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {/* â”€â”€ toolbar â”€â”€ */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadStones}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => { setStoneForm(emptyStone()); setAddStoneOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-trust-blue px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus size={14} />
              Add New Stone
            </button>

            <button
              onClick={openStockPopup}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-trust-blue bg-white px-3 py-2 text-sm font-medium text-trust-blue hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Add Stone Stock
              {selectedIds.size > 0 && (
                <span className="ml-1 rounded-full bg-trust-blue px-1.5 py-0.5 text-[10px] text-white leading-none">
                  {selectedIds.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* â”€â”€ status â”€â”€ */}
        {statusMsg && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-soft-border bg-white px-4 py-2 text-sm text-midnight-ink shadow-sm">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')}>
              <X size={14} className="text-cool-gray hover:text-midnight-ink" />
            </button>
          </div>
        )}

        {/* â”€â”€ selection hint â”€â”€ */}
        {selectedIds.size > 0 && (
          <p className="mb-2 text-xs text-trust-blue">
            {selectedIds.size} stone{selectedIds.size !== 1 ? 's' : ''} selected â€” click &quot;Add Stone Stock&quot; to update stock.
          </p>
        )}

        {/* â”€â”€ main table â”€â”€ */}
        <div className="overflow-x-auto rounded-xl border border-soft-border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-soft-border bg-[#F8F9FA]">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                </th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLS.length + 2} className="px-4 py-6 text-center text-cool-gray">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && stones.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 2} className="px-4 py-6 text-center text-cool-gray">
                    No stones found. Add one using the button above.
                  </td>
                </tr>
              )}
              {!loading &&
                stones.map((stone) => {
                  const isSelected = selectedIds.has(stone.id);
                  return (
                    <tr
                      key={stone.id}
                      className={`border-b border-soft-border last:border-0 transition ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(stone.id)}
                          className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                        />
                      </td>
                      {COLS.map((c) => (
                        <td key={c.key} className="whitespace-nowrap px-4 py-2.5 text-midnight-ink">
                          {c.render ? c.render(stone[c.key]) : (stone[c.key] ?? 'â€”')}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setDeleteId(stone.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete stone"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Add New Stone dialog
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={addStoneOpen} onOpenChange={setAddStoneOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add New Stone</DialogTitle>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Type" value={stoneForm.stone_type} onChange={stoneField('stone_type')} />
            <Field label="Species" value={stoneForm.species} onChange={stoneField('species')} />
            <Field label="Variety" value={stoneForm.variety} onChange={stoneField('variety')} />
            <Field label="Color" value={stoneForm.color} onChange={stoneField('color')} />
            <Field label="Quality" value={stoneForm.quality} onChange={stoneField('quality')} />

            {/* Wax Setting toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Wax Setting</label>
              <div className="flex items-center gap-3 pt-1">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStoneForm((prev) => ({ ...prev, wax_setting: opt === 'Yes' }))}
                    className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${
                      stoneForm.wax_setting === (opt === 'Yes')
                        ? 'border-trust-blue bg-trust-blue text-white'
                        : 'border-soft-border bg-white text-midnight-ink hover:border-trust-blue'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <Field label="Do's" value={stoneForm.dos} onChange={stoneField('dos')} textarea />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <Field label="Don'ts" value={stoneForm.donts} onChange={stoneField('donts')} textarea />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddStoneOpen(false)} disabled={savingStone}>
              Cancel
            </Button>
            <Button onClick={handleSaveStone} disabled={savingStone}>
              {savingStone ? 'Saving...' : 'Save Stone'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Add Stone Stock dialog â€” table of selected stones
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-midnight-ink">
              Add Stone Stock
              <span className="ml-2 text-sm font-normal text-cool-gray">
                ({stockRows.length} stone{stockRows.length !== 1 ? 's' : ''} selected)
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* scrollable table body */}
          <div className="flex-1 overflow-auto mt-3 rounded-lg border border-soft-border">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                {/* â”€â”€ row 1: section spans â”€â”€ */}
                <tr className="bg-[#EEF2F7]">
                  <th
                    colSpan={LOCKED_KEYS.length}
                    className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide"
                  >
                    Pre-filled (locked)
                  </th>
                  <th
                    colSpan={EDITABLE_STONE_KEYS.length}
                    className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-midnight-ink uppercase tracking-wide bg-amber-50"
                  >
                    Editable
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Weight (cts)
                  </th>
                  <th
                    colSpan={2}
                    className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide"
                  >
                    Price by (check one)
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Price
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-[#0d7a3e] uppercase tracking-wide bg-green-50">
                    Amount
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Remark
                  </th>
                </tr>
                {/* â”€â”€ row 2: column labels â”€â”€ */}
                <tr className="bg-[#F8F9FA]">
                  {LOCKED_KEYS.map((c) => (
                    <th
                      key={c.key}
                      className={`border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray ${c.minW}`}
                    >
                      {c.label}
                    </th>
                  ))}
                  {EDITABLE_STONE_KEYS.map((c) => (
                    <th
                      key={c.key}
                      className={`border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-midnight-ink bg-amber-50 ${c.minW}`}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">
                    Qty
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[100px]">
                    Weight (cts)
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[50px]">
                    Pcs
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[60px]">
                    Weight
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">
                    Price
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0d7a3e] min-w-[90px] bg-green-50">
                    Amount
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row) => {
                  const stone = selectedStones.find((s) => s.id === row.stoneId);
                  if (!stone) return null;
                  return (
                    <tr key={row.stoneId} className="hover:bg-blue-50">
                      {/* locked pre-filled cells */}
                      {LOCKED_KEYS.map((c) => (
                        <td
                          key={c.key}
                          className="border border-soft-border px-3 py-1.5 text-cool-gray bg-[#F8F9FA] whitespace-nowrap"
                        >
                          {c.render ? c.render(stone[c.key]) : (stone[c.key] || 'â€”')}
                        </td>
                      ))}
                      {/* editable stone property cells */}
                      {EDITABLE_STONE_KEYS.map((c) => (
                        <td key={c.key} className="border border-soft-border px-2 py-1 bg-amber-50">
                          <CellInput
                            value={row[c.key]}
                            onChange={(v) => updateStockRow(row.stoneId, c.key, v)}
                          />
                        </td>
                      ))}
                      {/* qty */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.qty_added}
                          placeholder="0"
                          onChange={(v) => updateStockRow(row.stoneId, 'qty_added', v)}
                        />
                      </td>

                      {/* weight */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.weight_cts_added}
                          placeholder="0.0000"
                          onChange={(v) => updateStockRow(row.stoneId, 'weight_cts_added', v)}
                        />
                      </td>

                      {/* price by pcs radio */}
                      <td className="border border-soft-border px-2 py-1 text-center">
                        <input
                          type="radio"
                          name={`price_by_${row.stoneId}`}
                          checked={row.price_by === 'pcs'}
                          onChange={() => updateStockRow(row.stoneId, 'price_by', 'pcs')}
                          className="h-4 w-4 cursor-pointer accent-trust-blue"
                        />
                      </td>

                      {/* price by weight radio */}
                      <td className="border border-soft-border px-2 py-1 text-center">
                        <input
                          type="radio"
                          name={`price_by_${row.stoneId}`}
                          checked={row.price_by === 'weight'}
                          onChange={() => updateStockRow(row.stoneId, 'price_by', 'weight')}
                          className="h-4 w-4 cursor-pointer accent-trust-blue"
                        />
                      </td>

                      {/* price */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.price}
                          placeholder="0.00"
                          onChange={(v) => updateStockRow(row.stoneId, 'price', v)}
                        />
                      </td>

                      {/* amount (auto-calculated, read-only) */}
                      <td className="border border-soft-border px-3 py-1.5 bg-green-50 font-semibold text-[#0d7a3e] whitespace-nowrap text-right">
                        {row.amount !== '' ? row.amount : 'â€”'}
                      </td>

                      {/* remark */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          value={row.remark}
                          placeholder="optional"
                          onChange={(v) => updateStockRow(row.stoneId, 'remark', v)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="flex-shrink-0 mt-2 text-[11px] text-cool-gray italic">
            Amount = Price Ã— Qty (Pcs selected) or Price Ã— Weight (Weight selected). Auto-calculated.
          </p>

          <div className="flex-shrink-0 mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddStockOpen(false)} disabled={savingStock}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={savingStock}>
              {savingStock ? 'Saving...' : 'Save Stock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Delete confirmation dialog
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Delete Stone</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-cool-gray">
            This will permanently delete the stone and all its stock history. This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
