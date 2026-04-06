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
import { CalendarIcon, Trash2, X, ArrowRight, Printer } from "lucide-react"
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
  // API state
  const [workforce, setWorkforce] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitWarnings, setSubmitWarnings] = useState([])

  // Pre-populate form with voucher data when it's selected
  useEffect(() => {
    if (voucherData && open) {
      setVoucherNo(voucherData.voucherNo || "")
      setIssuedTo(voucherData.name || voucherData.firstName || "")
      setWorkType(voucherData.workType || voucherData.type || "")
      setDeptFrom(voucherData.deptFrom || voucherData.department || "")
      setDeptTo(voucherData.deptTo || "")
      setSubmitError('')
      setSubmitWarnings([])

      // Populate rows from materialRows (multi-SKU voucher)
      const materialRows = Array.isArray(voucherData.materialRows) ? voucherData.materialRows : []
      if (materialRows.length > 0) {
        setRows(materialRows.map((mr, idx) => ({
          id: idx + 1,
          sku: mr.sku || '',
          category: mr.category || '',
          metal: mr.metal || '',
          issuedQty: mr.issued_qty || mr.issuedQty || '',
          unit1: mr.unit1 || 'Pcs',
          issuedWeight: mr.issued_weight || mr.issuedWeight || '',
          unit2: mr.unit2 || 'Kg',
          receivedQty: '',
          unit3: 'Pcs',
          receivedWeight: '',
          unit4: 'Kg',
          lossQty: '',
          unit5: 'Pcs',
          lossWeight: '',
          unit6: 'Kg',
          reissueQty: '',
          unit7: 'Pcs',
          reissueWeight: '',
          unit8: 'Kg',
        })))
      } else if (voucherData.qty) {
        setRows([{
          id: 1, sku: voucherData.sku || '', category: voucherData.category || '',
          metal: '', issuedQty: String(voucherData.qty || ''), unit1: 'Pcs',
          issuedWeight: String(voucherData.weight || ''), unit2: 'Kg',
          receivedQty: '', unit3: 'Pcs', receivedWeight: '', unit4: 'Kg',
          lossQty: '', unit5: 'Pcs', lossWeight: '', unit6: 'Kg',
          reissueQty: '', unit7: 'Pcs', reissueWeight: '', unit8: 'Kg',
        }])
      }
    }
  }, [voucherData, open])

  // Load workforce members + auto-fill session user when modal opens
  useEffect(() => {
    if (!open) return
    fetch('/api/workforce', { cache: 'no-store' })
      .then(r => r.json())
      .then(result => {
        const members = Array.isArray(result?.data)
          ? result.data
          : (result?.data?.results || [])
        setWorkforce(members)
      })
      .catch(() => {})
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const name = data?.user?.first_name
          ? `${data.user.first_name} ${data.user.last_name || ''}`.trim()
          : (data?.user?.username || '')
        if (name) setIssuedByName(name)
      })
      .catch(() => {})
  }, [open])

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

  async function callReceiveApi(isPartial) {
    const voucherId = voucherData?.id
    if (!voucherId) {
      setSubmitError('No voucher ID found. Please re-open the voucher card.')
      return
    }
    const canReceive = ['in_process', 'partially_complete'].includes(voucherData?.approvalStatus)
    if (!canReceive) {
      setSubmitError(`This voucher cannot be received (status: ${voucherData?.approvalStatus}). Only in-process or partially complete vouchers can be received.`)
      return
    }
    const receivedRows = rows
      .filter(r => String(r.receivedQty || '').trim() !== '')
      .map(r => ({
        sku: r.sku,
        received_qty: parseFloat(r.receivedQty) || 0,
        received_weight: parseFloat(r.receivedWeight) || 0,
        loss_qty: parseFloat(r.lossQty) || 0,
        loss_weight: parseFloat(r.lossWeight) || 0,
        reissue_qty: parseFloat(r.reissueQty) || 0,
      }))
    if (receivedRows.length === 0) {
      setSubmitError('Please fill in at least one Received Qty before submitting.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitWarnings([])
    try {
      const res = await fetch(`/api/jobs/${voucherId}/receive-voucher/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: receivedRows,
          is_partial: isPartial,
          received_by: receivedByName || issuedByName,
          note: noteForReissue,
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok || !result?.success) {
        setSubmitError(result?.error?.message || result?.error?.details || 'Failed to update inventory.')
        return
      }
      if (result?.data?.warnings?.length) {
        setSubmitWarnings(result.data.warnings)
      }
      // Broadcast inventory update so Master Inventory Sheet refreshes
      const syncTs = new Date().toISOString()
      try { localStorage.setItem('inventory_sheet_updated_at', syncTs) } catch {}
      window.dispatchEvent(new CustomEvent('inventory_sheet_sync', { detail: { updatedAt: syncTs } }))
      onJobReceived?.(result.data)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err.message || 'Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateInventory = () => callReceiveApi(false)
  const handlePartialUpdate = () => callReceiveApi(true)

  function handlePrint() {
    const deptLabel = (val) => jewelleryDepartments.find(d => d.value === val)?.label || val || '—'

    const tableRows = rows.map(row => `
      <tr>
        <td class="left">${row.sku || ''}</td>
        <td class="left">${row.category || ''}</td>
        <td class="left">${row.metal || ''}</td>
        <td class="issued">${row.issuedQty || '0'}</td>
        <td class="issued">${row.unit1 || 'Pcs'}</td>
        <td class="issued">${row.issuedWeight || '0.00'}</td>
        <td class="issued">${row.unit2 || 'Kg'}</td>
        <td class="received"></td>
        <td class="received"></td>
        <td class="received"></td>
        <td class="received"></td>
        <td class="loss"></td>
        <td class="loss"></td>
        <td class="loss"></td>
        <td class="loss"></td>
        <td class="reissue"></td>
        <td class="reissue"></td>
        <td class="reissue"></td>
        <td class="reissue"></td>
      </tr>
    `).join('')

    const ratingDots = Array.from({ length: 10 }, (_, i) => i + 1)
      .map(n => `<div class="rating-dot ${n <= ratingScore ? 'active' : 'inactive'}">${n}</div>`)
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Voucher ${voucherNo}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; border-bottom: 2px solid #1a56db; padding-bottom: 6px; }
    .header-title { font-size: 15px; font-weight: 800; color: #1a56db; letter-spacing: 1px; }
    .header-right { text-align: right; }
    .voucher-no { font-size: 18px; font-weight: 800; color: #111; }
    .voucher-date { font-size: 9px; color: #555; margin-top: 2px; }

    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 12px; margin-bottom: 7px; padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; }
    .info-item label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 1px; }
    .info-item span { font-size: 10.5px; font-weight: 600; color: #111; }

    .dept-section { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; padding: 5px 10px; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 3px; }
    .dept-box { flex: 1; }
    .dept-box label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #1e40af; display: block; margin-bottom: 1px; }
    .dept-box span { font-size: 13px; font-weight: 800; color: #1e3a8a; }
    .dept-arrow { font-size: 22px; color: #3b82f6; font-weight: 900; padding: 0 6px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 7px; font-size: 9px; }
    th { background: #1a56db; color: white; font-weight: 700; text-transform: uppercase; padding: 3px 3px; text-align: center; border: 1px solid #1e40af; line-height: 1.2; }
    th.left { text-align: left; padding-left: 5px; }
    td { padding: 3px 3px; border: 1px solid #d1d5db; text-align: center; }
    td.left { text-align: left; padding-left: 5px; font-weight: 600; }
    tr:nth-child(even) td { background: #f9fafb; }
    th.issued { background: #1e40af; } td.issued { background: rgba(59,130,246,0.08); }
    th.received { background: #065f46; } td.received { background: rgba(16,185,129,0.08); }
    th.loss { background: #7f1d1d; } td.loss { background: rgba(239,68,68,0.08); }
    th.reissue { background: #78350f; } td.reissue { background: rgba(245,158,11,0.08); }

    .footer-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 7px; }
    .footer-box { padding: 5px 7px; border: 1px solid #e2e8f0; border-radius: 3px; }
    .footer-box label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
    .footer-box span { font-size: 10.5px; font-weight: 600; }
    .rating { display: flex; gap: 3px; margin-top: 2px; }
    .rating-dot { width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; }
    .rating-dot.active { background: #f59e0b; color: white; }
    .rating-dot.inactive { color: #f59e0b; background: white; }

    .note-box { padding: 5px 7px; border: 1px solid #e2e8f0; border-radius: 3px; margin-bottom: 10px; min-height: 30px; }
    .note-box label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }

    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 18px; }
    .sig-box { border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">JOB VOUCHER</div>
    <div class="header-right">
      <div class="voucher-no">${voucherNo}</div>
      <div class="voucher-date">Issue Date: ${issueDate || '—'}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Issued To</label><span>${issuedTo || '—'}</span></div>
    <div class="info-item"><label>Work Type</label><span>${workType || '—'}</span></div>
    <div class="info-item"><label>Issued By</label><span>${issuedByName || '—'}</span></div>
    <div class="info-item"><label>Contact</label><span>${issuedByContact || '—'}</span></div>
  </div>

  <div class="dept-section">
    <div class="dept-box"><label>From Department</label><span>${deptLabel(deptFrom)}</span></div>
    <div class="dept-arrow">&#8594;</div>
    <div class="dept-box"><label>To Department</label><span>${deptLabel(deptTo)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="left" rowspan="2">SKU</th>
        <th class="left" rowspan="2">Category</th>
        <th class="left" rowspan="2">Metal</th>
        <th class="issued" colspan="4">ISSUED</th>
        <th class="received" colspan="4">RECEIVED</th>
        <th class="loss" colspan="4">LOSS</th>
        <th class="reissue" colspan="4">RE-ISSUE</th>
      </tr>
      <tr>
        <th class="issued">QTY</th><th class="issued">UNIT</th><th class="issued">WT</th><th class="issued">UNIT</th>
        <th class="received">QTY</th><th class="received">UNIT</th><th class="received">WT</th><th class="received">UNIT</th>
        <th class="loss">QTY</th><th class="loss">UNIT</th><th class="loss">WT</th><th class="loss">UNIT</th>
        <th class="reissue">QTY</th><th class="reissue">UNIT</th><th class="reissue">WT</th><th class="reissue">UNIT</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer-row">
    <div class="footer-box"><label>Received By</label><span>${receivedByName || '—'}</span></div>
    <div class="footer-box"><label>Contact</label><span>${receivedByContact || '—'}</span></div>
    <div class="footer-box">
      <label>Rate Workmanship</label>
      <div class="rating">${ratingDots}</div>
    </div>
  </div>

  ${noteForReissue ? `<div class="note-box"><label>Note for Reissue Voucher</label><div>${noteForReissue}</div></div>` : ''}

  <div class="sig-row">
    <div class="sig-box">Issued By Signature</div>
    <div class="sig-box">Received By Signature</div>
    <div class="sig-box">Authorised Signature</div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=1000,height=720')
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print.')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      win.addEventListener('afterprint', () => win.close())
    }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Receive Job Voucher</DialogTitle>
        <div className="relative">
          {/* Close + Print buttons */}
          <div className="flex justify-between items-center px-5 pt-3 pb-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 h-7 rounded border border-trust-blue text-trust-blue text-sm font-semibold hover:bg-trust-blue/10 transition-colors"
              aria-label="Print voucher"
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
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
                    <SelectValue placeholder="Select workforce" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Existing Workforce / Vendor">Existing Workforce / Vendor</SelectItem>
                    <SelectItem value="New Workforce / Vendor">New Workforce / Vendor</SelectItem>
                    {workforce.map(w => (
                      <SelectItem key={w.id} value={w.full_name || w.name || String(w.id)}>
                        {w.full_name || w.name}
                      </SelectItem>
                    ))}
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
          <div className="border-2 border-trust-blue rounded-md px-3 py-2 bg-trust-blue/5">
            <div className="grid grid-cols-[minmax(200px,260px)_1fr_minmax(200px,260px)] gap-5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-midnight-ink">From</Label>
                <Select value={deptFrom} onValueChange={setDeptFrom}>
                  <SelectTrigger className="h-8 text-sm font-bold bg-background border-trust-blue text-midnight-ink">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelleryDepartments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center h-8 px-3">
                <ArrowRight className="h-6 w-10 text-trust-blue" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-midnight-ink">To</Label>
                <Select value={deptTo} onValueChange={setDeptTo}>
                  <SelectTrigger className="h-8 text-sm font-bold bg-background border-trust-blue text-midnight-ink">
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

          {/* SKU Table */}
          <div className="rounded-md overflow-auto border border-border text-xs">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 80 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 72 }} />
                {/* Issued */}
                <col style={{ width: 50 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 40 }} />
                {/* Received */}
                <col style={{ width: 50 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 40 }} />
                {/* Loss */}
                <col style={{ width: 50 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 40 }} />
                {/* Re-Issue */}
                <col style={{ width: 50 }} />
                <col style={{ width: 46 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 40 }} />
                <col style={{ width: 24 }} />
              </colgroup>
              <thead>
                <tr className="bg-trust-blue text-white font-bold uppercase tracking-wider text-center text-[10px]">
                  <th className="py-1.5 px-1 text-left font-bold border-r border-white/20">SKU</th>
                  <th className="py-1.5 px-1 text-left font-bold border-r border-white/20">Category</th>
                  <th className="py-1.5 px-1 text-left font-bold border-r border-white/20">Metal</th>
                  <th className="py-1.5 px-0.5 font-bold bg-blue-700/30 border-l-2 border-white/40 leading-tight">Issued<br/>Qty</th>
                  <th className="py-1.5 px-0.5 font-bold bg-blue-700/30"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-blue-700/30 leading-tight">Issued<br/>WT</th>
                  <th className="py-1.5 px-0.5 font-bold bg-blue-700/30 border-r border-white/20"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-emerald-700/30 border-l-2 border-white/40 leading-tight">Received<br/>Qty</th>
                  <th className="py-1.5 px-0.5 font-bold bg-emerald-700/30"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-emerald-700/30 leading-tight">Received<br/>WT</th>
                  <th className="py-1.5 px-0.5 font-bold bg-emerald-700/30 border-r border-white/20"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-rose-700/30 border-l-2 border-white/40 leading-tight">Loss<br/>Qty</th>
                  <th className="py-1.5 px-0.5 font-bold bg-rose-700/30"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-rose-700/30 leading-tight">Loss<br/>WT</th>
                  <th className="py-1.5 px-0.5 font-bold bg-rose-700/30 border-r border-white/20"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-amber-700/30 border-l-2 border-white/40 leading-tight">Re-Issue<br/>Qty</th>
                  <th className="py-1.5 px-0.5 font-bold bg-amber-700/30"></th>
                  <th className="py-1.5 px-0.5 font-bold bg-amber-700/30 leading-tight">Re-Issue<br/>WT</th>
                  <th className="py-1.5 px-0.5 font-bold bg-amber-700/30"></th>
                  <th className="py-1.5 px-0.5 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border bg-white hover:bg-gray-50/50">
                    <td className="px-0.5 py-0.5 border-r border-border/40">
                      <Input className="h-6 text-xs border-border w-full" placeholder="SKU" value={row.sku} onChange={(e) => updateRow(row.id, "sku", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 border-r border-border/40">
                      <Input className="h-6 text-xs border-border w-full" placeholder="Cat" value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 border-r border-border/40">
                      <Input className="h-6 text-xs border-border w-full" placeholder="Metal" value={row.metal} onChange={(e) => updateRow(row.id, "metal", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-blue-50/60 border-l-2 border-l-blue-200">
                      <Input className="h-6 text-xs border-border w-full" type="number" placeholder="0" value={row.issuedQty} onChange={(e) => updateRow(row.id, "issuedQty", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-blue-50/60">
                      <Select value={row.unit1} onValueChange={(v) => updateRow(row.id, "unit1", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="Pairs">Pairs</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-blue-50/60">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0.00" value={row.issuedWeight} onChange={(e) => updateRow(row.id, "issuedWeight", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-blue-50/60 border-r border-border/40">
                      <Select value={row.unit2} onValueChange={(v) => updateRow(row.id, "unit2", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ct">ct</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-emerald-50/60 border-l-2 border-l-emerald-200">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0" value={row.receivedQty} onChange={(e) => updateRow(row.id, "receivedQty", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-emerald-50/60">
                      <Select value={row.unit3 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit3", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="Pairs">Pairs</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-emerald-50/60">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0.00" value={row.receivedWeight} onChange={(e) => updateRow(row.id, "receivedWeight", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-emerald-50/60 border-r border-border/40">
                      <Select value={row.unit4 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit4", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ct">ct</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-rose-50/60 border-l-2 border-l-rose-200">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0" value={row.lossQty} onChange={(e) => updateRow(row.id, "lossQty", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-rose-50/60">
                      <Select value={row.unit5 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit5", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="Pairs">Pairs</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-rose-50/60">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0.00" value={row.lossWeight} onChange={(e) => updateRow(row.id, "lossWeight", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-rose-50/60 border-r border-border/40">
                      <Select value={row.unit6 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit6", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ct">ct</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-amber-50/60 border-l-2 border-l-amber-200">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0" value={row.reissueQty} onChange={(e) => updateRow(row.id, "reissueQty", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-amber-50/60">
                      <Select value={row.unit7 || "Pcs"} onValueChange={(v) => updateRow(row.id, "unit7", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="Pairs">Pairs</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 bg-amber-50/60">
                      <Input className="h-6 text-xs border-border w-full" placeholder="0.00" value={row.reissueWeight} onChange={(e) => updateRow(row.id, "reissueWeight", e.target.value)} />
                    </td>
                    <td className="px-0.5 py-0.5 bg-amber-50/60">
                      <Select value={row.unit8 || "Kg"} onValueChange={(v) => updateRow(row.id, "unit8", v)}>
                        <SelectTrigger className="h-6 text-xs border-border p-0.5 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ct">ct</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-0.5 py-0.5 text-center">
                      <button type="button" onClick={() => deleteRow(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-background">
                  <td colSpan={20} className="py-1 text-center">
                    <button type="button" className="text-trust-blue hover:text-deep-blue text-xs font-semibold transition-colors" onClick={addRow}>
                      + Add Row
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Error / Warning Display */}
          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}
          {submitWarnings.length > 0 && (
            <div className="rounded-md bg-yellow-50 border border-yellow-300 px-3 py-2 text-xs text-yellow-800">
              <p className="font-semibold mb-1">Warnings (inventory updated for other rows):</p>
              {submitWarnings.map((w, i) => <p key={i}>• {w}</p>)}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              className="h-7 bg-success hover:bg-success text-white font-bold text-sm rounded"
              onClick={handleUpdateInventory}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Inventory'}
            </Button>
            <Button
              className="h-7 bg-warning hover:bg-warning/90 text-white font-bold text-sm rounded"
              onClick={handlePartialUpdate}
              disabled={isSubmitting}
            >
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
