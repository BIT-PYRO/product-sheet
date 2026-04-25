'use client';

import { useEffect, useState } from 'react';

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
  name: '',
  bank_name: '',
  account_number: '',
  opening_balance: '0',
};

export default function BankingAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add-account form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/frontend/api/accounting/bank-accounts/');
      const data = await res.json();
      if (data?.success) setAccounts(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    fetch('/frontend/api/accounting/ledgers/').then(r => r.json()).then(d => {
      if (d?.success) setLedgers(d.data || []);
    });
  }, []);

  const handleFormChange = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleAddAccount = async () => {
    if (!form.name.trim()) { setFormError('Account name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/frontend/api/accounting/bank-accounts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          bank_name: form.bank_name.trim(),
          account_number: form.account_number.trim(),
          opening_balance: form.opening_balance || '0',
        }),
      });
      const data = await res.json();
      if (data?.success) {
        showToast(`"${data.data?.name}" created.`);
        setForm(EMPTY_FORM);
        setShowForm(false);
        loadAccounts();
      } else {
        setFormError(data?.message || 'Failed to create account.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This will also delete all staging transactions.`)) return;
    const res = await fetch(`/frontend/api/accounting/bank-accounts/${id}/`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      showToast(`"${name}" deleted.`);
      loadAccounts();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data?.message || 'Delete failed.', 'error');
    }
  };

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-midnight-ink">Bank Accounts</h3>
        <button
          type="button"
          onClick={() => { setShowForm(v => !v); setFormError(''); }}
          className="bg-trust-blue text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Add Bank Account'}
        </button>
      </div>

      {/* Add account form */}
      {showForm && (
        <div className="border border-soft-border rounded-xl bg-cloud-gray p-5 space-y-4">
          <h4 className="text-sm font-semibold text-midnight-ink">New Bank Account</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cool-gray mb-1">Account Label *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                placeholder="e.g. HDFC Current Account"
                className="w-full border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-cool-gray mb-1">Bank Name</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={e => handleFormChange('bank_name', e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="w-full border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-cool-gray mb-1">Account Number</label>
              <input
                type="text"
                value={form.account_number}
                onChange={e => handleFormChange('account_number', e.target.value)}
                placeholder="Last 4 digits or full number"
                className="w-full border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-cool-gray mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                value={form.opening_balance}
                onChange={e => handleFormChange('opening_balance', e.target.value)}
                className="w-full border border-soft-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddAccount}
              disabled={saving}
              className="bg-trust-blue text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create Account'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(''); }}
              className="border border-soft-border text-sm text-cool-gray px-4 py-2 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account cards */}
      {loading ? (
        <div className="py-10 text-center text-sm text-cool-gray">Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="py-10 text-center text-sm text-cool-gray">
          No bank accounts yet. Click &ldquo;+ Add Bank Account&rdquo; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => {
            const balance = Number(a.balance ?? 0);
            const isNeg = balance < 0;
            return (
              <div key={a.id} className="border border-soft-border rounded-xl bg-white p-5 space-y-3 hover:shadow-sm transition-shadow">
                {/* Name row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-midnight-ink text-sm">{a.name}</div>
                    {a.bank_name && <div className="text-xs text-cool-gray">{a.bank_name}</div>}
                    {a.account_number && (
                      <div className="text-xs text-cool-gray font-mono">
                        ···· {a.account_number.slice(-4)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id, a.name)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                    title="Delete account"
                  >
                    Delete
                  </button>
                </div>

                {/* Balance */}
                <div>
                  <div className="text-xs text-cool-gray mb-0.5">Current Balance</div>
                  <div className={`text-xl font-bold font-mono ${isNeg ? 'text-red-600' : 'text-green-600'}`}>
                    {isNeg ? '-' : ''}{fmt(Math.abs(balance))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 rounded-lg px-3 py-2">
                    <div className="text-cool-gray">Credits</div>
                    <div className="font-semibold text-green-700">{fmt(a.total_credits ?? 0)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg px-3 py-2">
                    <div className="text-cool-gray">Debits</div>
                    <div className="font-semibold text-red-600">{fmt(a.total_debits ?? 0)}</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between text-xs text-cool-gray pt-1 border-t border-soft-border">
                  <span>{a.transaction_count ?? 0} transaction{a.transaction_count !== 1 ? 's' : ''}</span>
                  {(a.unprocessed_count ?? 0) > 0 && (
                    <span className="text-amber-600 font-medium">{a.unprocessed_count} unprocessed</span>
                  )}
                  {a.last_transaction_date && (
                    <span>Last: {a.last_transaction_date}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
