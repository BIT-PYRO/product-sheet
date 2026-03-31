'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDrafts, useDraftLoader } from '@/components/drafts-manager';

const PENDING_DRAFT_KEY = 'pending_enroll_customer_draft';

const INPUT_CLS =
  'w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition';

export function EnrollCustomerForm({ onEnroll, onClose, open = true, draftData = null }) {
  const { saveDraft } = useDrafts();
  const loadedDraft = useDraftLoader();
  const formScrollRef = React.useRef(null);

  const [form, setForm] = useState({
    companyName: '',
    businessType: '',
    gstNumber: '',
    panNumber: '',
    status: 'active',
    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    // Authorized Person
    authorizedPersonName: '',
    designation: '',
    mobile: '',
    email: '',
    // Banking
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    // Notes
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Load draft passed as prop
  useEffect(() => {
    if (draftData) setForm(draftData);
  }, [draftData]);

  // Load pending draft from localStorage
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_DRAFT_KEY);
    if (pending) {
      try {
        setForm(JSON.parse(pending));
        localStorage.removeItem(PENDING_DRAFT_KEY);
      } catch {}
    }
  }, []);

  // Load draft from draft loader (cross-page navigation)
  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Enroll Customer') {
      setForm(loadedDraft.data);
    }
  }, [loadedDraft]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const companyName = String(form.companyName || '').trim();
    if (!companyName) {
      setSubmitStatus({ success: false, message: 'Company Name is required to enroll.' });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          business_type: String(form.businessType || '').trim(),
          gst_number: String(form.gstNumber || '').trim(),
          pan_number: String(form.panNumber || '').trim(),
          status: form.status || 'active',
          address_line1: String(form.addressLine1 || '').trim(),
          address_line2: String(form.addressLine2 || '').trim(),
          city: String(form.city || '').trim(),
          state: String(form.state || '').trim(),
          pin_code: String(form.pinCode || '').trim(),
          authorized_person_name: String(form.authorizedPersonName || '').trim(),
          designation: String(form.designation || '').trim(),
          mobile: String(form.mobile || '').trim(),
          email: String(form.email || '').trim(),
          account_name: String(form.accountName || '').trim(),
          bank_name: String(form.bankName || '').trim(),
          account_number: String(form.accountNumber || '').trim(),
          ifsc: String(form.ifsc || '').trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const message = result?.error?.message || result?.message || 'Unable to enroll customer.';
        setSubmitStatus({ success: false, message });
        formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSubmitStatus({ success: true, message: `${companyName} enrolled successfully.` });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      if (onEnroll) onEnroll(companyName);
      if (onClose) onClose();
    } catch {
      setSubmitStatus({ success: false, message: 'Unable to enroll customer. Please try again.' });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    saveDraft('Enroll Customer', `draft_customer_${Date.now()}`, {
      ...form,
      title: form.companyName || 'Enroll Customer Draft',
    });
    if (typeof window !== 'undefined') alert('Draft saved successfully!');
    handleClose();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!nextOpen) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        ref={formScrollRef}
        className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-cloud-gray to-cloud-gray text-midnight-ink p-0 gap-0 [&>button]:hidden"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-soft-border bg-trust-blue relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">ENROLL CUSTOMER</DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="absolute right-5 top-4 text-cool-gray hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {/* Status banner */}
        {submitStatus && (
          <div className="sticky top-0 z-10 px-5 pt-3 bg-cloud-gray/95 backdrop-blur-sm border-b border-soft-border">
            <div
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                submitStatus.success
                  ? 'bg-success/10 text-success-dark border border-success/30'
                  : 'bg-danger/10 text-danger-dark border border-danger/30'
              }`}
            >
              {submitStatus.message}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 flex flex-col gap-2">
          <form className="space-y-6 pt-4">

            {/* ── Section 1: Company Information ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
                </svg>
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Company Name *</label>
                  <input className={INPUT_CLS} name="companyName" value={form.companyName} onChange={handleInput} placeholder="Enter company name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Business Type</label>
                  <select className={INPUT_CLS} name="businessType" value={form.businessType} onChange={handleInput}>
                    <option value="">Select business type</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">GST Number</label>
                  <input className={INPUT_CLS} name="gstNumber" value={form.gstNumber} onChange={handleInput} placeholder="e.g. 27AAPFU0939F1ZV" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">PAN Number</label>
                  <input className={INPUT_CLS} name="panNumber" value={form.panNumber} onChange={handleInput} placeholder="e.g. AAPFU0939F" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Status</label>
                  <select className={INPUT_CLS} name="status" value={form.status} onChange={handleInput}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Address ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address
              </h3>
              <div className="flex flex-col gap-3">
                <input className={INPUT_CLS} name="addressLine1" value={form.addressLine1} onChange={handleInput} placeholder="Address Line 1" />
                <input className={INPUT_CLS} name="addressLine2" value={form.addressLine2} onChange={handleInput} placeholder="Address Line 2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className={INPUT_CLS} name="city" value={form.city} onChange={handleInput} placeholder="City" />
                  <input className={INPUT_CLS} name="state" value={form.state} onChange={handleInput} placeholder="State" />
                  <input className={INPUT_CLS} name="pinCode" value={form.pinCode} onChange={handleInput} placeholder="PIN Code" />
                </div>
              </div>
            </div>

            {/* ── Section 3: Authorized Person ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Authorized Person
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Full Name *</label>
                  <input className={INPUT_CLS} name="authorizedPersonName" value={form.authorizedPersonName} onChange={handleInput} placeholder="e.g. Rajesh Mehta" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Designation</label>
                  <input className={INPUT_CLS} name="designation" value={form.designation} onChange={handleInput} placeholder="e.g. Director" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Mobile *</label>
                  <input className={INPUT_CLS} name="mobile" value={form.mobile} onChange={handleInput} placeholder="e.g. 9876543210" type="tel" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Email</label>
                  <input className={INPUT_CLS} name="email" value={form.email} onChange={handleInput} placeholder="e.g. contact@company.com" type="email" />
                </div>
              </div>
            </div>

            {/* ── Section 4: Banking Details ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Banking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Account Name</label>
                  <input className={INPUT_CLS} name="accountName" value={form.accountName} onChange={handleInput} placeholder="Name on bank account" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Bank Name</label>
                  <input className={INPUT_CLS} name="bankName" value={form.bankName} onChange={handleInput} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Account Number</label>
                  <input className={INPUT_CLS} name="accountNumber" value={form.accountNumber} onChange={handleInput} placeholder="Enter account number" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">IFSC Code</label>
                  <input className={INPUT_CLS} name="ifsc" value={form.ifsc} onChange={handleInput} placeholder="e.g. HDFC0001234" />
                </div>
              </div>
            </div>

            {/* ── Section 5: Notes ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notes
              </h3>
              <textarea
                className={INPUT_CLS}
                name="notes"
                value={form.notes}
                onChange={handleInput}
                rows="4"
                placeholder="Add any additional notes or remarks..."
              />
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 h-10 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded transition shadow-md"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md disabled:opacity-60"
              >
                {isSubmitting ? 'ENROLLING...' : 'ENROLL CUSTOMER'}
              </button>
            </div>

          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EnrollCustomerPage() {
  const router = useRouter();

  return (
    <EnrollCustomerForm
      open
      onClose={() => router.push('/home')}
    />
  );
}
