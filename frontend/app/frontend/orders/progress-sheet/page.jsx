'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmtNum } from '@/lib/utils';

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  in_process: 'bg-orange-100 text-orange-800',
  awaiting: 'bg-slate-100 text-slate-700',
  partially_complete: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

const STATE_FILTERS = {
  pending: {
    title: 'Products Pending',
    matchesProduct: (product) => product.label === 'Not Started' || product.label === 'Queued',
    matchesVoucher: (voucher) => ['pending', 'approved', 'awaiting'].includes(voucher.approval_status),
  },
  wip: {
    title: 'Products WIP',
    matchesProduct: (product) => product.label === 'In Process',
    matchesVoucher: (voucher) => ['in_process', 'partially_complete'].includes(voucher.approval_status),
  },
  ready: {
    title: 'Products Ready',
    matchesProduct: (product) => product.label === 'Ready',
    matchesVoucher: (voucher) => voucher.approval_status === 'completed' && voucher.dept_to === 'final-stock',
  },
  packaging: {
    title: 'Sent For Packaging',
    matchesProduct: (product) => product.vouchers.some(
      (voucher) => voucher.dept_to === 'final-packaging' || voucher.dept_from === 'final-packaging'
    ),
    matchesVoucher: (voucher) => voucher.dept_to === 'final-packaging' || voucher.dept_from === 'final-packaging',
  },
};

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

const normalizeBaseSku = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.includes('/') ? normalized.split('/')[0] : normalized;
};

const getDeptLabel = (deptKey) => {
  const labels = {
    'wax-pieces': 'Wax Piece',
    'wax-setting': 'Wax Setting',
    casting: 'Casting',
    filing: 'Filing / Grinding',
    'pre-polish': 'Pre-Polish',
    'hand-setting': 'Hand Setting',
    polishing: 'Final Polish',
    plating: 'Plating',
    'final-packaging': 'Final Packaging',
    'final-stock': 'Final Stock',
  };
  return labels[deptKey] || deptKey || 'Unknown';
};

const getApprovalLabel = (value) => {
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    in_process: 'In Process',
    awaiting: 'Awaiting',
    partially_complete: 'Partially Completed',
    completed: 'Completed',
  };
  return labels[value] || value || 'Unknown';
};

const parseOrders = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
};

const parseJobs = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
};

const extractVoucherSkuSet = (voucher) => {
  const set = new Set();
  const rows = Array.isArray(voucher?.material_rows) ? voucher.material_rows : [];
  rows.forEach((row) => {
    const base = normalizeBaseSku(row?.sku);
    if (base) set.add(base);
  });
  return set;
};

const computeProductState = (skuVouchers) => {
  if (!skuVouchers.length) {
    return { label: 'Not Started', className: 'bg-slate-100 text-slate-700', detail: 'No voucher created yet' };
  }

  const hasFinalStockCompleted = skuVouchers.some(
    (v) => v.approval_status === 'completed' && v.dept_to === 'final-stock'
  );
  if (hasFinalStockCompleted) {
    return { label: 'Ready', className: 'bg-green-100 text-green-800', detail: 'Reached Final Stock' };
  }

  const inProcessVoucher = skuVouchers.find(
    (v) => v.approval_status === 'in_process' || v.approval_status === 'partially_complete'
  );
  if (inProcessVoucher) {
    return {
      label: 'In Process',
      className: 'bg-orange-100 text-orange-800',
      detail: `${getDeptLabel(inProcessVoucher.dept_from)} -> ${getDeptLabel(inProcessVoucher.dept_to)}`,
    };
  }

  const hasQueued = skuVouchers.some(
    (v) => ['pending', 'approved', 'awaiting'].includes(v.approval_status)
  );
  if (hasQueued) {
    return { label: 'Queued', className: 'bg-blue-100 text-blue-800', detail: 'Waiting for stage start' };
  }

  return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', detail: 'Voucher stages completed' };
};

export function OrderProgressSheetView({ embedded = false }) {
  const [orders, setOrders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeVoucherFilter, setActiveVoucherFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [ordersRes, jobsRes] = await Promise.all([
        fetch('/frontend/api/orders', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch('/frontend/api/jobs?ordering=-created_at', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      const ordersPayload = await ordersRes.json().catch(() => null);
      const jobsPayload = await jobsRes.json().catch(() => null);

      if (!ordersRes.ok) {
        throw new Error('Failed to load orders');
      }

      if (!jobsRes.ok || jobsPayload?.success === false) {
        throw new Error(jobsPayload?.error?.message || 'Failed to load job vouchers');
      }

      const nextOrders = parseOrders(ordersPayload);
      const nextJobs = parseJobs(jobsPayload).filter((j) => j.batch_id || j.voucher_no);

      setOrders(nextOrders);
      setJobs(nextJobs);

      if (selectedOrder) {
        const updated = nextOrders.find((o) => o.id === selectedOrder.id) || null;
        setSelectedOrder(updated);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load order progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setActiveVoucherFilter(null);
  }, [selectedOrder?.id]);

  const selectedSkuRows = useMemo(() => {
    if (!selectedOrder?.items) return [];

    const map = new Map();
    selectedOrder.items.forEach((item) => {
      const baseSku = normalizeBaseSku(item?.sku);
      if (!baseSku) return;
      if (!map.has(baseSku)) {
        map.set(baseSku, {
          baseSku,
          displaySku: String(item?.sku || '').includes('/')
            ? String(item.sku).split('/')[0]
            : item.sku,
          quantity: 0,
        });
      }
      const existing = map.get(baseSku);
      existing.quantity += Number(item?.quantity) || 0;
      map.set(baseSku, existing);
    });

    return Array.from(map.values());
  }, [selectedOrder]);

  const relatedVouchers = useMemo(() => {
    if (!selectedOrder) return [];

    const orderSkuSet = new Set(selectedSkuRows.map((row) => row.baseSku));
    if (!orderSkuSet.size) return [];

    return jobs.filter((voucher) => {
      const skuSet = extractVoucherSkuSet(voucher);
      for (const sku of skuSet) {
        if (orderSkuSet.has(sku)) return true;
      }
      return false;
    });
  }, [jobs, selectedOrder, selectedSkuRows]);

  const productProgress = useMemo(() => {
    return selectedSkuRows.map((row) => {
      const skuVouchers = relatedVouchers.filter((voucher) =>
        extractVoucherSkuSet(voucher).has(row.baseSku)
      );
      const state = computeProductState(skuVouchers);
      return {
        baseSku: row.baseSku,
        sku: row.displaySku || row.baseSku.toUpperCase(),
        quantity: row.quantity,
        vouchers: skuVouchers,
        ...state,
      };
    });
  }, [selectedSkuRows, relatedVouchers]);

  const summary = useMemo(() => {
    const pendingProducts = productProgress.filter(
      (p) => p.label === 'Not Started' || p.label === 'Queued'
    ).length;
    const wipProducts = productProgress.filter((p) => p.label === 'In Process').length;
    const readyProducts = productProgress.filter((p) => p.label === 'Ready').length;
    const sentForPackagingProducts = productProgress.filter((p) =>
      p.vouchers.some(
        (v) =>
          v.dept_to === 'final-packaging' ||
          v.dept_from === 'final-packaging'
      )
    ).length;

    return {
      pendingProducts,
      wipProducts,
      readyProducts,
      totalProducts: productProgress.length,
      sentForPackagingProducts,
    };
  }, [productProgress]);

  const totalOrderedQty = useMemo(
    () => productProgress.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
    [productProgress]
  );

  const filteredStateVouchers = useMemo(() => {
    if (!activeVoucherFilter || !selectedOrder) return [];

    const filterConfig = STATE_FILTERS[activeVoucherFilter];
    if (!filterConfig) return [];

    const matchingProducts = productProgress.filter((product) => filterConfig.matchesProduct(product));
    const matchingSkuSet = new Set(matchingProducts.map((product) => product.baseSku));
    if (!matchingSkuSet.size) return [];

    const displayMap = new Map(productProgress.map((product) => [product.baseSku, product.sku]));

    return relatedVouchers
      .filter((voucher) => {
        const skuSet = extractVoucherSkuSet(voucher);
        let hasMatchedSku = false;
        for (const sku of skuSet) {
          if (matchingSkuSet.has(sku)) {
            hasMatchedSku = true;
            break;
          }
        }
        return hasMatchedSku && filterConfig.matchesVoucher(voucher);
      })
      .map((voucher) => {
        const skuSet = extractVoucherSkuSet(voucher);
        const matchedSkus = [];
        for (const sku of skuSet) {
          if (matchingSkuSet.has(sku)) {
            matchedSkus.push(displayMap.get(sku) || sku.toUpperCase());
          }
        }
        return {
          ...voucher,
          matchedSkus,
        };
      });
  }, [activeVoucherFilter, productProgress, relatedVouchers, selectedOrder]);


  return (
    <main className={embedded ? '' : 'h-screen bg-cloud-gray overflow-hidden'}>
      <div className={`${embedded ? 'w-full h-full px-0 py-2' : 'h-[calc(100vh-90px)] max-w-7xl mx-auto px-5 py-4'} min-h-0`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-soft border border-danger text-danger-dark text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 h-full min-h-0">
          <div className="w-full h-[44vh] min-h-[320px] max-h-[48vh] shrink-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-soft-border bg-cloud-gray flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-midnight-ink">Order Progress Sheet</h3>
              <button
                onClick={loadData}
                className="text-xs px-3 py-1 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[220px] text-xs text-cool-gray">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center min-h-[220px] text-xs text-cool-gray">No orders found</div>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden max-h-[360px] min-h-[220px]">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="bg-cloud-gray border-b border-soft-border sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[12%]">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Time</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[14%]">Order Ref</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[18%]">Order Name</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Order No</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[12%]">Pieces</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[12%]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-border">
                    {orders.map((order) => {
                      const orderRef = order.order_source === 'picklist' ? 'PICKLIST' : 'CUSTOM';
                      const orderName = order.order_source === 'picklist'
                        ? `PICKLIST-${order.picklist_number ?? order.id}`
                        : `CUSTOM-${order.id}`;
                      const totalPieces = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            if (selectedOrder?.id === order.id) {
                              setSelectedOrder(null);
                              return;
                            }
                            setSelectedOrder(order);
                          }}
                          className={`hover:bg-cloud-gray transition-colors cursor-pointer group border-l-4 ${
                            selectedOrder?.id === order.id
                              ? 'bg-cloud-gray border-l-trust-blue'
                              : 'border-l-transparent even:bg-white'
                          }`}
                        >
                          <td className="px-4 py-3 text-xs text-midnight-ink">{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3 text-xs text-midnight-ink">
                            {new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              orderRef === 'PICKLIST' ? 'bg-trust-blue/10 text-trust-blue' : 'bg-cloud-gray text-cool-gray'
                            }`}>{orderRef}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-midnight-ink">{orderName}</td>
                          <td className="px-4 py-3 text-xs font-bold text-trust-blue">{order.order_no || order.id}</td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-midnight-ink">{totalPieces || '—'}</td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-midnight-ink">{fmt(order.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="w-full flex-1 min-h-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            {selectedOrder ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div className="p-2 bg-white rounded-lg border border-soft-border">
                    <p className="text-xs text-cool-gray mb-0.5">Order ID</p>
                    <p className="font-bold text-midnight-ink text-xs">{selectedOrder.order_no || selectedOrder.id}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-soft-border">
                    <p className="text-xs text-cool-gray mb-0.5">Total Products</p>
                    <p className="font-bold text-midnight-ink text-xs">{summary.totalProducts}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherFilter((prev) => prev === 'pending' ? null : 'pending')}
                    className={`p-2 text-left bg-white rounded-lg border transition-colors ${
                      activeVoucherFilter === 'pending'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-soft-border hover:bg-amber-50/60'
                    }`}
                  >
                    <p className="text-xs text-cool-gray mb-0.5">Products Pending</p>
                    <p className="font-bold text-amber-700 text-xs">{summary.pendingProducts}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherFilter((prev) => prev === 'wip' ? null : 'wip')}
                    className={`p-2 text-left bg-white rounded-lg border transition-colors ${
                      activeVoucherFilter === 'wip'
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-soft-border hover:bg-orange-50/60'
                    }`}
                  >
                    <p className="text-xs text-cool-gray mb-0.5">Products WIP</p>
                    <p className="font-bold text-orange-700 text-xs">{summary.wipProducts}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherFilter((prev) => prev === 'ready' ? null : 'ready')}
                    className={`p-2 text-left bg-white rounded-lg border transition-colors ${
                      activeVoucherFilter === 'ready'
                        ? 'border-green-300 bg-green-50'
                        : 'border-soft-border hover:bg-green-50/60'
                    }`}
                  >
                    <p className="text-xs text-cool-gray mb-0.5">Products Ready</p>
                    <p className="font-bold text-green-700 text-xs">{summary.readyProducts}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveVoucherFilter((prev) => prev === 'packaging' ? null : 'packaging')}
                    className={`p-2 text-left bg-white rounded-lg border transition-colors ${
                      activeVoucherFilter === 'packaging'
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-soft-border hover:bg-indigo-50/60'
                    }`}
                  >
                    <p className="text-xs text-cool-gray mb-0.5">Sent For Packaging</p>
                    <p className="font-bold text-indigo-700 text-xs">{summary.sentForPackagingProducts}</p>
                  </button>
                </div>

                {activeVoucherFilter && (
                  <div className="rounded-xl border border-soft-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-soft-border bg-cloud-gray flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-midnight-ink">
                        {STATE_FILTERS[activeVoucherFilter]?.title} Vouchers
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveVoucherFilter(null)}
                        className="text-[11px] px-2 py-1 rounded border border-soft-border bg-white text-midnight-ink"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead className="bg-cloud-gray/60 border-b border-soft-border">
                          <tr>
                            <th className="text-left px-3 py-2 font-bold text-midnight-ink">Voucher No</th>
                            <th className="text-left px-3 py-2 font-bold text-midnight-ink">Status</th>
                            <th className="text-left px-3 py-2 font-bold text-midnight-ink">Flow</th>
                            <th className="text-left px-3 py-2 font-bold text-midnight-ink">Related Product SKU</th>
                            <th className="text-right px-3 py-2 font-bold text-midnight-ink">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStateVouchers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-3 text-cool-gray">
                                No vouchers match this state for the selected order.
                              </td>
                            </tr>
                          ) : (
                            filteredStateVouchers.map((voucher) => (
                              <tr key={voucher.id} className="border-b border-soft-border last:border-b-0">
                                <td className="px-3 py-2 font-semibold text-midnight-ink">{voucher.voucher_no || `#${voucher.id}`}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                                      STATUS_BADGE[voucher.approval_status] || 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {getApprovalLabel(voucher.approval_status)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-cool-gray">
                                  {getDeptLabel(voucher.dept_from)} {'->'} {getDeptLabel(voucher.dept_to)}
                                </td>
                                <td className="px-3 py-2 text-midnight-ink">
                                  {voucher.matchedSkus.length ? voucher.matchedSkus.join(', ') : '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-cool-gray">
                                  {voucher.created_at
                                    ? new Date(voucher.created_at).toLocaleDateString('en-GB')
                                    : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-soft-border overflow-hidden">
                  <div className="px-3 py-2 border-b border-soft-border bg-cloud-gray">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-midnight-ink">Product State Progress</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border-collapse">
                      <thead className="bg-cloud-gray/60 border-b border-soft-border">
                        <tr>
                          <th className="text-left px-3 py-2 font-bold text-midnight-ink">Product SKU</th>
                          <th className="text-left px-3 py-2 font-bold text-midnight-ink">Order Qty</th>
                          <th className="text-left px-3 py-2 font-bold text-midnight-ink">Current State</th>
                          <th className="text-left px-3 py-2 font-bold text-midnight-ink">Details</th>
                          <th className="text-right px-3 py-2 font-bold text-midnight-ink">Qty Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productProgress.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-cool-gray">No SKU details available for this order.</td>
                          </tr>
                        ) : (
                          productProgress.map((row) => (
                            <tr key={row.sku} className="border-b border-soft-border last:border-b-0">
                              <td className="px-3 py-2 font-semibold text-midnight-ink">{row.sku}</td>
                              <td className="px-3 py-2 text-midnight-ink">{fmtNum(row.quantity) || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${row.className}`}>
                                  {row.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-cool-gray">{row.detail}</td>
                              <td className="px-3 py-2 text-right text-midnight-ink font-medium">
                                {totalOrderedQty > 0
                                  ? `${((Number(row.quantity) || 0) / totalOrderedQty * 100).toFixed(1)}%`
                                  : '0.0%'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-center">
                <div className="text-cool-gray">
                  <p className="text-xs">Select an order from the list to view progress details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderProgressSheetPage() {
  return <OrderProgressSheetView />;
}
