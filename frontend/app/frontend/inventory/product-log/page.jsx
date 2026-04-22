'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import SortPopover from '@/components/sort-popover';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useColumnPreferences } from '@/hooks/use-column-preferences';


// ── Product constants ──────────────────────────────────────────────────────
const P_INVENTORY_TYPES   = ['Finished Product', 'WIP', 'Sample', 'Return', 'Rejected'];
const P_METAL_OPTIONS     = ['Gold', 'Silver', 'Platinum', 'Brass', 'Alloy', 'Other'];
const P_UNIT_OPTIONS      = ['PCS', 'GM', 'KG', 'CT'];
const P_ACTIVITY_STATUSES = ['In Stock', 'Issued', 'Used', 'Returned', 'Under Inspection', 'Sold', 'Rejected'];
const RECEIVED_ISSUED_OPTIONS = ['Received', 'Issued'];

const PRODUCT_COLUMNS = [
  { id: 'sno',           label: '#'               },
  { id: 'date',          label: 'Date'            },
  { id: 'receivedIssued',label: 'Rcvd/Issued'    },
  { id: 'inventoryType', label: 'Inventory Type'  },
  { id: 'masterSku',     label: 'Master SKU'      },
  { id: 'designerSku',   label: 'Designer SKU'    },
  { id: 'finalSku',      label: 'Final Stock SKU' },
  { id: 'metal',         label: 'Metal'           },
  { id: 'value',         label: 'Value / Qty'     },
  { id: 'unit',          label: 'Unit'            },
  { id: 'location',      label: 'Location'        },
  { id: 'wip',           label: 'WIP'             },
  { id: 'totalInDemand', label: 'Total In Demand' },
  { id: 'price',         label: 'Price (₹)'      },
  { id: 'amount',        label: 'Amount (₹)'     },
  { id: 'receivedFrom',  label: 'Received From'   },
  { id: 'issuedTo',      label: 'Issued To'       },
  { id: 'remark',        label: 'Remark'          },
  { id: 'activityStatus',label: 'Status'          },
  { id: 'action',        label: 'Action'          },
];

const productEmpty = () => ({
  date: new Date().toISOString().slice(0, 10),
  receivedIssued: '', inventoryType: '', masterSku: '', designerSku: '', finalSku: '',
  metal: '', value: '', unit: 'PCS', location: '', wip: '', totalInDemand: '',
  price: '', amount: '', receivedFrom: '', issuedTo: '', remark: '', activityStatus: '',
});

// ── Finding constants ──────────────────────────────────────────────────────
const F_INVENTORY_TYPES   = ['Raw', 'Wax', 'Casting', 'Filing', 'Polish', 'Hand Setting', 'Ready', 'Finished'];
const F_METAL_OPTIONS     = ['Gold', 'Silver', 'Platinum', 'Brass', 'Alloy', 'Other'];
const F_STAGE_OPTIONS     = ['Raw', 'Wax', 'Casting', 'Filing', 'Polish', 'Hand Setting', 'Ready', 'Finished'];
const F_ACTIVITY_STATUSES = ['In Stock', 'Issued', 'Used', 'Returned', 'Under Inspection', 'Rejected'];

const FINDING_COLUMNS = [
  { id: 'sno',           label: '#'              },
  { id: 'date',          label: 'Date'           },
  { id: 'receivedIssued',label: 'Rcvd/Issued'   },
  { id: 'inventoryType', label: 'Inventory Type' },
  { id: 'findingCode',   label: 'Finding Code'   },
  { id: 'dieNumber',     label: 'Die No.'        },
  { id: 'size',          label: 'Size'           },
  { id: 'metal',         label: 'Metal'          },
  { id: 'stage',         label: 'Stage'          },
  { id: 'mechanism',     label: 'Mechanism'      },
  { id: 'qty',           label: 'Quantity'       },
  { id: 'weight',        label: 'Weight'         },
  { id: 'deadWeight',    label: 'Dead Weight'    },
  { id: 'moldQtyPerDie', label: 'Mold Qty/Die'  },
  { id: 'price',         label: 'Price (₹)'     },
  { id: 'amount',        label: 'Amount (₹)'    },
  { id: 'receivedFrom',  label: 'Received From'  },
  { id: 'issuedTo',      label: 'Issued To'      },
  { id: 'remark',        label: 'Remark'         },
  { id: 'activityStatus',label: 'Status'         },
  { id: 'action',        label: 'Action'         },
];

const findingEmpty = () => ({
  date: new Date().toISOString().slice(0, 10),
  receivedIssued: '', inventoryType: '', findingCode: '', dieNumber: '', size: '',
  metal: '', stage: '', mechanism: '', qty: '', weight: '', deadWeight: '',
  moldQtyPerDie: '', price: '', amount: '', receivedFrom: '', issuedTo: '', remark: '', activityStatus: '',
});

const calcAmount = (qty, price) => {
  const q = Number(qty); const p = Number(price);
  return (q > 0 && p > 0) ? String((q * p).toFixed(2)) : '';
};

// ── Die Log constants ──────────────────────────────────────────────────────
const DIE_LOG_COLUMNS = [
  { id: 'sno',           label: '#' },
  { id: 'date',          label: 'Date' },
  { id: 'receivedIssued',label: 'Rcvd/Issued' },
  { id: 'die_code',      label: 'Die Code' },
  { id: 'master_sku',    label: 'Master SKU' },
  { id: 'designer_sku',  label: 'Designer SKU' },
  { id: 'location',      label: 'Location' },
  { id: 'qty',           label: 'Quantity' },
  { id: 'wax_piece_qty',       label: 'Wax Piece Qty' },
  { id: 'wax_piece_location',  label: 'Wax Piece Location' },
  { id: 'wax_setting_qty',     label: 'Wax Setting Qty' },
  { id: 'wax_setting_location',label: 'Wax Setting Location' },
  { id: 'casting_qty',         label: 'Casting Qty' },
  { id: 'casting_location',    label: 'Casting Location' },
  { id: 'price',         label: 'Price (₹)' },
  { id: 'amount',        label: 'Amount (₹)' },
  { id: 'received_from', label: 'Received From' },
  { id: 'issued_to',     label: 'Issued To' },
  { id: 'remark',        label: 'Remark' },
  { id: 'activity_status',label: 'Status' },
  { id: 'action',        label: 'Action' },
];

const dieLogEmpty = () => ({
  date: new Date().toISOString().slice(0, 10),
  txn_type: '', die_code: '', master_sku: '', designer_sku: '',
  location: '', qty: '', wax_piece_qty: '', wax_piece_location: '', wax_setting_qty: '', wax_setting_location: '', casting_qty: '', casting_location: '',
  price: '', amount: '', received_from: '', issued_to: '', remark: '', activity_status: '',
});

// ── Component ──────────────────────────────────────────────────────────────
export default function ProductFindingLogPage() {
  const [activeTab, setActiveTab] = useState('product');

  // ── Per-tab rows ──────────────────────────────────────────────────────────
  const [pRows, setPRows] = useState([]);
  const [fRows, setFRows] = useState([]);
  const [dRows, setDRows] = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingD, setLoadingD] = useState(true);

  const rows    = activeTab === 'product' ? pRows : activeTab === 'finding' ? fRows : dRows;

  const fetchProductRows = useCallback(async () => {
    setLoadingP(true);
    try {
      const res = await fetch('/api/product-transactions?page_size=500');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPRows(Array.isArray(data?.data?.results ?? data?.results ?? data?.data) ? (data?.data?.results ?? data?.results ?? data?.data) : []);
    } catch { /* non-fatal */ } finally { setLoadingP(false); }
  }, []);

  const fetchFindingRows = useCallback(async () => {
    setLoadingF(true);
    try {
      const res = await fetch('/api/finding-transactions?page_size=500');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFRows(Array.isArray(data?.data?.results ?? data?.results ?? data?.data) ? (data?.data?.results ?? data?.results ?? data?.data) : []);
    } catch { /* non-fatal */ } finally { setLoadingF(false); }
  }, []);

  const fetchDieRows = useCallback(async () => {
    setLoadingD(true);
    try {
      const res = await fetch('/api/die-transactions?page_size=500');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDRows(Array.isArray(data?.data?.results ?? data?.results ?? data?.data) ? (data?.data?.results ?? data?.results ?? data?.data) : []);
    } catch { /* non-fatal */ } finally { setLoadingD(false); }
  }, []);

  useEffect(() => { fetchProductRows(); fetchFindingRows(); fetchDieRows(); }, [fetchProductRows, fetchFindingRows, fetchDieRows]);

  const fetchRows = activeTab === 'product' ? fetchProductRows : activeTab === 'finding' ? fetchFindingRows : fetchDieRows;

  // ── Per-tab visible columns ───────────────────────────────────────────────
  const { visibleColumns: pVisibleCols, setVisibleColumns: setPVisibleCols, saveView: savePView, saveViewStatus: pSaveStatus } = useColumnPreferences('inv-product-log-product', PRODUCT_COLUMNS.map((c) => c.id));
  const { visibleColumns: fVisibleCols, setVisibleColumns: setFVisibleCols, saveView: saveFView, saveViewStatus: fSaveStatus } = useColumnPreferences('inv-product-log-finding', FINDING_COLUMNS.map((c) => c.id));
  const { visibleColumns: dVisibleCols, setVisibleColumns: setDVisibleCols, saveView: saveDView, saveViewStatus: dSaveStatus } = useColumnPreferences('inv-product-log-die', DIE_LOG_COLUMNS.map((c) => c.id));
  const visibleColumns    = activeTab === 'product' ? pVisibleCols : activeTab === 'finding' ? fVisibleCols : dVisibleCols;
  const setVisibleColumns = activeTab === 'product' ? setPVisibleCols : activeTab === 'finding' ? setFVisibleCols : setDVisibleCols;
  const saveColumnView    = activeTab === 'product' ? savePView : activeTab === 'finding' ? saveFView : saveDView;
  const saveViewStatus    = activeTab === 'product' ? pSaveStatus : activeTab === 'finding' ? fSaveStatus : dSaveStatus;

  const COLUMNS = activeTab === 'product' ? PRODUCT_COLUMNS : activeTab === 'finding' ? FINDING_COLUMNS : DIE_LOG_COLUMNS;

  // ── Per-tab add form ──────────────────────────────────────────────────────
  const [pAddForm, setPAddForm] = useState(productEmpty);
  const [fAddForm, setFAddForm] = useState(findingEmpty);
  const [dAddForm, setDAddForm] = useState(dieLogEmpty);
  const addForm    = activeTab === 'product' ? pAddForm : activeTab === 'finding' ? fAddForm : dAddForm;
  const setAddForm = activeTab === 'product' ? setPAddForm : activeTab === 'finding' ? setFAddForm : setDAddForm;

  // ── Per-tab filters ───────────────────────────────────────────────────────
  const emptyFilters = () => ({ search: '', receivedFrom: '', issuedTo: '', metal: '', invType: '', status: '', ri: '', dateFrom: '', dateTo: '' });
  const [pFilters, setPFilters] = useState(emptyFilters);
  const [fFilters, setFFilters] = useState(emptyFilters);
  const [dFilters, setDFilters] = useState(emptyFilters);
  const filters    = activeTab === 'product' ? pFilters : activeTab === 'finding' ? fFilters : dFilters;
  const setFilters = activeTab === 'product' ? setPFilters : activeTab === 'finding' ? setFFilters : setDFilters;

  const setF_ = (key, val) => setFilters((prev) => ({ ...prev, [key]: val }));
  const clearFilters = () => setFilters(emptyFilters());
  const hasFilter = Object.values(filters).some(Boolean);

  // ── Shared UI state (reset on tab switch) ────────────────────────────────
  const [status, setStatus]         = useState('');
  const [statusType, setStatusType] = useState('success');
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [editingIds, setEditingIds]     = useState(new Set());
  const [editBuffer, setEditBuffer]     = useState({});
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selColsForAction, setSelColsForAction]       = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (field) => { setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return field; }); };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSelectedIds(new Set()); setEditingIds(new Set()); setEditBuffer({});
    setAddOpen(false); setStatus('');
    setSortField(''); setSortDir('asc');
  };

  const showStatus = (msg, type = 'success') => {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(''), 3000);
  };

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    const searchFields = activeTab === 'product'
      ? ['masterSku','designerSku','finalSku','location','remark','receivedFrom','issuedTo']
      : activeTab === 'finding'
        ? ['findingCode','dieNumber','size','mechanism','remark','receivedFrom','issuedTo']
        : ['die_code','master_sku','designer_sku','location','remark','received_from','issued_to'];
    const base = rows.filter((r) => {
      if (s && !searchFields.some((k) => String(r[k] || '').toLowerCase().includes(s))) return false;
      const recFrom = r.receivedFrom || r.received_from || '';
      const issTo   = r.issuedTo || r.issued_to || '';
      if (filters.receivedFrom && !String(recFrom).toLowerCase().includes(filters.receivedFrom.toLowerCase())) return false;
      if (filters.issuedTo     && !String(issTo).toLowerCase().includes(filters.issuedTo.toLowerCase())) return false;
      if (filters.metal        && r.metal          !== filters.metal)   return false;
      if (filters.invType      && r.inventoryType  !== filters.invType) return false;
      if (filters.status       && (r.activityStatus || r.activity_status) !== filters.status) return false;
      const ri = r.receivedIssued || (r.txn_type === 'received' ? 'Received' : r.txn_type === 'issued' ? 'Issued' : '');
      if (filters.ri && ri !== filters.ri) return false;
      const rowDate = r.date || r.txn_date || '';
      if (filters.dateFrom && rowDate < filters.dateFrom) return false;
      if (filters.dateTo   && rowDate > filters.dateTo)   return false;
      return true;
    });
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, filters, activeTab, sortField, sortDir]);

  // ── Add entry ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (activeTab === 'product') {
      if (!pAddForm.masterSku?.trim() && !pAddForm.finalSku?.trim()) {
        showStatus('Master SKU or Final SKU is required.', 'error'); return;
      }
      const payload = {
        txn_date: pAddForm.date, txn_type: (pAddForm.receivedIssued || '').toLowerCase(),
        inventory_type: pAddForm.inventoryType, master_sku: pAddForm.masterSku, designer_sku: pAddForm.designerSku,
        final_sku: pAddForm.finalSku, metal: pAddForm.metal, value: pAddForm.value || 0, unit: pAddForm.unit,
        location: pAddForm.location, wip: pAddForm.wip || 0, total_in_demand: pAddForm.totalInDemand || 0,
        price: pAddForm.price || 0, amount: calcAmount(pAddForm.value, pAddForm.price) || pAddForm.amount || 0,
        received_from: pAddForm.receivedFrom, issued_to: pAddForm.issuedTo, remark: pAddForm.remark,
        activity_status: pAddForm.activityStatus,
      };
      try {
        const res = await fetch('/api/product-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setAddOpen(false); setPAddForm(productEmpty());
        await fetchProductRows(); showStatus('Entry added.');
      } catch (err) { showStatus(err.message || 'Add failed', 'error'); }
    } else if (activeTab === 'finding') {
      if (!fAddForm.findingCode?.trim()) { showStatus('Finding Code is required.', 'error'); return; }
      const payload = {
        txn_date: fAddForm.date, txn_type: (fAddForm.receivedIssued || '').toLowerCase(),
        inventory_type: fAddForm.inventoryType, finding_code: fAddForm.findingCode, die_number: fAddForm.dieNumber,
        size: fAddForm.size, material: fAddForm.metal, stage: fAddForm.stage, qty: fAddForm.qty || 0,
        weight: fAddForm.weight || 0, dead_weight: fAddForm.deadWeight || 0,
        price: fAddForm.price || 0, amount: calcAmount(fAddForm.qty, fAddForm.price) || fAddForm.amount || 0,
        received_from: fAddForm.receivedFrom, issued_to: fAddForm.issuedTo, remark: fAddForm.remark,
        activity_status: fAddForm.activityStatus,
      };
      try {
        const res = await fetch('/api/finding-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setAddOpen(false); setFAddForm(findingEmpty());
        await fetchFindingRows(); showStatus('Entry added.');
      } catch (err) { showStatus(err.message || 'Add failed', 'error'); }
    } else {
      if (!dAddForm.die_code?.trim()) { showStatus('Die Code is required.', 'error'); return; }
      const payload = {
        txn_date: dAddForm.date, txn_type: (dAddForm.txn_type || '').toLowerCase(),
        die_code: dAddForm.die_code, master_sku: dAddForm.master_sku, designer_sku: dAddForm.designer_sku,
        location: dAddForm.location, qty: dAddForm.qty || 0,
        wax_piece_qty: dAddForm.wax_piece_qty || 0, wax_piece_location: dAddForm.wax_piece_location,
        wax_setting_qty: dAddForm.wax_setting_qty, wax_setting_location: dAddForm.wax_setting_location,
        casting_qty: dAddForm.casting_qty, casting_location: dAddForm.casting_location,
        price: dAddForm.price || 0, amount: calcAmount(dAddForm.qty, dAddForm.price) || dAddForm.amount || 0,
        received_from: dAddForm.received_from, issued_to: dAddForm.issued_to, remark: dAddForm.remark,
        activity_status: dAddForm.activity_status,
      };
      try {
        const res = await fetch('/api/die-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setAddOpen(false); setDAddForm(dieLogEmpty());
        await fetchDieRows(); showStatus('Entry added.');
      } catch (err) { showStatus(err.message || 'Add failed', 'error'); }
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const getF = (row, key) => editBuffer[row.id]?.[key] !== undefined ? editBuffer[row.id][key] : rowVal(row, key);
  const setEF = (id, key, val) => {
    if (!editingIds.has(id)) return;
    setEditBuffer((prev) => {
      const updated = { ...prev, [id]: { ...(prev[id] || {}), [key]: val } };
      const row = rows.find((r) => r.id === id);
      if (activeTab === 'product' && (key === 'value' || key === 'price')) {
        const v = key === 'value' ? val : (updated[id]?.value ?? row?.value ?? '');
        const p = key === 'price' ? val : (updated[id]?.price ?? row?.price ?? '');
        updated[id].amount = calcAmount(v, p);
      }
      if (activeTab === 'finding' && (key === 'qty' || key === 'price')) {
        const q = key === 'qty'   ? val : (updated[id]?.qty   ?? row?.qty   ?? '');
        const p = key === 'price' ? val : (updated[id]?.price ?? row?.price ?? '');
        updated[id].amount = calcAmount(q, p);
      }
      return updated;
    });
  };

  const startEdit = () => {
    if (selectedIds.size === 0) { showStatus('Select rows to edit.', 'error'); return; }
    const buf = {};
    rows.forEach((r) => { if (selectedIds.has(r.id)) buf[r.id] = { ...r }; });
    setEditBuffer(buf); setEditingIds(new Set(selectedIds));
  };
  const cancelEdit = () => { setEditBuffer({}); setEditingIds(new Set()); };
  const saveEdits = async () => {
    try {
      const endpoint = activeTab === 'product' ? 'product-transactions' : 'finding-transactions';
      for (const id of Array.from(editingIds)) {
        const buf = editBuffer[id];
        if (!buf) continue;
        let payload;
        if (activeTab === 'product') {
          payload = {
            txn_date: buf.date ?? buf.txn_date, txn_type: (buf.receivedIssued ?? buf.txn_type ?? '').toLowerCase(),
            inventory_type: buf.inventoryType ?? buf.inventory_type, master_sku: buf.masterSku ?? buf.master_sku,
            designer_sku: buf.designerSku ?? buf.designer_sku, final_sku: buf.finalSku ?? buf.final_sku,
            metal: buf.metal, value: buf.value ?? 0, unit: buf.unit, location: buf.location,
            wip: buf.wip ?? 0, total_in_demand: buf.totalInDemand ?? buf.total_in_demand ?? 0,
            price: buf.price ?? 0, amount: buf.amount ?? 0,
            received_from: buf.receivedFrom ?? buf.received_from, issued_to: buf.issuedTo ?? buf.issued_to,
            remark: buf.remark, activity_status: buf.activityStatus ?? buf.activity_status,
          };
        } else {
          payload = {
            txn_date: buf.date ?? buf.txn_date, txn_type: (buf.receivedIssued ?? buf.txn_type ?? '').toLowerCase(),
            inventory_type: buf.inventoryType ?? buf.inventory_type,
            finding_code: buf.findingCode ?? buf.finding_code, die_number: buf.dieNumber ?? buf.die_number,
            size: buf.size, material: buf.metal, stage: buf.stage, qty: buf.qty ?? 0,
            weight: buf.weight ?? 0, dead_weight: buf.deadWeight ?? buf.dead_weight ?? 0,
            price: buf.price ?? 0, amount: buf.amount ?? 0,
            received_from: buf.receivedFrom ?? buf.received_from, issued_to: buf.issuedTo ?? buf.issued_to,
            remark: buf.remark, activity_status: buf.activityStatus ?? buf.activity_status,
          };
        }
        await fetch(`/api/${endpoint}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setEditBuffer({}); setEditingIds(new Set()); setSelectedIds(new Set());
      await fetchRows();
      showStatus('Changes saved.');
    } catch (err) { showStatus(err.message || 'Save failed', 'error'); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteRow = async (id) => {
    const endpoint = activeTab === 'product' ? 'product-transactions' : activeTab === 'finding' ? 'finding-transactions' : 'die-transactions';
    try {
      const res = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
      if (activeTab === 'product') setPRows((p) => p.filter((r) => r.id !== id));
      else if (activeTab === 'finding') setFRows((p) => p.filter((r) => r.id !== id));
      else setDRows((p) => p.filter((r) => r.id !== id));
      setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; });
      showStatus('Entry deleted.');
    } catch (err) { showStatus(err.message || 'Delete failed', 'error'); }
  };
  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    const endpoint = activeTab === 'product' ? 'product-transactions' : activeTab === 'finding' ? 'finding-transactions' : 'die-transactions';
    try {
      for (const id of Array.from(selectedIds)) { await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' }); }
      await fetchRows(); setSelectedIds(new Set()); showStatus(`${count} entries deleted.`);
    } catch (err) { showStatus(err.message || 'Delete failed', 'error'); }
  };

  // ── Select ────────────────────────────────────────────────────────────────
  const allSelected  = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleSelectAll = (checked) => {
    if (editingIds.size > 0) return;
    setSelectedIds((p) => { const n = new Set(p); filteredRows.forEach((r) => checked ? n.add(r.id) : n.delete(r.id)); return n; });
  };
  const toggleRow = (id) => {
    if (editingIds.size > 0) return;
    setSelectedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const fieldMapPrint = activeTab === 'product'
      ? { date: 'txn_date', receivedIssued: 'txn_type', inventoryType: 'inventory_type', masterSku: 'master_sku', designerSku: 'designer_sku', finalSku: 'final_sku', totalInDemand: 'total_in_demand', receivedFrom: 'received_from', issuedTo: 'issued_to', activityStatus: 'activity_status' }
      : { date: 'txn_date', receivedIssued: 'txn_type', inventoryType: 'inventory_type', findingCode: 'finding_code', dieNumber: 'die_number', deadWeight: 'dead_weight', receivedFrom: 'received_from', issuedTo: 'issued_to', activityStatus: 'activity_status' };
    const headers = COLUMNS.filter((c) => visibleColumns.has(c.id) && c.id !== 'action' && c.id !== 'sno').map((c) => `<th>${c.label}</th>`).join('');
    const rowsHtml = filteredRows.map((r, i) => {
      const cells = COLUMNS.filter((c) => visibleColumns.has(c.id) && c.id !== 'action' && c.id !== 'sno').map((c) => { const k = fieldMapPrint[c.id] || c.id; return `<td>${r[k] ?? r[c.id] ?? ''}</td>`; }).join('');
      return `<tr><td>${i + 1}</td>${cells}</tr>`;
    }).join('');
    const title = activeTab === 'product' ? 'Product Inventory Log' : 'Finding Inventory Log';
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:5px 8px}th{background:#dbeafe;text-align:left}</style></head><body><h2>${title}</h2><table><thead><tr><th>#</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  const toggleColSel = (id) => setSelColsForAction((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const inputCls = (editing) =>
    `h-9 w-full rounded-lg border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue ${
      editing ? 'border-trust-blue/60 bg-white' : 'border-soft-border read-only:bg-gray-50 read-only:text-cool-gray'
    }`;
  const selectCls = (editing) =>
    `h-9 w-full rounded-lg border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue ${
      editing ? 'border-trust-blue/60' : 'border-soft-border disabled:bg-gray-50 disabled:text-cool-gray'
    }`;

  const METAL_OPTIONS     = activeTab === 'product' ? P_METAL_OPTIONS     : F_METAL_OPTIONS;
  const INVENTORY_TYPES   = activeTab === 'product' ? P_INVENTORY_TYPES   : F_INVENTORY_TYPES;
  const ACTIVITY_STATUSES = activeTab === 'product' ? P_ACTIVITY_STATUSES : F_ACTIVITY_STATUSES;

  const addFormAmount = useMemo(
    () => activeTab === 'product'
      ? calcAmount(pAddForm.value, pAddForm.price)
      : calcAmount(fAddForm.qty, fAddForm.price),
    [activeTab, pAddForm.value, pAddForm.price, fAddForm.qty, fAddForm.price]
  );

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">JEWEL LOGS</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-3 md:px-4 pt-16 pb-16">
        {/* Back */}
        <div className="mb-4 flex justify-end">
          <Link href="/inventory"
            className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
            <button type="button" onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-ink bg-white px-4 h-8 text-sm font-medium text-midnight-ink">
              <Printer className="h-4 w-4" /> Print
            </button>
            <SortPopover
              columns={
                activeTab === 'product' ? [
                  { id: 'date', label: 'Date' },
                  { id: 'masterSku', label: 'Master SKU' },
                  { id: 'designerSku', label: 'Designer SKU' },
                  { id: 'value', label: 'Qty' },
                  { id: 'amount', label: 'Amount' },
                ] : activeTab === 'finding' ? [
                  { id: 'date', label: 'Date' },
                  { id: 'findingCode', label: 'Finding Code' },
                  { id: 'qty', label: 'Qty' },
                  { id: 'amount', label: 'Amount' },
                ] : [
                  { id: 'txn_date', label: 'Date' },
                  { id: 'die_code', label: 'Die Code' },
                  { id: 'qty', label: 'Qty' },
                  { id: 'amount', label: 'Amount' },
                ]
              }
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onClear={() => { setSortField(''); setSortDir('asc'); }}
            />
            <button type="button" onClick={() => { setSelColsForAction(new Set()); setIsManageColumnsOpen(true); }}
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
            <button type="button"
              onClick={() => { setAddForm(activeTab === 'product' ? productEmpty() : activeTab === 'finding' ? findingEmpty() : dieLogEmpty()); setAddOpen(true); }}
              className="inline-flex items-center gap-2 rounded-full border border-trust-blue bg-white px-4 h-8 text-sm font-medium text-trust-blue">
              <Plus className="h-4 w-4" /> Add Entry
            </button>
            <button type="button"
              onClick={() => { writeLS(STORAGE[activeTab], rows); showStatus(`${activeTab === 'product' ? 'Product' : 'Finding'} log saved.`); }}
              className="inline-flex items-center gap-2 rounded-full bg-trust-blue px-4 h-8 text-sm font-semibold text-white">
              Save
            </button>
        </div>

        {/* Tab pills */}
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => switchTab('product')}
            className={`rounded-full px-5 h-9 text-sm font-semibold transition border ${
              activeTab === 'product'
                ? 'bg-trust-blue text-white border-trust-blue'
                : 'bg-white text-midnight-ink border-midnight-ink hover:border-trust-blue'
            }`}>
            Product Log
          </button>
          <button type="button" onClick={() => switchTab('finding')}
            className={`rounded-full px-5 h-9 text-sm font-semibold transition border ${
              activeTab === 'finding'
                ? 'bg-trust-blue text-white border-trust-blue'
                : 'bg-white text-midnight-ink border-midnight-ink hover:border-trust-blue'
            }`}>
            Finding Log
          </button>
          <button type="button" onClick={() => switchTab('die')}
            className={`rounded-full px-5 h-9 text-sm font-semibold transition border ${
              activeTab === 'die'
                ? 'bg-trust-blue text-white border-trust-blue'
                : 'bg-white text-midnight-ink border-midnight-ink hover:border-trust-blue'
            }`}>
            Die Log
          </button>
        </div>

        {editingIds.size > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <Button onClick={saveEdits} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white">Save Changes</Button>
            <Button variant="outline" onClick={cancelEdit} className="h-8 px-3 border-rose-400 text-rose-600 hover:bg-rose-50">Cancel Edit</Button>
            <span className="text-xs text-cool-gray">Editing {editingIds.size} row(s)</span>
          </div>
        )}

        {status && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}

        {/* Filter bar */}
        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input type="text" value={filters.search} onChange={(e) => setF_('search', e.target.value)}
              placeholder="Search" className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-3" />
            <input type="text" value={filters.receivedFrom} onChange={(e) => setF_('receivedFrom', e.target.value)}
              placeholder="Received From" className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3" />
            <input type="text" value={filters.issuedTo} onChange={(e) => setF_('issuedTo', e.target.value)}
              placeholder="Issued To" className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-3" />
            <select value={filters.metal} onChange={(e) => setF_('metal', e.target.value)}
              className="h-8 text-sm w-28 bg-white rounded-md border border-trust-blue/40 px-2">
              <option value="">Metal</option>
              {METAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filters.invType} onChange={(e) => setF_('invType', e.target.value)}
              className="h-8 text-sm w-40 bg-white rounded-md border border-trust-blue/40 px-2">
              <option value="">Inventory Type</option>
              {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => setF_('status', e.target.value)}
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-2">
              <option value="">Activity Status</option>
              {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.ri} onChange={(e) => setF_('ri', e.target.value)}
              className="h-8 text-sm w-32 bg-white rounded-md border border-trust-blue/40 px-2">
              <option value="">Rcvd / Issued</option>
              {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="date" value={filters.dateFrom} onChange={(e) => setF_('dateFrom', e.target.value)}
              title="Date From" className="h-8 text-sm bg-white rounded-md border border-trust-blue/40 px-2" />
            <input type="date" value={filters.dateTo} onChange={(e) => setF_('dateTo', e.target.value)}
              title="Date To" className="h-8 text-sm bg-white rounded-md border border-trust-blue/40 px-2" />
            <button type="button" onClick={clearFilters}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium">
              Clear
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-xl border border-soft-border bg-white shadow-sm mb-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: '2000px' }}>
              <thead>
                <tr className="bg-[#dbeafe] border-b border-soft-border">
                  <th className="border border-soft-border px-3 py-2 text-left text-xs font-normal text-black w-10">
                    <input type="checkbox" checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      disabled={editingIds.size > 0}
                      className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue" />
                  </th>
                  {COLUMNS.filter((c) => visibleColumns.has(c.id)).map((col) => (
                    <th key={col.id} className="border border-soft-border px-3 py-2 text-left text-xs font-normal text-black whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={1 + COLUMNS.filter((c) => visibleColumns.has(c.id)).length}
                      className="px-4 py-12 text-center text-sm text-cool-gray">
                      No entries found. {!hasFilter ? 'Click "Add Entry" to get started.' : 'Try clearing the filters.'}
                    </td>
                  </tr>
                ) : filteredRows.map((row, idx) => {
                  const isEditing  = editingIds.has(row.id);
                  const isReceived = row.receivedIssued === 'Received';
                  const isIssued   = row.receivedIssued === 'Issued';
                  return (
                    <tr key={row.id}
                      className={`border-b border-soft-border/70 last:border-b-0 ${
                        isEditing ? 'bg-blue-50/40' : isReceived ? 'bg-emerald-50/30' : isIssued ? 'bg-amber-50/30' : ''
                      }`}>
                      <td className="border border-soft-border px-3 py-1.5">
                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)}
                          disabled={editingIds.size > 0}
                          className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue" />
                      </td>

                      {/* Shared columns */}
                      {visibleColumns.has('sno')            && <td className="border border-soft-border px-3 py-1.5 text-cool-gray text-xs">{idx + 1}</td>}
                      {visibleColumns.has('date')           && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="date" value={getF(row,'date')} onChange={(e) => setEF(row.id,'date',e.target.value)} readOnly={!isEditing} className={inputCls(isEditing)} /></td>}
                      {visibleColumns.has('receivedIssued') && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]">
                        <select value={getF(row,'receivedIssued')} onChange={(e) => setEF(row.id,'receivedIssued',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>
                          {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('inventoryType')  && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]">
                        <select value={getF(row,'inventoryType')} onChange={(e) => setEF(row.id,'inventoryType',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>
                          {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>}

                      {/* Product-only */}
                      {activeTab === 'product' && visibleColumns.has('masterSku')     && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={getF(row,'masterSku')}     onChange={(e) => setEF(row.id,'masterSku',e.target.value)}     readOnly={!isEditing} placeholder="Master SKU"   className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('designerSku')   && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={getF(row,'designerSku')}   onChange={(e) => setEF(row.id,'designerSku',e.target.value)}   readOnly={!isEditing} placeholder="Designer SKU" className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('finalSku')      && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text"   value={getF(row,'finalSku')}      onChange={(e) => setEF(row.id,'finalSku',e.target.value)}      readOnly={!isEditing} placeholder="Final SKU"    className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('metal')         && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]">
                        <select value={getF(row,'metal')} onChange={(e) => setEF(row.id,'metal',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>{P_METAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>}
                      {activeTab === 'product' && visibleColumns.has('value')         && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]"><input  type="number" value={getF(row,'value')}         onChange={(e) => setEF(row.id,'value',e.target.value)}         readOnly={!isEditing} placeholder="0"         className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('unit')          && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]">
                        <select value={getF(row,'unit')} onChange={(e) => setEF(row.id,'unit',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          {P_UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>}
                      {activeTab === 'product' && visibleColumns.has('location')      && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="text"   value={getF(row,'location')}      onChange={(e) => setEF(row.id,'location',e.target.value)}      readOnly={!isEditing} placeholder="Location"    className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('wip')           && <td className="border border-soft-border px-3 py-1.5 min-w-[80px]"><input  type="number" value={getF(row,'wip')}           onChange={(e) => setEF(row.id,'wip',e.target.value)}           readOnly={!isEditing} placeholder="0"         className={inputCls(isEditing)} /></td>}
                      {activeTab === 'product' && visibleColumns.has('totalInDemand') && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="number" value={getF(row,'totalInDemand')} onChange={(e) => setEF(row.id,'totalInDemand',e.target.value)} readOnly={!isEditing} placeholder="0"         className={inputCls(isEditing)} /></td>}

                      {/* Finding-only */}
                      {activeTab === 'finding' && visibleColumns.has('findingCode')   && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={getF(row,'findingCode')}   onChange={(e) => setEF(row.id,'findingCode',e.target.value)}   readOnly={!isEditing} placeholder="Finding Code" className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('dieNumber')     && <td className="border border-soft-border px-3 py-1.5 min-w-[100px]"><input type="text"   value={getF(row,'dieNumber')}     onChange={(e) => setEF(row.id,'dieNumber',e.target.value)}     readOnly={!isEditing} placeholder="Die No."      className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('size')          && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]"><input  type="text"   value={getF(row,'size')}          onChange={(e) => setEF(row.id,'size',e.target.value)}          readOnly={!isEditing} placeholder="Size"        className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('metal')         && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]">
                        <select value={getF(row,'metal')} onChange={(e) => setEF(row.id,'metal',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>{F_METAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>}
                      {activeTab === 'finding' && visibleColumns.has('stage')         && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]">
                        <select value={getF(row,'stage')} onChange={(e) => setEF(row.id,'stage',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>{F_STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>}
                      {activeTab === 'finding' && visibleColumns.has('mechanism')     && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="text"   value={getF(row,'mechanism')}     onChange={(e) => setEF(row.id,'mechanism',e.target.value)}     readOnly={!isEditing} placeholder="Mechanism"    className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('qty')           && <td className="border border-soft-border px-3 py-1.5 min-w-[80px]"><input  type="number" value={getF(row,'qty')}           onChange={(e) => setEF(row.id,'qty',e.target.value)}           readOnly={!isEditing} placeholder="0"           className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('weight')        && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]"><input  type="number" value={getF(row,'weight')}        onChange={(e) => setEF(row.id,'weight',e.target.value)}        readOnly={!isEditing} placeholder="0.00" step="0.01" className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('deadWeight')    && <td className="border border-soft-border px-3 py-1.5 min-w-[100px]"><input type="number" value={getF(row,'deadWeight')}    onChange={(e) => setEF(row.id,'deadWeight',e.target.value)}    readOnly={!isEditing} placeholder="0.00" step="0.01" className={inputCls(isEditing)} /></td>}
                      {activeTab === 'finding' && visibleColumns.has('moldQtyPerDie') && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]"><input type="number" value={getF(row,'moldQtyPerDie')} onChange={(e) => setEF(row.id,'moldQtyPerDie',e.target.value)} readOnly={!isEditing} placeholder="0"           className={inputCls(isEditing)} /></td>}

                      {/* Die-only */}
                      {activeTab === 'die' && visibleColumns.has('die_code')      && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="text"   value={row.die_code || '—'}      readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('master_sku')    && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="text"   value={row.master_sku || '—'}    readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('designer_sku')  && <td className="border border-soft-border px-3 py-1.5 min-w-[120px]"><input type="text"   value={row.designer_sku || '—'}  readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('location')      && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]"><input type="text"   value={row.location || '—'}      readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('qty')                && <td className="border border-soft-border px-3 py-1.5 min-w-[80px]"><input  type="number" value={row.qty || 0}                   readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('wax_piece_qty')       && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]"><input type="number" value={row.wax_piece_qty || '—'}    readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('wax_piece_location')  && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={row.wax_piece_location || '—'}  readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('wax_setting_qty')     && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]"><input type="text"   value={row.wax_setting_qty || '—'}     readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('wax_setting_location') && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={row.wax_setting_location || '—'} readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('casting_qty')          && <td className="border border-soft-border px-3 py-1.5 min-w-[100px]"><input type="text"   value={row.casting_qty || '—'}          readOnly className={inputCls(false)} /></td>}
                      {activeTab === 'die' && visibleColumns.has('casting_location')     && <td className="border border-soft-border px-3 py-1.5 min-w-[130px]"><input type="text"   value={row.casting_location || '—'}     readOnly className={inputCls(false)} /></td>}

                      {/* Shared trailing */}
                      {visibleColumns.has('price') && activeTab !== 'die'          && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]"><input type="number" value={getF(row,'price')} onChange={(e) => setEF(row.id,'price',e.target.value)} readOnly={!isEditing} placeholder="0.00" step="0.01" className={inputCls(isEditing)} /></td>}
                      {visibleColumns.has('price') && activeTab === 'die'          && <td className="border border-soft-border px-3 py-1.5 min-w-[90px]"><input type="number" value={row.price || 0} readOnly className={inputCls(false)} /></td>}
                      {visibleColumns.has('amount')         && <td className="border border-soft-border px-3 py-1.5 min-w-[110px]">
                        <span className="inline-block text-sm font-semibold text-trust-blue">
                          {(getF(row,'amount') || row.amount) ? `₹${Number(getF(row,'amount') || row.amount).toLocaleString('en-IN')}` : '—'}
                        </span>
                      </td>}
                      {visibleColumns.has('receivedFrom') && activeTab !== 'die'   && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text"   value={getF(row,'receivedFrom')}  onChange={(e) => setEF(row.id,'receivedFrom',e.target.value)}  readOnly={!isEditing} placeholder="Vendor"      className={inputCls(isEditing)} /></td>}
                      {visibleColumns.has('received_from') && activeTab === 'die'  && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text"   value={row.received_from || '—'}  readOnly className={inputCls(false)} /></td>}
                      {visibleColumns.has('issuedTo') && activeTab !== 'die'       && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text"   value={getF(row,'issuedTo')}      onChange={(e) => setEF(row.id,'issuedTo',e.target.value)}      readOnly={!isEditing} placeholder="Person/dept" className={inputCls(isEditing)} /></td>}
                      {visibleColumns.has('issued_to') && activeTab === 'die'      && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text"   value={row.issued_to || '—'}      readOnly className={inputCls(false)} /></td>}
                      {visibleColumns.has('remark')         && <td className="border border-soft-border px-3 py-1.5 min-w-[160px]"><input type="text"   value={activeTab === 'die' ? (row.remark || '—') : getF(row,'remark')} onChange={(e) => activeTab !== 'die' && setEF(row.id,'remark',e.target.value)} readOnly={!isEditing || activeTab === 'die'} placeholder="Remark" className={inputCls(isEditing && activeTab !== 'die')} /></td>}
                      {visibleColumns.has('activityStatus') && activeTab !== 'die' && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]">
                        <select value={getF(row,'activityStatus')} onChange={(e) => setEF(row.id,'activityStatus',e.target.value)} disabled={!isEditing} className={selectCls(isEditing)}>
                          <option value="">—</option>
                          {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>}
                      {visibleColumns.has('activity_status') && activeTab === 'die' && <td className="border border-soft-border px-3 py-1.5 min-w-[140px]"><input type="text" value={row.activity_status || '—'} readOnly className={inputCls(false)} /></td>}
                      {visibleColumns.has('action')         && <td className="border border-soft-border px-3 py-1.5">
                        <button type="button" onClick={() => deleteRow(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Add Entry Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
              <Plus className="h-5 w-5 text-trust-blue" />
              Add {activeTab === 'product' ? 'Product' : activeTab === 'finding' ? 'Finding' : 'Die'} Log Entry
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Shared top fields */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Date</label>
              <input type="date" value={addForm.date} onChange={(e) => setAddForm((p) => ({ ...p, date: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Received / Issued</label>
              <select value={addForm.receivedIssued} onChange={(e) => setAddForm((p) => ({ ...p, receivedIssued: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select</option>
                {RECEIVED_ISSUED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Inventory Type</label>
              <select value={addForm.inventoryType} onChange={(e) => setAddForm((p) => ({ ...p, inventoryType: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select type</option>
                {INVENTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Metal</label>
              <select value={addForm.metal} onChange={(e) => setAddForm((p) => ({ ...p, metal: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select metal</option>
                {METAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Product fields */}
            {activeTab === 'product' && <>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Master SKU <span className="text-red-500">*</span></label>
                <input type="text" value={pAddForm.masterSku} onChange={(e) => setPAddForm((p) => ({ ...p, masterSku: e.target.value }))}
                  placeholder="e.g. M-001"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Designer SKU</label>
                <input type="text" value={pAddForm.designerSku} onChange={(e) => setPAddForm((p) => ({ ...p, designerSku: e.target.value }))}
                  placeholder="e.g. D-001"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Final Stock SKU</label>
                <input type="text" value={pAddForm.finalSku} onChange={(e) => setPAddForm((p) => ({ ...p, finalSku: e.target.value }))}
                  placeholder="e.g. FS-001"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Value / Qty</label>
                <input type="number" value={pAddForm.value} onChange={(e) => setPAddForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Unit</label>
                <select value={pAddForm.unit} onChange={(e) => setPAddForm((p) => ({ ...p, unit: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                  {P_UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Location</label>
                <input type="text" value={pAddForm.location} onChange={(e) => setPAddForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Shelf A"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">WIP</label>
                <input type="number" value={pAddForm.wip} onChange={(e) => setPAddForm((p) => ({ ...p, wip: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Total In Demand</label>
                <input type="number" value={pAddForm.totalInDemand} onChange={(e) => setPAddForm((p) => ({ ...p, totalInDemand: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
            </>}

            {/* Finding fields */}
            {activeTab === 'finding' && <>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Finding Code <span className="text-red-500">*</span></label>
                <input type="text" value={fAddForm.findingCode} onChange={(e) => setFAddForm((p) => ({ ...p, findingCode: e.target.value }))}
                  placeholder="e.g. FC-001"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Die No.</label>
                <input type="text" value={fAddForm.dieNumber} onChange={(e) => setFAddForm((p) => ({ ...p, dieNumber: e.target.value }))}
                  placeholder="e.g. D-101"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Size</label>
                <input type="text" value={fAddForm.size} onChange={(e) => setFAddForm((p) => ({ ...p, size: e.target.value }))}
                  placeholder="e.g. 6mm"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Stage</label>
                <select value={fAddForm.stage} onChange={(e) => setFAddForm((p) => ({ ...p, stage: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                  <option value="">Select stage</option>
                  {F_STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Mechanism</label>
                <input type="text" value={fAddForm.mechanism} onChange={(e) => setFAddForm((p) => ({ ...p, mechanism: e.target.value }))}
                  placeholder="e.g. Lobster clasp"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Quantity</label>
                <input type="number" value={fAddForm.qty} onChange={(e) => setFAddForm((p) => ({ ...p, qty: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Weight</label>
                <input type="number" value={fAddForm.weight} onChange={(e) => setFAddForm((p) => ({ ...p, weight: e.target.value }))}
                  placeholder="0.00" min={0} step="0.01"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Dead Weight</label>
                <input type="number" value={fAddForm.deadWeight} onChange={(e) => setFAddForm((p) => ({ ...p, deadWeight: e.target.value }))}
                  placeholder="0.00" min={0} step="0.01"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Mold Qty / Die</label>
                <input type="number" value={fAddForm.moldQtyPerDie} onChange={(e) => setFAddForm((p) => ({ ...p, moldQtyPerDie: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
            </>}

            {/* Die Log fields */}
            {activeTab === 'die' && <>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Die Code <span className="text-red-500">*</span></label>
                <input type="text" value={dAddForm.die_code} onChange={(e) => setDAddForm((p) => ({ ...p, die_code: e.target.value }))}
                  placeholder="e.g. DIE-001"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Txn Type</label>
                <select value={dAddForm.txn_type} onChange={(e) => setDAddForm((p) => ({ ...p, txn_type: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                  <option value="">Select</option>
                  <option value="received">Received</option>
                  <option value="issued">Issued</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Master SKU</label>
                <input type="text" value={dAddForm.master_sku} onChange={(e) => setDAddForm((p) => ({ ...p, master_sku: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Designer SKU</label>
                <input type="text" value={dAddForm.designer_sku} onChange={(e) => setDAddForm((p) => ({ ...p, designer_sku: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Quantity</label>
                <input type="number" value={dAddForm.qty} onChange={(e) => setDAddForm((p) => ({ ...p, qty: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Location</label>
                <input type="text" value={dAddForm.location} onChange={(e) => setDAddForm((p) => ({ ...p, location: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Wax Piece Qty</label>
                <input type="number" value={dAddForm.wax_piece_qty} onChange={(e) => setDAddForm((p) => ({ ...p, wax_piece_qty: e.target.value }))}
                  placeholder="0" min={0}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Wax Piece Location</label>
                <input type="text" value={dAddForm.wax_piece_location} onChange={(e) => setDAddForm((p) => ({ ...p, wax_piece_location: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Wax Setting Qty</label>
                <input type="text" value={dAddForm.wax_setting_qty} onChange={(e) => setDAddForm((p) => ({ ...p, wax_setting_qty: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Wax Setting Location</label>
                <input type="text" value={dAddForm.wax_setting_location} onChange={(e) => setDAddForm((p) => ({ ...p, wax_setting_location: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Casting Qty</label>
                <input type="text" value={dAddForm.casting_qty} onChange={(e) => setDAddForm((p) => ({ ...p, casting_qty: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Casting Location</label>
                <input type="text" value={dAddForm.casting_location} onChange={(e) => setDAddForm((p) => ({ ...p, casting_location: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Received From</label>
                <input type="text" value={dAddForm.received_from} onChange={(e) => setDAddForm((p) => ({ ...p, received_from: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Issued To</label>
                <input type="text" value={dAddForm.issued_to} onChange={(e) => setDAddForm((p) => ({ ...p, issued_to: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Price (₹)</label>
                <input type="number" value={dAddForm.price} onChange={(e) => setDAddForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0.00" min={0} step="0.01"
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Activity Status</label>
                <input type="text" value={dAddForm.activity_status} onChange={(e) => setDAddForm((p) => ({ ...p, activity_status: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Remark</label>
                <input type="text" value={dAddForm.remark} onChange={(e) => setDAddForm((p) => ({ ...p, remark: e.target.value }))}
                  className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
              </div>
            </>}

            {/* Shared bottom fields */}
            {activeTab !== 'die' && <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Price per Unit (₹)</label>
              <input type="number" value={addForm.price} onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00" min={0} step="0.01"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>}
            {activeTab !== 'die' && <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Activity Status</label>
              <select value={addForm.activityStatus} onChange={(e) => setAddForm((p) => ({ ...p, activityStatus: e.target.value }))}
                className="h-9 rounded-lg border border-soft-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue">
                <option value="">Select status</option>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>}
            {activeTab !== 'die' && <div className={`col-span-2 rounded-lg border px-4 py-3 flex items-center justify-between ${addFormAmount ? 'border-trust-blue/30 bg-blue-50' : 'border-soft-border bg-[#F8F9FA]'}`}>
              <span className="text-sm text-cool-gray font-medium">
                Total Amount — Price × {activeTab === 'product' ? 'Value/Qty' : 'Quantity'} (auto)
              </span>
              <span className={`text-xl font-bold ${addFormAmount ? 'text-trust-blue' : 'text-cool-gray/50'}`}>
                {addFormAmount ? `₹${Number(addFormAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </span>
            </div>}
            {activeTab !== 'die' && <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Received From</label>
              <input type="text" value={addForm.receivedFrom} onChange={(e) => setAddForm((p) => ({ ...p, receivedFrom: e.target.value }))}
                placeholder="Vendor / supplier"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>}
            {activeTab !== 'die' && <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Issued To</label>
              <input type="text" value={addForm.issuedTo} onChange={(e) => setAddForm((p) => ({ ...p, issuedTo: e.target.value }))}
                placeholder="Person / department"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>}
            {activeTab !== 'die' && <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Remark</label>
              <input type="text" value={addForm.remark} onChange={(e) => setAddForm((p) => ({ ...p, remark: e.target.value }))}
                placeholder="Any additional notes"
                className="h-9 rounded-lg border border-soft-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue" />
            </div>}
          </div>

          {status && statusType === 'error' && <p className="text-xs text-red-600 mt-1">{status}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-trust-blue hover:bg-blue-700 text-white">Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manage Columns Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-midnight-ink">
              Manage Columns — {activeTab === 'product' ? 'Product' : activeTab === 'finding' ? 'Finding' : 'Die'} Log
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
            {COLUMNS.filter((c) => c.id !== 'sno' && c.id !== 'action').map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer text-sm text-midnight-ink">
                <input type="checkbox" checked={selColsForAction.has(col.id)} onChange={() => toggleColSel(col.id)}
                  className="h-4 w-4 accent-trust-blue" />
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
            <Button variant="outline" onClick={saveColumnView} className="ml-auto border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10">{saveViewStatus === 'saved' ? 'Saved ✓' : 'Save View'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <DeletionHistoryDrawer appLabel="inventory" modelName="productinventorytransaction" />
    </main>
  );
}
