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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Trash2, X, ArrowRight } from "lucide-react"
const jewelleryDepartments = [
  { value: "design", label: "Design / CAD" },
  { value: "3d-print", label: "3D Print" },
  { value: "mold-die", label: "Mold Die" },
  { value: "wax-pieces", label: "Wax Pieces" },
  { value: "wax-setting", label: "Wax Setting" },
  { value: "casting", label: "Casting" },
  { value: "filing", label: "Filing / Grinding" },
  { value: "pre-polish", label: "Pre-Polish" },
  { value: "hand-setting", label: "Hand Setting" },
  { value: "polishing", label: "Polishing" },
  { value: "plating", label: "Plating" },
  { value: "final-qc", label: "Final Quality Check" },
  { value: "hallmarking", label: "Hallmarking" },
  { value: "laser-soldering", label: "Laser Soldering" },
  { value: "final-packaging", label: "Final Packaging" },
]

export function ReceiveJobModal({ open, onOpenChange, onJobReceived, voucherData }) {
  const [issueDate, setIssueDate] = useState("")
  const [voucherNo, setVoucherNo] = useState("")
  const [issuedTo, setIssuedTo] = useState("")
  const [workType, setWorkType] = useState("")
  const [deptFrom, setDeptFrom] = useState("")
  const [deptTo, setDeptTo] = useState("")
  const [issuedByName, setIssuedByName] = useState("")
  const [issuedByContact, setIssuedByContact] = useState("")
  const [receivedByName, setReceivedByName] = useState("")
  const [receivedByContact, setReceivedByContact] = useState("")
  const [ratingScore, setRatingScore] = useState(5)
  const [noteForReissue, setNoteForReissue] = useState("")
  const [rows, setRows] = useState([
    { id: 1, sku: "", category: "", metal: "", issuedQty: "", unit1: "Pcs", issuedWeight: "", unit2: "Kg", receivedQty: "", receivedWeight: "", lossQty: "", lossWeight: "", reissueQty: "", reissueWeight: "" },
  ])

  // Pre-populate form with voucher data when it's selected
  useEffect(() => {
    if (voucherData && open) {
      setVoucherNo(voucherData.voucherNo || "")
      // Handle both master job sheet format (firstName) and managers dashboard format (name)
      setIssuedTo(voucherData.firstName || voucherData.name || "")
      setWorkType(voucherData.type || "")
      setDeptFrom(voucherData.department || "")
      setDeptTo(voucherData.deptTo || "")
      // Initialize rows with issued quantities if available
      // Handle both formats: master job sheet (issuedQty/issuedWeight) and managers dashboard (qty/weight)
      if (voucherData.issuedQty || voucherData.issuedWeight || voucherData.qty || voucherData.weight) {
        setRows([
          {
            id: 1,
            sku: voucherData.sku || "",
            category: voucherData.category || "",
            issuedQty: voucherData.issuedQty || voucherData.qty || "",
            unit1: "Pcs",
            issuedWeight: voucherData.issuedWeight || voucherData.weight || "",
            unit2: "Kg",
            receivedQty: voucherData.receivedQty || "",
            receivedWeight: voucherData.receivedWeight || "",
            lossQty: voucherData.lossQty || "",
            lossWeight: voucherData.lossWeight || "",
            reissueQty: voucherData.reIssueQty || "",
            reissueWeight: voucherData.reIssueWeight || "",
          },
        ])
      }
    }
  }, [voucherData, open])

  const addRow = () => {
    const newRow = {
      id: Math.max(...rows.map(r => r.id), 0) + 1,
      sku: "",
      category: "",
      metal: "",
      issuedQty: "",
      unit1: "Pcs",
      issuedWeight: "",
      unit2: "Kg",
      receivedQty: "",
      receivedWeight: "",
      lossQty: "",
      lossWeight: "",
      reissueQty: "",
      reissueWeight: "",
    }
    setRows([...rows, newRow])
  }

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const deleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id))
  }

  const handleSubmit = () => {
    onJobReceived({
      issueDate,
      voucherNo,
      receivedBy: receivedByName,
      receivedContact: receivedByContact,
      ratingScore,
      noteForReissue,
      rows,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Receive Job Voucher</DialogTitle>
        <div className="relative">
          {/* Close button */}
          <div className="flex justify-end px-5 pt-3 pb-0">
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 pb-4 flex flex-col gap-2.5">
          {/* Header: Issue Date, Voucher Type, Voucher No. */}
          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Issue Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="pl-7 h-7 text-sm bg-background border-border"
                />
              </div>
            </div>
            <div className="flex items-end gap-6">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher Type</Label>
                <Select defaultValue="New">
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                <Input
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  placeholder="JW-2026-XXXX"
                  className="h-7 text-sm bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Issued To Section */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(200px,260px)_1fr_minmax(200px,240px)] gap-5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Issued To</Label>
                <Select value={issuedTo} onValueChange={setIssuedTo}>
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Existing Workforce / Vendor">Existing Workforce / Vendor</SelectItem>
                    <SelectItem value="New Workforce / Vendor">New Workforce / Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center text-sm text-muted-foreground px-6">—</div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Work Type</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
                    <SelectValue placeholder="Select" />
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

          {/* Department Transfer */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(200px,260px)_1fr_minmax(200px,260px)] gap-5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">From</Label>
                <Select value={deptFrom} onValueChange={setDeptFrom}>
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelleryDepartments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center h-7 px-3">
                <ArrowRight className="h-5 w-8 text-trust-blue" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">To</Label>
                <Select value={deptTo} onValueChange={setDeptTo}>
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
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

          {/* Issued By Section */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(220px,320px)_1fr_minmax(220px,320px)] gap-4">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Issued By</Label>
                <Input placeholder="User Name" value={issuedByName} onChange={(e) => setIssuedByName(e.target.value)} className="h-7 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text" />
              </div>
              <div className="hidden md:block" />
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="Contact Number" value={issuedByContact} onChange={(e) => setIssuedByContact(e.target.value)} className="h-7 text-sm bg-background border-border" />
              </div>
            </div>
          </div>

          {/* SKU Table with all 18 columns */}
          <div className="rounded-md overflow-hidden border border-border text-sm">
            <div className="w-full scale-[1.0] origin-top-left">
              <div className="grid gap-0 bg-trust-blue text-white font-bold uppercase tracking-wider px-1 text-center" style={{ gridTemplateColumns: "0.45fr 0.75fr 0.84fr 0.34fr 0.34fr 0.52fr 0.34fr 0.36fr 0.34fr 0.36fr 0.34fr 0.5fr 0.34fr 0.5fr 0.34fr 0.5fr 0.34fr 0.5fr 0.34fr 24px" }}>
                <div className="py-1">SKU</div>
                <div className="py-1">Category</div>
                <div className="py-1">Metal</div>
                <div className="py-1 leading-tight bg-blue-700/25 border-l-2 border-white/40"><span>Issued</span><span className="block">Qty</span></div>
                <div className="py-1 bg-blue-700/25"></div>
                <div className="py-1 leading-tight bg-blue-700/25"><span>Issued</span><span className="block">WT</span></div>
                <div className="py-1 bg-blue-700/25"></div>
                <div className="py-1 leading-tight bg-emerald-700/25 border-l-2 border-white/40"><span>Received</span><span className="block">Qty</span></div>
                <div className="py-1 bg-emerald-700/25"></div>
                <div className="py-1 leading-tight bg-emerald-700/25"><span>Received</span><span className="block">WT</span></div>
                <div className="py-1 bg-emerald-700/25"></div>
                <div className="py-1 leading-tight bg-rose-700/25 border-l-2 border-white/40"><span>Loss</span><span className="block">Qty</span></div>
                <div className="py-1 bg-rose-700/25"></div>
                <div className="py-1 leading-tight bg-rose-700/25"><span>Loss</span><span className="block">WT</span></div>
                <div className="py-1 bg-rose-700/25"></div>
                <div className="py-1 leading-tight bg-amber-700/25 border-l-2 border-white/40"><span>Re-Issue</span><span className="block">Qty</span></div>
                <div className="py-1 bg-amber-700/25"></div>
                <div className="py-1 leading-tight bg-amber-700/25"><span>Re-Issue</span><span className="block">WT</span></div>
                <div className="py-1 bg-amber-700/25"></div>
                <div className="py-1"></div>
              </div>
              {rows.map((row, i) => (
                <div key={row.id} className="grid gap-0 border-t border-border items-center px-1 bg-white" style={{ gridTemplateColumns: "0.6fr 0.65fr 0.65fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 0.48fr 0.32fr 24px" }}>
                  <div className="py-0.5">
                    <Input className="h-6 text-sm border-border" placeholder="SKU" value={row.sku} onChange={(e) => updateRow(row.id, "sku", e.target.value)} />
                  </div>
                  <div className="py-0.5">
                    <Input className="h-6 text-sm border-border" placeholder="Cat" value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} />
                  </div>
                  <div className="py-0.5">
                    <Input className="h-6 text-sm border-border" placeholder="Metal" value={row.metal} onChange={(e) => updateRow(row.id, "metal", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-blue-50/40 border-l-2 border-l-blue-200">
                    <Input className="h-6 text-sm border-border" type="number" placeholder="0" value={row.issuedQty} onChange={(e) => updateRow(row.id, "issuedQty", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-blue-50/40">
                    <Select value={row.unit1} onValueChange={(v) => updateRow(row.id, "unit1", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Pairs">Pairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-blue-50/40">
                    <Input className="h-6 text-sm border-border" placeholder="0.00" value={row.issuedWeight} onChange={(e) => updateRow(row.id, "issuedWeight", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-blue-50/40">
                    <Select value={row.unit2} onValueChange={(v) => updateRow(row.id, "unit2", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ct">ct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-emerald-50/40 border-l-2 border-l-emerald-200">
                    <Input className="h-6 text-sm border-border" placeholder="0" value={row.receivedQty} onChange={(e) => updateRow(row.id, "receivedQty", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-emerald-50/40">
                    <Select value={row.unit3 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit3", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Pairs">Pairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-emerald-50/40">
                    <Input className="h-6 text-sm border-border" placeholder="0.00" value={row.receivedWeight} onChange={(e) => updateRow(row.id, "receivedWeight", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-emerald-50/40">
                    <Select value={row.unit4 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit4", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ct">ct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-rose-50/45 border-l-2 border-l-rose-200">
                    <Input className="h-6 text-sm border-border" placeholder="0" value={row.lossQty} onChange={(e) => updateRow(row.id, "lossQty", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-rose-50/45">
                    <Select value={row.unit5 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit5", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Pairs">Pairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-rose-50/45">
                    <Input className="h-6 text-sm border-border" placeholder="0.00" value={row.lossWeight} onChange={(e) => updateRow(row.id, "lossWeight", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-rose-50/45">
                    <Select value={row.unit6 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit6", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ct">ct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-amber-50/45 border-l-2 border-l-amber-200">
                    <Input className="h-6 text-sm border-border" placeholder="0" value={row.reissueQty} onChange={(e) => updateRow(row.id, "reissueQty", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-amber-50/45">
                    <Select value={row.unit7 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit7", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Pairs">Pairs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="py-0.5 bg-amber-50/45">
                    <Input className="h-6 text-sm border-border" placeholder="0.00" value={row.reissueWeight} onChange={(e) => updateRow(row.id, "reissueWeight", e.target.value)} />
                  </div>
                  <div className="py-0.5 bg-amber-50/45">
                    <Select value={row.unit8 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit8", v)}>
                      <SelectTrigger className="h-6 text-sm border-border p-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ct">ct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-center">
                    <button type="button" onClick={() => deleteRow(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t border-border bg-background">
                <button type="button" className="w-full py-1 text-trust-blue hover:text-deep-blue text-sm font-semibold transition-colors" onClick={addRow}>
                  + Add Row
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button className="h-7 bg-success hover:bg-success text-white font-bold text-sm rounded">
              Update Inventory
            </Button>
            <Button className="h-7 bg-warning hover:bg-warning/90 text-white font-bold text-sm rounded">
              Partial Update
            </Button>
            <Button className="h-7 bg-warning hover:bg-warning/90 text-white font-bold text-sm rounded">
              Re-Issue for Improvement
            </Button>
          </div>

          {/* Received By, Contact, and Rate Workmanship - Single Row */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(220px,320px)_minmax(220px,320px)_minmax(180px,220px)] gap-4 items-end justify-start">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Received By</Label>
                <Input placeholder="User Name" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className="h-7 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="Contact Number" value={receivedByContact} onChange={(e) => setReceivedByContact(e.target.value)} className="h-7 text-sm bg-background border-border" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Rate Workmanship</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setRatingScore(num)}
                      className={`h-6 w-6 rounded-full border text-sm font-semibold transition-colors ${
                        ratingScore >= num
                          ? "border-warning bg-warning text-white"
                          : "border-warning text-warning"
                      }`}
                      title={`Rating ${num}`}
                      type="button"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Note For Reissue Voucher */}
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Note For Reissue Voucher</Label>
            <Textarea
              value={noteForReissue}
              onChange={(e) => setNoteForReissue(e.target.value)}
              placeholder="Enter notes..."
              className="min-h-[35px] text-sm resize-none bg-background border-border p-1.5"
            />
          </div>

        </div>
      </div>
      </DialogContent>
    </Dialog>
  )
}
