

'use client';
import React, { useState } from "react";

export default function EnrolWorkforce() {
  const [editMode, setEditMode] = useState(false);
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
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Handle address autofill
  const handleSameAsCurrent = (checked) => {
    setForm((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanentAddress: checked ? { ...prev.currentAddress } : { line1: "", line2: "", city: "", state: "", pincode: "", details: "" }
    }));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-lg p-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <input
                id="profile-photo-input"
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setProfilePhoto(e.target.files[0])}
                disabled={!editMode}
              />
              <div
                className={`w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-700 cursor-pointer border-2 border-slate-300 ${editMode ? 'hover:ring-2 hover:ring-slate-400' : ''}`}
                onClick={() => editMode && document.getElementById('profile-photo-input').click()}
                style={{ overflow: 'hidden' }}
              >
                {profilePhoto ? (
                  <img src={URL.createObjectURL(profilePhoto)} alt="Profile" className="object-cover w-full h-full" />
                ) : form.fullName ? (
                  form.fullName?.[0]
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{form.fullName}</h2>
              {form.email && (
                <div className="flex items-center gap-2 text-white/90">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span>{form.email}</span>
                </div>
              )}
            </div>
          </div>
          <button
            className={`bg-white text-slate-800 px-6 py-2 rounded-lg font-semibold shadow-md hover:bg-slate-50 transition ${editMode ? 'ring-2 ring-white' : ''}`}
            onClick={() => setEditMode((e) => !e)}
          >
            {editMode ? 'SAVE' : 'EDIT PROFILE'}
          </button>
        </div>

        <div className="bg-white rounded-b-lg p-6 shadow-lg border-t border-slate-200">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="text-slate-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                Personal Information
              </h3>
              <p className="text-slate-600 text-sm font-medium">Update your personal details</p>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="fullName" value={form.fullName} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Date of Birth *</label>
                  <input type="date" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-0" name="dob" value={form.dob} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gender *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="gender" value={form.gender} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="email" value={form.email} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number *</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="contact" value={form.contact} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp Number</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="whatsapp" value={form.whatsapp} onChange={handleInput} disabled={!editMode} />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Current Address *</label>
                <div className="flex flex-col gap-2 mt-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 1" value={form.currentAddress.line1} onChange={e => handleInput(e, "currentAddress", "line1")} disabled={!editMode} />
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 2" value={form.currentAddress.line2} onChange={e => handleInput(e, "currentAddress", "line2")} disabled={!editMode} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="City" value={form.currentAddress.city} onChange={e => handleInput(e, "currentAddress", "city")} disabled={!editMode} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="State" value={form.currentAddress.state} onChange={e => handleInput(e, "currentAddress", "state")} disabled={!editMode} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Pincode" value={form.currentAddress.pincode} onChange={e => handleInput(e, "currentAddress", "pincode")} disabled={!editMode} />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Permanent Address *</label>
                {editMode && (
                  <div className="flex items-center mb-3">
                    <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="w-4 h-4 text-slate-700 border-slate-300 rounded cursor-pointer" />
                    <span className="text-xs text-slate-700 font-medium ml-2">Same as current address</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 1" value={form.permanentAddress.line1} onChange={e => handleInput(e, "permanentAddress", "line1")} disabled={!editMode || form.sameAsCurrent} />
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Address Line 2" value={form.permanentAddress.line2} onChange={e => handleInput(e, "permanentAddress", "line2")} disabled={!editMode || form.sameAsCurrent} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="City" value={form.permanentAddress.city} onChange={e => handleInput(e, "permanentAddress", "city")} disabled={!editMode || form.sameAsCurrent} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="State" value={form.permanentAddress.state} onChange={e => handleInput(e, "permanentAddress", "state")} disabled={!editMode || form.sameAsCurrent} />
                    <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" placeholder="Pincode" value={form.permanentAddress.pincode} onChange={e => handleInput(e, "permanentAddress", "pincode")} disabled={!editMode || form.sameAsCurrent} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">GST Number</label>
                <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="gstNumber" value={form.gstNumber} onChange={handleInput} disabled={!editMode} placeholder="Enter GST number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Language</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="firstLang" value={form.firstLang} onChange={handleInput} disabled={!editMode} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Second Language</label>
                  <input className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition" name="secondLang" value={form.secondLang} onChange={handleInput} disabled={!editMode} />
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
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <div className="font-semibold">Aadhaar Card</div>
                    <div className="text-xs text-slate-600">{documents.aadhaar ? documents.aadhaar.name : 'Drag your file here, or '}<span className="text-slate-700 font-semibold cursor-pointer">browse</span></div>
                    <div className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.pan ? 'border-slate-500' : 'hover:border-slate-400'}`}
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
                    <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                    <div className="font-semibold">PAN Card</div>
                    <div className="text-xs text-slate-600">{documents.pan ? documents.pan.name : 'Drag your file here, or '}<span className="text-slate-700 font-semibold cursor-pointer">browse</span></div>
                    <div className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</div>
                  </div>

                  <div
                    className={`border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${documents.gst ? 'border-slate-500' : 'hover:border-slate-400'}`}
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
                  disabled={!editMode}
                  rows="5"
                  placeholder="Enter your notes here..."
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
