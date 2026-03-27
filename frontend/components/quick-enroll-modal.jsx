"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import { useDrafts, useDraftLoader } from "@/components/drafts-manager"

export function QuickEnrollModal({ open, onOpenChange, onEnroll }) {
  const { saveDraft } = useDrafts()
  const loadedDraft = useDraftLoader()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [contactNumber, setContactNumber] = useState("")
  const [location, setLocation] = useState("Dwarka Niwas, Jaipur")
  const [department, setDepartment] = useState("")
  const [designation, setDesignation] = useState("")
  const [designationOther, setDesignationOther] = useState("")
  const [type, setType] = useState("In-House")
  const [remarks, setRemarks] = useState("")
  const [photoFileName, setPhotoFileName] = useState("")
  const photoInputRef = useRef(null)

  function handlePhotoChange(e) {
    if (e.target.files?.[0]) {
      setPhotoFileName(e.target.files[0].name)
    }
  }

  async function handleSubmit() {
    const fullName = `${firstName} ${lastName}`.trim()
    if (!fullName) {
      alert('Please enter first name (and last name is optional)')
      return
    }
    if (!contactNumber.trim()) {
      alert('Please enter contact number')
      return
    }

    const payload = {
      full_name: fullName,
      phone: `${countryCode} ${contactNumber}`.trim(),
      whatsapp: contactNumber.trim(),
      email: '',
      current_location: location,
      department,
      designation: designation === 'Other' ? designationOther.trim() : designation,
      notes: remarks,
      active: true,
    }

    try {
      const response = await fetch('/api/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        const msg = result?.error?.message || result?.message || result?.detail || 'Unable to enroll workforce member.'
        throw new Error(msg)
      }

      const created = result.data
      if (onEnroll) {
        onEnroll(created)
      }

      if (typeof window !== 'undefined') {
        alert('Workforce enrolled successfully!')
      }

      onOpenChange(false)
      setFirstName('')
      setLastName('')
      setCountryCode('+91')
      setContactNumber('')
      setLocation('Dwarka Niwas, Jaipur')
      setDepartment('')
      setDesignation('')
      setDesignationOther('')
      setType('In-House')
      setRemarks('')
      setPhotoFileName('')
    } catch (error) {
      console.error('Quick enroll failed', error)
      alert(`Error: ${error.message || 'Unable to enroll workforce member.'}`)
    }
  }

  function handleSaveDraft() {
    const draftData = {
      firstName,
      lastName,
      countryCode,
      contactNumber,
      location,
      department,
      designation,
      designationOther,
      type,
      remarks,
      photoFileName,
      title: `${firstName} ${lastName}`.trim() || 'Quick Enroll Draft',
    }
    saveDraft('Quick Enroll', `draft_${Date.now()}`, draftData)
    // Show toast notification
    if (typeof window !== 'undefined') {
      alert('Draft saved successfully!')
    }
    onOpenChange(false)
  }

  // Handle draft loading
  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Quick Enroll') {
      const draft = loadedDraft.data
      // Restore all form fields from draft
      if (draft.firstName) setFirstName(draft.firstName)
      if (draft.lastName) setLastName(draft.lastName)
      if (draft.countryCode) setCountryCode(draft.countryCode)
      if (draft.contactNumber) setContactNumber(draft.contactNumber)
      if (draft.location) setLocation(draft.location)
      if (draft.department) setDepartment(draft.department)
      if (draft.designation) setDesignation(draft.designation)
      if (draft.designationOther) setDesignationOther(draft.designationOther)
      if (draft.type) setType(draft.type)
      if (draft.remarks) setRemarks(draft.remarks)
      if (draft.photoFileName) setPhotoFileName(draft.photoFileName)
      // Open the modal
      onOpenChange(true)
    }
  }, [loadedDraft, onOpenChange])

  const fieldLabel = "text-[10px] font-semibold tracking-widest text-slate-text uppercase mb-0.5"
  const inputCls = "h-8 text-xs bg-white border border-soft-border rounded px-2.5 focus:outline-none focus:ring-1 focus:ring-trust-blue focus:border-transparent placeholder-slate-300 transition"
  const selectTriggerCls = "h-8 text-xs bg-white border border-soft-border rounded focus:outline-none focus:ring-1 focus:ring-trust-blue focus:border-transparent"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] bg-white text-midnight-ink p-0 gap-0 [&>button]:hidden rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-soft-border bg-midnight-ink relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-sm font-bold tracking-widest text-white">
              QUICK ENROLMENT
            </DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-3 text-white/50 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Photo + Fields row */}
          <div className="flex gap-4">
            {/* Photo Upload */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-[88px] h-[110px] border border-dashed border-soft-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-trust-blue hover:bg-blue-50/30 transition cursor-pointer bg-cloud-gray group"
              >
                <Upload className="h-4 w-4 text-cool-gray group-hover:text-trust-blue transition" />
                <span className="text-[10px] font-medium text-cool-gray group-hover:text-trust-blue leading-tight text-center">Upload<br/>Photo</span>
              </button>
              {photoFileName && (
                <p className="text-[9px] text-slate-text truncate w-[88px] text-center">{photoFileName}</p>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Form Fields */}
            <div className="flex-1 flex flex-col gap-2.5">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className={fieldLabel}>First Name <span className="text-danger">*</span></label>
                  <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col">
                  <label className={fieldLabel}>Last Name</label>
                  <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Code + Phone + Location */}
              <div className="grid grid-cols-[56px_130px_1fr] gap-2">
                <div className="flex flex-col">
                  <label className={fieldLabel}>Code</label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className={selectTriggerCls + " w-full"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+91">+91</SelectItem>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className={fieldLabel}>Phone <span className="text-danger">*</span></label>
                  <Input type="tel" maxLength={12} placeholder="XXXXXXXXXX" value={contactNumber} onChange={(e) => setContactNumber(e.target.value.slice(0, 12))} className={inputCls} />
                </div>
                <div className="flex flex-col">
                  <label className={fieldLabel}>Location</label>
                  <Input placeholder="City, State" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Department + Type */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className={fieldLabel}>Department</label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Design / CAD">Design / CAD</SelectItem>
                      <SelectItem value="3D Print">3D Print</SelectItem>
                      <SelectItem value="Mold Die">Mold Die</SelectItem>
                      <SelectItem value="Wax Pieces">Wax Pieces</SelectItem>
                      <SelectItem value="Wax Setting">Wax Setting</SelectItem>
                      <SelectItem value="Casting">Casting</SelectItem>
                      <SelectItem value="Filing / Grinding">Filing / Grinding</SelectItem>
                      <SelectItem value="Pre-Polish">Pre-Polish</SelectItem>
                      <SelectItem value="Hand Setting">Hand Setting</SelectItem>
                      <SelectItem value="Polishing">Polishing</SelectItem>
                      <SelectItem value="Plating">Plating</SelectItem>
                      <SelectItem value="Final Quality Check">Final Quality Check</SelectItem>
                      <SelectItem value="Hallmarking">Hallmarking</SelectItem>
                      <SelectItem value="Laser Soldering">Laser Soldering</SelectItem>
                      <SelectItem value="Final Packaging">Final Packaging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className={fieldLabel}>Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In-House">In-House</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Designation row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label className={fieldLabel}>Designation</label>
              <Select value={designation} onValueChange={(val) => { setDesignation(val); if (val !== 'Other') setDesignationOther('') }}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Worker">Worker</SelectItem>
                  <SelectItem value="Labour">Labour</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {designation === 'Other' && (
              <div className="flex flex-col">
                <label className={fieldLabel}>Specify Designation</label>
                <Input placeholder="Enter designation" value={designationOther} onChange={(e) => setDesignationOther(e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="flex flex-col">
            <label className={fieldLabel}>Remarks</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              className="min-h-[52px] text-xs resize-none bg-white border border-soft-border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-trust-blue focus:border-transparent placeholder-slate-300 transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1 h-9 bg-trust-blue hover:bg-deep-blue text-white font-semibold text-xs rounded transition" onClick={handleSaveDraft}>
              Save as Draft
            </Button>
            <Button className="flex-1 h-9 bg-midnight-ink hover:bg-midnight-ink/90 text-white font-bold text-xs tracking-widest rounded transition" onClick={handleSubmit}>
              ENROLL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
