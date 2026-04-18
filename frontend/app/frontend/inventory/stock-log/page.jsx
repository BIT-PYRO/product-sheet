'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ── Constants ──────────────────────────────────────────────────────────────
const INVENTORY_TYPES = ['Tools', 'Machines', 'Others'];
const ACTIVITY_STATUSES = ['Used', 'In Used', 'In Stock', 'Running', 'Idle', 'Breakdown', 'Under Maintenance'];
const RECEIVED_ISSUED_OPTIONS = ['Received', 'Issued'];
const QTY_UNITS = ['PCS', 'BOX', 'PACKET', 'ROLL', 'SET', 'PAIR', 'NOS'];
const WEIGHT_UNITS = ['KG', 'GM', 'LB', 'TON', 'MT', 'OZ'];

const LOG_COLUMNS = [
  { id: 'sno',           label: '#'              },
  { id: 'date',          label: 'Date'           },
  { id: 'inventoryType', label: 'Inventory Type' },
  { id: 'receivedIssued',label: 'Rcvd/Issued'   },
  { id: 'stockName',     label: 'Stock Name'     },
  { id: 'particulars',   label: 'Particulars'    },
  { id: 'qty',           label: 'Qty'            },
  { id: 'qtyUnit',       label: 'Units'          },
  { id: 'weight',        label: 'Weight'         },
  { id: 'weightUnit',    label: 'Units'          },
  { id: 'location',      label: 'Location'       },
  { id: 'price',         label: 'Price'          },
  { id: 'amount',        label: 'Amount'         },
  { id: 'receivedFrom',  label: 'Received From'  },
  { id: 'issuedTo',      label: 'Issued To'      },
  { id: 'activityStatus',label: 'Status'         },
  { id: 'action',        label: 'Action'         },
];

const emptyEntry = () => ({
  date: new Date().toISOString().slice(0, 10),
  inventoryType: '',
  receivedIssued: '',
  stockName: '',
  particulars: '',
  qty: '',
  qtyUnit: 'PCS',
  weight: '',
  weightUnit: 'KG',
  location: '',
  price: '',
  amount: '',
  receivedFrom: '',
  issuedTo: '',
  activityStatus: '',
});

// ── Component ──────────────────────────────────────────────────────────────
export default function StockLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock-transactions?page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setRows(Array.isArray(results) ? results : []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const [status, setStatus]     = useState('');
  const [statusType, setStatusType] = useState('success');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingIds, setEditingIds]   = useState(new Set());
  const [editBuffer, setEditBuffer]   = useState({});
  const [visibleColumns, setVisibleColumns] = useState(new Set(LOG_COLUMNS.map((c) => c.id)));
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selColsForAction, setSelColsForAction] = useState(new Set());

  // Add dialog
  const [addOpen, setAddOpen]   = useState(false);
  const [addForm, setAddForm]   = useState(emptyEntry());

  // Filters
  const [fSearch,       setFSearch]       = useState('');
  const [fReceivedFrom, setFReceivedFrom] = useState('');
  const [fIssuedTo,     setFIssuedTo]     = useState('');
  const [fType,         setFType]         = useState('');
  const [fStatus,       setFStatus]       = useState('');
  const [fRI,           setFRI]           = useState('');
  const [fDateFrom,     setFDateFrom]     = useState('');
  const [fDateTo,       setFDateTo]       = useState('');

  const showStatus = (msg, type = 'success') => {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(''), 3000);
  };

  // ── Derived: auto-calculate amount ─────────────────────────────────────
  const calcAmount = (qty, price) => {
    const q = Number(qty); const p = Number(price);
    if (q > 0 && p > 0) return String((q * p).toFixed(2));
    return '';
  };

  // ── Filtered rows ────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const s = fSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const itemName = r.item_name || r.stockName || '';
      const receivedFrom = r.received_from || r.receivedFrom || '';
      const issuedTo = r.issued_to || r.issuedTo || '';
      const inventoryType = r.inventory_type || r.inventoryType || '';
      const activityStatus = r.activity_status || r.activityStatus || '';
      const receivedIssued = r.txn_type || r.receivedIssued || '';
      const txnDate = r.txn_date || r.date || '';
      if (s && ![itemName, r.particulars||'', receivedFrom, issuedTo, r.location||''].some(
        (v) => v.toLowerCase().includes(s)
      )) return false;
      if (fReceivedFrom && !receivedFrom.toLowerCase().includes(fReceivedFrom.toLowerCase())) return false;
      if (fIssuedTo     && !issuedTo.toLowerCase().includes(fIssuedTo.toLowerCase())) return false;
      if (fType   && inventoryType  !== fType)   return false;
      if (fStatus && activityStatus !== fStatus) return false;
      if (fRI     && receivedIssued.toLowerCase() !== fRI.toLowerCase()) return false;
      if (fDateFrom && txnDate < fDateFrom) return false;
      if (fDateTo   && txnDate > fDateTo)   return false;
      return true;
    });
  }, [rows, fSearch, fReceivedFrom, fIssuedTo, fType, fStatus, fRI, fDateFrom, fDateTo]);

  const clearFilters = () => {
    setFSearch(''); setFReceivedFrom(''); setFIssuedTo('');
    setFType(''); setFStatus(''); setFRI('');
    setFDateFrom(''); setFDateTo('');
  };

  const hasFilter = fSearch || fReceivedFrom || fIssuedTo || fType || fStatus || fRI || fDateFrom || fDateTo;

  // ── Add entry ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.stockName.trim()) { showStatus('Stock Name is required.', 'error'); return; }
    const payload = {
      txn_date: addForm.date,
      inventory_type: addForm.inventoryType,
      txn_type: (addForm.receivedIssued || '').toLowerCase(),
      item_name: addForm.stockName,
      particulars: addForm.particulars,
      qty: addForm.qty || 0,
      qty_unit: addForm.qtyUnit,
      weight: addForm.weight || 0,
      weight_unit: addForm.weightUnit,
      location: addForm.location,
      price: addForm.price || 0,
      amount: calcAmount(addForm.qty, addForm.price) || addForm.amount || 0,
      received_from: addForm.receivedFrom,
      issued_to: addForm.issuedTo,
      activity_status: addForm.activityStatus,
    };
    try {
      const res = await fetch('/api/stock-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setAddOpen(false);
      setAddForm(emptyEntry());
      await fetchRows();
      showStatus('Entry added.');
    } catch (err) { showStatus(err.message || 'Add failed', 'error'); }
  };

  // ── Edit helpers ─────────────────────────────────────────────────────────
  const FIELD_MAP = { date: 'txn_date', inventoryType: 'inventory_type', receivedIssued: 'txn_type', stockName: 'item_name', qtyUnit: 'qty_unit', weightUnit: 'weight_unit', receivedFrom: 'received_from', issuedTo: 'issued_to', activityStatus: 'activity_status' };
  const rowVal = (row, key) => { const apiKey = FIELD_MAP[key] || key; return row[apiKey] !== undefined ? row[apiKey] : (row[key] ?? ''); };
  const getF = (row, key) => { const v = editBuffer[row.id]?.[key] !== undefined ? editBuffer[row.id][key] : rowVal(row, key); return v ?? ''; };
  const setF = (id, key, val) => {
    if (!editingIds.has(id)) return;
    setEditBuffer((prev) => {
      const updated = { ...prev, [id]: { ...(prev[id] || {}), [key]: val } };
      // auto-recalc amount when qty or price changes
      if (key === 'qty' || key === 'price') {
        const qty   = key === 'qty'   ? val : (updated[id]?.qty   ?? rows.find((r) => r.id === id)?.qty   ?? '');
        const price = key === 'price' ? val : (updated[id]?.price ?? rows.find((r) => r.id === id)?.price ?? '');
        updated[id].amount = calcAmount(qty, price) || updated[id].amount || '';
      }
      return updated;
    });
  };

  const startEdit = () => {
    if (selectedIds.size === 0) { showStatus('Select rows to edit.', 'error'); return; }
    const buf = {};
    rows.forEach((r) => {
      if (selectedIds.has(r.id)) buf[r.id] = { ...r };
    });
    setEditBuffer(buf);
    setEditingIds(new Set(selectedIds));
  };

  const cancelEdit = () => { setEditBuffer({}); setEditingIds(new Set()); };

  const saveEdits = async () => {
    try {
      for (const id of Array.from(editingIds)) {
        const buf = editBuffer[id];
        if (!buf) continue;
        const payload = {
          txn_date: buf.date ?? buf.txn_date,
          inventory_type: buf.inventoryType ?? buf.inventory_type,
          txn_type: (buf.receivedIssued ?? buf.txn_type ?? '').toLowerCase(),
          item_name: buf.stockName ?? buf.item_name,
          particulars: buf.particulars,
          qty: buf.qty ?? 0,
          qty_unit: buf.qtyUnit ?? buf.qty_unit,
          weight: buf.weight ?? 0,
          weight_unit: buf.weightUnit ?? buf.weight_unit,
          location: buf.location,
          price: buf.price ?? 0,
          amount: buf.amount ?? 0,
          received_from: buf.receivedFrom ?? buf.received_from,
          issued_to: buf.issuedTo ?? buf.issued_to,
          activity_status: buf.activityStatus ?? buf.activity_status,
        };
        await fetch(`/api/stock-transactions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setEditBuffer({}); setEditingIds(new Set()); setSelectedIds(new Set());
      await fetchRows();
      showStatus('Changes saved.');
    } catch (err) { showStatus(err.message || 'Save failed', 'error'); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteRow = async (id) => {
    try {
      const res = await fetch(`/api/stock-transactions/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      showStatus('Entry deleted.');
    } catch (err) { showStatus(err.message || 'Delete failed', 'error'); }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(`/api/stock-transactions/${id}`, { method: 'DELETE' });
      }
      await fetchRows();
      setSelectedIds(new Set());
      showStatus(`${selectedIds.size} entries deleted.`);
    } catch (err) { showStatus(err.message || 'Delete failed', 'error'); }
  };

  // ── Select all ───────────────────────────────────────────────────────────
  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = (checked) => {
    if (editingIds.size > 0) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      filteredRows.forEach((r) => checked ? n.add(r.id) : n.delete(r.id));
      return n;
    });
  };

  const toggleRow = (id) => {
    if (editingIds.size > 0) return;
    setSelectedIds((prev) => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  };

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const fieldMap = { date: 'txn_date', inventoryType: 'inventory_type', receivedIssued: 'txn_type', stockName: 'item_name', qtyUnit: 'qty_unit', weightUnit: 'weight_unit', receivedFrom: 'received_from', issuedTo: 'issued_to', activityStatus: 'activity_status' };
    const headers = LOG_COLUMNS.filter((c) => visibleColumns.has(c.id) && c.id !== 'action' && c.id !== 'sno').map((c) => `<th>${c.label}</th>`).join('');
    const rowsHtml = filteredRows.map((r, i) => {
      const cells = LOG_COLUMNS.filter((c) => visibleColumns.has(c.id) && c.id !== 'action' && c.id !== 'sno').map((c) => { const k = fieldMap[c.id] || c.id; return `<td>${r[k] ?? r[c.id] ?? ''}</td>`; }).join('');
      return `<tr><td>${i+1}</td>${cells}</tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Stock Log</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:5px 8px}th{background:#dbeafe;text-align:left}</style></head><body><h2>Tools, Machinery & Others Stock Log</h2><table><thead><tr><th>#</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  // ── Manage columns ───────────────────────────────────────────────────────
  const toggleColSel = (id) => setSelColsForAction((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const visibleColCount = 1 + LOG_COLUMNS.filter((c) => visibleColumns.has(c.id)).length;

  // ── Add form auto-amount ─────────────────────────────────────────────────
  const addFormAmount = useMemo(() => calcAmount(addForm.qty, addForm.price), [addForm.qty, addForm.price]);

  // ── Input class helpers ──────────────────────────────────────────────────
  const inputCls = (editing) =>
    `h-9 w-full rounded-lg border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue ${
      editing ? 'border-trust-blue/60 bg-white' : 'border-soft-border read-only:bg-gray-50 read-only:text-cool-gray'
    }`;
  const selectCls = (editing) =>
    `h-9 w-full rounded-lg border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue ${
      editing ? 'border-trust-blue/60' : 'border-soft-border disabled:bg-gray-50 disabled:text-cool-gray'
    }`;

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">STOCK LOG</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {/* Back (left) + action buttons (right) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" onClick={() => setIsManageColumnsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink">
              Manage Columns
            </button>
            <button type="button" onClick={startEdit} disabled={editingIds.size > 0}
              className="inline-flex items-center gap-2 rounded-full border border-trust-blue bg-white px-4 h-8 text-sm font-medium text-trust-blue disabled:opacity-40">
              <Pencil className="h-4 w-4" /> Edit Row
            </button>
            {selectedIds.size > 0 && editingIds.size === 0 && (
              <button type="button" onClick={deleteSelected}
                className="inline-flex items-center gap-2 rounded-full border border-rose-400 bg-white px-4 h-8 text-sm font-medium text-rose-600">
                <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
              </button>
            )}
            <button type="button" onClick={() => { setAddForm(emptyEntry()); setAddOpen(true); }}
              className="inline-flex items-center gap-2 rounded-full border border-trust-blue bg-white px-4 h-8 text-sm font-medium text-trust-blue">
              <Plus className="h-4 w-4" /> Add Entry
            </button>
            <button type="button" onClick={() => { writeLS(rows); showStatus('Stock log saved.'); }}
              className="inline-flex items-center gap-2 rounded-full bg-trust-blue px-4 h-8 text-sm font-semibold text-white">
              Save
            </button>
          </div>
        </div>

        {/* Edit action bar */}
        {editingIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button onClick={saveEdits} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white">Save Changes</Button>
            <Button variant="outline" onClick={cancelEdit} className="h-8 px-3 border-rose-400 text-rose-600 hover:bg-rose-50">Cancel Edit</Button>
            <span className="text-xs text-cool-gray">Editing {editingIds.size} row(s)</span>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              placeholder="Search"
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <input
              type="text"
              value={fReceivedFrom}
              onChange={(e) => setFReceivedFrom(e.target.value)}
              placeholder="Received From"
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <input
              type="text"
              value={fIssuedTo}
              onChange={(e) => setFIssuedTo(e.target.value)}
              placeholder="Issued To"
              className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <select
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-2"
            >
              <option value="">Inv. Type</option>
              {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="h-8 text-sm w-40 bg-white rounded-md border border-trust-blue/40 px-2"
            >
              <option value="">Activity Status</option>
              {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={fRI}
              onChange={(e) => setFRI(e.target.value)}
              className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-2"
            >
              <option value="">Rcvd / Issued</option>
              {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input
              type="date"
              value={fDateFrom}
              onChange={(e) => setFDateFrom(e.target.value)}
              title="Date From"
              className="h-8 text-sm bg-white rounded-md border border-trust-blue/40 px-2"
            />
            <input
              type="date"
              value={fDateTo}
              onChange={(e) => setFDateTo(e.target.value)}
              title="Date To"
              className="h-8 text-sm bg-white rounded-md border border-trust-blue/40 px-2"
            />
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        {/* ── Table section ────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-soft-border bg-white shadow-sm mb-6">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="bg-[#dbeafe] border-b border-soft-border">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      disabled={editingIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                    />
                  </th>
                  {visibleColumns.has('sno')            && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">#</th>}
                  {visibleColumns.has('date')           && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Date</th>}
                  {visibleColumns.has('inventoryType')  && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Inventory Type</th>}
                  {visibleColumns.has('receivedIssued') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Rcvd / Issued</th>}
                  {visibleColumns.has('stockName')      && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Stock Name</th>}
                  {visibleColumns.has('particulars')    && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Particulars</th>}
                  {visibleColumns.has('qty')            && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Qty</th>}
                  {visibleColumns.has('qtyUnit')        && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Units</th>}
                  {visibleColumns.has('weight')         && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Weight</th>}
                  {visibleColumns.has('weightUnit')     && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Units</th>}
                  {visibleColumns.has('location')       && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Location</th>}
                  {visibleColumns.has('price')          && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Price</th>}
                  {visibleColumns.has('amount')         && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Amount</th>}
                  {visibleColumns.has('receivedFrom')   && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Received From</th>}
                  {visibleColumns.has('issuedTo')       && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Issued To</th>}
                  {visibleColumns.has('activityStatus') && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Status</th>}
                  {visibleColumns.has('action')         && <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-16">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColCount} className="px-4 py-12 text-center text-sm text-cool-gray">
                      No entries found. {!hasFilter ? 'Click "Add Entry" to get started.' : 'Try clearing the filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isEditing = editingIds.has(row.id);
                    const isReceived = row.receivedIssued === 'Received';
                    const isIssued   = row.receivedIssued === 'Issued';
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-soft-border/70 last:border-b-0 ${
                          isEditing ? 'bg-blue-50/40' : isReceived ? 'bg-emerald-50/30' : isIssued ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            disabled={editingIds.size > 0}
                            className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                          />
                        </td>
                        {visibleColumns.has('sno')            && <td className="px-3 py-1.5 text-cool-gray text-xs">{idx + 1}</td>}
                        {visibleColumns.has('date')           && <td className="px-3 py-1.5 min-w-[120px]"><input type="date" value={getF(row,'date')} onChange={(e) => setF(row.id,'date',e.target.value)} readOnly={!isEditing} className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('inventoryType')  && <td className="px-3 py-1.5 min-w-[120px]">
                          <select value={getF(row,'inventoryType')} onChange={(e) => setF(row.id,'inventoryType',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                            <option value="">—</option>
                            {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('receivedIssued') && <td className="px-3 py-1.5 min-w-[110px]">
                          <select value={getF(row,'receivedIssued')} onChange={(e) => setF(row.id,'receivedIssued',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                            <option value="">—</option>
                            {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('stockName')      && <td className="px-3 py-1.5 min-w-[140px]"><input type="text" value={getF(row,'stockName')} onChange={(e) => setF(row.id,'stockName',e.target.value)} readOnly={!isEditing} placeholder="Stock name" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('particulars')    && <td className="px-3 py-1.5 min-w-[140px]"><input type="text" value={getF(row,'particulars')} onChange={(e) => setF(row.id,'particulars',e.target.value)} readOnly={!isEditing} placeholder="Particulars" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('qty')            && <td className="px-3 py-1.5 min-w-[80px]"><input type="number" value={getF(row,'qty')} onChange={(e) => setF(row.id,'qty',e.target.value)} readOnly={!isEditing} placeholder="0" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('qtyUnit')        && <td className="px-3 py-1.5 min-w-[90px]">
                          <select value={getF(row,'qtyUnit')} onChange={(e) => setF(row.id,'qtyUnit',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                            {QTY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('weight')         && <td className="px-3 py-1.5 min-w-[80px]"><input type="number" value={getF(row,'weight')} onChange={(e) => setF(row.id,'weight',e.target.value)} readOnly={!isEditing} placeholder="0" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('weightUnit')     && <td className="px-3 py-1.5 min-w-[90px]">
                          <select value={getF(row,'weightUnit')} onChange={(e) => setF(row.id,'weightUnit',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                            {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('location')       && <td className="px-3 py-1.5 min-w-[120px]"><input type="text" value={getF(row,'location')} onChange={(e) => setF(row.id,'location',e.target.value)} readOnly={!isEditing} placeholder="Location" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('price')          && <td className="px-3 py-1.5 min-w-[90px]"><input type="number" value={getF(row,'price')} onChange={(e) => setF(row.id,'price',e.target.value)} readOnly={!isEditing} placeholder="0.00" step="0.01" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('amount')         && <td className="px-3 py-1.5 min-w-[100px]">
                          <span className="inline-block text-sm font-semibold text-trust-blue">
                            {getF(row,'amount') ? `₹${Number(getF(row,'amount')).toLocaleString('en-IN')}` : '—'}
                          </span>
                        </td>}
                        {visibleColumns.has('receivedFrom')   && <td className="px-3 py-1.5 min-w-[140px]"><input type="text" value={getF(row,'receivedFrom')} onChange={(e) => setF(row.id,'receivedFrom',e.target.value)} readOnly={!isEditing} placeholder="Vendor" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('issuedTo')       && <td className="px-3 py-1.5 min-w-[140px]"><input type="text" value={getF(row,'issuedTo')} onChange={(e) => setF(row.id,'issuedTo',e.target.value)} readOnly={!isEditing} placeholder="Person/dept" className={inputCls(isEditing)} /></td>}
                        {visibleColumns.has('activityStatus') && <td className="px-3 py-1.5 min-w-[150px]">
                          <select value={getF(row,'activityStatus')} onChange={(e) => setF(row.id,'activityStatus',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                            <option value="">—</option>
                            {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>}
                        {visibleColumns.has('action')         && <td className="px-3 py-1.5">
                          <button type="button" onClick={() => deleteRow(row.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Add Entry Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
              <Plus className="h-5 w-5 text-trust-blue" />
              Add Stock Log Entry
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Date</label>
              <input type="date" value={addForm.date} onChange={(e) => setAddForm((p) => ({ ...p, date: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Inventory Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Inventory Type</label>
              <select value={addForm.inventoryType} onChange={(e) => setAddForm((p) => ({ ...p, inventoryType: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select type</option>
                {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Received / Issued */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Received / Issued</label>
              <select value={addForm.receivedIssued} onChange={(e) => setAddForm((p) => ({ ...p, receivedIssued: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select</option>
                {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Activity Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Activity Status</label>
              <select value={addForm.activityStatus} onChange={(e) => setAddForm((p) => ({ ...p, activityStatus: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select status</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Stock Name */}
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Stock Name <span className="text-red-500">*</span></label>
              <input type="text" value={addForm.stockName} onChange={(e) => setAddForm((p) => ({ ...p, stockName: e.target.value }))}
                placeholder="e.g. Drill Bit Set"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Particulars */}
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Particulars</label>
              <input type="text" value={addForm.particulars} onChange={(e) => setAddForm((p) => ({ ...p, particulars: e.target.value }))}
                placeholder="e.g. Brand, specification"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Qty + Unit */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Qty</label>
              <input type="number" value={addForm.qty} onChange={(e) => setAddForm((p) => ({ ...p, qty: e.target.value }))}
                placeholder="0" min={0}
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Qty Unit</label>
              <select value={addForm.qtyUnit} onChange={(e) => setAddForm((p) => ({ ...p, qtyUnit: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                {QTY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Weight + Unit */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Weight</label>
              <input type="number" value={addForm.weight} onChange={(e) => setAddForm((p) => ({ ...p, weight: e.target.value }))}
                placeholder="0" min={0} step="0.01"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Weight Unit</label>
              <select value={addForm.weightUnit} onChange={(e) => setAddForm((p) => ({ ...p, weightUnit: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Location</label>
              <input type="text" value={addForm.location} onChange={(e) => setAddForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Store Room A"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Price per Unit (₹)</label>
              <input type="number" value={addForm.price} onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00" min={0} step="0.01"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Amount (auto-calculated) */}
            <div className={`col-span-2 rounded-lg border px-4 py-3 flex items-center justify-between ${addFormAmount ? 'border-trust-blue/30 bg-blue-50' : 'border-soft-border bg-[#F8F9FA]'}`}>
              <span className="text-sm text-cool-gray font-medium">Total Amount (auto)</span>
              <span className={`text-xl font-bold ${addFormAmount ? 'text-trust-blue' : 'text-cool-gray/50'}`}>
                {addFormAmount ? `₹${Number(addFormAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </span>
            </div>

            {/* Received From */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Received From</label>
              <input type="text" value={addForm.receivedFrom} onChange={(e) => setAddForm((p) => ({ ...p, receivedFrom: e.target.value }))}
                placeholder="Vendor / supplier"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>

            {/* Issued To */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Issued To</label>
              <input type="text" value={addForm.issuedTo} onChange={(e) => setAddForm((p) => ({ ...p, issuedTo: e.target.value }))}
                placeholder="Person / department"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>
          </div>

          {status && statusType === 'error' && (
            <p className="text-xs text-red-600 mt-1">{status}</p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-trust-blue hover:bg-blue-700 text-white">Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manage Columns Dialog ─────────────────────────────────────────── */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-midnight-ink">Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
            {LOG_COLUMNS.filter((c) => c.id !== 'sno' && c.id !== 'action').map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer text-sm text-midnight-ink">
                <input
                  type="checkbox"
                  checked={selColsForAction.has(col.id)}
                  onChange={() => toggleColSel(col.id)}
                  className="h-4 w-4 accent-trust-blue"
                />
                {col.label}
                {visibleColumns.has(col.id)
                  ? <span className="ml-auto text-xs text-emerald-600">Visible</span>
                  : <span className="ml-auto text-xs text-cool-gray">Hidden</span>}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              const next = new Set(visibleColumns);
              selColsForAction.forEach((id) => next.delete(id));
              setVisibleColumns(next); setSelColsForAction(new Set()); setIsManageColumnsOpen(false);
            }}>Hide Selected</Button>
            <Button onClick={() => {
              const next = new Set(visibleColumns);
              selColsForAction.forEach((id) => next.add(id));
              setVisibleColumns(next); setSelColsForAction(new Set()); setIsManageColumnsOpen(false);
            }} className="bg-trust-blue text-white hover:bg-blue-700">Show Selected</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
