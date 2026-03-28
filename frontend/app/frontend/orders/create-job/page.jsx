'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Pencil, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CREATE_ORDER_ENTITY_TYPE = 'create_order';

const EMPTY_NEW_CUSTOMER = {
  firstName: '', lastName: '', language: 'English [Default]', email: '',
  acceptsMarketing: false, taxExempt: false,
  country: 'India', company: '', address: '', apartment: '',
  city: '', state: '', pinCode: '', phone: '',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

// ─── Inline payment row helpers ──────────────────────────────────────────────

function SummaryRow({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className={bold ? 'font-semibold text-midnight-ink' : 'font-medium text-midnight-ink'}>
        {label}
      </span>
      <span className={bold ? 'font-semibold text-midnight-ink' : 'text-midnight-ink'}>{value}</span>
    </div>
  );
}

function EditableRow({ label, value, inputValue, onInputChange, placeholder }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      {editing ? (
        <div className="flex items-center gap-3 w-full">
          <span className="text-cool-gray flex-1">{label}</span>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            className="w-28 border border-soft-border bg-white rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onBlur={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <button
            className="text-cool-gray hover:text-midnight-ink text-left flex items-center gap-2"
            onClick={() => setEditing(true)}
          >
            <span className="text-cool-gray">—</span>
            {label}
          </button>
          <span className="text-midnight-ink">{value}</span>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CreateOrderForm({ embedded = false }) {
  const router = useRouter();
  
  // Order items
  const [orderItems, setOrderItems] = useState([]);

  // Browse dialog
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [productsLoading, setProductsLoading] = useState(false);

  // Custom item dialog
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '', quantity: '1', taxable: true, images: [], note: '' });

  // Payment
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');

  // Notes
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Create order
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState({ type: '', text: '' });
  const [activeDraftId, setActiveDraftId] = useState(null);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_NEW_CUSTOMER);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [createCustomerError, setCreateCustomerError] = useState('');
  const customerContainerRef = useRef(null);

  const applyDraftData = useCallback((draft, options = {}) => {
    if (!draft) return;
    setOrderItems(Array.isArray(draft.orderItems) ? draft.orderItems : []);
    setSelectedCustomer(draft.selectedCustomer || null);
    setCustomerSearch(draft.customerSearch || '');
    setNotes(draft.notes || '');
    setDiscount(draft.discount || '');
    setShipping(draft.shipping || '');
    if (options.draftId) {
      setActiveDraftId(options.draftId);
    }
  }, []);



  // ── Load products ──────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (products.length > 0) return; // already loaded
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const json = await res.json().catch(() => null);
      const list =
        Array.isArray(json?.data?.results) ? json.data.results :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.results) ? json.results : [];
      setProducts(list);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [products.length]);

  // ── Load customers from master customer sheet ──────────────────────────────
  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        console.warn('Could not load customers:', res.status);
      } else {
        const data = await res.json().catch(() => null);
        const rows =
          Array.isArray(data?.data?.results) ? data.data.results :
          Array.isArray(data?.data) ? data.data :
          Array.isArray(data?.results) ? data.results : [];

        const list = rows.map((customer) => ({
          id: customer?.id,
          companyName: customer?.company_name || '',
          authorizedPersonName: customer?.authorized_person_name || '',
          email: customer?.email || '',
          mobile: customer?.mobile || '',
          phone: customer?.mobile || '',
          address: customer?.address_line1 || '',
          city: customer?.city || '',
          state: customer?.state || '',
          pinCode: customer?.pin_code || '',
        }));

        setCustomers(list);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    const draftFromSession = sessionStorage.getItem('create_order_draft_to_load');
    if (!draftFromSession) return;
    try {
      const parsed = JSON.parse(draftFromSession);
      const draftId = parsed?.__backendDraftId || parsed?.id || null;
      applyDraftData(parsed, { draftId });
    } catch (error) {
      console.error('Failed to load create order draft:', error);
    } finally {
      sessionStorage.removeItem('create_order_draft_to_load');
    }
  }, [applyDraftData]);

  // ── Close customer dropdown on outside click ───────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const shippingAmount = parseFloat(shipping) || 0;
  const total = subtotal - discountAmount + shippingAmount;

  const filteredProducts = products.filter((p) =>
    !productSearch ||
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter((c) =>
    !customerSearch ||
    c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.authorizedPersonName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  function addSelectedProducts() {
    const toAdd = products.filter((p) => selectedProductIds.has(p.id));
    const newItems = toAdd
      .filter((p) => !orderItems.find((i) => i.id === `product-${p.id}`))
      .map((p) => ({
        id: `product-${p.id}`,
        name: p.name,
        sku: p.sku,
        price: parseFloat(p.selling_price) || 0,
        quantity: 1,
      }));
    setOrderItems((prev) => [...prev, ...newItems]);
    setSelectedProductIds(new Set());
    setIsBrowseOpen(false);
    setProductSearch('');
  }

  function addCustomItem() {
    if (!customItem.name.trim() || !customItem.price) return;
    setOrderItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customItem.name.trim(),
        sku: null,
        price: parseFloat(customItem.price) || 0,
        quantity: parseInt(customItem.quantity) || 1,
        taxable: customItem.taxable,
        images: customItem.images,
        note: customItem.note,
      },
    ]);
    setCustomItem({ name: '', price: '', quantity: '1', taxable: true, images: [], note: '' });
    setIsCustomItemOpen(false);
  }

  function updateItemQty(id, qty) {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }

  function removeItem(id) {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleCreateCustomer() {
    if (isSavingCustomer) return;

    const displayName =
      [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(' ') ||
      newCustomer.email ||
      'New Customer';
    const companyName = (newCustomer.company || displayName).trim();

    if (!companyName) {
      setCreateCustomerError('Company name is required.');
      return;
    }

    setCreateCustomerError('');
    setIsSavingCustomer(true);

    try {
      const payload = {
        company_name: companyName,
        authorized_person_name: displayName,
        email: (newCustomer.email || '').trim(),
        mobile: (newCustomer.phone || '').trim(),
        address_line1: (newCustomer.address || '').trim(),
        address_line2: (newCustomer.apartment || '').trim(),
        city: (newCustomer.city || '').trim(),
        state: (newCustomer.state || '').trim(),
        pin_code: (newCustomer.pinCode || '').trim(),
        status: 'active',
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const msg =
          json?.detail ||
          json?.message ||
          (json ? JSON.stringify(json) : `Failed to create customer (${response.status})`);
        throw new Error(msg);
      }

      const created = json?.data || json;
      const saved = {
        id: created?.id,
        companyName: created?.company_name || companyName,
        authorizedPersonName: created?.authorized_person_name || displayName,
        email: created?.email || payload.email,
        mobile: created?.mobile || payload.mobile,
        phone: created?.mobile || payload.mobile,
        address: created?.address_line1 || payload.address_line1,
        city: created?.city || payload.city,
        state: created?.state || payload.state,
        pinCode: created?.pin_code || payload.pin_code,
      };

      setCustomers((prev) => [saved, ...prev]);
      setSelectedCustomer(saved);
      setCustomerSearch(saved.companyName || saved.authorizedPersonName || saved.email || '');
      setCustomerDropdownOpen(false);
      setIsCreateCustomerOpen(false);
      setNewCustomer(EMPTY_NEW_CUSTOMER);
    } catch (error) {
      setCreateCustomerError(error.message || 'Failed to create customer');
    } finally {
      setIsSavingCustomer(false);
    }
  }

  function selectCustomer(c) {
    setSelectedCustomer(c);
    setCustomerSearch(c.companyName || c.authorizedPersonName || c.email || '');
    setCustomerDropdownOpen(false);
  }

  async function handleSaveDraft() {
    const draftData = {
      title: selectedCustomer?.companyName
        ? `Create Order - ${selectedCustomer.companyName}`
        : 'Create Order Draft',
      selectedCustomer,
      customerSearch,
      orderItems,
      discount,
      shipping,
      notes,
      itemsCount: orderItems.length,
      total: total.toFixed(2),
    };

    try {
      const body = JSON.stringify({
        entity_type: CREATE_ORDER_ENTITY_TYPE,
        payload: draftData,
        is_submitted: false,
      });

      const saveViaEndpoint = async (endpoint, method) => {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const error = new Error(
            errorData?.detail ||
            errorData?.message ||
            `Failed to save draft (${response.status})`
          );
          error.status = response.status;
          throw error;
        }

        return response.json().catch(() => null);
      };

      let json;
      if (activeDraftId) {
        try {
          json = await saveViaEndpoint(`/api/drafts/${activeDraftId}`, 'PATCH');
        } catch (error) {
          if (error.status === 403) {
            json = await saveViaEndpoint('/api/drafts', 'POST');
          } else {
            throw error;
          }
        }
      } else {
        json = await saveViaEndpoint('/api/drafts', 'POST');
      }

      const returnedId = json?.data?.id || json?.id;
      if (returnedId) {
        setActiveDraftId(returnedId);
      }

      setOrderMessage({ type: 'success', text: 'Draft saved to backend successfully' });
      setTimeout(() => setOrderMessage({ type: '', text: '' }), 2200);
    } catch (error) {
      setOrderMessage({ type: 'error', text: error.message || 'Failed to save draft' });
      setTimeout(() => setOrderMessage({ type: '', text: '' }), 3000);
    }
  }

  // Create order
  async function handleCreateOrder() {
    if (orderItems.length === 0) {
      setOrderMessage({ type: 'error', text: 'Add at least one product to create an order' });
      setTimeout(() => setOrderMessage({ type: '', text: '' }), 3000);
      return;
    }

    setIsCreatingOrder(true);
    setOrderMessage({ type: '', text: '' });

    try {
      // Map frontend items to the shape the backend serializer expects
      const apiItems = orderItems.map((item) => ({
        name: item.name,
        sku: item.sku || '',
        price: String(item.price),
        quantity: item.quantity,
        taxable: item.taxable ?? true,
        images: item.images || [],
        note: item.note || '',
      }));

      const response = await fetch('/frontend/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: selectedCustomer?.id || null,
          customer_name: selectedCustomer?.companyName || selectedCustomer?.authorizedPersonName || selectedCustomer?.firstName || '',
          customer_email: selectedCustomer?.email || '',
          customer_phone: selectedCustomer?.phone || '',
          customer_address: selectedCustomer?.address || '',
          customer_city: selectedCustomer?.city || '',
          customer_state: selectedCustomer?.state || '',
          customer_zip: selectedCustomer?.pinCode || '',
          items: apiItems,
          discount: parseFloat(discount) || 0,
          shipping: parseFloat(shipping) || 0,
          notes: notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg =
          errorData?.detail ||
          errorData?.message ||
          (errorData ? JSON.stringify(errorData) : `Server error ${response.status}`);
        throw new Error(msg);
      }

      setOrderMessage({ type: 'success', text: 'Order created successfully!' });
      // Reset form and redirect to order sheet after success
      setTimeout(() => {
        setOrderItems([]);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setNotes('');
        setDiscount('');
        setShipping('');
        setActiveDraftId(null);
        setOrderMessage({ type: '', text: '' });
        router.push('/orders/job-sheet');
      }, 2000);
    } catch (error) {
      setOrderMessage({ type: 'error', text: error.message || 'Error creating order' });
    } finally {
      setIsCreatingOrder(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className={embedded ? '' : 'min-h-screen bg-cloud-gray'}>
      {/* Top breadcrumb bar */}
      {!embedded && (
        <div className="bg-cloud-gray border-b border-soft-border px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-1.5 text-sm text-cool-gray">
              <Link href="/orders" className="hover:text-midnight-ink">Orders</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-midnight-ink font-medium">Create order</span>
            </div>
            <h1 className="text-2xl font-bold text-midnight-ink mt-2">Create order</h1>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className={`max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 ${embedded ? 'px-0 py-2' : 'px-6 py-6'}`}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Products card */}
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <h2 className="text-base font-semibold text-midnight-ink mb-3">Products</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
                <input
                  readOnly
                  className="w-full pl-9 pr-3 py-2 text-sm border border-soft-border rounded-md bg-white placeholder:text-cool-gray focus:outline-none focus:ring-2 focus:ring-midnight-ink/20 cursor-pointer"
                  placeholder="Search products"
                  onClick={() => { loadProducts(); setIsBrowseOpen(true); }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 font-medium"
                onClick={() => { loadProducts(); setIsBrowseOpen(true); }}
              >
                Browse
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 font-medium"
                onClick={() => setIsCustomItemOpen(true)}
              >
                Add custom item
              </Button>
            </div>

            {/* Order items table */}
            {orderItems.length > 0 && (
              <div className="mt-4 border border-soft-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cloud-gray border-b border-soft-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-cool-gray uppercase tracking-wide">
                        Product
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-cool-gray uppercase tracking-wide w-24">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-cool-gray uppercase tracking-wide">
                        Price
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-cool-gray uppercase tracking-wide">
                        Total
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id} className="border-b border-soft-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-midnight-ink">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-cool-gray">SKU: {item.sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateItemQty(item.id, Math.max(1, item.quantity - 1))}
                              className="flex items-center justify-center w-7 h-7 rounded border border-soft-border hover:bg-cloud-gray transition-colors text-cool-gray hover:text-midnight-ink"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.id, parseInt(e.target.value) || 1)}
                              className="w-12 text-center border border-soft-border bg-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
                            />
                            <button
                              onClick={() => updateItemQty(item.id, item.quantity + 1)}
                              className="flex items-center justify-center w-7 h-7 rounded border border-soft-border hover:bg-cloud-gray transition-colors text-cool-gray hover:text-midnight-ink"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-midnight-ink">
                          {fmt(item.price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-midnight-ink">
                          {fmt(item.price * item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-cool-gray hover:text-midnight-ink transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment card */}
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <h2 className="text-base font-semibold text-midnight-ink mb-3">Payment</h2>
            <div className="border border-soft-border rounded-lg overflow-hidden">
              <div className="divide-y divide-soft-border">
                <SummaryRow label="Subtotal" value={fmt(subtotal)} />
                <EditableRow
                  label="Add discount"
                  value={discountAmount > 0 ? `-${fmt(discountAmount)}` : fmt(0)}
                  inputValue={discount}
                  onInputChange={setDiscount}
                  placeholder="0.00"
                />
                <EditableRow
                  label="Add shipping or delivery"
                  value={fmt(shippingAmount)}
                  inputValue={shipping}
                  onInputChange={setShipping}
                  placeholder="0.00"
                />
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-cool-gray flex items-center gap-1.5">
                    Estimated tax
                    <Info className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-cool-gray">Not calculated</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-soft-border bg-cloud-gray">
                <span className="font-semibold text-midnight-ink">Total</span>
                <span className="font-semibold text-midnight-ink">{fmt(total)}</span>
              </div>
            </div>
            {orderItems.length === 0 && (
              <p className="text-sm text-cool-gray mt-3">
                Add a product to calculate total and view payment options
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ───────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Notes */}
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-midnight-ink">Notes</h2>
              <button
                onClick={() => setIsEditingNotes((v) => !v)}
                className="text-cool-gray hover:text-midnight-ink transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {isEditingNotes ? (
              <textarea
                autoFocus
                rows={3}
                className="w-full text-sm border border-soft-border bg-white rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-midnight-ink/20 placeholder:text-cool-gray"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setIsEditingNotes(false);
                  }
                }}
                onBlur={() => setIsEditingNotes(false)}
              />
            ) : (
              <p className="text-sm text-cool-gray">{notes || 'No notes'}</p>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <h2 className="text-base font-semibold text-midnight-ink mb-3">Customer</h2>
            <div className="relative" ref={customerContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
                <input
                  className="w-full pl-9 pr-3 py-2 text-sm border border-soft-border rounded-md bg-white placeholder:text-cool-gray focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
                  placeholder="Search or create a customer"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerDropdownOpen(true);
                    setSelectedCustomer(null);
                  }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                />
              </div>

              {/* Dropdown */}
              {customerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-soft-border rounded-md shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {/* Create new */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-cloud-gray border-b border-soft-border"
                    onMouseDown={() => {
                      setIsCreateCustomerOpen(true);
                      setCustomerDropdownOpen(false);
                    }}
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-cool-gray text-cool-gray text-xs font-bold leading-none">
                      +
                    </span>
                    <span className="font-medium text-midnight-ink">Create a new customer</span>
                  </button>

                  {filteredCustomers.length === 0 && customerSearch && (
                    <div className="px-3 py-3 text-sm text-cool-gray">No customers found</div>
                  )}

                  {filteredCustomers.map((c, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2.5 hover:bg-cloud-gray border-b border-soft-border last:border-0"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <div className="text-sm font-medium text-midnight-ink">
                        {c.companyName || c.authorizedPersonName}
                      </div>
                      {c.email && (
                        <div className="text-xs text-cool-gray">{c.email}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected customer pill */}
            {selectedCustomer && (
              <div className="mt-3 flex items-start justify-between p-3 bg-cloud-gray rounded-lg border border-soft-border">
                <div className="text-sm">
                  <div className="font-medium text-midnight-ink">
                    {selectedCustomer.companyName || selectedCustomer.authorizedPersonName}
                  </div>
                  {selectedCustomer.email && (
                    <div className="text-cool-gray text-xs mt-0.5">{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.mobile && (
                    <div className="text-cool-gray text-xs">{selectedCustomer.mobile}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="text-cool-gray hover:text-midnight-ink ml-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Markets */}
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <h2 className="text-base font-semibold text-midnight-ink mb-3">Markets</h2>
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cloud-gray border border-soft-border text-sm font-medium text-midnight-ink">
                🌐 India
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-midnight-ink mb-1.5">Currency</p>
              <div className="flex items-center justify-between border border-soft-border rounded-md px-3 py-2 text-sm bg-white">
                <span className="text-midnight-ink">Indian Rupee (INR ₹)</span>
                <span className="text-cool-gray text-xs">⇅</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Create Order Button & Message
      ════════════════════════════════════════════════════════════════════ */}
      <div className={`max-w-6xl mx-auto ${embedded ? 'px-0 py-4' : 'px-6 py-6'}`}>
        {orderMessage.text && (
          <div className={`mb-4 p-4 rounded-lg text-sm ${
            orderMessage.type === 'success'
              ? 'bg-cloud-gray border border-soft-border text-midnight-ink'
              : 'bg-cloud-gray border border-soft-border text-midnight-ink'
          }`}>
            {orderMessage.text}
          </div>
        )}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            className="px-8 py-2.5 font-semibold"
          >
            Save to draft
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={isCreatingOrder || orderItems.length === 0}
            className="px-8 py-2.5 font-semibold bg-midnight-ink text-white hover:opacity-95"
          >
            {isCreatingOrder ? 'Creating order...' : 'Create order'}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Browse Products Dialog
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isBrowseOpen} onOpenChange={(open) => {
        if (!open) { setSelectedProductIds(new Set()); setProductSearch(''); }
        setIsBrowseOpen(open);
      }}>
        <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
          <DialogHeader>
            <DialogTitle>Browse products</DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search products"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto border border-soft-border rounded-lg min-h-0">
            {productsLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-cool-gray">
                Loading products…
              </div>
            )}
            {!productsLoading && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-sm text-cool-gray gap-2">
                <Search className="h-8 w-8 text-cool-gray" />
                <p>No products found</p>
              </div>
            )}
            {!productsLoading &&
              filteredProducts.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-cloud-gray cursor-pointer border-b border-soft-border last:border-0"
                >
                  <Checkbox
                    checked={selectedProductIds.has(p.id)}
                    onCheckedChange={(checked) => {
                      setSelectedProductIds((prev) => {
                        const next = new Set(prev);
                        checked ? next.add(p.id) : next.delete(p.id);
                        return next;
                      });
                    }}
                  />
                  {/* Product colour swatch placeholder */}
                  <div className="w-10 h-10 rounded-md bg-cloud-gray border border-soft-border shrink-0 flex items-center justify-center text-xs text-cool-gray font-medium uppercase">
                    {(p.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-midnight-ink truncate">{p.name}</div>
                    {p.sku && <div className="text-xs text-cool-gray">SKU: {p.sku}</div>}
                    {p.category && <div className="text-xs text-cool-gray">{p.category}</div>}
                  </div>
                  <div className="text-sm font-semibold text-midnight-ink shrink-0">
                    {fmt(p.selling_price || 0)}
                  </div>
                </label>
              ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-soft-border">
            <p className="text-xs text-cool-gray">
              {selectedProductIds.size > 0
                ? `${selectedProductIds.size} item${selectedProductIds.size !== 1 ? 's' : ''} selected`
                : 'Select products to add'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setIsBrowseOpen(false); setSelectedProductIds(new Set()); setProductSearch(''); }}
              >
                Cancel
              </Button>
              <Button onClick={addSelectedProducts} disabled={selectedProductIds.size === 0} className="bg-midnight-ink text-white hover:opacity-95">
                Add {selectedProductIds.size > 0 ? selectedProductIds.size : ''}{' '}
                {selectedProductIds.size === 1 ? 'item' : 'items'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          Add Custom Item Dialog
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isCustomItemOpen} onOpenChange={setIsCustomItemOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add custom item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Item name</label>
              <Input
                autoFocus
                placeholder="e.g. Custom service"
                value={customItem.name}
                onChange={(e) => setCustomItem((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customItem.price}
                  onChange={(e) => setCustomItem((v) => ({ ...v, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={customItem.quantity}
                  onChange={(e) => setCustomItem((v) => ({ ...v, quantity: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-midnight-ink cursor-pointer">
              <Checkbox
                checked={customItem.taxable}
                onCheckedChange={(checked) => setCustomItem((v) => ({ ...v, taxable: Boolean(checked) }))}
              />
              Taxable
            </label>

            {/* Reference Images */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Reference images</label>
              <div className="relative border-2 border-dashed border-soft-border rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-cloud-gray transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      Array.from(files).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCustomItem((v) => ({ ...v, images: [...v.images, event.target?.result] }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                />
                {customItem.images.length > 0 ? (
                  <div className="w-full">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {customItem.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img}
                            alt={`Preview ${idx + 1}`}
                            className="h-24 w-24 object-cover rounded border border-soft-border"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomItem((v) => ({
                                ...v,
                                images: v.images.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-midnight-ink hover:bg-slate-text text-white rounded-full p-1 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-cool-gray text-center">Click to add more images</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-cool-gray text-sm mb-1">Click to upload</div>
                    <div className="text-xs text-cool-gray">PNG, JPG up to 5MB (multiple allowed)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Note</label>
              <textarea
                rows={3}
                className="w-full text-sm border border-soft-border bg-white rounded-md px-3 py-2 resize-none placeholder:text-cool-gray focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
                placeholder="Add any notes..."
                value={customItem.note}
                onChange={(e) => setCustomItem((v) => ({ ...v, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-soft-border">
            <Button variant="outline" onClick={() => setIsCustomItemOpen(false)}>Cancel</Button>
              <Button
              onClick={addCustomItem}
              disabled={!customItem.name.trim() || !customItem.price}
                className="bg-midnight-ink text-white hover:opacity-95"
            >
              Add item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          Create New Customer Dialog
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isCreateCustomerOpen}
        onOpenChange={(open) => {
          setIsCreateCustomerOpen(open);
          if (!open) {
            setCreateCustomerError('');
            setIsSavingCustomer(false);
          }
        }}
      >
        <DialogContent className="max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Create a new customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">First name</label>
                <Input
                  autoFocus
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Last name</label>
                <Input
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, lastName: e.target.value }))}
                />
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Language</label>
              <select
                className="w-full border border-soft-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
                value={newCustomer.language}
                onChange={(e) => setNewCustomer((v) => ({ ...v, language: e.target.value }))}
              >
                <option>English [Default]</option>
                <option>Hindi</option>
                <option>Gujarati</option>
                <option>Marathi</option>
                <option>Tamil</option>
                <option>Telugu</option>
                <option>Kannada</option>
              </select>
              <p className="text-xs text-cool-gray mt-1">
                This customer will receive notifications in this language.
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Email</label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((v) => ({ ...v, email: e.target.value }))}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm text-midnight-ink cursor-pointer">
                <Checkbox
                  checked={newCustomer.acceptsMarketing}
                  onCheckedChange={(checked) =>
                    setNewCustomer((v) => ({ ...v, acceptsMarketing: Boolean(checked) }))
                  }
                />
                Customer accepts email marketing
              </label>
              <label className="flex items-center gap-2.5 text-sm text-midnight-ink cursor-pointer">
                <Checkbox
                  checked={newCustomer.taxExempt}
                  onCheckedChange={(checked) =>
                    setNewCustomer((v) => ({ ...v, taxExempt: Boolean(checked) }))
                  }
                />
                Customer is tax exempt
              </label>
            </div>

            {/* Country */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Country/region</label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={newCustomer.country}
                onChange={(e) => setNewCustomer((v) => ({ ...v, country: e.target.value }))}
              >
                <option>India</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Australia</option>
                <option>Canada</option>
                <option>UAE</option>
                <option>Singapore</option>
              </select>
            </div>

            {/* Company */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Company</label>
              <Input
                value={newCustomer.company}
                onChange={(e) => setNewCustomer((v) => ({ ...v, company: e.target.value }))}
              />
            </div>

            {createCustomerError && (
              <div className="rounded-md border border-soft-border bg-cloud-gray px-3 py-2 text-sm text-midnight-ink">
                {createCustomerError}
              </div>
            )}

            {/* Address */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Address</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
                <Input
                  className="pl-9"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, address: e.target.value }))}
                />
              </div>
            </div>

            {/* Apartment */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Apartment, suite, etc</label>
              <Input
                value={newCustomer.apartment}
                onChange={(e) => setNewCustomer((v) => ({ ...v, apartment: e.target.value }))}
              />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">City</label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-midnight-ink mb-1.5 block">State</label>
                <select
                  className="w-full border border-soft-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-midnight-ink/20"
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, state: e.target.value }))}
                >
                  <option value="">Select a state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PIN code */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">PIN code</label>
              <Input
                value={newCustomer.pinCode}
                maxLength={6}
                onChange={(e) => setNewCustomer((v) => ({ ...v, pinCode: e.target.value.replace(/\D/g, '') }))}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-midnight-ink mb-1.5 block">Phone</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 border border-soft-border rounded-md px-3 py-2 text-sm bg-white shrink-0">
                  <span>🇮🇳</span>
                  <span className="text-cool-gray">+91</span>
                  <span className="text-cool-gray text-xs">⇅</span>
                </div>
                <Input
                  className="flex-1"
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-soft-border">
            <Button
              variant="outline"
              onClick={() => setIsCreateCustomerOpen(false)}
              disabled={isSavingCustomer}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={isSavingCustomer} className="bg-midnight-ink text-white hover:opacity-95">
              {isSavingCustomer ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function CreateJobPage() {
  return <CreateOrderForm />;
}
