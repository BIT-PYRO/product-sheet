"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuickEnrollModal } from "@/components/quick-enroll-modal"
import { PrintVoucherModal } from "@/components/print-voucher-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Plus, Trash2, X, ArrowRight, FileText } from "lucide-react"
import { useDrafts, useDraftLoader } from "@/components/drafts-manager"

function generateVoucherNo() {
  if (typeof window === 'undefined') return 'JJ-01'
  // Get current counter from localStorage or start at 1
  const currentCount = parseInt(localStorage.getItem('jj_counter') || '0') + 1
  // Save next counter value
  localStorage.setItem('jj_counter', currentCount.toString())
  // Return formatted voucher number JJ-01, JJ-02, etc.
  return `JJ-${String(currentCount).padStart(2, '0')}`
}

export function CreateJobModal({ open, onOpenChange, onQuickEnroll, onJobCreated }) {
  const { saveDraft } = useDrafts()
  const loadedDraft = useDraftLoader()
  const [isQuickEnrollModalOpen, setIsQuickEnrollModalOpen] = useState(false)
  const [isPrintVoucherModalOpen, setIsPrintVoucherModalOpen] = useState(false)
  const [printVoucherData, setPrintVoucherData] = useState(null)
  const [activeTab, setActiveTab] = useState("stone")
  const [enrolledPeople, setEnrolledPeople] = useState([])
  const [rows, setRows] = useState([
    { id: 1, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
    { id: 2, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
    { id: 3, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
  ])
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [scheduleFuture, setScheduleFuture] = useState("")
  const [voucherType, setVoucherType] = useState("New")
  const [voucherNo, setVoucherNo] = useState('JJ-01')
  const [issuedTo, setIssuedTo] = useState("Existing Workforce / Vendor")
  const [workType, setWorkType] = useState("In-House")
  const [deptFrom, setDeptFrom] = useState("")
  const [deptTo, setDeptTo] = useState("")
  const [noteByIssuer, setNoteByIssuer] = useState("")
  const [issuedByName, setIssuedByName] = useState("")
  const [issuedByContact, setIssuedByContact] = useState("")
  const [stoneRows, setStoneRows] = useState([
    { id: 1, name: "", cut: "", color: "", size: "", quantity: "" },
  ])
  const [dieWeightRows, setDieWeightRows] = useState([
    { id: 1, dieNumber: "", quantity: "", weight: "", unit: "" },
  ])

  async function loadWorkforceMembers() {
    try {
      const response = await fetch('/api/workforce', { cache: 'no-store' })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        return
      }
      const rowsData = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
      setEnrolledPeople(rowsData)
    } catch {
      // Keep form usable even if workforce list fails.
    }
  }

  // Generate voucher number on client mount (localStorage is not available on server)
  useEffect(() => {
    setVoucherNo(generateVoucherNo())
  }, [])

  // Refresh enrolled people from backend when modal opens
  useEffect(() => {
    if (open) {
      loadWorkforceMembers()
    }
  }, [open])

  // Handle draft loading
  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Create Job') {
      const draft = loadedDraft.data
      // Restore all form fields from draft
      if (draft.date) setDate(draft.date)
      if (draft.issuedTo) setIssuedTo(draft.issuedTo)
      if (draft.deptFrom) setDeptFrom(draft.deptFrom)
      if (draft.deptTo) setDeptTo(draft.deptTo)
      if (draft.rows) setRows(draft.rows)
      if (draft.stoneRows) setStoneRows(draft.stoneRows)
      if (draft.dieWeightRows) setDieWeightRows(draft.dieWeightRows)
      if (draft.voucherType) setVoucherType(draft.voucherType)
      if (draft.workType) setWorkType(draft.workType)
      if (draft.noteByIssuer) setNoteByIssuer(draft.noteByIssuer)
      if (draft.scheduleFuture) setScheduleFuture(draft.scheduleFuture)
      // Open the modal
      onOpenChange(true)
    }
  }, [loadedDraft, onOpenChange])

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: Date.now(), sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
    ])
  }

  function deleteRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function addStoneRow() {
    setStoneRows((prev) => [
      ...prev,
      { id: Date.now(), name: "", cut: "", color: "", size: "", quantity: "" },
    ])
  }

  function deleteStoneRow(id) {
    setStoneRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateStoneRow(id, field, value) {
    setStoneRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function addDieWeightRow() {
    setDieWeightRows((prev) => [
      ...prev,
      { id: Date.now(), dieNumber: "", quantity: "", weight: "", unit: "" },
    ])
  }

  function deleteDieWeightRow(id) {
    setDieWeightRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateDieWeightRow(id, field, value) {
    setDieWeightRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  async function handleEnrollPerson(personName) {
    const normalizedName = String(personName || '').trim()
    if (!normalizedName) {
      return
    }

    try {
      const exists = enrolledPeople.some(
        (entry) => String(entry.full_name || '').toLowerCase() === normalizedName.toLowerCase()
      )

      if (!exists) {
        await fetch('/api/workforce', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: normalizedName,
            phone: '',
            active: true,
          }),
        })
      }

      await loadWorkforceMembers()
      setIssuedTo(normalizedName)
      setIsQuickEnrollModalOpen(false)
    } catch {
      alert('Unable to enroll workforce member right now.')
    }
  }

  async function handleSubmit() {
    const primarySku = String(rows.find((entry) => String(entry.sku || '').trim())?.sku || '').trim()
    if (!primarySku) {
      alert('Please enter at least one SKU row before issuing job.')
      return
    }

    try {
      const productsResponse = await fetch(`/api/products?search=${encodeURIComponent(primarySku)}`, {
        cache: 'no-store',
      })
      const productsResult = await productsResponse.json().catch(() => null)
      const productsData = Array.isArray(productsResult?.data)
        ? productsResult.data
        : (productsResult?.data?.results || [])

      if (!productsResponse.ok || !productsResult?.success || !productsData.length) {
        alert(`No product found for SKU: ${primarySku}. Create the product first.`)
        return
      }

      const selectedProduct =
        productsData.find((item) => String(item.sku || '').toLowerCase() === primarySku.toLowerCase()) ||
        productsData[0]

      const title = `${voucherNo} - ${issuedTo || 'Unassigned'} - ${primarySku}`
      const createResponse = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          product: selectedProduct.id,
          status: 'created',
        }),
      })

      const createResult = await createResponse.json().catch(() => null)
      if (!createResponse.ok || !createResult?.success) {
        const message = createResult?.error?.message || createResult?.message || 'Unable to create job.'
        alert(message)
        return
      }

      const createdJob = createResult?.data || null
      const jobData = { date, issuedTo, deptFrom, deptTo, rows, voucherNo, createdJob }
      setPrintVoucherData(jobData)
      setIsPrintVoucherModalOpen(true)
      if (onJobCreated) {
        onJobCreated(createdJob)
      }
    } catch {
      alert('Unable to create job right now. Please try again.')
    }
  }

  function handleSaveDraft() {
    const draftData = {
      date,
      issuedTo,
      deptFrom,
      deptTo,
      rows,
      stoneRows,
      dieWeightRows,
      voucherNo,
      workType,
      noteByIssuer,
      scheduleFuture,
      voucherType,
      title: `Job ${voucherNo} - ${new Date(date).toLocaleDateString()}`,
    }
    saveDraft('Create Job', `draft_${voucherNo}`, draftData)
    // Show toast notification
    if (typeof window !== 'undefined') {
      alert('Draft saved successfully!')
    }
    onOpenChange(false)
  }

  const jewelleryDepartments = [
    { value: "design", label: "Design / CAD" },
    { value: "wax-moulding", label: "Wax Moulding" },
    { value: "casting", label: "Casting" },
    { value: "filing", label: "Filing / Grinding" },
    { value: "setting", label: "Stone Setting" },
    { value: "polishing", label: "Polishing" },
    { value: "rhodium", label: "Rhodium / Plating" },
    { value: "qc", label: "Quality Check" },
    { value: "hallmarking", label: "Hallmarking" },
    { value: "packaging", label: "Packaging" },
    { value: "store", label: "Store / Vault" },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[700px] w-[95vw] max-h-[92vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Create Job Modal</DialogTitle>
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
          {/* Row 1: DATE & SCHEDULE on LEFT | VOUCHER TYPE & NO. on RIGHT */}
          <div className="flex justify-between gap-2">
            {/* LEFT: DATE & SCHEDULE */}
            <div className="flex gap-2">
              {/* DATE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Date</Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-1 h-8 py-1 text-sm bg-background border-border !w-fit max-w-[130px]"
                  />
                </div>
              </div>

              {/* SCHEDULE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Schedule</Label>
                <Input
                  type="date"
                  value={scheduleFuture}
                  onChange={(e) => setScheduleFuture(e.target.value)}
                  className="h-8 pl-1 py-1 text-sm bg-background border-border !w-fit max-w-[130px]"
                />
              </div>
            </div>

            {/* RIGHT: TYPE & VOUCHER NO. */}
            <div className="flex gap-2">
              {/* TYPE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
                <Select value={voucherType} onValueChange={setVoucherType}>
                  <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* VOUCHER NO. */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                <Input
                  value={voucherNo}
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
                    {enrolledPeople.map((person) => (
                      <SelectItem key={person.id} value={person.full_name}>
                        {person.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEnrollModalOpen(true)}
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
                    <SelectItem value="In-House">In-House</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Job Work">Job Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* DEPARTMENT TRANSFER */}
          <div className="border border-border rounded-md px-2.5 py-1.5">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">From</Label>
                <Select value={deptFrom} onValueChange={setDeptFrom}>
                  <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelleryDepartments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center h-8 px-2">
                <ArrowRight className="h-4 w-6 text-trust-blue" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">To</Label>
                <Select value={deptTo} onValueChange={setDeptTo}>
                  <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelleryDepartments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SKU Table */}
          <div className="rounded-md overflow-hidden border border-border">
            {/* Table Header - blue */}
            <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
              <div className="px-1.5 py-2">SKU</div>
              <div className="px-1.5 py-2">Category</div>
              <div className="px-1.5 py-2">Metal</div>
              <div className="px-1.5 py-2">Qty</div>
              <div className="px-1.5 py-2"></div>
              <div className="px-1.5 py-2">Weight</div>
              <div className="px-1.5 py-2"></div>
              <div className="px-1.5 py-2"></div>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 border-t border-border items-center bg-background"
              >
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" placeholder="SKU" value={row.sku} onChange={(e) => updateRow(row.id, "sku", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" placeholder="Category" value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-xs bg-background border-border" placeholder="Metal" value={row.metal} onChange={(e) => updateRow(row.id, "metal", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-xs bg-background border-border" type="number" placeholder="0" value={row.issuedQty} onChange={(e) => updateRow(row.id, "issuedQty", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Select value={row.unit1} onValueChange={(v) => updateRow(row.id, "unit1", v)}>
                    <SelectTrigger className="h-6 text-sm bg-background border-border p-0.5 focus:ring-0 focus:outline-none"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" placeholder="0" value={row.issuedWeight} onChange={(e) => updateRow(row.id, "issuedWeight", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Select value={row.unit2} onValueChange={(v) => updateRow(row.id, "unit2", v)}>
                    <SelectTrigger className="h-6 text-sm bg-background border-border p-0.5 focus:ring-0 focus:outline-none"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-center">
                  <button type="button" onClick={() => deleteRow(row.id)} className="text-danger hover:text-danger-dark transition-colors" aria-label="Delete row">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {/* Totals Rows by Unit */}
            {(() => {
              const qtyByUnit = {}
              const weightByUnit = {}
              
              rows.forEach((row) => {
                if (row.issuedQty) {
                  const unit = row.unit1
                  qtyByUnit[unit] = (qtyByUnit[unit] || 0) + parseFloat(row.issuedQty)
                }
                if (row.issuedWeight) {
                  const unit = row.unit2
                  weightByUnit[unit] = (weightByUnit[unit] || 0) + parseFloat(row.issuedWeight)
                }
              })
              
              const qtyUnits = Object.keys(qtyByUnit)
              const weightUnits = Object.keys(weightByUnit)
              const allUnits = [...new Set([...qtyUnits, ...weightUnits])]
              
              return allUnits.map((unit, idx) => (
                <div key={`total-${unit}`} className="grid grid-cols-[1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 border-t border-border items-center bg-trust-blue/10">
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-bold text-foreground">{idx === 0 ? "Total" : ""}</div>
                  </div>
                  <div className="px-1.5 py-0.5"></div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-bold text-foreground">{qtyByUnit[unit] ? qtyByUnit[unit].toFixed(2) : "-"}</div>
                  </div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-semibold text-foreground">{qtyByUnit[unit] ? unit : ""}</div>
                  </div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-bold text-foreground">{weightByUnit[unit] ? weightByUnit[unit].toFixed(2) : "-"}</div>
                  </div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-semibold text-foreground">{weightByUnit[unit] ? unit : ""}</div>
                  </div>
                  <div className="px-1.5 py-0.5"></div>
                </div>
              ))
            })()}
            <div className="border-t border-border bg-background flex gap-2">
              <button type="button" className="flex-1 py-1 text-trust-blue hover:text-deep-blue text-sm font-semibold transition-colors" onClick={addRow}>
                + Add Row
              </button>
              <button type="button" className="flex-1 py-1 text-trust-blue hover:text-deep-blue text-sm font-semibold transition-colors border-l border-border" disabled>
                + Add Column
              </button>
            </div>
          </div>

          {/* STONE & FINDINGS TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-trust-blue/10">
              <TabsTrigger value="stone" className="text-sm font-semibold">Stone</TabsTrigger>
              <TabsTrigger value="die" className="text-sm font-semibold">Findings</TabsTrigger>
            </TabsList>

            {/* STONE AND FINDINGS TAB */}
            <TabsContent value="stone" className="mt-2">
              <div className="flex flex-col gap-1">
                <div className="rounded-md overflow-hidden border border-border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_32px] gap-0 bg-trust-blue text-white text-[9px] font-bold uppercase tracking-wider">
                    <div className="px-1.5 py-2">Name</div>
                    <div className="px-1.5 py-2">Cut</div>
                    <div className="px-1.5 py-2">Color</div>
                    <div className="px-1.5 py-2">Size</div>
                    <div className="px-1.5 py-2">Qty</div>
                    <div className="px-1.5 py-2"></div>
                  </div>
                  {stoneRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_32px] gap-0 border-t border-border items-center bg-background"
                    >
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Stone name" value={row.name} onChange={(e) => updateStoneRow(row.id, "name", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Cut" value={row.cut} onChange={(e) => updateStoneRow(row.id, "cut", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Color" value={row.color} onChange={(e) => updateStoneRow(row.id, "color", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Size" value={row.size} onChange={(e) => updateStoneRow(row.id, "size", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                      <Input className="h-6 text-sm bg-background border-border" type="number" placeholder="0" value={row.quantity} onChange={(e) => updateStoneRow(row.id, "quantity", e.target.value)} />
                      </div>
                      <div className="flex items-center justify-center">
                        <button type="button" onClick={() => deleteStoneRow(row.id)} className="text-danger hover:text-danger-dark transition-colors" aria-label="Delete row">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border bg-background">
                    <button type="button" onClick={addStoneRow} className="w-full py-0.5 text-trust-blue hover:text-deep-blue text-sm font-semibold transition-colors">
                      + Add Row
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* DIE NUMBER/WEIGHT TAB */}
            <TabsContent value="die" className="mt-2">
              <div className="flex flex-col gap-1">
                <div className="rounded-md overflow-hidden border border-border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-0 bg-trust-blue text-white text-[9px] font-bold uppercase tracking-wider">
                    <div className="px-1.5 py-2">Die Number</div>
                    <div className="px-1.5 py-2">Qty</div>
                    <div className="px-1.5 py-2">Weight</div>
                    <div className="px-1.5 py-2">Unit</div>
                    <div className="px-1.5 py-2"></div>
                  </div>
                  {dieWeightRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-0 border-t border-border items-center bg-background"
                    >
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Die Number" value={row.dieNumber} onChange={(e) => updateDieWeightRow(row.id, "dieNumber", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" type="number" placeholder="0" value={row.quantity} onChange={(e) => updateDieWeightRow(row.id, "quantity", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" type="number" step="0.01" placeholder="0" value={row.weight} onChange={(e) => updateDieWeightRow(row.id, "weight", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Select value={row.unit} onValueChange={(value) => updateDieWeightRow(row.id, "unit", value)}>
                          <SelectTrigger className="h-6 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-center">
                        <button type="button" onClick={() => deleteDieWeightRow(row.id)} className="text-danger hover:text-danger-dark transition-colors" aria-label="Delete row">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border bg-background">
                    <button type="button" onClick={addDieWeightRow} className="w-full py-0.5 text-trust-blue hover:text-deep-blue text-sm font-semibold transition-colors">
                      + Add Row
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ISSUED BY */}
          <div className="border border-border rounded-md px-2.5 py-1.5">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Issued By</Label>
                <Input placeholder="Enter your name" value={issuedByName} onChange={(e) => setIssuedByName(e.target.value)} className="h-8 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text" />
              </div>
              <div className="hidden md:block" />
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="+91 XXXXX XXXXX" value={issuedByContact} onChange={(e) => setIssuedByContact(e.target.value)} className="h-8 text-sm bg-background border-border" />
              </div>
            </div>
          </div>

          {/* ADD NOTE */}
          <div className="border border-border rounded-md px-2.5 py-1.5">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium text-muted-foreground">Add Note</Label>
              <Textarea
                value={noteByIssuer}
                onChange={(e) => setNoteByIssuer(e.target.value)}
                placeholder="Enter notes..."
                className="min-h-[32px] max-h-[32px] resize-none text-sm bg-background border-border p-1"
              />
            </div>
          </div>

          {/* Buttons Container */}
          <div className="flex gap-2 mt-0.5 mb-1.5">
            <Button
              className="flex-1 h-7 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded"
              onClick={handleSaveDraft}
            >
              Save as Draft
            </Button>
            <Button
              className="flex-1 h-7 bg-success hover:bg-success text-white font-bold text-sm rounded"
              onClick={handleSubmit}
            >
              Issue Job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <QuickEnrollModal 
      open={isQuickEnrollModalOpen}
      onOpenChange={setIsQuickEnrollModalOpen}
      onEnroll={handleEnrollPerson}
    />

    <PrintVoucherModal
      open={isPrintVoucherModalOpen}
      onOpenChange={setIsPrintVoucherModalOpen}
      data={printVoucherData}
      onEdit={() => {
        // Handle edit action if needed
        setIsPrintVoucherModalOpen(false)
      }}
      onOpenReceiveModal={() => {
        // Handle receive modal action if needed
      }}
    />
    </>
  )
}
