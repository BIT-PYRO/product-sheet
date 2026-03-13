'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

const PRODUCT_DETAIL_FIELDS = [
  { key: 'sku', label: 'SKU' },
  { key: 'listingName', label: 'Listing Name' },
  { key: 'material', label: 'Material' },
  { key: 'weight', label: 'Weight' },
  { key: 'category', label: 'Category' },
  { key: 'collection', label: 'Collection' },
  { key: 'settingType', label: 'Setting Type' },
  { key: 'enamelType', label: 'Enamel Type' },
  { key: 'activeChannels', label: 'Active Channels' },
  { key: 'shopifyStatus', label: 'Shopify Status' },
  { key: 'dieNumberFindings', label: 'Die Number/Findings' },
  { key: 'masterSku', label: 'Master SKU' },
  { key: 'color', label: 'Color' },
  { key: 'enamel', label: 'Enamel' },
  { key: 'stoneName', label: 'Stone Name' },
  { key: 'stoneCut', label: 'Stone Cut' },
  { key: 'stoneColor', label: 'Stone Color' },
  { key: 'stoneSize', label: 'Stone Size' },
  { key: 'stoneQuantity', label: 'Stone Quantity' },
  { key: 'platingType', label: 'Plating Type' },
  { key: 'platingColor', label: 'Plating Color' },
  { key: 'notes', label: 'Notes' },
  { key: 'images', label: 'Images' },
];

export default function JobSheetPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsBySku, setProductsBySku] = useState({});
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showManageDetailsColumns, setShowManageDetailsColumns] = useState(false);
  const [visibleDetailFields, setVisibleDetailFields] = useState(new Set(PRODUCT_DETAIL_FIELDS.map((field) => field.key)));
  const [selectedDetailFields, setSelectedDetailFields] = useState(new Set());
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [customerDetailsUnlocked, setCustomerDetailsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const CUSTOMER_DETAILS_PASSCODE = process.env.NEXT_PUBLIC_CUSTOMER_PASSCODE || '1234';

  const normalizeSku = (value) => String(value || '').trim().toLowerCase();

  const displayValue = (value) => {
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '—';
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).length ? JSON.stringify(value) : '—';
    }
    return value || '—';
  };

  const toggleDetailFieldSelection = (fieldKey) => {
    setSelectedDetailFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const toggleSelectAllDetailFields = () => {
    setSelectedDetailFields((prev) => {
      if (prev.size === PRODUCT_DETAIL_FIELDS.length) {
        return new Set();
      }
      return new Set(PRODUCT_DETAIL_FIELDS.map((field) => field.key));
    });
  };

  const handleHideDetailFields = () => {
    if (selectedDetailFields.size === 0) {
      return;
    }
    setVisibleDetailFields((prev) => {
      const next = new Set(prev);
      selectedDetailFields.forEach((fieldKey) => next.delete(fieldKey));
      return next;
    });
    setSelectedDetailFields(new Set());
    setShowManageDetailsColumns(false);
  };

  const handleShowDetailFields = () => {
    if (selectedDetailFields.size === 0) {
      return;
    }
    setVisibleDetailFields((prev) => {
      const next = new Set(prev);
      selectedDetailFields.forEach((fieldKey) => next.add(fieldKey));
      return next;
    });
    setSelectedDetailFields(new Set());
    setShowManageDetailsColumns(false);
  };

  const buildProductMap = (products) => {
    const map = {};
    products.forEach((product) => {
      const key = normalizeSku(product?.sku);
      if (!key) {
        return;
      }
      map[key] = {
        sku: product?.sku || '',
        listingName: product?.name || product?.listingName || '',
        material: product?.material || '',
        weight: product?.weight || '',
        category: product?.category || '',
        collection: product?.collection || '',
        settingType: product?.settingType || product?.setting_type || '',
        enamelType: product?.enamelType || product?.enamel_type || '',
        activeChannels: product?.activeChannels || product?.active_channels || '',
        shopifyStatus: product?.shopifyStatus || product?.shopify_status || (product?.is_active === true ? 'Active' : product?.is_active === false ? 'Inactive' : ''),
        dieNumberFindings: product?.dieNumberFindings || product?.die_number_findings || '',
        masterSku: product?.masterSku || product?.master_sku || product?.sku || '',
        color: product?.color || '',
        enamel: product?.enamel || '',
        stoneName: product?.stoneName || product?.stone_name || '',
        stoneCut: product?.stoneCut || product?.stone_cut || '',
        stoneColor: product?.stoneColor || product?.stone_color || '',
        stoneSize: product?.stoneSize || product?.stone_size || '',
        stoneQuantity: product?.stoneQuantity || product?.stone_quantity || '',
        platingType: product?.platingType || product?.plating_type || '',
        platingColor: product?.platingColor || product?.plating_color || '',
        notes: product?.notes || '',
        images: product?.images || '',
      };
    });
    return map;
  };

  const loadOrdersAndProducts = async () => {
    try {
      setLoading(true);
      setProductsLoading(true);
      setError(null);
      setProductsError(null);

      const [ordersResponse, productsResponse] = await Promise.all([
        fetch('/frontend/api/orders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch('/frontend/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }

      const ordersData = await ordersResponse.json();
      const ordersList = Array.isArray(ordersData?.results)
        ? ordersData.results
        : Array.isArray(ordersData)
          ? ordersData
          : [];
      setOrders(ordersList);
      if (ordersList.length > 0 && !selectedOrder) {
        setSelectedOrder(ordersList[0]);
      }

      if (!productsResponse.ok) {
        setProductsError('Failed to fetch product details');
      } else {
        const productsData = await productsResponse.json();
        const productsList = Array.isArray(productsData?.data)
          ? productsData.data
          : Array.isArray(productsData?.results)
            ? productsData.results
            : Array.isArray(productsData)
              ? productsData
              : [];
        setProductsBySku(buildProductMap(productsList));
      }
    } catch (err) {
      setError(err.message || 'Error loading orders');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setProductsLoading(false);
    }
  };

  // Load orders and product details from API
  useEffect(() => {
    loadOrdersAndProducts();
  }, []);

  const handleVerifyPassword = () => {
    setPasswordError('');
    if (passwordInput === CUSTOMER_DETAILS_PASSCODE) {
      setCustomerDetailsUnlocked(true);
      setShowPasswordDialog(false);
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect passcode. Please try again.');
      setPasswordInput('');
    }
  };

  const handleOpenPasswordDialog = () => {
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };

  const handleRefresh = async () => {
    await loadOrdersAndProducts();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#f8fafc_32%,_#ffffff_72%)]">
      {/* Header */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-soft-border shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-cool-gray mb-2">
            <Link href="/orders" className="hover:text-midnight-ink">Orders</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-midnight-ink font-medium">Order Sheet</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-midnight-ink">Order Sheet</h1>
              <p className="text-xs text-cool-gray mt-0.5">View all confirmed orders</p>
            </div>
            <button
              onClick={handleRefresh}
              className="gap-2 text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-midnight-ink font-medium transition-colors flex items-center"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Main content */}
      <div className={`max-w-7xl mx-auto h-full ${embedded ? 'px-0 py-2' : 'px-5 py-4'}`}>
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            {error}
          </div>
        )}

        {/* Split layout: 40% table, 60% details */}
        <div className="flex gap-4 h-full items-stretch">
          {/* Left side - 40% Orders table */}
          <div className="w-2/5 h-full bg-white/95 rounded-2xl border border-slate-200/70 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all">
            <div className="px-4 py-3 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-slate-100/70">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">Orders</h3>
                <span className="text-[11px] font-semibold text-slate-500">{orders.length} total</span>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center flex-1 text-xs text-cool-gray">
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-xs text-cool-gray gap-2">
                <p>No orders found</p>
                <Link href="/orders/create-job" className="text-trust-blue hover:underline font-medium">
                  Create an order
                </Link>
              </div>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-soft-border/60 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[22%]">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[16%]">
                        Order ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[14%]">
                        Ref. ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[30%]">
                        Channel
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[18%]">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-border/50">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setCustomerDetailsUnlocked(false);
                        }}
                        className={`hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent transition-all cursor-pointer group border-l-4 ${
                          selectedOrder?.id === order.id
                            ? 'bg-gradient-to-r from-blue-50/60 to-transparent border-l-trust-blue shadow-sm'
                            : 'border-l-transparent even:bg-slate-50/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs">
                            {new Date(order.created_at).toLocaleDateString('en-GB') /* dd/mm/yyyy */}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-trust-blue group-hover:text-trust-blue/80 transition-colors text-xs">
                            #{order.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs">
                            {order.customer_id || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs truncate block" title={order.customer_name || `Customer #${order.customer_id || 'N/A'}`}>
                            {order.customer_name || `Customer #${order.customer_id || 'N/A'}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-midnight-ink text-xs">
                            {fmt(order.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right side - 60% Order details */}
          <div className="w-3/5 h-full bg-white/95 rounded-2xl border border-slate-200/70 shadow-lg overflow-y-auto flex flex-col">
            {selectedOrder ? (
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-midnight-ink via-slate-800 to-midnight-ink/80 text-white p-2 z-20 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold">Order #{selectedOrder.id}</h2>
                      <p className="text-xs text-white/70 mt-0.5 leading-tight">
                        Status: <span className="font-medium text-white">{selectedOrder.status || 'Pending'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-2 space-y-2">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-soft-border/60 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs text-cool-gray mb-0.5">Created</p>
                      <p className="font-bold text-midnight-ink text-xs leading-tight">
                        {new Date(selectedOrder.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="p-2 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-soft-border/60 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs text-cool-gray mb-0.5">Total</p>
                      <p className="font-bold text-midnight-ink text-xs leading-tight">
                        {fmt(selectedOrder.total)}
                      </p>
                    </div>
                  </div>

                  {/* Customer details section */}
                  {!customerDetailsUnlocked ? (
                    <div
                      onClick={handleOpenPasswordDialog}
                      className="p-3 rounded-lg border border-slate-300/40 bg-gradient-to-br from-slate-50/80 to-slate-100/40 hover:from-slate-100/80 hover:to-slate-100/60 cursor-pointer transition-all group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 group-hover:from-slate-500 group-hover:to-slate-600 transition-all shadow-md">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</p>
                          <p className="text-xs text-slate-600 leading-tight">Enter passcode to unlock</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-slate-50/90 to-blue-50/50 border border-slate-300/40 shadow-sm animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</h3>
                        <button
                          onClick={() => setCustomerDetailsUnlocked(false)}
                          className="text-xs text-slate-500 hover:text-midnight-ink transition-colors underline"
                        >
                          Lock
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Name', value: selectedOrder.customer_name },
                          { label: 'Email', value: selectedOrder.customer_email },
                          { label: 'Phone', value: selectedOrder.customer_phone },
                          { label: 'Address', value: selectedOrder.customer_address },
                          { label: 'City', value: selectedOrder.customer_city },
                          { label: 'State', value: selectedOrder.customer_state },
                          { label: 'Zip', value: selectedOrder.customer_zip },
                        ].map((detail, idx) => (
                          <div key={idx} className="text-xs">
                            <p className="text-slate-600 font-medium mb-0.5 leading-tight">{detail.label}</p>
                            <p className="text-midnight-ink font-semibold text-xs leading-tight">{detail.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unified product details (includes order item info) */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="mt-1 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 shadow-sm overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Product Details
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowManageDetailsColumns(true)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Manage Columns
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowProductDetails((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-trust-blue hover:text-deep-blue transition-colors"
                          >
                            {showProductDetails ? 'Show less' : 'Show more'}
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showProductDetails ? 'rotate-90' : 'rotate-0'}`} />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`grid transition-all duration-400 ease-out ${showProductDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-2.5 space-y-2">
                            {productsLoading && (
                              <div className="text-xs text-cool-gray">Loading product details…</div>
                            )}
                            {!productsLoading && productsError && (
                              <div className="text-xs text-red-700">{productsError}</div>
                            )}
                            {!productsLoading && !productsError && (
                              <div className="rounded-lg bg-white border border-slate-200/70 shadow-sm overflow-hidden">
                                {PRODUCT_DETAIL_FIELDS.some((field) => visibleDetailFields.has(field.key)) ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-soft-border/60">
                                        <tr>
                                          {PRODUCT_DETAIL_FIELDS.filter((field) => visibleDetailFields.has(field.key)).map((field) => (
                                            <th
                                              key={field.key}
                                              className="text-left px-2 py-1.5 font-bold text-slate-700 whitespace-nowrap"
                                            >
                                              {field.label}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-soft-border/40">
                                        {selectedOrder.items.map((item, idx) => {
                                          const productDetails = productsBySku[normalizeSku(item.sku)] || {};
                                          const details = {
                                            orderProduct: item.name || '—',
                                            orderQty: item.quantity ?? '—',
                                            orderPrice: fmt(item.price || 0),
                                            sku: productDetails.sku || item.sku || '—',
                                            listingName: productDetails.listingName || item.name || '—',
                                            material: productDetails.material || '—',
                                            weight: productDetails.weight || '—',
                                            category: productDetails.category || '—',
                                            collection: productDetails.collection || '—',
                                            settingType: productDetails.settingType || '—',
                                            enamelType: productDetails.enamelType || '—',
                                            activeChannels: productDetails.activeChannels || '—',
                                            shopifyStatus: productDetails.shopifyStatus || '—',
                                            dieNumberFindings: productDetails.dieNumberFindings || '—',
                                            masterSku: productDetails.masterSku || '—',
                                            color: productDetails.color || '—',
                                            enamel: productDetails.enamel || '—',
                                            stoneName: productDetails.stoneName || '—',
                                            stoneCut: productDetails.stoneCut || '—',
                                            stoneColor: productDetails.stoneColor || '—',
                                            stoneSize: productDetails.stoneSize || '—',
                                            stoneQuantity: productDetails.stoneQuantity || '—',
                                            platingType: productDetails.platingType || '—',
                                            platingColor: productDetails.platingColor || '—',
                                            notes: productDetails.notes || item.note || selectedOrder.notes || '—',
                                            images: productDetails.images || item.images || '—',
                                          };

                                          return (
                                            <tr key={item.id || idx} className="hover:bg-blue-50/60 transition-all">
                                              {PRODUCT_DETAIL_FIELDS.filter((field) => visibleDetailFields.has(field.key)).map((field) => (
                                                <td
                                                  key={`${item.id || idx}-${field.key}`}
                                                  className="px-2 py-1.5 text-midnight-ink whitespace-nowrap"
                                                >
                                                  {displayValue(details[field.key])}
                                                </td>
                                              ))}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="p-3 text-xs text-cool-gray">
                                    No detail columns are visible. Use Manage Columns to show fields.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 shadow-sm overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Product Details
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowManageDetailsColumns(true)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              Manage Columns
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowProductDetails((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-trust-blue hover:text-deep-blue transition-colors"
                            >
                              {showProductDetails ? 'Show less' : 'Show more'}
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showProductDetails ? 'rotate-90' : 'rotate-0'}`} />
                            </button>
                          </div>
                        </div>

                        <div
                          className={`grid transition-all duration-400 ease-out ${showProductDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                          <div className="overflow-hidden">
                            <div className="p-2.5 space-y-2">
                              {productsLoading && (
                                <div className="text-xs text-cool-gray">Loading product details…</div>
                              )}
                              {!productsLoading && productsError && (
                                <div className="text-xs text-red-700">{productsError}</div>
                              )}
                              {!productsLoading && !productsError && (
                                <div className="space-y-3">
                                  {selectedOrder.items.map((item, idx) => {
                                    const productDetails = productsBySku[normalizeSku(item.sku)] || {};
                                    const details = {
                                      sku: productDetails.sku || item.sku || '—',
                                      listingName: productDetails.listingName || item.name || '—',
                                      material: productDetails.material || '—',
                                      weight: productDetails.weight || '—',
                                      category: productDetails.category || '—',
                                      collection: productDetails.collection || '—',
                                      settingType: productDetails.settingType || '—',
                                      enamelType: productDetails.enamelType || '—',
                                      activeChannels: productDetails.activeChannels || '—',
                                      shopifyStatus: productDetails.shopifyStatus || '—',
                                      dieNumberFindings: productDetails.dieNumberFindings || '—',
                                      masterSku: productDetails.masterSku || '—',
                                      color: productDetails.color || '—',
                                      enamel: productDetails.enamel || '—',
                                      stoneName: productDetails.stoneName || '—',
                                      stoneCut: productDetails.stoneCut || '—',
                                      stoneColor: productDetails.stoneColor || '—',
                                      stoneSize: productDetails.stoneSize || '—',
                                      stoneQuantity: productDetails.stoneQuantity || '—',
                                      platingType: productDetails.platingType || '—',
                                      platingColor: productDetails.platingColor || '—',
                                      notes: productDetails.notes || item.note || selectedOrder.notes || '—',
                                      images: productDetails.images || item.images || '—',
                                    };

                                    return (
                                      <div key={item.id || idx} className="rounded-lg bg-white border border-slate-200/70 p-2.5 shadow-sm">
                                        <div className="text-xs font-bold text-midnight-ink mb-1.5">{details.listingName}</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                          {PRODUCT_DETAIL_FIELDS.filter((field) => visibleDetailFields.has(field.key)).map((field) => (
                                            <DetailItem
                                              key={field.key}
                                              label={field.label}
                                              value={displayValue(details[field.key])}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment summary */}
                  <div className="bg-gradient-to-br from-slate-900 via-midnight-ink to-slate-800 text-white rounded-lg p-3 space-y-1.5 text-xs shadow-lg">
                    {/* Header */}
                    <div className="pb-1.5 border-b border-white/30">
                      <h3 className="font-bold text-xs uppercase tracking-widest mb-0.5 text-blue-100">Payment Summary</h3>
                      <p className="text-white/50 text-xs leading-tight">Detailed breakdown</p>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-1.5 py-1.5 border-y border-white/30\">
                      <div className="flex items-center justify-between hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors">
                        <div className="flex items-center gap-2\">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-300/70\"></div>
                          <span className="text-white/80 text-xs font-medium\">Subtotal</span>
                        </div>
                        <span className="font-bold text-xs text-white\">{fmt(selectedOrder.subtotal || selectedOrder.total)}</span>
                      </div>
                      
                      {selectedOrder.discount > 0 && (
                        <div className="flex items-center justify-between hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors\">
                          <div className="flex items-center gap-2\">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80\"></div>
                            <span className="text-white/80 text-xs font-medium\">Discount</span>
                          </div>
                          <span className="font-bold text-xs text-emerald-300">-{fmt(selectedOrder.discount)}</span>
                        </div>
                      )}
                      
                      {selectedOrder.shipping > 0 && (
                        <div className="flex items-center justify-between hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors\">
                          <div className="flex items-center gap-2\">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80\"></div>
                            <span className="text-white/80 text-xs font-medium\">Shipping</span>
                          </div>
                          <span className="font-bold text-xs text-amber-300">{fmt(selectedOrder.shipping)}</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="pt-1 bg-gradient-to-r from-white/5 to-transparent rounded px-1.5 py-1\">
                      <div className="flex items-baseline justify-between\">
                        <span className="font-bold text-xs uppercase tracking-widest text-blue-100\">Amount Due</span>
                        <span className="font-bold text-lg text-blue-300\">{fmt(selectedOrder.total)}</span>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5 text-right italic\">All inclusive charges</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-200/60 shadow-sm">
                      <h3 className="font-bold text-amber-900 text-xs mb-1 uppercase tracking-wide">Notes</h3>
                      <p className="text-xs text-amber-800/80 leading-tight line-clamp-2">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-center">
                <div className="text-cool-gray">
                  <p className="text-xs">Select an order from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      {showManageDetailsColumns && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] overflow-hidden border border-slate-200/80">
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-800">Manage Columns</h3>
              <button
                type="button"
                onClick={() => setShowManageDetailsColumns(false)}
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-4 pb-3 max-h-[50vh] overflow-y-auto">
              <label className="flex items-center justify-between gap-3 py-2 border-b border-slate-200/80 mb-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDetailFields.size === PRODUCT_DETAIL_FIELDS.length && PRODUCT_DETAIL_FIELDS.length > 0}
                    onChange={toggleSelectAllDetailFields}
                    className="h-5 w-5 rounded border-slate-300 text-trust-blue"
                  />
                  <span className="text-xl font-semibold text-slate-800">Select All</span>
                </div>
              </label>

              <div className="space-y-1">
                {PRODUCT_DETAIL_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDetailFields.has(field.key)}
                        onChange={() => toggleDetailFieldSelection(field.key)}
                        className="h-5 w-5 rounded border-slate-300 text-trust-blue"
                      />
                      <span className="text-sm text-slate-800">{field.label}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${visibleDetailFields.has(field.key) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {visibleDetailFields.has(field.key) ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleHideDetailFields}
                disabled={selectedDetailFields.size === 0}
                className="px-6 py-2 rounded-xl border border-rose-200 text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-50 transition-colors text-sm font-semibold"
              >
                Hide
              </button>
              <button
                type="button"
                onClick={handleShowDetailFields}
                disabled={selectedDetailFields.size === 0}
                className="px-6 py-2 rounded-xl border border-emerald-200 text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-50 transition-colors text-sm font-semibold"
              >
                Show
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all">
            <div className="p-6">
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-trust-blue to-trust-blue/80">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Enter Passcode</h3>
              <p className="text-center text-xs text-cool-gray mb-4">Protected customer information</p>
              
              <input
                type="password"
                placeholder="••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-trust-blue/50 focus:border-trust-blue mb-3 text-center text-lg tracking-[0.3em] font-semibold transition-all"
                autoFocus
              />
              
              {passwordError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 text-center font-medium">{passwordError}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 rounded-lg border border-soft-border hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyPassword}
                  className="flex-1 rounded-lg bg-trust-blue hover:bg-trust-blue/90 text-white font-medium transition-all text-sm"
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="text-xs rounded-md bg-slate-50/80 border border-slate-200/70 px-2 py-1.5">
      <div className="text-slate-500 font-medium uppercase tracking-wide text-[10px]">{label}</div>
      <div className="text-midnight-ink font-semibold mt-0.5">{value || '—'}</div>
    </div>
  );
}
