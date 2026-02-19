'use client';
import React, { useState, useEffect } from "react";
import { X } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(open)
  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    contact: "",
    whatsapp: "",
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
  const handleSubmit = () => {
    if (onEnroll && form.fullName) {
      onEnroll(form.fullName);
    }
    if (onClose) {
      onClose();
    }
    console.log("Workforce enrolled:", form);
    // TODO: Send form data to backend
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
    setIsOpen(false)
    if (onClose) {
      onClose()
    }
  };

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-700 relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">
              ENROLL WORKFORCE
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="absolute right-5 top-4 text-slate-200 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="fullName" value={form.fullName} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Date of Birth *</label>
                  <input type="date" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-0" name="dob" value={form.dob} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gender *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="gender" value={form.gender} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="email" value={form.email} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="contact" value={form.contact} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp Number</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="whatsapp" value={form.whatsapp} onChange={handleInput} />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Current Address *</label>
                <div className="flex flex-col gap-2 mt-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 1" value={form.currentAddress.line1} onChange={e => handleInput(e, "currentAddress", "line1")} />
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 2" value={form.currentAddress.line2} onChange={e => handleInput(e, "currentAddress", "line2")} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="City" value={form.currentAddress.city} onChange={e => handleInput(e, "currentAddress", "city")} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="State" value={form.currentAddress.state} onChange={e => handleInput(e, "currentAddress", "state")} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Pincode" value={form.currentAddress.pincode} onChange={e => handleInput(e, "currentAddress", "pincode")} />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Permanent Address *</label>
                <div className="flex items-center mb-3">
                  <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="w-4 h-4 text-slate-700 border-slate-300 rounded cursor-pointer" />
                  <span className="text-xs text-slate-700 font-medium ml-2">Same as current address</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 1" value={form.permanentAddress.line1} onChange={e => handleInput(e, "permanentAddress", "line1")} />
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 2" value={form.permanentAddress.line2} onChange={e => handleInput(e, "permanentAddress", "line2")} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="City" value={form.permanentAddress.city} onChange={e => handleInput(e, "permanentAddress", "city")} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="State" value={form.permanentAddress.state} onChange={e => handleInput(e, "permanentAddress", "state")} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Pincode" value={form.permanentAddress.pincode} onChange={e => handleInput(e, "permanentAddress", "pincode")} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">GST Number</label>
                <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="gstNumber" value={form.gstNumber} onChange={handleInput} placeholder="Enter GST number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Language</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="firstLang" value={form.firstLang} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Second Language</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="secondLang" value={form.secondLang} onChange={handleInput} />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-slate-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Identity Documents
                </h3>
                <p className="text-slate-600 text-sm font-medium">Upload your identity documents</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.aadhaar ? 'border-slate-500' : 'hover:border-slate-400'}`}
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
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <div className="font-semibold">Aadhaar Card</div>
                    <div className="text-xs text-slate-600">{documents.aadhaar ? documents.aadhaar.name : 'Drag your file here, or '}<span className="text-slate-700 font-semibold cursor-pointer">browse</span></div>
                    <div className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.pan ? 'border-slate-500' : 'hover:border-slate-400'}`}
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
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">PAN Card</div>
                    <div className="text-xs text-slate-600">{documents.pan ? documents.pan.name : 'Drag your file here, or '}<span className="text-slate-700 font-semibold cursor-pointer">browse</span></div>
                    <div className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.gst ? 'border-slate-500' : 'hover:border-slate-400'}`}
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
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">GST Document</div>
                    <div className="text-xs text-slate-600">{documents.gst ? documents.gst.name : 'Drag your file here, or '}<span className="text-slate-700 font-semibold cursor-pointer">browse</span></div>
                    <div className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-slate-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Notes
                </h3>
                <p className="text-slate-600 text-sm font-medium">Add any additional notes or remarks</p>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 mt-2 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition"
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
                  className="flex-1 h-10 bg-gray-500 hover:bg-gray-600 text-white font-bold text-sm rounded transition shadow-md"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 h-10 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white font-bold text-sm rounded transition shadow-md"
                >
                  ENROLL
                </button>
              </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EnrolWorkforcePage() {
  return <EnrolWorkforceForm />;
}
