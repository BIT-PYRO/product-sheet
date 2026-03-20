"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { QuickEnrollModal } from "@/components/quick-enroll-modal"
import { Plus, X, ChevronDown, Eye } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDrafts, useDraftLoader } from "@/components/drafts-manager"

const WORK_CATEGORIES = [
  "Jewelry Making",
  "Electrical Work",
  "AC Repair & Service",
  "Plumbing",
  "Carpentry",
  "Painting",
  "Masonry",
  "Welding",
  "Machinery Repair",
  "Cleaning Service",
  "Maintenance",
  "Installation",
  "Fabrication",
  "Assembly",
  "Quality Check",
  "Packaging",
  "Transportation",
  "Other",
]

const WORK_TYPES = ["In-House", "Contract", "Job Work"]

export function GenericJobModal({ open, onOpenChange, onJobCreated }) {
  const { saveDraft } = useDrafts()
  const loadedDraft = useDraftLoader()
  const dateInputRef = useRef(null)
  const scheduleInputRef = useRef(null)
  const [workCategory, setWorkCategory] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [scheduleFuture, setScheduleFuture] = useState("")
  const [enrolledWorkers, setEnrolledWorkers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [jobNumber, setJobNumber] = useState("")
  const [issuedTo, setIssuedTo] = useState("Existing Workforce / Vendor")
  const [workType, setWorkType] = useState("In-House")
  const [issuedBy, setIssuedBy] = useState("")
  const [contact, setContact] = useState("")
  const [addNote, setAddNote] = useState("")
  const [isQuickEnrollOpen, setIsQuickEnrollOpen] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const photoInputRef = useRef(null)
  const excelInputRef = useRef(null)
  const wordInputRef = useRef(null)
  const pdfInputRef = useRef(null)

  // Generate unique job number
  useEffect(() => {
    if (open) {
      // Get current counter from localStorage or start at 1
      const currentCount = parseInt(localStorage.getItem('gw_counter') || '0') + 1
      // Save next counter value
      localStorage.setItem('gw_counter', currentCount.toString())
      // Return formatted voucher number GW-01, GW-02, etc.
      setJobNumber(`GW-${String(currentCount).padStart(2, '0')}`)
    }
  }, [open])

  // Load workforce members
  useEffect(() => {
    if (open) {
      loadWorkforceMembers()
    }
  }, [open])

  // Handle draft loading
  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Generic Job') {
      const draft = loadedDraft.data
      if (draft.startDate) setStartDate(draft.startDate)
      if (draft.scheduleFuture) setScheduleFuture(draft.scheduleFuture)
      if (draft.workCategory) setWorkCategory(draft.workCategory)
      if (draft.issuedTo) setIssuedTo(draft.issuedTo)
      if (draft.workType) setWorkType(draft.workType)
      if (draft.issuedBy) setIssuedBy(draft.issuedBy)
      if (draft.contact) setContact(draft.contact)
      if (draft.addNote) setAddNote(draft.addNote)
      if (draft.jobNumber) setJobNumber(draft.jobNumber)
      onOpenChange(true)
    }
  }, [loadedDraft, onOpenChange])

  async function loadWorkforceMembers() {
    try {
      const response = await fetch("/api/v1/workforce", { cache: "no-store" })
      const result = await response.json().catch(() => null)
      if (response.ok && result?.success) {
        const data = Array.isArray(result?.data) ? result.data : result?.data?.results || []
        setEnrolledWorkers(data)
      }
    } catch {
      // Keep form usable
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!issuedBy.trim()) {
      alert("Please enter who is issuing the job")
      return
    }

    setIsLoading(true)
    try {
      // Generate a title for the job
      const jobTitle = `${workCategory} - ${issuedTo}`

      const jobData = {
        title: jobTitle,
        job_type: workCategory,
        work_type: workType,
        issued_to: issuedTo,
        issued_by: issuedBy,
        contact: contact,
        notes: addNote,
        start_date: startDate,
        schedule: scheduleFuture,
        status: "created",
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      }

      const response = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        const message = result?.error?.message || result?.message || "Failed to create job"
        alert(message)
        return
      }

      resetForm()
      onOpenChange(false)
      
      if (onJobCreated) {
        onJobCreated(result?.data || jobData)
      }
    } catch (error) {
      alert("Error creating job: " + (error.message || "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveDraft() {
    const draftData = {
      startDate,
      scheduleFuture,
      workCategory,
      issuedTo,
      workType,
      issuedBy,
      contact,
      addNote,
      jobNumber,
      uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      title: `Generic Job ${jobNumber} - ${new Date(startDate).toLocaleDateString()}`,
    }
    
    // Save to localStorage
    saveDraft('Generic Job', `draft_${jobNumber}`, draftData)
    
    // Save to backend
    try {
      await fetch("/api/v1/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "Generic Job",
          payload: draftData,
          is_submitted: false,
        }),
      })
    } catch (error) {
      console.error('Failed to save draft to backend:', error)
    }
    
    if (typeof window !== 'undefined') {
      alert('Draft saved successfully!')
    }
    onOpenChange(false)
  }

  function resetForm() {
    setStartDate(new Date().toISOString().split("T")[0])
    setScheduleFuture("")
    setIssuedTo("Existing Workforce / Vendor")
    setWorkType("In-House")
    setIssuedBy("")
    setContact("")
    setAddNote("")
    setWorkCategory("")
    setUploadedFiles([])
    setShowUploadMenu(false)
  }

  function handleFileUpload(e, fileType) {
    const file = e.target.files?.[0]
    if (file) {
      const newFile = {
        name: file.name,
        type: fileType,
        size: (file.size / 1024).toFixed(2), // KB
        file: file
      }
      setUploadedFiles(prev => [...prev, newFile])
      setShowUploadMenu(false)
      // Reset input
      e.target.value = ''
    }
  }

  function removeUploadedFile(index) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  function viewUploadedFile(file) {
    // Create a blob URL for the file and display in modal
    const url = URL.createObjectURL(file.file)
    setPreviewUrl(url)
    setPreviewFile(file)
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[700px] w-[95vw] max-h-[92vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Create Generic Job</DialogTitle>
          
          {/* Close button only, no title */}
          <div className="flex justify-end px-4 pt-2 pb-0">
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-1 flex flex-col gap-1.5">
            {/* Row 1: DATE & SCHEDULE on LEFT | TYPE & VOUCHER NO on RIGHT */}
            <div className="flex justify-between gap-2">
              {/* LEFT: DATE & SCHEDULE */}
              <div className="flex gap-2">
                {/* DATE */}
                <div className="flex flex-col gap-0.5 cursor-pointer">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Date</Label>
                  <Input
                    ref={dateInputRef}
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      // Auto-blur to close picker after selection
                      setTimeout(() => e.target.blur(), 100)
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setTimeout(() => e.target.showPicker?.(), 0)
                    }}
                    className="h-8 py-1 text-sm bg-background border-border !w-fit max-w-[130px] pl-5 cursor-pointer select-none"
                  />
                </div>

                {/* SCHEDULE */}
                <div className="flex flex-col gap-0.5 cursor-pointer">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Schedule</Label>
                  <Input
                    ref={scheduleInputRef}
                    type="date"
                    placeholder="dd-mm-yyyy"
                    value={scheduleFuture}
                    onChange={(e) => {
                      setScheduleFuture(e.target.value)
                      // Auto-blur to close picker after selection
                      setTimeout(() => e.target.blur(), 100)
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setTimeout(() => e.target.showPicker?.(), 0)
                    }}
                    className="h-8 py-1 text-sm bg-background border-border !w-fit max-w-[130px] pl-5 cursor-pointer select-none"
                  />
                </div>
              </div>

              {/* RIGHT: TYPE & VOUCHER NO */}
              <div className="flex gap-2">
                {/* TYPE */}
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
                  <Select value={workCategory} onValueChange={setWorkCategory}>
                    <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* VOUCHER NO */}
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                  <Input
                    value={jobNumber}
                    readOnly
                    className="h-8 px-2 py-1 text-sm bg-muted border-border font-semibold text-foreground !w-fit max-w-[120px]"
                  />
                </div>
              </div>
            </div>

            {/* ISSUED TO */}
            <div className="border border-border rounded-md px-2.5 py-1.5">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-medium text-muted-foreground">Issued To</Label>
                  <Select value={issuedTo} onValueChange={setIssuedTo}>
                    <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Existing Workforce / Vendor">Existing Workforce / Vendor</SelectItem>
                      <SelectItem value="New Workforce / Vendor">New Workforce / Vendor</SelectItem>
                      {enrolledWorkers.map((person) => (
                        <SelectItem key={person.id} value={person.full_name}>
                          {person.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickEnrollOpen(true)}
                  className="h-8 px-10 border-2 border-dashed border-trust-blue text-trust-blue rounded font-semibold text-sm hover:bg-trust-blue/10 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Enroll
                </button>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-medium text-muted-foreground">Work Type</Label>
                  <Select value={workType} onValueChange={setWorkType}>
                    <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ISSUED BY */}
            <div className="border border-border rounded-md px-2.5 py-1.5">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-medium text-muted-foreground">Issued By</Label>
                  <Input
                    placeholder="Enter your name"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className="h-8 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text"
                  />
                </div>
                <div className="hidden md:block" />
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                  <Input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="h-8 text-sm bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* ADD NOTE */}
            <div className="border border-border rounded-md px-2.5 py-1.5">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Add Note</Label>
                <Textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Enter notes..."
                  className="min-h-[72px] resize-none text-sm bg-background border-border p-1"
                />
              </div>
            </div>

            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
              <div className="border border-blue-200 bg-blue-50 rounded-md p-2">
                <p className="text-xs font-semibold text-blue-900 mb-1.5">Uploaded Files ({uploadedFiles.length})</p>
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs">
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{file.name}</span>
                        <span className="text-gray-500 ml-2">({file.size} KB)</span>
                      </div>
                      <span className="text-blue-600 font-semibold mr-2">{file.type}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewUploadedFile(file)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="View file"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeUploadedFile(idx)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons Container */}
            <div className="flex gap-2 mt-0.5 mb-1.5">
              <Button
                className="flex-1 h-7 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </Button>
              
              {/* Upload Button with Dropdown */}
              <div className="relative flex-1">
                <Button
                  className="w-full h-7 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded flex items-center justify-center gap-1"
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                >
                  Upload
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {/* Dropdown Menu */}
                {showUploadMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-border rounded-md shadow-lg z-50">
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-200 transition-colors"
                    >
                      📷 Upload Photo
                    </button>
                    <button
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-200 transition-colors"
                    >
                      📊 Upload Excel
                    </button>
                    <button
                      onClick={() => wordInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-200 transition-colors"
                    >
                      📄 Upload Word
                    </button>
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                    >
                      📑 Upload PDF
                    </button>
                  </div>
                )}
              </div>

              <Button
                className="flex-1 h-7 bg-success hover:bg-success text-white font-bold text-sm rounded"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Issue Job"}
              </Button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'Photo')}
              className="hidden"
            />
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleFileUpload(e, 'Excel')}
              className="hidden"
            />
            <input
              ref={wordInputRef}
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => handleFileUpload(e, 'Word')}
              className="hidden"
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileUpload(e, 'PDF')}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(isOpen) => !isOpen && closePreview()}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-auto bg-background text-foreground p-0 gap-0">
          <div className="flex justify-between items-center sticky top-0 bg-background border-b border-border px-4 py-3 z-10">
            <DialogTitle className="text-lg font-semibold">
              {previewFile?.name}
            </DialogTitle>
            <button
              onClick={closePreview}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 flex items-center justify-center min-h-96">
            {previewFile?.type === 'Photo' ? (
              <img 
                src={previewUrl} 
                alt={previewFile?.name}
                className="max-w-full max-h-[500px] object-contain rounded"
              />
            ) : previewFile?.type === 'PDF' ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-6xl">📑</div>
                <p className="text-sm text-muted-foreground">{previewFile?.name}</p>
                <p className="text-xs text-muted-foreground mb-4">PDF files are best viewed in your PDF reader</p>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewUrl
                    link.download = previewFile?.name || 'document.pdf'
                    link.click()
                  }}
                  className="bg-trust-blue hover:bg-deep-blue text-white"
                >
                  Download PDF
                </Button>
              </div>
            ) : previewFile?.type === 'Excel' ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-6xl">📊</div>
                <p className="text-sm text-muted-foreground">{previewFile?.name}</p>
                <p className="text-xs text-muted-foreground mb-4">Excel files are best viewed in your spreadsheet application</p>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewUrl
                    link.download = previewFile?.name || 'spreadsheet.xlsx'
                    link.click()
                  }}
                  className="bg-trust-blue hover:bg-deep-blue text-white"
                >
                  Download Excel
                </Button>
              </div>
            ) : previewFile?.type === 'Word' ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-6xl">📄</div>
                <p className="text-sm text-muted-foreground">{previewFile?.name}</p>
                <p className="text-xs text-muted-foreground mb-4">Word documents are best viewed in your document editor</p>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewUrl
                    link.download = previewFile?.name || 'document.docx'
                    link.click()
                  }}
                  className="bg-trust-blue hover:bg-deep-blue text-white"
                >
                  Download Word
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <QuickEnrollModal
        open={isQuickEnrollOpen}
        onOpenChange={setIsQuickEnrollOpen}
        onEnroll={(fullName) => {
          setEnrolledWorkers((prev) => [...prev, { full_name: fullName, id: Date.now() }])
          setIsQuickEnrollOpen(false)
        }}
      />
    </>
  )
}
