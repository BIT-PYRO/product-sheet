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
  const [type, setType] = useState("In-House")
  const [remarks, setRemarks] = useState("")
  const [photoFileName, setPhotoFileName] = useState("")
  const photoInputRef = useRef(null)

  function handlePhotoChange(e) {
    if (e.target.files?.[0]) {
      setPhotoFileName(e.target.files[0].name)
    }
  }

  function handleSubmit() {
    if (!firstName || !contactNumber) return
    const fullName = `${firstName} ${lastName}`.trim()
    if (onEnroll) {
      onEnroll(fullName)
    }
    onOpenChange(false)
    setFirstName("")
    setLastName("")
    setContactNumber("")
    setLocation("Dwarka Niwas, Jaipur")
    setRemarks("")
    setPhotoFileName("")
  }

  function handleSaveDraft() {
    const draftData = {
      firstName,
      lastName,
      countryCode,
      contactNumber,
      location,
      department,
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
      if (draft.type) setType(draft.type)
      if (draft.remarks) setRemarks(draft.remarks)
      if (draft.photoFileName) setPhotoFileName(draft.photoFileName)
      // Open the modal
      onOpenChange(true)
    }
  }, [loadedDraft, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[750px] max-h-[70vh] overflow-y-auto bg-gradient-to-br from-cloud-gray to-cloud-gray text-midnight-ink p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-soft-border bg-gradient-to-r from-midnight-ink to-midnight-ink/90 relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">
              QUICK ENROLMENT
            </DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-4 text-cool-gray hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="px-5 pb-5 flex flex-col gap-2">
          {/* Row 1: Photo on Left, First Name & Last Name & Location/Department/Type on Right */}
          <div className="grid grid-cols-[140px_1fr] gap-4">
            {/* Photo Upload Section - Passport size 4cm x 5cm */}
            <div className="flex flex-col gap-2 mt-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full aspect-[4/5] border border-soft-border rounded-xl flex items-center justify-center hover:bg-cloud-gray transition-all cursor-pointer bg-white shadow-sm hover:shadow-md group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-lg bg-cloud-gray group-hover:bg-cloud-gray transition">
                    <Upload className="h-5 w-5 text-cool-gray group-hover:text-slate-text" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base font-semibold text-slate-text">Upload Photo</span>
                  </div>
                </div>
              </button>
              {photoFileName && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-cloud-gray border border-soft-border">
                  <div className="w-4 h-4 rounded bg-cool-gray flex items-center justify-center">
                    <span className="text-sm text-white font-bold">✓</span>
                  </div>
                  <p className="text-base text-slate-text font-medium truncate flex-1">{photoFileName}</p>
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Form Fields on Right */}
            <div className="flex flex-col gap-2">
              {/* First Name & Last Name in one row */}
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="flex flex-col gap-0.5">
                  <Label>FIRST NAME<span className="text-danger">*</span></Label>
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label>LAST NAME</Label>
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
                  />
                </div>
              </div>

              {/* Phone (Code + Phone) and Location in one row */}
              <div className="grid grid-cols-[65px_150px_1fr] gap-2">
                <div className="flex flex-col gap-0.5">
                  <Label>CODE</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+91">+91</SelectItem>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label>PHONE<span className="text-danger">*</span></Label>
                  <Input
                    type="tel"
                    maxLength={12}
                    placeholder="XXXXXXXXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.slice(0, 12))}
                    className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label>LOCATION</Label>
                  <Input
                    placeholder="Dwarka Niwas, Jaipur"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
                  />
                </div>
              </div>

              {/* Department and Type in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <Label>DEPARTMENT</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cutting">Cutting</SelectItem>
                      <SelectItem value="Stitching">Stitching</SelectItem>
                      <SelectItem value="Polishing">Polishing</SelectItem>
                      <SelectItem value="Assembly">Assembly</SelectItem>
                      <SelectItem value="QC">Quality Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label>TYPE</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-11 text-base bg-cloud-gray border border-soft-border rounded-lg focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent">
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

          {/* Remarks Section */}
          <div className="flex flex-col gap-0.5">
            <Label>REMARKS</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              className="min-h-[60px] text-base resize-none bg-cloud-gray border border-soft-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
            />
          </div>

          {/* Buttons Container */}
          <div className="flex gap-2 mt-2">
            <Button
              className="flex-1 h-11 bg-trust-blue hover:bg-deep-blue text-white font-bold text-base rounded transition shadow-md"
              onClick={handleSaveDraft}
            >
              Save as Draft
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold h-11 text-base rounded transition shadow-md"
              onClick={handleSubmit}
            >
              ENROLL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
