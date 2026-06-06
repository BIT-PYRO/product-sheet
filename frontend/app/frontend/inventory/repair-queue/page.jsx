'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronDown, Calendar, RefreshCw, Wrench, FileText, Loader2, Search } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import LastUpdatedFooter from '@/components/last-updated-footer';
import { Button } from '@/components/ui/button';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { CreateJobModal } from '@/components/create-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';

export default function RepairQueuePage() {
  const { canView, canEdit, canCreate, permsLoading } = useSheetPermissions('master-inventory-sheet');
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'batches'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [queueItems, setQueueItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Filter/Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('-scanned_at');
  
  // Loading sub-actions
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingBatch, setIsConfirmingBatch] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Voucher creation modal state
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState(false);
  const [selectedBatchForVoucher, setSelectedBatchForVoucher] = useState(null);

  // Fetch incoming repair queue items
  async function loadQueueItems() {
    setIsLoading(true);
    setError('');
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStage !== 'all') params.append('repair_stage', selectedStage);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      // Backend filter defaults
      params.append('confirmed', 'false');
      params.append('sent_to_repair', 'false');
      
      const res = await fetch(`/api/inventory/repair-queue/?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setQueueItems(Array.isArray(payload.data) ? payload.data : (payload.data?.results || []));
        setLastUpdated(new Date());
      } else {
        setError(payload?.error?.message || 'Failed to fetch repair queue');
      }
    } catch (err) {
      setError('Connection error. Unable to load queue.');
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch batches
  async function loadBatches() {
    try {
      const res = await fetch('/api/inventory/repair-batches/', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        setBatches(Array.isArray(payload.data) ? payload.data : (payload.data?.results || []));
      }
    } catch {
      // Ignore batch load error silently
    }
  }

  // Initial load
  useEffect(() => {
    if (activeTab === 'incoming') {
      loadQueueItems();
    } else {
      loadBatches();
    }
  }, [activeTab, selectedStage, dateFrom, dateTo, sortOrder]);

  // Handle Search Debounce/Submit
  const filteredQueue = useMemo(() => {
    let list = [...queueItems];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => 
        (item.product || '').toLowerCase().includes(q) || 
        (item.sku || '').toLowerCase().includes(q) ||
        (item.repair_stage_label || '').toLowerCase().includes(q)
      );
    }
    // Sorting
    list.sort((a, b) => {
      if (sortOrder === '-scanned_at') {
        return new Date(b.scanned_at || 0) - new Date(a.scanned_at || 0);
      } else if (sortOrder === 'scanned_at') {
        return new Date(a.scanned_at || 0) - new Date(b.scanned_at || 0);
      } else if (sortOrder === 'qty_desc') {
        return b.quantity - a.quantity;
      } else if (sortOrder === 'qty_asc') {
        return a.quantity - b.quantity;
      }
      return 0;
    });
    return list;
  }, [queueItems, searchTerm, sortOrder]);

  // Select all toggler
  const handleSelectAll = () => {
    if (selectedItems.size === filteredQueue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredQueue.map(item => item.repair_item_id)));
    }
  };

  const handleSelectItem = (id) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  // Sync / Refresh trigger
  const handleSync = async () => {
    setIsSyncing(true);
    await loadQueueItems();
    await loadBatches();
    setIsSyncing(false);
  };

  // Accept incoming items (creates batches)
  const handleAcceptRepairs = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one repair item to accept.');
      return;
    }
    setIsConfirming(true);
    try {
      const res = await fetch('/api/inventory/repair-queue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repair_item_ids: Array.from(selectedItems) })
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        alert(payload.message || 'Items successfully accepted and grouped into Repair Batches!');
        setSelectedItems(new Set());
        loadQueueItems();
        loadBatches();
        setActiveTab('batches');
      } else {
        alert(payload?.error?.message || 'Failed to accept repair items.');
      }
    } catch {
      alert('Connection error. Failed to accept repairs.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Mark batch confirmed
  const handleConfirmBatch = async (batchNo) => {
    setIsConfirmingBatch(prev => ({ ...prev, [batchNo]: true }));
    try {
      const res = await fetch(`/api/inventory/repair-batches/${batchNo}/confirm`, {
        method: 'POST'
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success) {
        alert(`Repair Batch ${batchNo} marked as Confirmed!`);
        loadBatches();
      } else {
        alert(payload?.error?.message || 'Failed to confirm batch.');
      }
    } catch {
      alert('Connection error. Failed to confirm batch.');
    } finally {
      setIsConfirmingBatch(prev => ({ ...prev, [batchNo]: false }));
    }
  };

  // Open voucher modal for batch
  const handleOpenVoucherCreation = (batch) => {
    setSelectedBatchForVoucher(batch);
    setIsCreateVoucherOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#080d1a] text-slate-900 dark:text-slate-100">
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <MasterNavigationDrawer inHeader={true} />
          <Link href="/master-inventory-sheet" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2 font-bold text-lg text-slate-800 dark:text-slate-100">
            <Wrench className="h-5 w-5 text-amber-500" />
            <span>Repair Queue</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DateTimeStamp />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">REPAIR MANAGEMENT SHEET</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fetch incoming jewelry repair items live, accept them into date-grouped batches, and issue repair vouchers.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                variant="outline"
                disabled={isLoading || isSyncing}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#121b2d] hover:bg-slate-50 dark:hover:bg-[#162238] rounded-full h-9 flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync API
              </Button>

              {activeTab === 'incoming' && (
                <Button
                  onClick={handleAcceptRepairs}
                  disabled={selectedItems.size === 0 || isConfirming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-5 flex items-center gap-1.5 text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all animate-pulse"
                >
                  <Check className="h-4 w-4" />
                  Accept Incoming Repairs {selectedItems.size > 0 && `(${selectedItems.size})`}
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-6 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === 'incoming'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Incoming repairs Queue
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-6 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === 'batches'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Confirmed Repair Batches
            </button>
          </div>

          {/* Tab Content 1: Incoming repairs Queue */}
          {activeTab === 'incoming' && (
            <div className="flex flex-col gap-4">
              {/* Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#0c1427] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search product, SKU, stage..."
                    className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-[#121b2d] rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-[#0c1427] transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stage:</span>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-[#121b2d] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">All Stages</option>
                    <option value="hand_setting">Hand Setting</option>
                    <option value="final_polish">Final Polish</option>
                    <option value="plating">Plating</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 bg-slate-50 dark:bg-[#121b2d] text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                  <span className="font-semibold ml-1">To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 bg-slate-50 dark:bg-[#121b2d] text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-[#121b2d] text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="-scanned_at">Newest First</option>
                    <option value="scanned_at">Oldest First</option>
                    <option value="qty_desc">Qty: High to Low</option>
                    <option value="qty_asc">Qty: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] shadow-sm">
                <table className="w-full border-collapse text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-[#121b2d] text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center border-r border-slate-200 dark:border-slate-800/80">
                        <input
                           type="checkbox"
                           checked={filteredQueue.length > 0 && selectedItems.size === filteredQueue.length}
                           onChange={handleSelectAll}
                           className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        />
                      </th>
                      <th className="px-6 py-4">Product details</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4 w-24 text-center">Qty</th>
                      <th className="px-6 py-4 w-40">Target Stage</th>
                      <th className="px-6 py-4">Scan Agent</th>
                      <th className="px-6 py-4">Scanned Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <span className="text-sm font-medium">Fetching live repair items from external API...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 font-medium">
                          No repair items in queue. All clear!
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((item) => (
                        <tr 
                          key={item.repair_item_id}
                          className={`hover:bg-slate-50 dark:hover:bg-[#162238]/60 transition-colors ${
                            selectedItems.has(item.repair_item_id) ? 'bg-amber-50/30 dark:bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4 text-center border-r border-slate-100 dark:border-slate-800/80">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.repair_item_id)}
                              onChange={() => handleSelectItem(item.repair_item_id)}
                              className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                            />
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                            <div>{item.product}</div>
                            {item.variant && item.variant !== item.product && (
                              <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{item.variant}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#162238] border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5">
                              {item.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">{item.quantity}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              item.repair_stage === 'hand_setting' 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300'
                                : item.repair_stage === 'final_polish'
                                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300'
                            }`}>
                              {item.repair_stage_label}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{item.resolved_by || 'Unknown Agent'}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content 2: Confirmed Repair Batches */}
          {activeTab === 'batches' && (
            <div className="grid grid-cols-1 gap-6">
              {batches.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-dashed bg-white dark:bg-[#0c1427] p-16 text-center text-slate-400 dark:text-slate-500 font-medium shadow-sm">
                  No repair batches created yet. Go to Incoming Queue and confirm repairs to create date-grouped batches.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {batches.map((batch) => (
                    <div 
                      key={batch.batch_no}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md inline-block mb-1.5">
                            {batch.batch_no}
                          </div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <Calendar className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                            {new Date(batch.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </h3>
                        </div>

                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          batch.voucher_created
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300'
                            : batch.confirmed
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300'
                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}>
                          {batch.voucher_created ? 'Vouchers Created' : batch.confirmed ? 'Confirmed Batch' : 'Draft Batch'}
                        </span>
                      </div>

                      <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Repair Products:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-[#162238] px-2 py-0.5 rounded-full">{batch.items_count} pcs</span>
                      </div>

                      <div className="h-2" />

                      {/* Action buttons */}
                      <div className="mt-auto pt-2 flex flex-col gap-2">
                        {!batch.confirmed && (
                          <Button
                            onClick={() => handleConfirmBatch(batch.batch_no)}
                            disabled={isConfirmingBatch[batch.batch_no]}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 font-bold text-xs"
                          >
                            {isConfirmingBatch[batch.batch_no] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Confirm Batch
                          </Button>
                        )}

                        {batch.confirmed && !batch.voucher_created && (
                          <Button
                            onClick={() => handleOpenVoucherCreation(batch)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                          >
                            <FileText className="h-4 w-4" />
                            Create Repair Vouchers
                          </Button>
                        )}

                        {batch.voucher_created && (
                          <div className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-2 rounded-lg border border-emerald-100 dark:border-emerald-850/50">
                            Vouchers generated & repair started.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <LastUpdatedFooter lastUpdated={lastUpdated} />

      {/* Bulk Job/Voucher Creation Modal */}
      {selectedBatchForVoucher && (
        <CreateJobModal
          open={isCreateVoucherOpen}
          onOpenChange={setIsCreateVoucherOpen}
          mode="repair"
          picklistGroupNumber={selectedBatchForVoucher.batch_no} // Pass batch number as group number
          onJobCreated={() => {
            loadBatches();
            loadQueueItems();
            setSelectedBatchForVoucher(null);
          }}
        />
      )}
    </div>
  );
}
