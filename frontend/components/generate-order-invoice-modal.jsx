'use client';

import { useState, useMemo } from 'react';

const DEPARTMENTS = [
  'Marketing',
  'Customer Relation Management',
  'Operations',
  'Finance',
  'Human Resources',
  'Design',
  'Production',
  'Logistics',
  'General',
];

const today = () => new Date().toISOString().slice(0, 10);
const fmtRs = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB');
};

function OrderRefBadge({ order }) {
  const isPicklist = order.order_source === 'picklist';
  const name = order.order_name || (isPicklist
    ? `PICKLIST-${order.picklist_number ?? order.id}`
    : `CUSTOM-${order.id}`);
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isPicklist
          ? 'bg-trust-blue/10 text-trust-blue'
          : 'bg-cloud-gray text-cool-gray'
      }`}
    >
      {name}
    </span>
  );
}

// ─── From-Orders Tab ────────────────────────────────────────────────────────
const UNIT_TYPES = [
  { value: 'Pieces', label: 'Pieces (Pcs.)' },
  { value: 'Grams', label: 'Weight (Gms.)' },
  { value: 'Hours', label: 'Time (Hrs.)' },
];

function FromOrdersTab({ selectedOrders, onClose, onSuccess }) {
  const [partyName, setPartyName] = useState('');
  const [department, setDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceMode, setInvoiceMode] = useState('combined');
  const [unitType, setUnitType] = useState('');
  const [amountOverride, setAmountOverride] = useState('');  // editable per-invoice amount
  const [amountEdited, setAmountEdited] = useState(false);    // true once user manually edits
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Apply optional date filter to the selected orders list for display
  const displayedOrders = useMemo(() => {
    return selectedOrders.filter((o) => {
      const d = new Date(o.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [selectedOrders, dateFrom, dateTo]);

  const combinedTotal = useMemo(
    () => displayedOrders.reduce((s, o) => s + Number(o.total || 0), 0),
    [displayedOrders]
  );

  // Keep the amount field in sync with combinedTotal unless user has manually edited it
  const displayAmount = amountEdited ? amountOverride : String(combinedTotal.toFixed(2));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!partyName.trim()) { setError('Party name is required.'); return; }
    if (displayedOrders.length === 0) { setError('No orders to invoice (check date filter).'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/frontend/api/accounting/invoices/from-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: displayedOrders.map((o) => o.id),
          party_name: partyName.trim(),
          department,
          due_date: dueDate || null,
          description,
          invoice_mode: invoiceMode,
          unit_type: unitType || null,
          ...(invoiceMode === 'combined' && amountEdited && parseFloat(amountOverride) > 0
            ? { amount_override: parseFloat(amountOverride) }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to create invoice(s).');
        return;
      }
      const count = Array.isArray(data.data) ? data.data.length : 1;
      setSuccess(`${count} invoice(s) created successfully!`);
      setTimeout(() => onSuccess(), 1200);
    } catch {
      setError('Could not reach invoice API.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Date range filter */}
      <div className="bg-cloud-gray rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <span className="text-[11px] font-semibold text-cool-gray w-full">Filter orders by date</span>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-cool-gray">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-soft-border rounded px-2 py-1 text-xs focus:outline-none focus:border-trust-blue"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-cool-gray">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-soft-border rounded px-2 py-1 text-xs focus:outline-none focus:border-trust-blue"
          />
        </div>
        <span className="text-[11px] text-cool-gray self-end pb-1">
          {displayedOrders.length} of {selectedOrders.length} orders
        </span>
      </div>

      {/* Orders summary list */}
      <div className="border border-soft-border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-cloud-gray sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-cool-gray font-semibold">Order</th>
              <th className="text-left px-3 py-2 text-cool-gray font-semibold">Date</th>
              <th className="text-right px-3 py-2 text-cool-gray font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soft-border">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-cool-gray">
                  No orders match the date filter.
                </td>
              </tr>
            ) : (
              displayedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-cloud-gray/40">
                  <td className="px-3 py-2">
                    <OrderRefBadge order={o} />
                  </td>
                  <td className="px-3 py-2 text-cool-gray">{fmtDate(o.created_at)}</td>
                  <td className="px-3 py-2 text-right font-mono text-midnight-ink">
                    {fmtRs(o.total || 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-midnight-ink">Invoice mode:</span>
        {[
          { value: 'combined', label: 'Combined (1 invoice)' },
          { value: 'per_order', label: 'Per order' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setInvoiceMode(value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              invoiceMode === value
                ? 'bg-trust-blue text-white border-trust-blue'
                : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Unit type toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-midnight-ink">Quantity unit:</span>
        {UNIT_TYPES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setUnitType(unitType === value ? '' : value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              unitType === value
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-cool-gray border-soft-border hover:border-amber-400 hover:text-amber-600'
            }`}
          >
            {label}
          </button>
        ))}
        {unitType && (
          <span className="text-[11px] text-cool-gray ml-1">
            — overrides the per-order unit for this invoice's <em>Per</em> column
          </span>
        )}
      </div>

      {/* Amount preview / override */}
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
        {invoiceMode === 'combined' ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-emerald-700">Invoice amount</span>
              {amountEdited && Math.abs(parseFloat(amountOverride || 0) - combinedTotal) > 0.001 && (
                <span className="text-[10px] text-cool-gray">
                  Order total: {fmtRs(combinedTotal)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-700 font-semibold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={displayAmount}
                onChange={(e) => { setAmountOverride(e.target.value); setAmountEdited(true); }}
                onFocus={(e) => e.target.select()}
                className="w-36 text-right font-mono font-bold text-emerald-700 text-sm bg-transparent border-b border-emerald-400 focus:outline-none focus:border-emerald-600 py-0.5"
              />
              {amountEdited && (
                <button
                  type="button"
                  title="Reset to order total"
                  onClick={() => { setAmountOverride(String(combinedTotal.toFixed(2))); setAmountEdited(false); }}
                  className="text-[10px] text-emerald-600 hover:underline shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">
              {`${displayedOrders.length} invoice(s) × individual totals`}
            </span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              {fmtRs(combinedTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Invoice fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">
            Party Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Customer or company name"
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue bg-white"
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue"
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional note for this invoice…"
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{success}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 py-2 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || displayedOrders.length === 0}
          className="flex-1 py-2 rounded-lg bg-trust-blue hover:bg-deep-blue text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Creating…'
            : invoiceMode === 'combined'
              ? 'Create Invoice'
              : `Create ${displayedOrders.length} Invoice(s)`}
        </button>
      </div>
    </form>
  );
}

// ─── Custom Invoice Tab ──────────────────────────────────────────────────────
function CustomInvoiceTab({ onClose, onSuccess }) {
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceType, setInvoiceType] = useState('sales');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!partyName.trim()) { setError('Party name is required.'); return; }
    if (!parsedAmount || parsedAmount <= 0) { setError('Amount must be greater than 0.'); return; }

    setSubmitting(true);
    try {
      // Step 1: Create the invoice
      const res = await fetch('/frontend/api/accounting/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: invoiceType,
          party_name: partyName.trim(),
          amount: parsedAmount,
          department,
          due_date: dueDate || null,
          description,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to create invoice.');
        return;
      }

      // Step 2: Upload receipts if any
      const outstandingId = data.data?.outstanding_id;
      if (outstandingId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          await fetch(`/frontend/api/accounting/outstandings/${outstandingId}/receipts`, {
            method: 'POST',
            body: fd,
          });
        }
      }

      setSuccess('Invoice created successfully!');
      setTimeout(() => onSuccess(), 1200);
    } catch {
      setError('Could not reach invoice API.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-midnight-ink">Type:</span>
        {[
          { value: 'sales', label: 'Sales Invoice' },
          { value: 'purchase', label: 'Purchase Bill' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setInvoiceType(value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              invoiceType === value
                ? 'bg-trust-blue text-white border-trust-blue'
                : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">
            Party Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Customer or vendor name"
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">
            Amount (₹) <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue bg-white"
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Attachments</label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="border border-soft-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-trust-blue file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-cloud-gray file:text-midnight-ink"
          />
          {files.length > 0 && (
            <span className="text-[11px] text-cool-gray">{files.length} file(s) selected</span>
          )}
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-midnight-ink">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional details…"
            className="border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-trust-blue resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{success}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 py-2 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 rounded-lg bg-trust-blue hover:bg-deep-blue text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function GenerateOrderInvoiceModal({ selectedOrders = [], onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState(selectedOrders.length > 0 ? 'from-orders' : 'custom');

  const tabs = [
    { id: 'from-orders', label: `From Orders${selectedOrders.length > 0 ? ` (${selectedOrders.length})` : ''}` },
    { id: 'custom', label: 'Custom Invoice' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-soft-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-soft-border shrink-0">
          <h2 className="text-base font-bold text-midnight-ink">Generate Invoice</h2>
          <button
            onClick={onClose}
            className="text-cool-gray hover:text-midnight-ink transition-colors p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-soft-border shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-trust-blue text-trust-blue'
                  : 'border-transparent text-cool-gray hover:text-midnight-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {activeTab === 'from-orders' ? (
            <FromOrdersTab
              selectedOrders={selectedOrders}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          ) : (
            <CustomInvoiceTab onClose={onClose} onSuccess={onSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}
