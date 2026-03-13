'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [customerDetailsUnlocked, setCustomerDetailsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const CUSTOMER_DETAILS_PASSCODE = process.env.NEXT_PUBLIC_CUSTOMER_PASSCODE || '1234';

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/orders?id=${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order');
        }

        const data = await response.json();
        // Find the order with matching ID from the list
        const foundOrder = Array.isArray(data) 
          ? data.find(o => o.id === parseInt(id))
          : data;
        
        if (!foundOrder) {
          throw new Error('Order not found');
        }
        setOrder(foundOrder);
      } catch (err) {
        setError(err.message || 'Error loading order');
        console.error('Error loading order:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-cloud-gray">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-16">Loading...</div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-cloud-gray">
        <div className="bg-cloud-gray border-b border-soft-border px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/orders/job-sheet" className="text-sm text-trust-blue hover:underline flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            {error || 'Order not found'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cloud-gray via-cloud-gray to-white">
      {/* Compact Header */}
      <div className="relative border-b border-soft-border/50 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-cool-gray mb-2">
            <Link href="/orders/job-sheet" className="hover:text-trust-blue transition-colors font-medium">
              Orders
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="text-midnight-ink font-semibold">Order #{order.id}</span>
          </div>
          
          {/* Title and Status */}
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-midnight-ink">Order #{order.id}</h1>
            {/* Status Badge */}
            <div className={`
              px-3 py-1 rounded-full text-xs font-semibold capitalize
              ${order.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${order.status === 'pending' ? 'bg-blue-100 text-blue-800' : ''}
              ${order.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
              ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
              ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
            `}>
              {order.status}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 py-3 space-y-3">
        
        {/* Order Summary - Compact Cards */}
        <div className="grid grid-cols-4 gap-2">
          {/* Status Card */}
          <div className="bg-white rounded-lg border border-soft-border p-2.5 hover:shadow-sm transition-shadow">
            <p className="text-xs font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Status</p>
            <p className="text-sm font-bold text-midnight-ink capitalize">{order.status}</p>
            <div className="mt-1 h-0.5 w-6 bg-gradient-to-r from-trust-blue to-trust-blue/50 rounded-full"></div>
          </div>

          {/* Customer Card */}
          <div className="bg-white rounded-lg border border-soft-border p-2.5 hover:shadow-sm transition-shadow">
            <p className="text-xs font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Customer</p>
            <p className="text-sm font-bold text-midnight-ink truncate">
              {order.customer_name || 'Walk-in'}
            </p>
            <p className="text-xs text-cool-gray mt-0.5">{order.customer_id ? `#${order.customer_id}` : '—'}</p>
          </div>

          {/* Created Card */}
          <div className="bg-white rounded-lg border border-soft-border p-2.5 hover:shadow-sm transition-shadow">
            <p className="text-xs font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Created</p>
            <p className="text-sm font-bold text-midnight-ink">
              {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-cool-gray mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-US', { year: '2-digit' })}
            </p>
          </div>

          {/* Amount Card */}
          <div className="bg-gradient-to-br from-trust-blue to-trust-blue/80 rounded-lg border border-trust-blue/20 p-2.5 text-white">
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide mb-0.5">Total</p>
            <p className="text-sm font-bold">{fmt(order.total)}</p>
            <div className="mt-1 h-0.5 w-6 bg-white/30 rounded-full"></div>
          </div>
        </div>

        {/* Customer Details Toggle - Only show when details are hidden */}
        {!customerDetailsUnlocked && (
          <div 
            onClick={handleOpenPasswordDialog}
            className="bg-white rounded-lg border border-soft-border p-3 hover:shadow-md transition-shadow cursor-pointer group hover:bg-gradient-to-r hover:from-white hover:to-blue-50/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-trust-blue to-trust-blue/80">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-midnight-ink">Show Customer Details</h2>
                  <p className="text-xs text-cool-gray mt-0.5">Click to view protected information</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-cool-gray group-hover:text-trust-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Customer Details View - Only shows when unlocked */}
        {customerDetailsUnlocked && (
          <div className="bg-white rounded-lg border border-soft-border shadow-sm hover:shadow-md transition-shadow animate-fade-in">
            <div className="p-3 border-b border-soft-border bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-midnight-ink">Customer Information</h2>
                <button
                  onClick={() => setCustomerDetailsUnlocked(false)}
                  className="text-cool-gray hover:text-gray-700 text-xs font-semibold"
                >
                  Hide
                </button>
              </div>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">Full Name</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_name || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">Email</p>
                  <p className="text-xs font-semibold text-trust-blue truncate">
                    {order.customer_email || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">Phone</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_phone || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">Customer ID</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_id ? `#${order.customer_id}` : '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">Address</p>
                  <p className="text-xs font-medium text-midnight-ink">
                    {order.customer_address || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">City</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_city || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">State</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_state || '—'}
                  </p>
                </div>
                <div className="space-y-1 p-2 rounded-md bg-gradient-to-br from-white to-blue-50/30 border border-blue-50/50">
                  <p className="text-xs font-bold text-cool-gray uppercase tracking-wide">ZIP</p>
                  <p className="text-xs font-semibold text-midnight-ink">
                    {order.customer_zip || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Dialog */}
        {showPasswordDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all">
              <div className="p-6">
                {/* Lock Icon */}
                <div className="flex justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-trust-blue to-trust-blue/80">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                    </svg>
                  </div>
                </div>
                {/* Header */}
                <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Enter Passcode</h3>
                <p className="text-center text-xs text-cool-gray mb-4">Protected customer information</p>
                
                {/* Input */}
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

        {/* Order Items */}
        <div className="bg-white rounded-lg border border-soft-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 border-b border-soft-border bg-gradient-to-r from-white to-gray-50/50">
            <h2 className="text-sm font-bold text-midnight-ink">Order Items</h2>
            {order.items && order.items.length > 0 && (
              <p className="text-xs text-cool-gray mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          {order.items && order.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-soft-border">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-cool-gray uppercase tracking-wide">Item</th>
                    <th className="text-center px-3 py-2 font-bold text-cool-gray uppercase tracking-wide">Qty</th>
                    <th className="text-right px-3 py-2 font-bold text-cool-gray uppercase tracking-wide">Price</th>
                    <th className="text-right px-3 py-2 font-bold text-cool-gray uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-border/50">
                  {order.items.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-gradient-to-r hover:from-blue-50/20 hover:to-transparent transition-colors"
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-midnight-ink text-xs">{item.name}</div>
                        {item.sku && (
                          <div className="text-xs text-cool-gray mt-0.5 font-medium">SKU: {item.sku}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block bg-blue-50 px-2 py-0.5 rounded-full text-xs font-semibold text-midnight-ink">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-midnight-ink font-medium text-xs">{fmt(item.price)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-bold text-xs text-trust-blue">{fmt(item.total_price)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-cool-gray text-xs">No items in this order</p>
            </div>
          )}
        </div>

        {/* Order Total */}
        <div className="bg-gradient-to-br from-midnight-ink to-midnight-ink/95 rounded-lg border border-midnight-ink/20 p-4 text-white shadow-lg">
          <h2 className="text-sm font-bold mb-2.5">Payment Summary</h2>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center py-1.5 border-b border-white/10">
              <span className="text-white/70 text-xs">Subtotal</span>
              <span className="text-xs font-semibold">{fmt(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-white/70 text-xs">Discount</span>
                <span className="text-xs font-semibold text-red-300">-{fmt(order.discount)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-white/70 text-xs">Shipping</span>
                <span className="text-xs font-semibold text-green-300">+{fmt(order.shipping)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-white/70 text-xs">Tax</span>
                <span className="text-xs font-semibold">+{fmt(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-white/20">
              <span className="text-sm font-bold">Total</span>
              <span className="text-lg font-bold text-trust-blue">{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="bg-white rounded-lg border border-soft-border p-3 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-bold text-midnight-ink mb-2">Notes</h2>
            <p className="text-xs text-midnight-ink leading-relaxed whitespace-pre-wrap bg-gradient-to-br from-white to-blue-50/30 p-2 rounded-lg border border-blue-50 italic">
              {order.notes}
            </p>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-1.5 pb-3">
          <Link href="/orders/job-sheet">
            <Button 
              variant="outline" 
              className="rounded-lg border border-soft-border hover:bg-gray-50 hover:border-cool-gray transition-all flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
          </Link>
          <div className="text-xs text-cool-gray">
            Updated {new Date(order.updated_at).toLocaleDateString()}
          </div>
        </div>

      </div>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all">
            <div className="p-6">
              {/* Lock Icon */}
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-trust-blue to-trust-blue/80">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                  </svg>
                </div>
              </div>
                {/* Header */}
                <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Enter Passcode</h3>
                <p className="text-center text-xs text-cool-gray mb-4">Protected customer information</p>
                
                {/* Input */}
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
