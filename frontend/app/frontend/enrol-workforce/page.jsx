'use client';
import React, { useState, useEffect } from "react";
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDrafts, useDraftLoader } from "@/components/drafts-manager";

const PENDING_DRAFT_KEY = 'pending_enroll_workforce_draft'

export function EnrolWorkforceForm({ onEnroll, onClose, open = true, draftData = null }) {
  const { saveDraft } = useDrafts()
  const loadedDraft = useDraftLoader()
  const formScrollRef = React.useRef(null)
  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    contact: "",
    whatsapp: "",
    department: "",
    departmentOther: "",
    designation: "",
    currentAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: ""
    },
    permanentAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: ""
    },
    sameAsCurrent: false,
    gstNumber: "",
    currentLocation: "",
    firstLang: "",
    secondLang: "",
    notes: "",
  });
  const [documents, setDocuments] = useState({ aadhaar: null, pan: null, gst: null });
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  // Load draft data passed as prop (from DraftsManager)
  useEffect(() => {
    if (draftData) {
      setForm(draftData)
    }
  }, [draftData])

  // Load pending draft on component mount
  useEffect(() => {
    const pendingDraft = localStorage.getItem(PENDING_DRAFT_KEY)
    if (pendingDraft) {
      try {
        const draftData = JSON.parse(pendingDraft)
        setForm(draftData)
        localStorage.removeItem(PENDING_DRAFT_KEY)
      } catch (e) {
        console.error('Failed to load pending draft:', e)
      }
    }
  }, [])

  // Handle draft loading from useDraftLoader (for other pages navigating here)
  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Enroll Workforce') {
      const draft = loadedDraft.data
      setForm(draft)
    }
  }, [loadedDraft])

  // Handle address autofill
  const handleSameAsCurrent = (checked) => {
    setForm((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanentAddress: checked ? { ...prev.currentAddress } : { line1: "", line2: "", city: "", state: "", pincode: "", details: "" }
    }));
  };

  // Handle submit
  const handleSubmit = async () => {
    const fullName = String(form.fullName || '').trim();
    if (!fullName) {
      setSubmitStatus({ success: false, message: 'Full Name is required to enroll.' })
      return;
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch('/api/workforce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          phone: String(form.contact || '').trim(),
          active: true,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        const message = result?.error?.message || result?.message || 'Unable to enroll workforce member.';
        setSubmitStatus({ success: false, message })
        return;
      }

      setSubmitStatus({ success: true, message: `${fullName} enrolled successfully.` })

      if (onEnroll) {
        onEnroll(fullName);
      }
      if (onClose) {
        onClose();
      }
    } catch {
      setSubmitStatus({ success: false, message: 'Unable to enroll workforce member. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    const draftData = {
      ...form,
      title: form.fullName || 'Enroll Workforce Draft',
    }
    saveDraft('Enroll Workforce', `draft_enroll_${Date.now()}`, draftData)
    if (typeof window !== 'undefined') {
      alert('Draft saved successfully!')
    }
    handleClose()
  };

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!nextOpen) {
      handleClose()
    }
  }

  // Handle input changes
  const handleInput = (e, section, field) => {
    const { name, value, type, checked } = e.target;
    if (section === "currentAddress" || section === "permanentAddress") {
      setForm((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
      if (form.sameAsCurrent && section === "currentAddress") {
        setForm((prev) => ({
          ...prev,
          permanentAddress: { ...prev.currentAddress, [field]: value }
        }));
      }
    } else if (name === "sameAsCurrent") {
      handleSameAsCurrent(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle file upload
  const handleFile = (e, docType) => {
    setDocuments((prev) => ({ ...prev, [docType]: e.target.files[0] }));
  };

  // Clickable upload area
  const handleUploadClick = (docType) => {
    document.getElementById(`file-input-${docType}`).click();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent ref={formScrollRef} className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-cloud-gray to-cloud-gray text-midnight-ink p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-soft-border bg-gradient-to-r from-midnight-ink to-midnight-ink/90 relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">
              ENROLL WORKFORCE
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="absolute right-5 top-4 text-cool-gray hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {submitStatus && (
          <div className="sticky top-0 z-10 px-5 pt-3 bg-cloud-gray/95 backdrop-blur-sm border-b border-soft-border">
            <div className={`rounded-md px-3 py-2 text-sm font-medium ${submitStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {submitStatus.message}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 flex flex-col gap-2">
          <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Full Name *</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="fullName" value={form.fullName} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Date of Birth *</label>
                  <input type="date" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-0" name="dob" value={form.dob} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Gender *</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="gender" value={form.gender} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Email Address *</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="email" value={form.email} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Contact Number *</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="contact" value={form.contact} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">WhatsApp Number</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="whatsapp" value={form.whatsapp} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Designation / Role</label>
                  <select
                    name="designation"
                    value={form.designation}
                    onChange={handleInput}
                    className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink transition"
                  >
                    <option value="">Select designation...</option>
                    <optgroup label="Senior Management">
                      <option>Chief Operating Officer (COO)</option>
                      <option>Chief Financial Officer (CFO)</option>
                      <option>Chief Marketing Officer (CMO)</option>
                      <option>Head of Merchandising / Product Head</option>
                      <option>HR Head</option>
                    </optgroup>
                    <optgroup label="Middle Management">
                      <option>Store Manager / Retail Manager</option>
                      <option>Production Manager</option>
                      <option>Inventory Manager</option>
                      <option>Sales Manager</option>
                      <option>Digital Marketing Manager</option>
                    </optgroup>
                    <optgroup label="Supervisors / Team Leads">
                      <option>Floor Supervisor (Retail)</option>
                      <option>Workshop Supervisor</option>
                      <option>Customer Support Lead</option>
                    </optgroup>
                    <optgroup label="Core Workforce">
                      <option>Sales Executive / Showroom Staff</option>
                      <option>Karigar / Craftsman</option>
                      <option>Inventory Staff</option>
                      <option>Digital Team</option>
                      <option>Customer Support Executive</option>
                    </optgroup>
                    <optgroup label="Entry Level">
                      <option>Intern - Marketing</option>
                      <option>Intern - Operations</option>
                      <option>Intern - Tech / Shopify</option>
                      <option>Trainee - Sales</option>
                      <option>Trainee - Production</option>
                    </optgroup>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Department</label>
                  <select
                    name="department"
                    value={form.department === '' || ['IT', 'Customer Care', 'TSF', 'JANKI', 'Other'].includes(form.department) ? form.department : 'Other'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        department: val,
                        departmentOther: val !== 'Other' ? '' : prev.departmentOther,
                      }));
                    }}
                    className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink transition"
                  >
                    <option value="">Select department...</option>
                    <option value="IT">IT</option>
                    <option value="Customer Care">Customer Care</option>
                    <option value="TSF">TSF</option>
                    <option value="JANKI">JANKI</option>
                    <option value="Other">Other</option>
                  </select>
                  {(form.department === 'Other' || (!['', 'IT', 'Customer Care', 'TSF', 'JANKI', 'Other'].includes(form.department) && form.department !== '')) && (
                    <input
                      className="w-full mt-2 border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition"
                      placeholder="Enter department name"
                      name="departmentOther"
                      value={form.departmentOther}
                      onChange={handleInput}
                    />
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-text mb-3">Current Address *</label>
                <div className="flex flex-col gap-2 mt-2">
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Address Line 1" value={form.currentAddress.line1} onChange={e => handleInput(e, "currentAddress", "line1")} />
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Address Line 2" value={form.currentAddress.line2} onChange={e => handleInput(e, "currentAddress", "line2")} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="City" value={form.currentAddress.city} onChange={e => handleInput(e, "currentAddress", "city")} />
                    <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="State" value={form.currentAddress.state} onChange={e => handleInput(e, "currentAddress", "state")} />
                    <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Pincode" value={form.currentAddress.pincode} onChange={e => handleInput(e, "currentAddress", "pincode")} />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-text mb-3">Permanent Address *</label>
                <div className="flex items-center mb-3">
                  <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="w-4 h-4 text-slate-text border-soft-border rounded cursor-pointer" />
                  <span className="text-sm text-slate-text font-medium ml-2">Same as current address</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Address Line 1" value={form.permanentAddress.line1} onChange={e => handleInput(e, "permanentAddress", "line1")} />
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Address Line 2" value={form.permanentAddress.line2} onChange={e => handleInput(e, "permanentAddress", "line2")} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="City" value={form.permanentAddress.city} onChange={e => handleInput(e, "permanentAddress", "city")} />
                    <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="State" value={form.permanentAddress.state} onChange={e => handleInput(e, "permanentAddress", "state")} />
                    <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" placeholder="Pincode" value={form.permanentAddress.pincode} onChange={e => handleInput(e, "permanentAddress", "pincode")} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-text mb-2">GST Number</label>
                <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="gstNumber" value={form.gstNumber} onChange={handleInput} placeholder="Enter GST number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">First Language</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="firstLang" value={form.firstLang} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Second Language</label>
                  <input className="w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition" name="secondLang" value={form.secondLang} onChange={handleInput} />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold text-midnight-ink flex items-center gap-2">
                  <span className="text-slate-text">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Identity Documents
                </h3>
                <p className="text-cool-gray text-sm font-medium">Upload your identity documents</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.aadhaar ? 'border-soft-border' : 'hover:border-soft-border'}`}
                    onClick={() => handleUploadClick('aadhaar')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'aadhaar')}
                      id="file-input-aadhaar"
                    />
                    <svg className="w-10 h-10 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <div className="font-semibold">Aadhaar Card</div>
                    <div className="text-sm text-cool-gray">{documents.aadhaar ? documents.aadhaar.name : 'Drag your file here, or '}<span className="text-slate-text font-semibold cursor-pointer">browse</span></div>
                    <div className="text-sm text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.pan ? 'border-soft-border' : 'hover:border-soft-border'}`}
                    onClick={() => handleUploadClick('pan')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'pan')}
                      id="file-input-pan"
                    />
                    <svg className="w-10 h-10 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">PAN Card</div>
                    <div className="text-sm text-cool-gray">{documents.pan ? documents.pan.name : 'Drag your file here, or '}<span className="text-slate-text font-semibold cursor-pointer">browse</span></div>
                    <div className="text-sm text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.gst ? 'border-soft-border' : 'hover:border-soft-border'}`}
                    onClick={() => handleUploadClick('gst')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'gst')}
                      id="file-input-gst"
                    />
                    <svg className="w-10 h-10 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">GST Document</div>
                    <div className="text-sm text-cool-gray">{documents.gst ? documents.gst.name : 'Drag your file here, or '}<span className="text-slate-text font-semibold cursor-pointer">browse</span></div>
                    <div className="text-sm text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold text-midnight-ink flex items-center gap-2">
                  <span className="text-slate-text">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Notes
                </h3>
                <p className="text-cool-gray text-sm font-medium">Add any additional notes or remarks</p>
                <textarea
                  className="w-full border border-soft-border rounded-lg px-4 py-2.5 mt-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition"
                  name="notes"
                  value={form.notes}
                  onChange={handleInput}
                  rows="5"
                  placeholder="Enter your notes here..."
                />
              </div>

              {/* Buttons Container */}
              <div className="flex gap-2 mt-8">
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
                  className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md"
                >
                  {isSubmitting ? 'ENROLLING...' : 'ENROLL'}
                </button>
              </div>
              {submitStatus && (
                <div className={`mt-2 text-sm font-medium ${submitStatus.success ? 'text-success-dark' : 'text-danger-dark'}`}>
                  {submitStatus.message}
                </div>
              )}
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EnrolWorkforcePage() {
  const router = useRouter();

  return (
    <EnrolWorkforceForm
      open
      onClose={() => router.push('/home')}
    />
  );
}
