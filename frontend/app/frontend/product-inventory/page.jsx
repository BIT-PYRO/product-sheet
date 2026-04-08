'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, ChevronRight, Upload, Trash2, Pencil, Download, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import GlobalSearchBar from '@/components/global-search-bar';
import LastUpdatedFooter from '@/components/last-updated-footer';

const UNIT_OPTIONS = ['PCS', 'GM', 'KG', 'CT'];

export default function ProductInventoryPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [bulkUploadStatus, setBulkUploadStatus] = useState(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const bulkFileRef = useRef(null);

  // WIP data from jobs
  const [wipData, setWipData] = useState({});

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  const backendBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://product-sheet.onrender.com';

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendBase}${url}`;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const [invRes, prodRes, wipRes] = await Promise.all([
        fetch('/api/product-inventory', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/jobs/wip-summary', { cache: 'no-store' }),
      ]);

      const invPayload = await invRes.json().catch(() => null);
      const prodPayload = await prodRes.json().catch(() => null);
      const wipPayload = await wipRes.json().catch(() => null);

      if (!invRes.ok || !invPayload?.success) throw new Error(invPayload?.message || 'Failed to fetch product inventory');

      const invItems = Array.isArray(invPayload.data) ? invPayload.data : (Array.isArray(invPayload.data?.results) ? invPayload.data.results : []);
      const products = prodRes.ok && prodPayload?.success
        ? (Array.isArray(prodPayload.data) ? prodPayload.data : (Array.isArray(prodPayload.data?.results) ? prodPayload.data.results : []))
        : [];
      const wip = wipRes.ok && wipPayload?.success ? (wipPayload.data || {}) : {};
      setWipData(wip);

      // Build product lookup
      const productMap = new Map();
      products.forEach(p => productMap.set(p.id, p));

      // Group inventory items by product
      const byProduct = new Map();
      invItems.forEach(item => {
        const pid = item.product;
        if (!byProduct.has(pid)) byProduct.set(pid, []);
        byProduct.get(pid).push(item);
      });

      // Build rows: one per product with sub-rows for final stock entries
      const rows = [];
      byProduct.forEach((items, productId) => {
        const product = productMap.get(productId) || {};
        const firstItem = items[0] || {};
        const masterSku = (firstItem.master_sku || product.master_sku || '').toUpperCase();
        const productWip = wip[masterSku] || {};
        const totalWip = Object.values(productWip).reduce((sum, v) => sum + (Number(v) || 0), 0);

        rows.push({
          productId,
          masterSku: product.master_sku || firstItem.master_sku || '',
          designerSku: product.designer_sku || firstItem.designer_sku || '',
          productName: product.name || firstItem.product_name || '',
          images: Array.isArray(product.images) ? product.images : (Array.isArray(firstItem.images) ? firstItem.images : []),
          wip: totalWip,
          wipBreakdown: productWip,
          subRows: items.map(it => ({
            id: it.id,
            finalSku: it.final_sku || '',
            value: it.value || '0',
            unit: it.unit || 'PCS',
            location: it.location || '',
            totalInDemand: it.total_in_demand || '0',
            createdBy: it.created_by,
            updatedBy: it.updated_by,
            updatedAt: it.updated_at,
          })),
        });
      });

      // Also add products that have NO inventory items but exist in products list
      products.forEach(p => {
        if (!byProduct.has(p.id)) {
          // skip — they'll appear when user adds rows
        }
      });

      setData(rows);
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError(err.message || 'Failed to load');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Search filter
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(row => {
      if (row.masterSku.toLowerCase().includes(q)) return true;
      if (row.designerSku.toLowerCase().includes(q)) return true;
      if (row.subRows.some(s => s.finalSku.toLowerCase().includes(q))) return true;
      if (row.subRows.some(s => s.location.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [data, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // Selection
  const allPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.productId));

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(r => r.productId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const toggleRowSelection = (productId) => {
    const next = new Set(selectedRows);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedRows(next);
  };

  const toggleExpand = (productId) => {
    const next = new Set(expandedProducts);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setExpandedProducts(next);
  };

  // Edit
  const handleEditRows = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to edit.');
      return;
    }
    const buffer = {};
    data.forEach(row => {
      if (selectedRows.has(row.productId)) {
        row.subRows.forEach(sub => {
          buffer[sub.id] = { ...sub };
        });
      }
    });
    setEditBuffer(buffer);
    setEditingRowIds(new Set(Object.keys(buffer).map(Number)));
    // Expand rows being edited
    setExpandedProducts(prev => {
      const next = new Set(prev);
      selectedRows.forEach(pid => next.add(pid));
      return next;
    });
  };

  const updateEditBuffer = (subId, field, value) => {
    setEditBuffer(prev => ({
      ...prev,
      [subId]: { ...prev[subId], [field]: value },
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    const errors = [];
    const ids = Array.from(editingRowIds);

    for (const id of ids) {
      const buf = editBuffer[id];
      if (!buf) continue;
      try {
        const res = await fetch(`/api/product-inventory/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            final_sku: buf.finalSku,
            value: buf.value,
            unit: buf.unit,
            location: buf.location,
            total_in_demand: buf.totalInDemand,
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) throw new Error(result?.message || `Failed to save row ${id}`);
      } catch (err) {
        errors.push(err.message);
      }
    }

    setIsSaving(false);
    setEditingRowIds(new Set());
    setEditBuffer({});
    setSelectedRows(new Set());

    if (errors.length > 0) {
      setSaveStatus({ success: false, message: errors.join('; ') });
    } else {
      setSaveStatus({ success: true, message: `${ids.length} row(s) saved` });
      loadData();
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowIds(new Set());
    setEditBuffer({});
  };

  // Delete
  const handleDeleteRows = async () => {
    const toDelete = [];
    data.forEach(row => {
      if (selectedRows.has(row.productId)) {
        row.subRows.forEach(sub => toDelete.push(sub.id));
      }
    });
    if (toDelete.length === 0) return;

    setIsDeletingRows(true);
    setDeleteStatus(null);
    const errors = [];

    for (const id of toDelete) {
      try {
        const res = await fetch(`/api/product-inventory/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || `Failed to delete ${id}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    setSelectedRows(new Set());
    setIsDeleteConfirmOpen(false);
    setIsDeletingRows(false);

    if (errors.length > 0) {
      setDeleteStatus({ success: false, message: errors.join('; ') });
    } else {
      setDeleteStatus({ success: true, message: `${toDelete.length} item(s) deleted` });
      loadData();
      setTimeout(() => setDeleteStatus(null), 3000);
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Image', 'Master SKU', 'Designer SKU', 'Final Stock SKU', 'Value', 'Unit', 'Location', 'WIP', 'Total In Demand'];
    const csvRows = [headers.join(',')];

    filteredData.forEach(row => {
      row.subRows.forEach((sub, idx) => {
        csvRows.push([
          idx === 0 ? (row.images[0] || '') : '',
          idx === 0 ? `"${row.masterSku}"` : '',
          idx === 0 ? `"${row.designerSku}"` : '',
          `"${sub.finalSku}"`,
          sub.value,
          sub.unit,
          `"${sub.location}"`,
          idx === 0 ? row.wip : '',
          sub.totalInDemand,
        ].join(','));
      });
      if (row.subRows.length === 0) {
        csvRows.push([
          row.images[0] || '',
          `"${row.masterSku}"`,
          `"${row.designerSku}"`,
          '', '', '', '',
          row.wip,
          '',
        ].join(','));
      }
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk upload
  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsBulkUploading(true);
    setBulkUploadStatus(null);

    try {
      const text = await file.text();
      let items;

      if (file.name.endsWith('.json')) {
        items = JSON.parse(text);
      } else {
        // CSV parsing
        const lines = text.trim().split('\n');
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        items = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
      }

      const res = await fetch('/api/product-inventory/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) throw new Error(result?.message || 'Bulk upload failed');

      setBulkUploadStatus({ success: true, message: result.message || 'Upload successful' });
      loadData();
    } catch (err) {
      setBulkUploadStatus({ success: false, message: err.message });
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedRows.size} product(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-cool-gray py-2">
            This will permanently delete all inventory entries for the selected product(s). This action cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsDeleteConfirmOpen(false)} variant="outline" disabled={isDeletingRows}>Cancel</Button>
            <Button onClick={handleDeleteRows} className="bg-danger hover:bg-danger/90 text-white" disabled={isDeletingRows}>
              {isDeletingRows ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 pt-16 px-3 md:px-4 pb-16">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT INVENTORY</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          {/* Search */}
          <div className="relative mr-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-4 h-4" />
            <Input
              type="text"
              placeholder="Search SKU, Design Code, Location..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="border border-soft-border rounded-lg pl-9 pr-4 h-9 w-80 text-sm"
            />
          </div>

          <Button onClick={loadData} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Bulk Upload */}
          <div>
            <input ref={bulkFileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleBulkFileChange} />
            <Button
              onClick={() => bulkFileRef.current?.click()}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
              disabled={isBulkUploading}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isBulkUploading ? 'Uploading...' : 'Bulk Upload'}
            </Button>
          </div>

          <Button onClick={handleExport} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>

          <Button
            onClick={handleEditRows}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit Rows
          </Button>

          <Button
            onClick={() => {
              if (selectedRows.size === 0) { alert('Please select at least one row to delete'); return; }
              setIsDeleteConfirmOpen(true);
            }}
            variant="outline"
            className="border-danger text-danger hover:bg-danger/10 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        </div>

        {/* Status messages */}
        {bulkUploadStatus && (
          <div className={`mb-3 rounded-md border px-4 py-2 text-sm ${bulkUploadStatus.success ? 'border-green-300 bg-success/10 text-success-dark' : 'border-danger/30 bg-danger/10 text-danger-dark'}`}>
            {bulkUploadStatus.message}
          </div>
        )}

        {isLoading && (
          <div className="mb-4 rounded-md border border-trust-blue/30 bg-trust-blue/10 px-4 py-2 text-sm text-deep-blue">Loading product inventory...</div>
        )}

        {!isLoading && fetchError && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger-dark flex items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button onClick={loadData} variant="outline" className="h-8 px-3 border-danger/40 text-danger-dark hover:bg-danger/10">Retry</Button>
          </div>
        )}

        {/* Table */}
        <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-[#dbeafe]">
                <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                  <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                      className="cursor-pointer"
                      disabled={filteredData.length === 0 || editingRowIds.size > 0}
                    />
                  </th>
                  <th className="border border-soft-border p-2 w-8 bg-[#dbeafe]"></th>
                  <th className="border border-soft-border p-2 min-w-[80px] bg-[#dbeafe]">IMAGE</th>
                  <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">MASTER SKU</th>
                  <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">DESIGNER SKU</th>
                  <th className="border border-soft-border p-2 min-w-[140px] bg-[#dbeafe]">FINAL STOCK SKU</th>
                  <th className="border border-soft-border p-2 min-w-[90px] bg-[#dbeafe]">VALUE</th>
                  <th className="border border-soft-border p-2 min-w-[70px] bg-[#dbeafe]">UNIT</th>
                  <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">LOCATION</th>
                  <th className="border border-soft-border p-2 min-w-[80px] bg-[#dbeafe]">WIP</th>
                  <th className="border border-soft-border p-2 min-w-[110px] bg-[#dbeafe]">TOTAL IN DEMAND</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={11} className="border border-soft-border p-6 text-center text-cool-gray">
                      No product inventory found. Use Bulk Upload to add products.
                    </td>
                  </tr>
                )}
                {paginatedData.map((row) => {
                  const isExpanded = expandedProducts.has(row.productId);
                  const firstSub = row.subRows[0];
                  const hasMultipleSubs = row.subRows.length > 1;

                  return (
                    <ProductRow
                      key={row.productId}
                      row={row}
                      firstSub={firstSub}
                      hasMultipleSubs={hasMultipleSubs}
                      isExpanded={isExpanded}
                      isSelected={selectedRows.has(row.productId)}
                      isEditing={editingRowIds.size > 0 && selectedRows.has(row.productId)}
                      editBuffer={editBuffer}
                      onToggleExpand={() => toggleExpand(row.productId)}
                      onToggleSelect={() => toggleRowSelection(row.productId)}
                      onUpdateBuffer={updateEditBuffer}
                      resolveImageUrl={resolveImageUrl}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Controls */}
        {editingRowIds.size > 0 && (
          <div className="mt-4 flex gap-2 items-center flex-wrap">
            <Button onClick={handleSaveEdit} className="bg-success hover:bg-success/90 text-white px-6" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancelEdit} variant="outline" className="border-red-600 text-danger hover:bg-danger/10 px-6" disabled={isSaving}>
              Cancel Edit
            </Button>
            {saveStatus && (
              <span className={`text-sm font-semibold ${saveStatus.success ? 'text-success' : 'text-danger'}`}>{saveStatus.message}</span>
            )}
          </div>
        )}

        {!editingRowIds.size && saveStatus && (
          <div className="mt-2">
            <span className={`text-sm font-semibold ${saveStatus.success ? 'text-success' : 'text-danger'}`}>{saveStatus.message}</span>
          </div>
        )}
        {deleteStatus && (
          <div className="mt-2">
            <span className={`text-sm font-semibold ${deleteStatus.success ? 'text-success' : 'text-danger'}`}>{deleteStatus.message}</span>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-soft-border shadow-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm text-cool-gray">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-soft-border rounded px-2 py-1 text-sm text-midnight-ink bg-white"
          >
            {[25, 50, 75, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{filteredData.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, filteredData.length)}`} of {filteredData.length}</span>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
          {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} item(s)</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
      </div>
    </div>
  );
}

function ProductRow({ row, firstSub, hasMultipleSubs, isExpanded, isSelected, isEditing, editBuffer, onToggleExpand, onToggleSelect, onUpdateBuffer, resolveImageUrl }) {
  const renderSubRowCells = (sub, isFirst) => {
    const buf = editBuffer[sub.id];
    const editing = isEditing && buf;

    return (
      <>
        <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input value={buf.finalSku} onChange={(e) => onUpdateBuffer(sub.id, 'finalSku', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.finalSku || '—'}</span>
          )}
        </td>
        <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input type="number" value={buf.value} onChange={(e) => onUpdateBuffer(sub.id, 'value', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.value}</span>
          )}
        </td>
        <td className="border border-soft-border p-1.5">
          {editing ? (
            <select value={buf.unit} onChange={(e) => onUpdateBuffer(sub.id, 'unit', e.target.value)} className="border rounded px-1 py-1 text-sm h-8 w-full">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          ) : (
            <span className="px-1 text-sm">{sub.unit}</span>
          )}
        </td>
        <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input value={buf.location} onChange={(e) => onUpdateBuffer(sub.id, 'location', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.location || '—'}</span>
          )}
        </td>
        <td className="border border-soft-border p-1.5 text-center">
          {isFirst ? (
            <span className="px-1 text-sm font-medium">{row.wip || 0}</span>
          ) : null}
        </td>
        <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input type="number" value={buf.totalInDemand} onChange={(e) => onUpdateBuffer(sub.id, 'totalInDemand', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.totalInDemand}</span>
          )}
        </td>
      </>
    );
  };

  if (!firstSub) {
    return (
      <tr className="hover:bg-cloud-gray">
        <td className="border border-soft-border p-2 text-center sticky left-0 z-10 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="cursor-pointer" />
        </td>
        <td className="border border-soft-border p-2"></td>
        <td className="border border-soft-border p-1.5">
          <span className="text-xs text-cool-gray">—</span>
        </td>
        <td className="border border-soft-border p-1.5">
          <Link href={`/frontend?sku=${encodeURIComponent(row.masterSku)}`} className="text-deep-blue underline hover:text-deep-blue text-sm">{row.masterSku}</Link>
        </td>
        <td className="border border-soft-border p-1.5 text-sm">{row.designerSku || '—'}</td>
        <td colSpan={4} className="border border-soft-border p-1.5 text-sm text-cool-gray">No stock entries</td>
        <td className="border border-soft-border p-1.5 text-center text-sm">{row.wip || 0}</td>
        <td className="border border-soft-border p-1.5 text-sm">—</td>
      </tr>
    );
  }

  const bgClass = isEditing ? 'bg-trust-blue/5' : 'hover:bg-cloud-gray';

  return (
    <>
      {/* Main row (with first sub-row inline) */}
      <tr className={`border-b border-soft-border ${bgClass}`}>
        <td className={`border border-soft-border p-2 text-center sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${isEditing ? 'bg-[#eff6ff]' : 'bg-white'}`}>
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="cursor-pointer" disabled={isEditing} />
        </td>
        <td className="border border-soft-border p-1 text-center">
          {hasMultipleSubs && (
            <button onClick={onToggleExpand} className="p-0.5 rounded hover:bg-cloud-gray">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </td>
        <td className="border border-soft-border p-1.5">
          {row.images.length > 0 ? (
            <img
              src={resolveImageUrl(row.images[0])}
              alt="product"
              className="w-10 h-10 object-cover rounded border border-soft-border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="text-xs text-cool-gray">—</span>
          )}
        </td>
        <td className="border border-soft-border p-1.5">
          <Link href={`/frontend?sku=${encodeURIComponent(row.masterSku)}`} className="text-deep-blue underline hover:text-deep-blue text-sm">
            {row.masterSku}
          </Link>
        </td>
        <td className="border border-soft-border p-1.5 text-sm">{row.designerSku || '—'}</td>
        {renderSubRowCells(firstSub, true)}
      </tr>

      {/* Expanded sub-rows */}
      {isExpanded && row.subRows.slice(1).map((sub) => (
        <tr key={sub.id} className={`border-b border-soft-border ${isEditing ? 'bg-trust-blue/5' : 'bg-cloud-gray/40'}`}>
          <td className={`border border-soft-border p-2 sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${isEditing ? 'bg-[#eff6ff]' : 'bg-cloud-gray/40'}`}></td>
          <td className="border border-soft-border p-1"></td>
          <td className="border border-soft-border p-1.5"></td>
          <td className="border border-soft-border p-1.5"></td>
          <td className="border border-soft-border p-1.5"></td>
          {renderSubRowCells(sub, false)}
        </tr>
      ))}
    </>
  );
}
