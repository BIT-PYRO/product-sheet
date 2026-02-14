"use client"

import { useState, useRef } from "react"
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

export function QuickEnrollModal({ open, onOpenChange }) {
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
    onOpenChange(false)
    setFirstName("")
    setLastName("")
    setContactNumber("")
    setLocation("Dwarka Niwas, Jaipur")
    setRemarks("")
    setPhotoFileName("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[85vh] overflow-y-auto bg-white text-slate-900 p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-2 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900">
              QUICK ENROLMENT OF WORKFORCE/VENDOR
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5 flex flex-col gap-2">
          {/* Row 1: Photo Upload on Left, First Name & Last Name on Right */}
          <div className="grid grid-cols-[140px_1fr] gap-4">
            {/* Photo Upload Section - Passport size 4cm x 5cm */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold text-slate-700">PHOTO</Label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full aspect-[4/5] border-2 border-dashed border-slate-300 rounded flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">Click upload</span>
                </div>
              </button>
              {photoFileName && (
                <p className="text-xs text-slate-600 truncate">{photoFileName}</p>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-semibold text-slate-700">FIRST NAME<span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-8 text-sm bg-white border-slate-300 px-2"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-semibold text-slate-700">LAST NAME</Label>
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-8 text-sm bg-white border-slate-300 px-2"
                  />
                </div>
              </div>

              {/* Phone Number Row */}
              <div className="grid grid-cols-[90px_1fr] gap-2">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-semibold text-slate-700">CODE</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-8 text-sm bg-white border-slate-300 w-full">
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
                  <Label className="text-xs font-semibold text-slate-700">PHONE<span className="text-red-500">*</span></Label>
                  <Input
                    type="tel"
                    maxLength={15}
                    placeholder="XXXXX XXXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.slice(0, 15))}
                    className="h-8 text-sm bg-white border-slate-300 px-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Location, Department, Type */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs font-semibold text-slate-700">LOCATION</Label>
              <Input
                placeholder="Dwarka Niwas, Jaipur"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-8 text-sm bg-white border-slate-300 px-2"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs font-semibold text-slate-700">DEPARTMENT</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-8 text-sm bg-white border-slate-300">
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
              <Label className="text-xs font-semibold text-slate-700">TYPE</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-sm bg-white border-slate-300">
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

          {/* Remarks */}
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs font-semibold text-slate-700">REMARKS</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              className="min-h-[50px] text-sm resize-none bg-white border-slate-300 px-2 py-1"
            />
          </div>

          {/* Enroll Button */}
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-sm w-full mt-1"
            onClick={handleSubmit}
          >
            ENROLL WORKFORCE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
