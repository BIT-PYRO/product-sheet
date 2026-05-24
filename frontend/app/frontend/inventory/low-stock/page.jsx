'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, PackagePlus, History, AlertTriangle, Printer } from 'lucide-react';
import SortPopover from '@/components/sort-popover';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fmtNum } from '@/lib/utils';

// ── localStorage keys (kept for fulfill log only) ────────────────────────
const FULFILL_LOG_KEY = 'low_stock_fulfill_log_v1';

// ── per-source low-stock threshold (for localStorage sources) ──────────────
const LS_LOW_THRESHOLD = 5;
// For API sources the backend min_level field is used when available.
const API_LOW_THRESHOLD = 5;

// ── helpers ────────────────────────────────────────────────────────────────
function readLS(key) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function itemName(item) {
  return item.toolName || item.machineName || item.item_name
    || item.name || item.variety || item.finding_code
    || item.master_sku || item.sku || `#${item.id}`;
}

function qty(item) {
  return Number(item.qty ?? item.quantity ?? item.current_qty ?? item.value ?? 0);
}

function minLevel(item) {
  return Number(item.min_level ?? item.low_threshold ?? 0);
}

// ── source config ──────────────────────────────────────────────────────────
const SOURCES = [
  { key: 'tools',    label: 'Tools',    color: 'bg-blue-100 text-blue-800'    },
  { key: 'machines', label: 'Machines', color: 'bg-purple-100 text-purple-800'},
  { key: 'others',   label: 'Others',   color: 'bg-amber-100 text-amber-800'  },
  { key: 'stone',    label: 'Stone',    color: 'bg-teal-100 text-teal-800'    },
  { key: 'finding',  label: 'Finding',  color: 'bg-rose-100 text-rose-800'    },
];

// ── emptyFulfill ───────────────────────────────────────────────────────────
function emptyFulfill() {
  return {
    vendorEmployee: '',
    pricePerUnit: '',
    quantity: '',
    referenceId: '',
    note: '',
  };
}

export default function LowStockPage() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [statusMsg, setStatus]  = useState('');
  const [tab, setTab]           = useState('low-stock'); // 'low-stock' | 'log'
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (field) => { setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return field; }); };
  const switchTab = (id) => { setTab(id); setSortField(''); setSortDir('asc'); };

  const [fulfillOpen, setFulfillOpen]   = useState(false);
  const [fulfillItem, setFulfillItem]   = useState(null);
  const [fulfillForm, setFulfillForm]   = useState(emptyFulfill());
  const [fulfilling, setFulfilling]     = useState(false);

  const [fulfillLog, setFulfillLog]       = useState([]);
  const [filterSource, setFilterSource]   = useState('all');
  const [filterLogSource, setFilterLogSource] = useState('all');
  const [filterLogDateFrom, setFilterLogDateFrom] = useState('');
  const [filterLogDateTo, setFilterLogDateTo]     = useState('');


  // ── Load fulfill log from localStorage ───────────────────────────────────
  useEffect(() => {
    setFulfillLog(readLS(FULFILL_LOG_KEY));
  }, []);

  // ── Fetch all low-stock items ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setStatus('');
    const all = [];

    // Tools – API
    try {
      const res = await fetch('/api/tools?page_size=500');
      if (res.ok) {
        const data = await res.json();
        const rows = data?.data?.results ?? data?.results ?? data?.data ?? [];

        // Also fetch pending tool issue requests to detect demand-based low stock
        let pendingRequests = [];
        try {
          const rRes = await fetch('/api/issue-requests?inventory_type=tools&status=pending&page_size=500');
          if (rRes.ok) {
            const rData = await rRes.json();
            pendingRequests = rData?.data?.results ?? rData?.data ?? rData?.results ?? [];
          }
        } catch { /* non-fatal */ }

        // Build map: tool id → max pending requested qty
        const pendingQtyMap = {};
        for (const req of pendingRequests) {
          const tid = req.item_id;
          if (tid) pendingQtyMap[tid] = Math.max(pendingQtyMap[tid] ?? 0, Number(req.quantity ?? 0));
        }

        for (const r of rows) {
          const q = Number(r.quantity ?? 0);
          const ml = Number(r.min_level ?? 0);
          const pendingQty = pendingQtyMap[r.id] ?? 0;
          // Low if quantity ≤ min_level threshold OR there's a pending request exceeding available stock
          const isBelowThreshold = q <= (ml > 0 ? ml : API_LOW_THRESHOLD);
          const hasDemandDeficit = pendingQty > q;
          if (isBelowThreshold || hasDemandDeficit) {
            const needed = hasDemandDeficit ? Math.max(pendingQty - q, ml > 0 ? Math.max(0, ml - q) : 0) : (ml > 0 ? Math.max(0, ml - q) : 0);
            const reasons = [];
            if (isBelowThreshold) reasons.push('below_min');
            if (hasDemandDeficit) reasons.push('demand_exceeds_stock');
            all.push({
              ...r,
              _source: 'tools',
              _qty: q,
              _minLevel: ml > 0 ? ml : (hasDemandDeficit ? pendingQty : API_LOW_THRESHOLD),
              _name: r.tool_name || `Tool #${r.id}`,
              _pendingQty: pendingQty > 0 ? pendingQty : undefined,
              _needed: needed,
              _reasons: reasons,
            });
          }
        }
      }
    } catch { /* non-fatal */ }

    // Machines – API
    try {
      const res = await fetch('/api/machines?page_size=500');
      if (res.ok) {
        const data = await res.json();
        const rows = data?.data?.results ?? data?.results ?? data?.data ?? [];
        // Also fetch pending machine issue requests to detect demand-based low stock
        let pendingRequests = [];
        try {
          const rRes = await fetch('/api/issue-requests?inventory_type=machines&status=pending&page_size=500');
          if (rRes.ok) {
            const rData = await rRes.json();
            pendingRequests = rData?.data?.results ?? rData?.data ?? rData?.results ?? [];
          }
        } catch { /* non-fatal */ }
        const pendingQtyMap = {};
        for (const req of pendingRequests) {
          const tid = req.item_id;
          if (tid) pendingQtyMap[tid] = Math.max(pendingQtyMap[tid] ?? 0, Number(req.quantity ?? 0));
        }
        for (const r of rows) {
          const q = Number(r.running_qty ?? 0) + Number(r.idle_qty ?? 0) + Number(r.breakdown_qty ?? 0) + Number(r.maintenance_qty ?? 0);
          const ml = Number(r.min_required_stock ?? 0);
          const pendingQty = pendingQtyMap[r.id] ?? 0;
          const isBelowThreshold = q <= (ml > 0 ? ml : API_LOW_THRESHOLD);
          const hasDemandDeficit = pendingQty > q;
          if (isBelowThreshold || hasDemandDeficit) {
            const needed = hasDemandDeficit ? Math.max(pendingQty - q, ml > 0 ? Math.max(0, ml - q) : 0) : (ml > 0 ? Math.max(0, ml - q) : 0);
            const reasons = [];
            if (isBelowThreshold) reasons.push('below_min');
            if (hasDemandDeficit) reasons.push('demand_exceeds_stock');
            all.push({ ...r, _source: 'machines', _qty: q, _minLevel: ml > 0 ? ml : (hasDemandDeficit ? pendingQty : API_LOW_THRESHOLD), _name: r.machine_name || `Machine #${r.id}`, _pendingQty: pendingQty > 0 ? pendingQty : undefined, _needed: needed, _reasons: reasons });
          }
        }
      }
    } catch { /* non-fatal */ }

    // Others – API
    try {
      const res = await fetch('/api/others?page_size=500');
      if (res.ok) {
        const data = await res.json();
        const rows = data?.data?.results ?? data?.results ?? data?.data ?? [];

        let pendingRequests = [];
        try {
          const rRes = await fetch('/api/issue-requests?inventory_type=others&status=pending&page_size=500');
          if (rRes.ok) {
            const rData = await rRes.json();
            pendingRequests = rData?.data?.results ?? rData?.data ?? rData?.results ?? [];
          }
        } catch { /* non-fatal */ }

        const pendingQtyMap = {};
        for (const req of pendingRequests) {
          const tid = req.item_id;
          if (tid) pendingQtyMap[tid] = Math.max(pendingQtyMap[tid] ?? 0, Number(req.quantity ?? 0));
        }

        for (const r of rows) {
          const q = Number(r.quantity ?? 0);
          const ml = Number(r.min_level ?? 0);
          const pendingQty = pendingQtyMap[r.id] ?? 0;
          const isBelowThreshold = q <= (ml > 0 ? ml : API_LOW_THRESHOLD);
          const hasDemandDeficit = pendingQty > q;
          if (isBelowThreshold || hasDemandDeficit) {
            const needed = hasDemandDeficit ? Math.max(pendingQty - q, ml > 0 ? Math.max(0, ml - q) : 0) : (ml > 0 ? Math.max(0, ml - q) : 0);
            const reasons = [];
            if (isBelowThreshold) reasons.push('below_min');
            if (hasDemandDeficit) reasons.push('demand_exceeds_stock');
            all.push({
              ...r,
              _source: 'others',
              _qty: q,
              _minLevel: ml > 0 ? ml : (hasDemandDeficit ? pendingQty : API_LOW_THRESHOLD),
              _name: r.item_name || r.name || `#${r.id}`,
              _pendingQty: pendingQty > 0 ? pendingQty : undefined,
              _needed: needed,
              _reasons: reasons,
            });
          }
        }
      }
    } catch { /* non-fatal */ }

    // Stone – API
    try {
      const res = await fetch('/api/stone-inventory?page_size=500');
      if (res.ok) {
        const data = await res.json();
        const rows = data?.data?.results ?? data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);

        let pendingRequests = [];
        try {
          const rRes = await fetch('/api/issue-requests?inventory_type=stone&status=pending&page_size=500');
          if (rRes.ok) {
            const rData = await rRes.json();
            pendingRequests = rData?.data?.results ?? rData?.data ?? rData?.results ?? [];
          }
        } catch { /* non-fatal */ }

        const pendingQtyMap = {};
        for (const req of pendingRequests) {
          const tid = req.item_id;
          if (tid) pendingQtyMap[tid] = Math.max(pendingQtyMap[tid] ?? 0, Number(req.quantity ?? 0));
        }

        for (const r of rows) {
          const q = Number(r.qty ?? r.quantity ?? 0);
          const ml = Number(r.min_level ?? 0);
          const pendingQty = pendingQtyMap[r.id] ?? 0;
          const isBelowThreshold = ml > 0 ? q <= ml : q <= API_LOW_THRESHOLD;
          const hasDemandDeficit = pendingQty > q;
          if (isBelowThreshold || hasDemandDeficit) {
            const needed = hasDemandDeficit ? Math.max(pendingQty - q, ml > 0 ? Math.max(0, ml - q) : 0) : (ml > 0 ? Math.max(0, ml - q) : 0);
            const reasons = [];
            if (isBelowThreshold) reasons.push('below_min');
            if (hasDemandDeficit) reasons.push('demand_exceeds_stock');
            all.push({
              ...r,
              _source: 'stone',
              _qty: q,
              _minLevel: ml > 0 ? ml : (hasDemandDeficit ? pendingQty : API_LOW_THRESHOLD),
              _name: [r.variety, r.species, r.stone_type].filter(Boolean).join(' – ') || `Stone #${r.id}`,
              _pendingQty: pendingQty > 0 ? pendingQty : undefined,
              _needed: needed,
              _reasons: reasons,
            });
          }
        }
      }
    } catch { /* non-fatal */ }

    // Finding – API (standalone finding-inventory)
    try {
      const res = await fetch('/api/finding-inventory?page_size=500');
      if (res.ok) {
        const data = await res.json();
        const rows = data?.data?.results ?? data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);

        let pendingRequests = [];
        try {
          const rRes = await fetch('/api/issue-requests?inventory_type=finding&status=pending&page_size=500');
          if (rRes.ok) {
            const rData = await rRes.json();
            pendingRequests = rData?.data?.results ?? rData?.data ?? rData?.results ?? [];
          }
        } catch { /* non-fatal */ }

        const pendingQtyMap = {};
        for (const req of pendingRequests) {
          const tid = req.item_id;
          if (tid) pendingQtyMap[tid] = Math.max(pendingQtyMap[tid] ?? 0, Number(req.quantity ?? 0));
        }

        for (const r of rows) {
          const q = Number(r.quantity ?? 0);
          const ml = Number(r.min_level ?? 0);
          const pendingQty = pendingQtyMap[r.id] ?? 0;
          const isBelowThreshold = q <= (ml > 0 ? ml : API_LOW_THRESHOLD);
          const hasDemandDeficit = pendingQty > q;
          if (isBelowThreshold || hasDemandDeficit) {
            const needed = hasDemandDeficit ? Math.max(pendingQty - q, ml > 0 ? Math.max(0, ml - q) : 0) : (ml > 0 ? Math.max(0, ml - q) : 0);
            const reasons = [];
            if (isBelowThreshold) reasons.push('below_min');
            if (hasDemandDeficit) reasons.push('demand_exceeds_stock');
            all.push({
              ...r,
              _source: 'finding',
              _qty: q,
              _name: r.finding_code || `Finding #${r.id}`,
              _pendingQty: pendingQty > 0 ? pendingQty : undefined,
              _needed: needed,
              _reasons: reasons,
            });
          }
        }
      }
    } catch { /* non-fatal */ }

    setItems(all);
    setLoading(false);
    setStatus(all.length === 0 ? 'No low-stock items found across all inventories.' : '');
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── filtered view ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const base = filterSource === 'all' ? items : items.filter((i) => i._source === filterSource);
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, filterSource, sortField, sortDir]);

  // ── filtered log ──────────────────────────────────────────────────────────
  const filteredLog = useMemo(() => {
    const base = fulfillLog.filter((e) => {
      if (filterLogSource !== 'all' && e.source !== filterLogSource) return false;
      if (filterLogDateFrom) {
        const entryDate = e.fulfilledAt.slice(0, 10);
        if (entryDate < filterLogDateFrom) return false;
      }
      if (filterLogDateTo) {
        const entryDate = e.fulfilledAt.slice(0, 10);
        if (entryDate > filterLogDateTo) return false;
      }
      return true;
    });
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [fulfillLog, filterLogSource, filterLogDateFrom, filterLogDateTo, sortField, sortDir]);

  // ── print helpers ─────────────────────────────────────────────────────────
  function printLowStock() {
    const rows = filteredItems.map((item) => {
      const src = srcConfig[item._source];
      const ml = Number(item._minLevel ?? item.min_level ?? 0);
      return `<tr><td>${src?.label ?? item._source}</td><td>${item._name}</td><td>${item._qty}</td><td>${ml > 0 ? ml : '—'}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Low Stock Report</title><style>body{font-family:sans-serif;font-size:13px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f1f5f9}</style></head><body><h2>Low Stock Report</h2><table><thead><tr><th>Source</th><th>Item</th><th>Current Stock</th><th>Min Level</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  }

  function printLog() {
    const rows = filteredLog.map((e) => {
      const src = srcConfig[e.source];
      return `<tr><td>${new Date(e.fulfilledAt).toLocaleDateString()}</td><td>${src?.label ?? e.source}</td><td>${e.itemName}</td><td>${e.vendorEmployee}</td><td>${e.quantity}</td><td>₹${Number(e.pricePerUnit).toLocaleString('en-IN')}</td><td>₹${Number(e.totalPrice).toLocaleString('en-IN')}</td><td>${e.referenceId || '—'}</td><td>${e.note || '—'}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Fulfill Log</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f1f5f9}</style></head><body><h2>Fulfill Log</h2><table><thead><tr><th>Date</th><th>Source</th><th>Item</th><th>Vendor/Employee</th><th>Qty</th><th>Price/Unit</th><th>Total</th><th>Ref ID</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  }

  // ── open fulfill popup ────────────────────────────────────────────────────
  function openFulfill(item) {
    setFulfillItem(item);
    setFulfillForm(emptyFulfill());
    setFulfillOpen(true);
  }

  // ── total price derived ───────────────────────────────────────────────────
  const totalPrice = useMemo(() => {
    const q = Number(fulfillForm.quantity);
    const p = Number(fulfillForm.pricePerUnit);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return null;
    return (q * p).toFixed(2);
  }, [fulfillForm.quantity, fulfillForm.pricePerUnit]);
// NOTE: totalPrice remains toFixed(2) for monetary display

  // ── submit fulfill ────────────────────────────────────────────────────────
  async function handleFulfill() {
    if (!fulfillItem) return;
    const qty     = Number(fulfillForm.quantity);
    const price   = Number(fulfillForm.pricePerUnit);
    const vendor  = fulfillForm.vendorEmployee.trim();
    const refId   = fulfillForm.referenceId.trim();

    if (!vendor)          { setStatus('Vendor / Employee name is required.'); return; }
    if (!qty || qty <= 0) { setStatus('Enter a valid quantity to fulfill.'); return; }
    if (!price || price <= 0) { setStatus('Enter a valid price per unit.'); return; }

    setFulfilling(true);
    setStatus('');

    try {
      const source = fulfillItem._source;

      if (source === 'tools') {
        const newQty = (fulfillItem._qty ?? 0) + qty;
        const res = await fetch(`/api/tools/${fulfillItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: String(newQty) }),
        });
        if (!res.ok) throw new Error(`Tools update failed (${res.status})`);
        await fetch('/api/stock-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txn_date: new Date().toISOString().slice(0,10), inventory_type: 'tools', txn_type: 'received', item_name: fulfillItem._name, qty, received_from: vendor, price, remark: refId, tool: fulfillItem.id }) });

      } else if (source === 'machines') {
        const newQty = (fulfillItem._qty ?? 0) + qty;
        // add to running_qty by default
        const res = await fetch(`/api/machines/${fulfillItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ running_qty: String(Number(fulfillItem.running_qty ?? 0) + qty) }),
        });
        if (!res.ok) throw new Error(`Machines update failed (${res.status})`);
        await fetch('/api/stock-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txn_date: new Date().toISOString().slice(0,10), inventory_type: 'machines', txn_type: 'received', item_name: fulfillItem._name, qty, received_from: vendor, price, remark: refId, machine: fulfillItem.id }) });

      } else if (source === 'others') {
        const newQty = (fulfillItem._qty ?? 0) + qty;
        const res = await fetch(`/api/others/${fulfillItem.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: String(newQty) }),
        });
        if (!res.ok) throw new Error(`Others update failed (${res.status})`);

      } else if (source === 'stone') {
        const newQty = (fulfillItem._qty ?? 0) + qty;
        const res = await fetch(`/api/stone-inventory/${fulfillItem.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qty: String(newQty) }),
        });
        if (!res.ok) throw new Error(`Stone update failed (${res.status})`);

      } else if (source === 'finding') {
        const newQty = (fulfillItem._qty ?? 0) + qty;
        const res = await fetch(`/api/finding-inventory/${fulfillItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: String(newQty) }),
        });
        if (!res.ok) throw new Error(`Finding update failed (${res.status})`);
        await fetch('/api/finding-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txn_date: new Date().toISOString().slice(0,10), txn_type: 'received', finding: fulfillItem.id, finding_code: fulfillItem.finding_code || '', qty, received_from: vendor, price, remark: refId }) });
      }

      // Save fulfill log
      const logEntry = {
        id: Date.now(),
        source,
        sourceName: SOURCES.find((s) => s.key === source)?.label ?? source,
        itemId: fulfillItem.id,
        itemName: fulfillItem._name,
        vendorEmployee: vendor,
        pricePerUnit: price,
        quantity: qty,
        totalPrice: Number(totalPrice ?? 0),
        referenceId: refId,
        note: fulfillForm.note.trim(),
        fulfilledAt: new Date().toISOString(),
        previousQty: fulfillItem._qty ?? 0,
        newQty: (fulfillItem._qty ?? 0) + qty,
      };
      const log = [logEntry, ...readLS(FULFILL_LOG_KEY)];
      writeLS(FULFILL_LOG_KEY, log);
      setFulfillLog(log);

      setFulfillOpen(false);
      setFulfillItem(null);
      await fetchAll();
      setTab('log');
      setStatus(`Fulfilled ${qty} units of "${fulfillItem._name}" successfully.`);
    } catch (err) {
      setStatus(err.message || 'Fulfill failed. Please try again.');
    } finally {
      setFulfilling(false);
    }
  }

  const srcConfig = Object.fromEntries(SOURCES.map((s) => [s.key, s]));

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-background/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              LOW STOCK
            </h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-3 md:px-4 pt-16 pb-16">
        {/* Back */}
        <div className="mb-4 flex justify-end">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-background px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-background px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={tab === 'log' ? printLog : printLowStock}
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-background px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <SortPopover
              columns={
                tab === 'log' ? [
                  { id: 'fulfilledAt', label: 'Date' },
                  { id: 'sourceName', label: 'Source' },
                  { id: 'itemName', label: 'Item' },
                  { id: 'quantity', label: 'Qty' },
                  { id: 'totalPrice', label: 'Total Price' },
                ] : [
                  { id: '_name', label: 'Item Name' },
                  { id: '_source', label: 'Type' },
                  { id: '_qty', label: 'Qty' },
                  { id: 'min_level', label: 'Min Level' },
                ]
              }
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onClear={() => { setSortField(''); setSortDir('asc'); }}
            />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-soft-border">
          {[
            { id: 'low-stock', label: `Low Stock Items${items.length > 0 ? ` (${items.length})` : ''}`, icon: <AlertTriangle className="h-4 w-4" /> },
            { id: 'log',       label: `Fulfill Log${fulfillLog.length > 0 ? ` (${fulfillLog.length})` : ''}`, icon: <History className="h-4 w-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                tab === t.id
                  ? 'border-trust-blue text-trust-blue'
                  : 'border-transparent text-cool-gray hover:text-midnight-ink'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {statusMsg && (
          <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${statusMsg.includes('failed') || statusMsg.includes('required') || statusMsg.includes('valid') ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {statusMsg}
          </div>
        )}

        {/* ── Low Stock Tab ───────────────────────────────────────────────── */}
        {tab === 'low-stock' && (
          <>
            {/* Source filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              {[{ key: 'all', label: 'All' }, ...SOURCES].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilterSource(s.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    filterSource === s.key
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-background text-midnight-ink border-soft-border hover:border-trust-blue'
                  }`}
                >
                  {s.label}
                  {s.key !== 'all' && (
                    <span className="ml-1 opacity-70">
                      ({items.filter((i) => i._source === s.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-sm text-cool-gray py-8 text-center">Loading inventory data…</div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-xl border border-soft-border bg-background px-6 py-12 text-center text-cool-gray text-sm">
                No low-stock items found{filterSource !== 'all' ? ` in ${srcConfig[filterSource]?.label}` : ''}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-soft-border bg-background">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-soft-border bg-muted">
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Source</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Item</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Details</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Reason</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Current Stock</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Min Level</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Needed</th>
                      <th className="border border-soft-border px-4 py-3 text-center font-normal text-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => {
                      const src = srcConfig[item._source];
                      const ml  = Number(item._minLevel ?? item.min_level ?? 0);
                      const needed = item._needed ?? (ml > 0 ? Math.max(0, ml - item._qty) : 0);
                      const isZero = item._qty === 0;
                      return (
                        <tr
                          key={`${item._source}-${item.id}-${idx}`}
                          className={`border-b border-soft-border/60 last:border-b-0 ${isZero ? 'bg-red-50/50' : 'bg-amber-50/30'}`}
                        >
                          <td className="border border-soft-border px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${src?.color ?? 'bg-gray-100 text-gray-700'}`}>
                              {src?.label ?? item._source}
                            </span>
                          </td>
                          <td className="border border-soft-border px-4 py-3 font-medium text-midnight-ink max-w-[180px] truncate">{item._name}</td>
                          <td className="border border-soft-border px-4 py-3 text-cool-gray text-xs">
                            {item.department && <span className="mr-2">Dept: {item.department}</span>}
                            {item.unit && <span className="mr-2">Unit: {item.unit}</span>}
                            {item.category && <span className="mr-2">Cat: {item.category}</span>}
                            {item.location && <span className="mr-2">Loc: {item.location}</span>}
                          </td>
                          <td className="border border-soft-border px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {(item._reasons || []).includes('below_min') && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
                                  ⚠ Below min level
                                </span>
                              )}
                              {(item._reasons || []).includes('demand_exceeds_stock') && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 whitespace-nowrap">
                                  ↑ Pending {item._pendingQty} &gt; stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border border-soft-border px-4 py-3 text-right">
                            <span className={`font-bold ${isZero ? 'text-red-600' : 'text-amber-600'}`}>
                              {item._qty}
                            </span>
                          </td>
                          <td className="border border-soft-border px-4 py-3 text-right text-cool-gray">{ml > 0 ? ml : '—'}</td>
                          <td className="border border-soft-border px-4 py-3 text-right">
                            {needed > 0 ? (
                              <span className="font-semibold text-red-600">{needed}</span>
                            ) : (
                              <span className="text-cool-gray">—</span>
                            )}
                          </td>
                          <td className="border border-soft-border px-4 py-3 text-center">
                            <button
                              onClick={() => openFulfill(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-trust-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              Fulfill
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Fulfill Log Tab ─────────────────────────────────────────────── */}
        {tab === 'log' && (
          <>
            {/* Log filters */}
            <div className="mb-4 flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray">From</label>
                <input
                  type="date"
                  value={filterLogDateFrom}
                  onChange={(e) => setFilterLogDateFrom(e.target.value)}
                  className="rounded-md border border-soft-border px-2 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray">To</label>
                <input
                  type="date"
                  value={filterLogDateTo}
                  onChange={(e) => setFilterLogDateTo(e.target.value)}
                  className="rounded-md border border-soft-border px-2 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[{ key: 'all', label: 'All' }, ...SOURCES].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setFilterLogSource(s.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      filterLogSource === s.key
                        ? 'bg-trust-blue text-white border-trust-blue'
                        : 'bg-background text-midnight-ink border-soft-border hover:border-trust-blue'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {(filterLogDateFrom || filterLogDateTo || filterLogSource !== 'all') && (
                <button
                  onClick={() => { setFilterLogDateFrom(''); setFilterLogDateTo(''); setFilterLogSource('all'); }}
                  className="text-xs text-cool-gray hover:text-red-500 underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {filteredLog.length === 0 ? (
              <div className="rounded-xl border border-soft-border bg-background px-6 py-12 text-center text-cool-gray text-sm">
                {fulfillLog.length === 0
                  ? 'No fulfillments recorded yet. Use the "Fulfill" button on a low-stock item to get started.'
                  : 'No log entries match the current filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-soft-border bg-background">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-soft-border bg-muted">
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Date</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Source</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Item</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Vendor / Employee</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Qty</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Price / Unit</th>
                      <th className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">Total</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Ref ID</th>
                      <th className="border border-soft-border px-4 py-3 text-left font-normal text-foreground">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLog.map((entry) => {
                      const src = srcConfig[entry.source];
                      return (
                        <tr key={entry.id} className="border-b border-soft-border/60 last:border-b-0 hover:bg-muted">
                          <td className="border border-soft-border px-4 py-3 text-cool-gray whitespace-nowrap">
                            {new Date(entry.fulfilledAt).toLocaleDateString()}{' '}
                            <span className="text-xs opacity-70">{new Date(entry.fulfilledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="border border-soft-border px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${src?.color ?? 'bg-gray-100 text-gray-700'}`}>
                              {entry.sourceName}
                            </span>
                          </td>
                          <td className="border border-soft-border px-4 py-3 font-medium text-midnight-ink max-w-[160px] truncate">{entry.itemName}</td>
                          <td className="border border-soft-border px-4 py-3 text-midnight-ink">{entry.vendorEmployee}</td>
                          <td className="border border-soft-border px-4 py-3 text-right font-normal text-foreground">{fmtNum(entry.quantity) || '—'}</td>
                          <td className="border border-soft-border px-4 py-3 text-right text-midnight-ink">₹{Number(entry.pricePerUnit).toLocaleString('en-IN')}</td>
                          <td className="border border-soft-border px-4 py-3 text-right font-semibold text-trust-blue">₹{Number(entry.totalPrice).toLocaleString('en-IN')}</td>
                          <td className="border border-soft-border px-4 py-3 text-cool-gray">{entry.referenceId || '—'}</td>
                          <td className="border border-soft-border px-4 py-3 text-cool-gray max-w-[160px] truncate">{entry.note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Fulfill Dialog ────────────────────────────────────────────────── */}
      <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-trust-blue" />
              Fulfill Stock
            </DialogTitle>
          </DialogHeader>

          {fulfillItem && (
            <div className="mt-1 rounded-lg border border-soft-border bg-muted px-4 py-3 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-cool-gray uppercase tracking-wide font-medium">{srcConfig[fulfillItem._source]?.label ?? fulfillItem._source}</p>
                  <p className="font-semibold text-midnight-ink">{fulfillItem._name}</p>
                  {(fulfillItem.department || fulfillItem.category) && (
                    <p className="text-xs text-cool-gray mt-0.5">{fulfillItem.department || fulfillItem.category}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-cool-gray">Current Stock</p>
                  <p className={`text-2xl font-bold ${fulfillItem._qty === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {fulfillItem._qty}
                  </p>
                  {fulfillItem.unit && <p className="text-xs text-cool-gray">{fulfillItem.unit}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Reference ID */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">
                Reference ID <span className="text-cool-gray/50 normal-case">(for payment, optional)</span>
              </label>
              <input
                type="text"
                value={fulfillForm.referenceId}
                onChange={(e) => setFulfillForm((p) => ({ ...p, referenceId: e.target.value }))}
                placeholder="e.g. INV-2026-042"
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>

            {/* Vendor / Employee */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Vendor / Employee Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={fulfillForm.vendorEmployee}
                onChange={(e) => setFulfillForm((p) => ({ ...p, vendorEmployee: e.target.value }))}
                placeholder="e.g. Raju Suppliers or Anita"
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>

            {/* Quantity + Price per unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity to Add <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={fulfillForm.quantity}
                  onChange={(e) => setFulfillForm((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Price per Unit (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={fulfillForm.pricePerUnit}
                  onChange={(e) => setFulfillForm((p) => ({ ...p, pricePerUnit: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>

            {/* Total price display */}
            <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${totalPrice !== null ? 'border-trust-blue/30 bg-blue-50' : 'border-soft-border bg-muted'}`}>
              <span className="text-sm text-cool-gray font-medium">Total Amount</span>
              <span className={`text-xl font-bold ${totalPrice !== null ? 'text-trust-blue' : 'text-cool-gray/50'}`}>
                {totalPrice !== null ? `₹${Number(totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </span>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Note <span className="text-cool-gray/50 normal-case">(optional)</span></label>
              <input
                type="text"
                value={fulfillForm.note}
                onChange={(e) => setFulfillForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="e.g. Monthly restock"
                className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>

          {statusMsg && (
            <p className="text-xs text-red-600 mt-1">{statusMsg}</p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFulfillOpen(false)} disabled={fulfilling}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={fulfilling} className="bg-trust-blue hover:bg-blue-700 text-white">
              {fulfilling ? 'Saving…' : 'Confirm Fulfill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
