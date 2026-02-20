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
    fullName: "Jatin",
    dob: "2005-05-07",
    gender: "Male",
    email: "jatin15.janki@gmail.com",
    contact: "+91 6375276531",
    whatsapp: "+91 6375276531",
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
    currentLocation: "Jaipur, Rajasthan",
    firstLang: "Hindi",
    secondLang: "English",
    notes: "",
  });
  const [documents, setDocuments] = useState({ aadhaar: null, pan: null, gst: null });
  const [profilePhoto, setProfilePhoto] = useState(null);

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
                  <label className="block text-sm font-medium">Full Name *</label>
                  <input className="w-full border rounded px-3 py-2" name="fullName" value={form.fullName} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Date of Birth *</label>
                  <input type="date" className="w-full border rounded px-3 py-2" name="dob" value={form.dob} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Gender *</label>
                  <input className="w-full border rounded px-3 py-2" name="gender" value={form.gender} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email Address *</label>
                  <input className="w-full border rounded px-3 py-2" name="email" value={form.email} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Contact Number *</label>
                  <input className="w-full border rounded px-3 py-2" name="contact" value={form.contact} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">WhatsApp Number</label>
                  <input className="w-full border rounded px-3 py-2" name="whatsapp" value={form.whatsapp} onChange={handleInput} disabled={!editMode} />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium">Current Address *</label>
                <div className="flex flex-col gap-2 mt-2">
                  <input className="w-full border rounded px-3 py-3 mb-1" placeholder="Address Line 1" value={form.currentAddress.line1} onChange={e => handleInput(e, "currentAddress", "line1")} disabled={!editMode} />
                  <input className="w-full border rounded px-3 py-3 mb-1" placeholder="Address Line 2" value={form.currentAddress.line2} onChange={e => handleInput(e, "currentAddress", "line2")} disabled={!editMode} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="City" value={form.currentAddress.city} onChange={e => handleInput(e, "currentAddress", "city")} disabled={!editMode} />
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="State" value={form.currentAddress.state} onChange={e => handleInput(e, "currentAddress", "state")} disabled={!editMode} />
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="Pincode" value={form.currentAddress.pincode} onChange={e => handleInput(e, "currentAddress", "pincode")} disabled={!editMode} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">GST Number</label>
                <input className="w-full border rounded px-3 py-2" name="gstNumber" value={form.gstNumber} onChange={handleInput} disabled={!editMode} placeholder="Enter GST number" />
              </div>

              <div>
                <label className="block text-sm font-medium">Current Location</label>
                <input className="w-full border rounded px-3 py-2" name="currentLocation" value={form.currentLocation} onChange={handleInput} disabled={!editMode} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">First Language</label>
                  <input className="w-full border rounded px-3 py-2" name="firstLang" value={form.firstLang} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Second Language</label>
                  <input className="w-full border rounded px-3 py-2" name="secondLang" value={form.secondLang} onChange={handleInput} disabled={!editMode} />
                </div>
              </div>

              <div className="mt-8">
                <label className="block text-sm font-medium">Permanent Address *</label>
                {editMode && (
                  <div className="flex items-center mb-2">
                    <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="mr-2" />
                    <span className="text-xs">Same as current address</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input className="w-full border rounded px-3 py-3 mb-1" placeholder="Address Line 1" value={form.permanentAddress.line1} onChange={e => handleInput(e, "permanentAddress", "line1")} disabled={!editMode || form.sameAsCurrent} />
                  <input className="w-full border rounded px-3 py-3 mb-1" placeholder="Address Line 2" value={form.permanentAddress.line2} onChange={e => handleInput(e, "permanentAddress", "line2")} disabled={!editMode || form.sameAsCurrent} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="City" value={form.permanentAddress.city} onChange={e => handleInput(e, "permanentAddress", "city")} disabled={!editMode || form.sameAsCurrent} />
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="State" value={form.permanentAddress.state} onChange={e => handleInput(e, "permanentAddress", "state")} disabled={!editMode || form.sameAsCurrent} />
                    <input className="w-full border rounded px-3 py-2 mb-1" placeholder="Pincode" value={form.permanentAddress.pincode} onChange={e => handleInput(e, "permanentAddress", "pincode")} disabled={!editMode || form.sameAsCurrent} />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Identity Documents
                </h3>
                <p className="text-gray-500 text-sm">Upload your identity documents</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.aadhaar ? 'border-blue-500' : 'hover:border-blue-400'}`}
                    onClick={() => editMode && handleUploadClick('aadhaar')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'aadhaar')}
                      disabled={!editMode}
                      id="file-input-aadhaar"
                    />
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <div className="font-semibold">Aadhaar Card</div>
                    <div className="text-xs text-gray-500">{documents.aadhaar ? documents.aadhaar.name : 'Drag your file here, or '}<span className="text-blue-600 cursor-pointer">browse</span></div>
                    <div className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.pan ? 'border-blue-500' : 'hover:border-blue-400'}`}
                    onClick={() => editMode && handleUploadClick('pan')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'pan')}
                      disabled={!editMode}
                      id="file-input-pan"
                    />
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">PAN Card</div>
                    <div className="text-xs text-gray-500">{documents.pan ? documents.pan.name : 'Drag your file here, or '}<span className="text-blue-600 cursor-pointer">browse</span></div>
                    <div className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.gst ? 'border-blue-500' : 'hover:border-blue-400'}`}
                    onClick={() => editMode && handleUploadClick('gst')}
                    style={{ borderWidth: 2 }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handleFile(e, 'gst')}
                      disabled={!editMode}
                      id="file-input-gst"
                    />
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">GST Document</div>
                    <div className="text-xs text-gray-500">{documents.gst ? documents.gst.name : 'Drag your file here, or '}<span className="text-blue-600 cursor-pointer">browse</span></div>
                    <div className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Notes
                </h3>
                <p className="text-gray-500 text-sm">Add any additional notes or remarks</p>
                <textarea
                  className="w-full border rounded px-3 py-2 mt-2"
                  name="notes"
                  value={form.notes}
                  onChange={handleInput}
                  disabled={!editMode}
                  rows="5"
                  placeholder="Enter your notes here..."
                />
              </div>

              {/* Buttons Container */}
              <div className="flex gap-2 mt-8">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded transition shadow-md"
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
