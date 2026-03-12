'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

export default function JobSheetPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [customerDetailsUnlocked, setCustomerDetailsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const CUSTOMER_DETAILS_PASSCODE = process.env.NEXT_PUBLIC_CUSTOMER_PASSCODE || '1234';

  // Load orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/orders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        const ordersList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setOrders(ordersList);
        // Auto-select first order
        if (ordersList.length > 0 && !selectedOrder) {
          setSelectedOrder(ordersList[0]);
        }
      } catch (err) {
        setError(err.message || 'Error loading orders');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
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
    setLoading(true);
    try {
      setError(null);
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      const ordersList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setOrders(ordersList);
    } catch (err) {
      setError(err.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-soft-border shadow-sm">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-5 py-4 h-full">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            {error}
          </div>
        )}

        {/* Split layout: 40% table, 60% details */}
        <div className="flex gap-4 h-full">
          {/* Left side - 40% Orders table */}
          <div className="w-2/5 bg-white rounded-xl border border-soft-border/60 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
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
              <div className="overflow-y-auto flex-1 ">
                <table className="w-full text-sm sticky top-0">
                  <thead className="bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-soft-border/60 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide">
                        Order ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide">
                        Channel
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide">
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
                            : 'border-l-transparent'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-bold text-trust-blue group-hover:text-trust-blue/80 transition-colors text-xs">
                            #{order.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs truncate block">
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
          <div className="w-3/5 bg-white/95 rounded-xl border border-soft-border/60 shadow-lg overflow-y-auto flex flex-col">
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
                        {new Date(selectedOrder.created_at).toLocaleDateString()}
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

                  {/* Order items */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-700 text-xs mb-2 uppercase tracking-wide\">Order Items</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-y border-soft-border/60">
                            <tr>
                              <th className="text-left px-2 py-1 font-bold text-slate-700">Product</th>
                              <th className="text-center px-2 py-1 font-bold text-slate-700">Qty</th>
                              <th className="text-right px-2 py-1 font-bold text-slate-700">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-soft-border/40">
                            {selectedOrder.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-blue-50/60 transition-all">
                                <td className="px-2 py-1 text-midnight-ink font-medium">{item.name}</td>
                                <td className="px-2 py-1 text-center text-cool-gray">{item.quantity}</td>
                                <td className="px-2 py-1 text-right font-bold text-midnight-ink">{fmt(item.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 rounded-lg border-soft-border hover:bg-gray-50 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyPassword}
                  className="flex-1 rounded-lg bg-trust-blue hover:bg-trust-blue/90 text-white font-medium transition-all text-sm"
                >
                  Unlock
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
