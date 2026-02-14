"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { QuickEnrollModal } from "@/components/quick-enroll-modal"
import { PrintVoucherModal } from "@/components/print-voucher-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Plus, Trash2, X, ArrowRight } from "lucide-react"

function generateVoucherNo() {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
  return `JW-${year}-${num}`
}

export function CreateJobModal({ open, onOpenChange, onQuickEnroll, onJobCreated }) {
  const [isQuickEnrollModalOpen, setIsQuickEnrollModalOpen] = useState(false)
  const [isPrintVoucherModalOpen, setIsPrintVoucherModalOpen] = useState(false)
  const [printVoucherData, setPrintVoucherData] = useState(null)
  const [rows, setRows] = useState([
    { id: 1, sku: "SKU-001", category: "Category", issuedQty: "0", unit1: "Pcs", issuedWeight: "0.00", unit2: "Kg" },
    { id: 2, sku: "SKU-001", category: "Category", issuedQty: "0", unit1: "Pcs", issuedWeight: "0.00", unit2: "Kg" },
    { id: 3, sku: "SKU-001", category: "Category", issuedQty: "0", unit1: "Pcs", issuedWeight: "0.00", unit2: "Kg" },
  ])
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [scheduleFuture, setScheduleFuture] = useState("")
  const [voucherType, setVoucherType] = useState("New")
  const [voucherNo] = useState(generateVoucherNo)
  const [issuedTo, setIssuedTo] = useState("Existing Workforce / Vendor")
  const [workType, setWorkType] = useState("In-House")
  const [deptFrom, setDeptFrom] = useState("")
  const [deptTo, setDeptTo] = useState("")
  const [noteByIssuer, setNoteByIssuer] = useState("")
  const [issuedByName, setIssuedByName] = useState("")
  const [issuedByContact, setIssuedByContact] = useState("")

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: Date.now(), sku: "SKU-001", category: "Category", issuedQty: "0", unit1: "Pcs", issuedWeight: "0.00", unit2: "Kg" },
    ])
  }

  function deleteRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function handleSubmit() {
    const jobData = { date, issuedTo, deptFrom, deptTo, rows, voucherNo }
    setPrintVoucherData(jobData)
    setIsPrintVoucherModalOpen(true)
    onJobCreated(jobData)
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
        <DialogContent className="max-w-[700px] w-[95vw] max-h-[95vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Create Job Modal</DialogTitle>
        {/* Close button only, no title */}
        <div className="flex justify-end px-5 pt-0 pb-0">
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-2 flex flex-col gap-2.5">
          {/* Row 1: DATE & SCHEDULE on LEFT | VOUCHER TYPE & NO. on RIGHT */}
          <div className="flex justify-between gap-3">
            {/* LEFT: DATE & SCHEDULE */}
            <div className="flex gap-3">
              {/* DATE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Date</Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-1 h-8 py-1 text-xs bg-background border-border !w-fit max-w-[130px]"
                  />
                </div>
              </div>

              {/* SCHEDULE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Schedule</Label>
                <Input
                  type="date"
                  value={scheduleFuture}
                  onChange={(e) => setScheduleFuture(e.target.value)}
                  className="h-8 pl-1 py-1 text-xs bg-background border-border !w-fit max-w-[13                  git push origin master                  git log --oneline -50px]"
                />
              </div>
            </div>

            {/* RIGHT: TYPE & VOUCHER NO. */}
            <div className="flex gap-3">
              {/* TYPE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
                <Select value={voucherType} onValueChange={setVoucherType}>
                  <SelectTrigger className="h-8 px-2 py-1 text-xs bg-background border-border">
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
                <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                <Input
                  value={voucherNo}
                  readOnly
                  className="h-8 px-2 py-1 text-xs bg-muted border-border font-semibold text-foreground !w-fit max-w-[120px]"
                />
              </div>
            </div>
          </div>

          {/* ISSUED TO */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Issued To</Label>
                <Select value={issuedTo} onValueChange={setIssuedTo}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Existing Workforce / Vendor">Existing Workforce / Vendor</SelectItem>
                    <SelectItem value="New Workforce / Vendor">New Workforce / Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEnrollModalOpen(true)}
                className="h-9 px-12 border-2 border-dashed border-blue-500 text-blue-600 rounded font-semibold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Enroll
              </button>
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Work Type</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
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
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">From</Label>
                <Select value={deptFrom} onValueChange={setDeptFrom}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelleryDepartments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center h-9 px-3">
                <ArrowRight className="h-5 w-8 text-blue-600" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">To</Label>
                <Select value={deptTo} onValueChange={setDeptTo}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
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
            <div className="grid grid-cols-[1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
              <div className="px-2 py-1.5">SKU</div>
              <div className="px-2 py-1.5">Category</div>
              <div className="px-2 py-1.5">Qty</div>
              <div className="px-2 py-1.5"></div>
              <div className="px-2 py-1.5">Weight</div>
              <div className="px-2 py-1.5"></div>
              <div className="px-2 py-1.5"></div>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 border-t border-border items-center bg-background"
              >
                <div className="px-1 py-1">
                  <Input className="h-6 text-xs bg-background border-border" placeholder="SKU-001" value={row.sku} onChange={(e) => updateRow(row.id, "sku", e.target.value)} />
                </div>
                <div className="px-1 py-1">
                  <Input className="h-6 text-xs bg-background border-border" placeholder="Category" value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} />
                </div>
                <div className="px-1 py-1">
                  <Input className="h-6 text-xs bg-background border-border" type="number" placeholder="0" value={row.issuedQty} onChange={(e) => updateRow(row.id, "issuedQty", e.target.value)} />
                </div>
                <div className="px-1 py-1">
                  <Select value={row.unit1} onValueChange={(v) => updateRow(row.id, "unit1", v)}>
                    <SelectTrigger className="h-6 text-[10px] bg-background border-border p-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Grams">Grams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-1 py-1">
                  <Input className="h-6 text-xs bg-background border-border" placeholder="0.00" value={row.issuedWeight} onChange={(e) => updateRow(row.id, "issuedWeight", e.target.value)} />
                </div>
                <div className="px-1 py-1">
                  <Select value={row.unit2} onValueChange={(v) => updateRow(row.id, "unit2", v)}>
                    <SelectTrigger className="h-6 text-[10px] bg-background border-border p-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Grams">Grams</SelectItem>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-center">
                  <button type="button" onClick={() => deleteRow(row.id)} className="text-red-500 hover:text-red-700 transition-colors" aria-label="Delete row">
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
                <div key={`total-${unit}`} className="grid grid-cols-[1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 border-t border-border items-center bg-blue-50">
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-bold text-foreground">{idx === 0 ? "Total" : ""}</div>
                  </div>
                  <div className="px-2 py-1.5"></div>
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-bold text-foreground">{qtyByUnit[unit] ? qtyByUnit[unit].toFixed(2) : "-"}</div>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold text-foreground">{qtyByUnit[unit] ? unit : ""}</div>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-bold text-foreground">{weightByUnit[unit] ? weightByUnit[unit].toFixed(2) : "-"}</div>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold text-foreground">{weightByUnit[unit] ? unit : ""}</div>
                  </div>
                  <div className="px-2 py-1.5"></div>
                </div>
              ))
            })()}
            <div className="border-t border-border bg-background flex gap-2">
              <button type="button" className="flex-1 py-1 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-colors" onClick={addRow}>
                + Add Row
              </button>
              <button type="button" className="flex-1 py-1 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-colors border-l border-border" disabled>
                + Add Column
              </button>
            </div>
          </div>

          {/* ISSUED BY */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Issued By</Label>
                <Input placeholder="Enter your name" value={issuedByName} onChange={(e) => setIssuedByName(e.target.value)} className="h-9 text-xs bg-background border-border focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text" />
              </div>
              <div className="hidden md:block" />
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="+91 XXXXX XXXXX" value={issuedByContact} onChange={(e) => setIssuedByContact(e.target.value)} className="h-9 text-xs bg-background border-border" />
              </div>
            </div>
          </div>

          {/* NOTE BY ISSUER */}
          <div className="flex flex-col gap-0.5">
            <Label className="text-[10px] font-bold uppercase tracking-wide text-foreground">Note by Issuer</Label>
            <Textarea
              value={noteByIssuer}
              onChange={(e) => setNoteByIssuer(e.target.value)}
              placeholder="Enter notes..."
              className="min-h-[35px] resize-none text-xs bg-background border-border p-1.5"
            />
          </div>

          {/* Issue Job Button */}
          <Button
            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded"
            onClick={handleSubmit}
          >
            Issue Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    <QuickEnrollModal 
      open={isQuickEnrollModalOpen}
      onOpenChange={setIsQuickEnrollModalOpen}
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
