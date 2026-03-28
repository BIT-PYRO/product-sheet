'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

const PRODUCT_DETAIL_FIELDS = [
  { key: 'orderProduct', label: 'Product' },
  { key: 'orderQty', label: 'Qty' },
  { key: 'orderPrice', label: 'Price' },
  { key: 'sku', label: 'SKU' },
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

export function OrderSheetView({ embedded = false }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsBySku, setProductsBySku] = useState({});
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(true);
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
        console.warn(`Orders request failed (${ordersResponse.status})`);
        setError('Failed to fetch orders');
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      const ordersData = await ordersResponse.json();
      const ordersList = Array.isArray(ordersData?.results)
        ? ordersData.results
        : Array.isArray(ordersData)
          ? ordersData
          : [];
      setOrders(ordersList);
      if (selectedOrder) {
        const updatedSelected = ordersList.find((order) => order.id === selectedOrder.id) || null;
        setSelectedOrder(updatedSelected);
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
    <main className={embedded ? '' : 'h-screen bg-cloud-gray overflow-hidden'}>
      {/* Header */}
      {!embedded && (
      <div className="bg-white border-b border-soft-border shadow-sm">
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
              className="gap-2 text-xs px-3 py-1.5 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors flex items-center"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Main content */}
      <div className={`${embedded ? 'w-full h-full px-0 py-2' : 'h-[calc(100vh-90px)] max-w-7xl mx-auto px-5 py-4'} min-h-0`}>
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-soft border border-danger text-danger-dark text-xs">
            {error}
          </div>
        )}

        {/* Vertical split layout: top list, bottom details */}
        <div className="flex flex-col gap-3 h-full min-h-0">
          {/* Top area - Orders table */}
          <div className="w-full h-[52vh] min-h-[360px] max-h-[56vh] shrink-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-soft-border bg-cloud-gray">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-midnight-ink">Orders</h3>
                <span className="text-[11px] font-semibold text-cool-gray">{orders.length} total</span>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center min-h-[220px] text-xs text-cool-gray">
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[220px] text-xs text-cool-gray gap-2">
                <p>No orders found</p>
                <Link href="/orders/create-job" className="text-sky-info hover:text-trust-blue hover:underline font-medium">
                  Create an order
                </Link>
              </div>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden max-h-[360px] min-h-[220px]">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="bg-cloud-gray border-b border-soft-border sticky top-0 z-10">
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
                  <tbody className="divide-y divide-soft-border">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setCustomerDetailsUnlocked(false);
                        }}
                        className={`hover:bg-cloud-gray transition-colors cursor-pointer group border-l-4 ${
                          selectedOrder?.id === order.id
                            ? 'bg-cloud-gray border-l-trust-blue'
                            : 'border-l-transparent even:bg-white'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs">
                            {new Date(order.created_at).toLocaleDateString('en-GB') /* dd/mm/yyyy */}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-trust-blue group-hover:text-deep-blue transition-colors text-xs">
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

          {/* Bottom area - Order details (shown only after selecting an order) */}
          <div className="w-full flex-1 min-h-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            {selectedOrder ? (
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-trust-blue border-b border-soft-border p-2 z-20 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">Order #{selectedOrder.id}</h2>
                      <p className="text-xs text-white/80 mt-0.5 leading-tight">
                        Status: <span className="font-medium text-white">{selectedOrder.status || 'Pending'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-3 min-h-0 flex flex-col">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded-lg border border-soft-border">
                      <p className="text-xs text-cool-gray mb-0.5">Created</p>
                      <p className="font-bold text-midnight-ink text-xs leading-tight">
                        {new Date(selectedOrder.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-soft-border">
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
                      className="p-3 rounded-lg border border-soft-border bg-cloud-gray hover:bg-white cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-trust-blue group-hover:bg-deep-blue transition-colors">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</p>
                          <p className="text-xs text-cool-gray leading-tight">Enter passcode to unlock</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-white border border-soft-border shadow-sm animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</h3>
                        <button
                          onClick={() => setCustomerDetailsUnlocked(false)}
                          className="text-xs text-cool-gray hover:text-midnight-ink transition-colors underline"
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
                            <p className="text-cool-gray font-medium mb-0.5 leading-tight">{detail.label}</p>
                            <p className="text-midnight-ink font-semibold text-xs leading-tight">{detail.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unified product details (includes order item info) */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className={`mt-1 rounded-xl border border-soft-border bg-white shadow-sm overflow-hidden flex flex-col min-h-0 ${showProductDetails ? 'flex-1' : ''}`}>
                      <div className="px-3 py-2.5 border-b border-soft-border flex items-center justify-between gap-2 bg-cloud-gray">
                        <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                          Product Details
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowManageDetailsColumns(true)}
                            className="text-xs font-semibold text-sky-info hover:text-trust-blue transition-colors"
                          >
                            Manage Columns
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowProductDetails((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-info hover:text-trust-blue transition-colors"
                          >
                            {showProductDetails ? 'Show less' : 'Show more'}
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showProductDetails ? 'rotate-90' : 'rotate-0'}`} />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`transition-all duration-300 ease-out overflow-hidden ${showProductDetails ? 'max-h-[42vh] opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-2.5 space-y-2 max-h-[40vh] overflow-y-auto">
                            {productsLoading && (
                              <div className="text-xs text-cool-gray">Loading product details…</div>
                            )}
                            {!productsLoading && productsError && (
                              <div className="text-xs text-midnight-ink">{productsError}</div>
                            )}
                            {!productsLoading && !productsError && (
                              <div className="rounded-lg bg-white border border-soft-border shadow-sm overflow-hidden">
                                {PRODUCT_DETAIL_FIELDS.some((field) => visibleDetailFields.has(field.key)) ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-cloud-gray border-b border-soft-border">
                                        <tr>
                                          {PRODUCT_DETAIL_FIELDS.filter((field) => visibleDetailFields.has(field.key)).map((field) => (
                                            <th
                                              key={field.key}
                                              className="text-left px-2 py-1.5 font-bold text-midnight-ink whitespace-nowrap"
                                            >
                                              {field.label}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-soft-border">
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
                                            <tr key={item.id || idx} className="hover:bg-cloud-gray transition-colors">
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
                    </div>
                  )}

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div className="bg-white rounded-lg p-3 border border-soft-border shadow-sm shrink-0">
                      <h3 className="font-bold text-midnight-ink text-xs mb-1 uppercase tracking-wide">Notes</h3>
                      <p className="text-xs text-cool-gray leading-tight line-clamp-2">{selectedOrder.notes}</p>
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
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[80vh] overflow-hidden border border-soft-border">
            <div className="px-6 py-4 border-b border-soft-border flex items-center justify-between bg-cloud-gray">
              <h3 className="text-2xl font-bold text-midnight-ink">Manage Columns</h3>
              <button
                type="button"
                onClick={() => setShowManageDetailsColumns(false)}
                className="text-cool-gray hover:text-midnight-ink text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-4 pb-3 max-h-[50vh] overflow-y-auto">
              <label className="flex items-center justify-between gap-3 py-2 border-b border-soft-border mb-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDetailFields.size === PRODUCT_DETAIL_FIELDS.length && PRODUCT_DETAIL_FIELDS.length > 0}
                    onChange={toggleSelectAllDetailFields}
                    className="h-5 w-5 rounded border-soft-border text-midnight-ink"
                  />
                  <span className="text-xl font-semibold text-midnight-ink">Select All</span>
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
                        className="h-5 w-5 rounded border-soft-border text-midnight-ink"
                      />
                      <span className="text-sm text-midnight-ink">{field.label}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${visibleDetailFields.has(field.key) ? 'bg-cloud-gray text-midnight-ink border border-soft-border' : 'bg-white text-cool-gray border border-soft-border'}`}>
                      {visibleDetailFields.has(field.key) ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-soft-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleHideDetailFields}
                disabled={selectedDetailFields.size === 0}
                className="px-6 py-2 rounded-xl border border-soft-border text-cool-gray disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cloud-gray transition-colors text-sm font-semibold"
              >
                Hide
              </button>
              <button
                type="button"
                onClick={handleShowDetailFields}
                disabled={selectedDetailFields.size === 0}
                className="px-6 py-2 rounded-xl border border-soft-border bg-trust-blue text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-deep-blue transition-colors text-sm font-semibold"
              >
                Show
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all border border-soft-border">
            <div className="p-6">
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-trust-blue">
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
                className="w-full px-3 py-2 border border-soft-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-trust-blue mb-3 text-center text-lg tracking-[0.3em] font-semibold transition-all"
                autoFocus
              />
              
              {passwordError && (
                <div className="mb-3 p-2 bg-danger-soft border border-danger rounded-lg">
                  <p className="text-xs text-danger-dark text-center font-medium">{passwordError}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyPassword}
                  className="flex-1 rounded-lg bg-trust-blue hover:bg-deep-blue text-white font-medium transition-all text-sm"
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

export default function JobSheetPage() {
  return <OrderSheetView />;
}

