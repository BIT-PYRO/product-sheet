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
import { CalendarIcon, Trash2, X, ArrowRight, Printer, BookImage, Layers } from "lucide-react"
import PhotoGuideModal from "@/components/photo-guide-modal"
import DieGuideModal from "@/components/die-guide-modal"
const jewelleryDepartments = [
  { value: "die", label: "Die" },
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
  { value: "final-stock", label: "Final Stock" },
]

export function ReceiveJobModal({ open, onOpenChange, onJobReceived, voucherData }) {
  const [issueDate, setIssueDate] = useState("")
  const [voucherNo, setVoucherNo] = useState("")
  const [voucherType, setVoucherType] = useState("New")
  const [issuedTo, setIssuedTo] = useState("")
  const [workType, setWorkType] = useState("")
  const [deptFrom, setDeptFrom] = useState("")
  const [deptTo, setDeptTo] = useState("")
  const [issuedByName, setIssuedByName] = useState("")
  const [issuedByContact, setIssuedByContact] = useState("")
  const [picklistName, setPicklistName] = useState("")
  const [orderName, setOrderName] = useState("")
  const [receivedByName, setReceivedByName] = useState("")
  const [receivedByContact, setReceivedByContact] = useState("")
  const [ratingScore, setRatingScore] = useState(5)
  const [noteForReissue, setNoteForReissue] = useState("")
  const [rows, setRows] = useState([
    { id: 1, sku: "", category: "", metal: "", issuedQty: "", unit1: "Pcs", issuedWeight: "", unit2: "Kg", receivedQty: "", receivedWeight: "", lossQty: "", lossWeight: "", reissueQty: "", reissueWeight: "" },
  ])
  const [photoGuideOpen, setPhotoGuideOpen] = useState(false)
  const [dieGuideOpen, setDieGuideOpen] = useState(false)
  // API state
  const [workforce, setWorkforce] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitWarnings, setSubmitWarnings] = useState([])
  const [stoneIssueRequests, setStoneIssueRequests] = useState([])
  const [isRecalcStone, setIsRecalcStone] = useState(false)

  // Pre-populate form with voucher data when it's selected
  useEffect(() => {
    if (voucherData && open) {
      setVoucherNo(voucherData.voucherNo || "")
      setVoucherType(voucherData.voucherType || voucherData.voucher_type || "New")
      setIssuedTo(voucherData.name || voucherData.firstName || "")
      setWorkType(voucherData.workType || voucherData.type || "")
      setDeptFrom(voucherData.deptFrom || voucherData.department || "")
      setDeptTo(voucherData.deptTo || "")
      // Populate date from start_date or created_at
      if (voucherData.createdAt) {
        const d = new Date(voucherData.createdAt)
        if (!isNaN(d)) setIssueDate(d.toISOString().split('T')[0])
      }
      // Populate contact
      if (voucherData.contact) setIssuedByContact(voucherData.contact)
      // Pre-fill received by from the person the voucher was issued to
      setReceivedByName(voucherData.name || voucherData.firstName || '')
      // Populate picklist / order info
      setPicklistName(voucherData.picklistName || '')
      setOrderName(voucherData.orderName || '')
      setSubmitError('')
      setSubmitWarnings([])

      // Populate rows from materialRows (multi-SKU voucher)
      const materialRows = Array.isArray(voucherData.materialRows) ? voucherData.materialRows : []
      const deptTo = voucherData.deptTo || voucherData.dept_to || ''
      const isPreCastingStage = ['wax-pieces', 'wax-setting', 'casting'].includes(deptTo)
      const dieRowsData = Array.isArray(voucherData.dieRows) ? voucherData.dieRows
        : Array.isArray(voucherData.die_rows) ? voucherData.die_rows : []

      if (isPreCastingStage && dieRowsData.length > 0) {
        // Pre-casting: show die code rows
        setRows(dieRowsData.map((dr, idx) => ({
          id: idx + 1,
          sku: dr.die_code || '',
          masterSku: dr.master_sku || '',
          qtyPerPiece: dr.qty_per_piece || 1,
          category: '',
          metal: '',
          issuedQty: dr.issued_qty || '',
          unit1: 'Pcs',
          issuedWeight: '',
          unit2: 'Kg',
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
      } else if (materialRows.length > 0) {
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

  // Fetch full job data on open: populate picklist/order, and fill received/loss
  // from received_rows for ALL statuses (completed, partially_complete, in_process).
  useEffect(() => {
    if (!open || !voucherData?.id) return
    fetch(`/api/jobs/${voucherData.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(result => {
        const job = result?.data
        if (!job) return
        if (job.picklist_name) setPicklistName(job.picklist_name)
        if (job.order_name) setOrderName(job.order_name)
        if (job.received_by) setReceivedByName(job.received_by)
        if (job.notes) setNoteForReissue(job.notes)

        const status = job.approval_status || ''
        const isCompleted = status === 'completed' || status === 'replaced'
        const isPartial = status === 'partially_complete'
        const isLocked = isCompleted || isPartial

        const receivedEvents = Array.isArray(job.received_rows) ? job.received_rows : []

        // Aggregate all received_qty and loss_qty across every prior event per SKU
        const totalReceived = {}
        const totalLoss = {}
        const totalReceivedWeight = {}
        const totalLossWeight = {}
        for (const event of receivedEvents) {
          for (const row of (event.rows || [])) {
            const key = (row.die_code || row.sku || '').trim().toUpperCase()
            totalReceived[key] = (totalReceived[key] || 0) + (parseFloat(row.received_qty) || 0)
            totalLoss[key] = (totalLoss[key] || 0) + (parseFloat(row.loss_qty) || 0)
            totalReceivedWeight[key] = (totalReceivedWeight[key] || 0) + (parseFloat(row.received_weight) || 0)
            totalLossWeight[key] = (totalLossWeight[key] || 0) + (parseFloat(row.loss_weight) || 0)
          }
        }

        const hasPriorActivity = Object.keys(totalReceived).length > 0 || Object.keys(totalLoss).length > 0

        if (isLocked && hasPriorActivity) {
          // Completed or partially complete: reconstruct rows to show original issued values and total received/loss values
          const isPreCasting = ['wax-pieces', 'wax-setting', 'casting'].includes(job.dept_to || '')
          const rawMaterialRows = Array.isArray(job.material_rows) ? job.material_rows : []
          const rawDieRows = Array.isArray(job.die_rows) ? job.die_rows : []

          if (isPreCasting && rawDieRows.length > 0) {
            setRows(rawDieRows.map((dr, idx) => {
              const key = (dr.die_code || '').trim().toUpperCase()
              return {
                id: idx + 1,
                sku: dr.die_code || '',
                masterSku: dr.master_sku || '',
                qtyPerPiece: dr.qty_per_piece || 1,
                category: '',
                metal: '',
                issuedQty: String(dr.issued_qty || ''),
                unit1: 'Pcs',
                issuedWeight: '',
                unit2: 'Kg',
                receivedQty: String(totalReceived[key] || 0),
                unit3: 'Pcs',
                receivedWeight: String(totalReceivedWeight[key] || ''),
                unit4: 'Kg',
                lossQty: String(totalLoss[key] || 0),
                unit5: 'Pcs',
                lossWeight: String(totalLossWeight[key] || ''),
                unit6: 'Kg',
                reissueQty: String(totalLoss[key] || 0),
                unit7: 'Pcs',
                reissueWeight: String(totalLossWeight[key] || ''),
                unit8: 'Kg',
              }
            }))
          } else if (rawMaterialRows.length > 0) {
            setRows(rawMaterialRows.map((mr, idx) => {
              const key = (mr.sku || '').trim().toUpperCase()
              return {
                id: idx + 1,
                sku: mr.sku || '',
                category: mr.category || '',
                metal: mr.metal || '',
                issuedQty: String(mr.issued_qty || mr.issuedQty || ''),
                unit1: mr.unit1 || 'Pcs',
                issuedWeight: String(mr.issued_weight || mr.issuedWeight || ''),
                unit2: mr.unit2 || 'Kg',
                receivedQty: String(totalReceived[key] || 0),
                unit3: 'Pcs',
                receivedWeight: String(totalReceivedWeight[key] || ''),
                unit4: 'Kg',
                lossQty: String(totalLoss[key] || 0),
                unit5: 'Pcs',
                lossWeight: String(totalLossWeight[key] || ''),
                unit6: 'Kg',
                reissueQty: String(totalLoss[key] || 0),
                unit7: 'Pcs',
                reissueWeight: String(totalLossWeight[key] || ''),
                unit8: 'Kg',
              }
            }))
          } else {
            setRows(prevRows => prevRows.map(r => {
              const key = (r.sku || '').trim().toUpperCase()
              return {
                ...r,
                receivedQty: String(totalReceived[key] || 0),
                receivedWeight: String(totalReceivedWeight[key] || ''),
                lossQty: String(totalLoss[key] || 0),
                lossWeight: String(totalLossWeight[key] || ''),
                reissueQty: String(totalLoss[key] || 0),
                reissueWeight: String(totalLossWeight[key] || ''),
              }
            }))
          }
        } else if (isPartial && hasPriorActivity) {
          const alreadyAccountedFor = {}
          for (const key of Object.keys(totalReceived)) {
            alreadyAccountedFor[key] = (totalReceived[key] || 0) + (totalLoss[key] || 0)
          }
          setRows(prevRows => prevRows.map(r => {
            const key = (r.sku || '').trim().toUpperCase()
            const issuedQty = parseFloat(r.issuedQty) || 0
            const issuedWeight = parseFloat(r.issuedWeight) || 0
            const remainingQty = Math.max(0, issuedQty - (alreadyAccountedFor[key] || 0))
            const remainingWeight = Math.max(0, issuedWeight - (totalReceivedWeight[key] || 0))
            return {
              ...r,
              issuedQty: String(remainingQty),
              issuedWeight: remainingWeight > 0 ? String(remainingWeight) : r.issuedWeight,
            }
          }))
        }
      })
      .catch(() => {})
  }, [open, voucherData?.id])

  // Fetch stone issue requests linked to this voucher
  useEffect(() => {
    if (!open || !voucherNo) return
    fetch(`/api/issue-requests?inventory_type=stone&reference_id=${encodeURIComponent(voucherNo)}&page_size=100`, { cache: 'no-store' })
      .then(r => r.json())
      .then(result => {
        const items = result?.data?.results ?? result?.data ?? []
        setStoneIssueRequests(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
  }, [open, voucherNo])

  // Load workforce members + auto-fill session user when modal opens
  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/workforce?active=true&page_size=500', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ]).then(([wfResult, sessionData]) => {
      const all = Array.isArray(wfResult?.data) ? wfResult.data : (wfResult?.data?.results || [])
      const prod = all.filter(w => (w.department || '').toLowerCase().includes('production'))
      setWorkforce(prod)
      // Auto-fill Issued By from current session user
      if (sessionData?.user) {
        const u = sessionData.user
        const name = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.username || '')
        const email = (u.email || '').toLowerCase()
        const wfRecord = all.find(m => (m.email || '').toLowerCase() === email)
        if (name) setIssuedByName(name)
        if (wfRecord) setIssuedByContact(prev => prev || wfRecord.phone || wfRecord.whatsapp || '')
      }
      // Auto-fill Received By contact from the issued-to person's workforce record
      const issuedToName = voucherData?.name || voucherData?.firstName || ''
      if (issuedToName) {
        const worker = all.find(w => w.full_name === issuedToName)
        if (worker) setReceivedByContact(worker.phone || worker.whatsapp || '')
      }
    }).catch(() => {})
  }, [open, voucherData?.name])

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
    setRows(rows.map(row => {
      if (row.id !== id) return row
      const updated = { ...row, [field]: value }
      // Loss auto-syncs to Re-Issue (lost pieces must be remade)
      if (field === 'lossQty') {
        updated.reissueQty = value
      }
      return updated
    }))
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
    const isPreCasting = ['wax-pieces', 'wax-setting', 'casting'].includes(deptFrom)
    const receivedRows = rows
      .filter(r => String(r.receivedQty || '').trim() !== '')
      .map(r => ({
        sku: r.sku,
        ...(isPreCasting && r.masterSku ? { die_code: r.sku, master_sku: r.masterSku, qty_per_piece: r.qtyPerPiece || 1 } : {}),
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

  async function handleSendForNextStage() {
    const voucherId = voucherData?.id
    if (!voucherId) {
      setSubmitError('No voucher ID found. Please re-open the voucher card.')
      return
    }
    const canSend = ['in_process', 'partially_complete'].includes(voucherData?.approvalStatus)
    if (!canSend) {
      setSubmitError(`Cannot process a voucher with status: "${voucherData?.approvalStatus}". Only in-process or partially complete vouchers can be sent for the next stage.`)
      return
    }
    const isPreCastingSend = ['wax-pieces', 'wax-setting', 'casting'].includes(deptFrom)
    const payloadRows = rows
      .filter(r => r.sku)
      .map(r => ({
        sku: r.sku,
        ...(isPreCastingSend && r.masterSku ? { die_code: r.sku, master_sku: r.masterSku, qty_per_piece: r.qtyPerPiece || 1 } : {}),
        received_qty: parseFloat(r.receivedQty) || 0,
        loss_qty: parseFloat(r.lossQty) || 0,
      }))
    if (payloadRows.length === 0) {
      setSubmitError('No rows with SKU found.')
      return
    }
    const hasAnyQty = payloadRows.some(r => r.received_qty > 0 || r.loss_qty > 0)
    if (!hasAnyQty) {
      setSubmitError('Enter at least one Received Qty or Loss Qty before submitting.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitWarnings([])
    try {
      const res = await fetch(`/api/jobs/${voucherId}/send-for-next-stage/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: payloadRows,
          received_by: receivedByName || issuedByName,
          note: noteForReissue,
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok || !result?.success) {
        const det = result?.error?.details
        const detailMsg = typeof det === 'string' ? det : (det?.rows || det?.approval_status || '')
        setSubmitError(detailMsg || result?.error?.message || 'Failed to process voucher.')
        return
      }
      if (result?.data?.warnings?.length) {
        setSubmitWarnings(result.data.warnings)
      }
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

  function handlePrint() {
    const deptLabel = (val) => jewelleryDepartments.find(d => d.value === val)?.label || val || 'ΓÇö'

    const wtCell = (wt, unit) => {
      const v = String(wt ?? '').trim()
      return v && v !== '0' && v !== '0.00' ? `${v} ${unit || 'Kg'}` : ''
    }

    const tableRows = rows.map(row => `
      <tr>
        <td class="left">${row.sku || ''}</td>
        <td class="left">${row.category || ''}</td>
        <td class="left">${row.metal || ''}</td>
        <td class="issued">${row.issuedQty && row.issuedQty !== '0' ? row.issuedQty : ''}<span class="unit">${row.issuedQty && row.issuedQty !== '0' ? (row.unit1 || 'Pcs') : ''}</span></td>
        <td class="issued-wt">${row.issuedWeight && row.issuedWeight !== '0' && row.issuedWeight !== '0.0' ? row.issuedWeight : ''}<span class="unit">${row.issuedWeight && row.issuedWeight !== '0' && row.issuedWeight !== '0.0' ? (row.unit2 || 'Kg') : ''}</span></td>
        <td class="received">${row.receivedQty && row.receivedQty !== '0' ? row.receivedQty : ''}<span class="unit">${row.receivedQty && row.receivedQty !== '0' ? (row.unit3 || 'Pcs') : ''}</span></td>
        <td class="received-wt">${row.receivedWeight && row.receivedWeight !== '0' && row.receivedWeight !== '0.0' ? row.receivedWeight : ''}<span class="unit">${row.receivedWeight && row.receivedWeight !== '0' && row.receivedWeight !== '0.0' ? (row.unit4 || 'Kg') : ''}</span></td>
        <td class="loss">${row.lossQty && row.lossQty !== '0' ? row.lossQty : ''}<span class="unit">${row.lossQty && row.lossQty !== '0' ? (row.unit5 || 'Pcs') : ''}</span></td>
        <td class="loss-wt">${row.lossWeight && row.lossWeight !== '0' && row.lossWeight !== '0.0' ? row.lossWeight : ''}<span class="unit">${row.lossWeight && row.lossWeight !== '0' && row.lossWeight !== '0.0' ? (row.unit6 || 'Kg') : ''}</span></td>
        <td class="reissue">${row.reissueQty && row.reissueQty !== '0' ? row.reissueQty : ''}<span class="unit">${row.reissueQty && row.reissueQty !== '0' ? (row.unit7 || 'Pcs') : ''}</span></td>
        <td class="reissue-wt">${row.reissueWeight && row.reissueWeight !== '0' && row.reissueWeight !== '0.0' ? row.reissueWeight : ''}<span class="unit">${row.reissueWeight && row.reissueWeight !== '0' && row.reissueWeight !== '0.0' ? (row.unit8 || 'Kg') : ''}</span></td>
      </tr>
    `).join('')

    const ratingDots = Array.from({ length: 10 }, (_, i) => i + 1)
      .map(n => `<div class="rating-dot ${n <= ratingScore ? 'active' : 'inactive'}">${n}</div>`)
      .join('')

    // Format display date as dd-mm-yyyy
    const fmtDate = (d) => {
      if (!d) return 'ΓÇö'
      const parts = d.split('-')
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
      return d
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Voucher ${voucherNo}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ΓöÇΓöÇ TOP ROW: Issue Date left, rest right ΓöÇΓöÇ */
    .top-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 6px; }
    .top-field { display: flex; flex-direction: column; gap: 1px; }
    .top-field label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .top-field span { font-size: 10px; font-weight: 600; color: #111; }
    .top-right { display: flex; align-items: flex-end; gap: 12px; }
    .chip { display: inline-block; padding: 1px 7px; border-radius: 3px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 10px; font-weight: 600; }

    /* ΓöÇΓöÇ SECTION BOXES ΓöÇΓöÇ */
    .section-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 4px 8px; margin-bottom: 5px; }
    .section-grid { display: grid; gap: 0 16px; align-items: end; }
    .grid-3 { grid-template-columns: minmax(160px,220px) 1fr minmax(160px,200px); }
    .grid-2 { grid-template-columns: minmax(200px,280px) 1fr minmax(200px,280px); }
    .field-label { font-size: 7px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 1px; }
    .field-value { font-size: 10px; font-weight: 500; color: #111; }
    .dash-center { text-align: center; font-size: 11px; color: #94a3b8; }

    /* ΓöÇΓöÇ DEPT SECTION ΓöÇΓöÇ */
    .dept-section { border: 2px solid #3b82f6; border-radius: 3px; padding: 5px 10px; margin-bottom: 5px; background: #eff6ff; }
    .dept-grid { display: grid; grid-template-columns: 1fr 40px 1fr; align-items: center; }
    .dept-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #1e40af; display: block; margin-bottom: 1px; }
    .dept-value { font-size: 12px; font-weight: 800; color: #1e3a8a; }
    .dept-arrow { text-align: center; font-size: 18px; color: #3b82f6; font-weight: 900; }

    /* ΓöÇΓöÇ TABLE ΓöÇΓöÇ */
    table { border-collapse: collapse; margin-bottom: 6px; font-size: 7.5px; width: 100%; table-layout: fixed; }
    th { background: #1a56db; color: white; font-weight: 500; padding: 2px 4px; text-align: center; border: 1px solid #1e40af; white-space: nowrap; overflow: hidden; word-break: break-all; max-width: 0; }
    th.left { text-align: left; padding-left: 5px; }
    td { padding: 2px 4px; border: 1px solid #d1d5db; text-align: center; white-space: nowrap; overflow: hidden; word-break: break-all; max-width: 0; }
    td.left { text-align: left; padding-left: 5px; }
    tr:nth-child(even) td { background: #f9fafb; }
    th.group-issued  { background: #1e40af; }
    th.group-received{ background: #065f46; }
    th.group-loss    { background: #881337; }
    th.group-reissue { background: #78350f; }
    th.sub-issued  { background: #1d4ed8; font-weight: 400; font-size: 7px; }
    th.sub-received{ background: #047857; font-weight: 400; font-size: 7px; }
    th.sub-loss    { background: #9f1239; font-weight: 400; font-size: 7px; }
    th.sub-reissue { background: #b45309; font-weight: 400; font-size: 7px; }
    td.issued  { background: rgba(59,130,246,0.07); border-left: 2px solid #93c5fd; }
    td.issued-wt { background: rgba(59,130,246,0.07); }
    td.received{ background: rgba(16,185,129,0.07); border-left: 2px solid #6ee7b7; }
    td.received-wt{ background: rgba(16,185,129,0.07); }
    td.loss    { background: rgba(239,68,68,0.07); border-left: 2px solid #fca5a5; }
    td.loss-wt { background: rgba(239,68,68,0.07); }
    td.reissue { background: rgba(245,158,11,0.07); border-left: 2px solid #fcd34d; }
    td.reissue-wt{ background: rgba(245,158,11,0.07); }
    .unit { font-size: 7px; color: #94a3b8; margin-left: 2px; }

    /* ΓöÇΓöÇ FOOTER ΓöÇΓöÇ */
    .footer-row { display: grid; grid-template-columns: 1fr 1fr 160px; gap: 6px; margin-bottom: 6px; }
    .footer-box { padding: 4px 7px; border: 1px solid #e2e8f0; border-radius: 3px; overflow: hidden; }
    .footer-box label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
    .footer-box span { font-size: 10px; font-weight: 600; }
    .rating { display: flex; gap: 2px; margin-top: 2px; flex-wrap: nowrap; }
    .rating-dot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid #f59e0b; display: inline-flex; align-items: center; justify-content: center; font-size: 6.5px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; flex-shrink: 0; }
    .rating-dot.active { background: #f59e0b !important; color: white !important; }
    .rating-dot.inactive { color: #f59e0b; background: white !important; }

    .note-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 3px; display: block; }
    .note-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 4px 7px; min-height: 28px; margin-bottom: 8px; font-size: 9.5px; }

    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 16px; }
    .sig-box { border-top: 1px solid #333; padding-top: 3px; text-align: center; font-size: 7px; font-weight: 700; text-transform: uppercase; color: #555; }
  </style>
</head>
<body>

  <!-- TOP ROW: Issue Date | Voucher Type | Picklist | Order | Voucher No -->
  <div class="top-row">
    <div class="top-field">
      <label>Issue Date</label>
      <span>${fmtDate(issueDate)}</span>
    </div>
    <div class="top-right">
      <div class="top-field"><label>Voucher Type</label><span>${voucherType || 'New'}</span></div>
      ${picklistName ? `<div class="top-field"><label>Picklist</label><span class="chip">${picklistName}</span></div>` : ''}
      ${orderName ? `<div class="top-field"><label>Order</label><span class="chip">${orderName}</span></div>` : ''}
      <div class="top-field"><label>Voucher No.</label><span style="font-size:12px;font-weight:700;">${voucherNo}</span></div>
    </div>
  </div>

  <!-- ISSUED TO + WORK TYPE -->
  <div class="section-box">
    <div class="section-grid grid-3">
      <div><span class="field-label">Issued To</span><span class="field-value">${issuedTo || 'ΓÇö'}</span></div>
      <div class="dash-center">ΓÇö</div>
      <div><span class="field-label">Work Type</span><span class="field-value">${workType || 'ΓÇö'}</span></div>
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="dept-section">
    <div class="dept-grid">
      <div><span class="dept-label">From</span><span class="dept-value">${deptLabel(deptFrom)}</span></div>
      <div class="dept-arrow">&#8594;</div>
      <div><span class="dept-label">To</span><span class="dept-value">${deptLabel(deptTo)}</span></div>
    </div>
  </div>

  <!-- ISSUED BY + CONTACT -->
  <div class="section-box">
    <div class="section-grid grid-2">
      <div><span class="field-label">Issued By</span><span class="field-value">${issuedByName || 'ΓÇö'}</span></div>
      <div></div>
      <div><span class="field-label">Contact</span><span class="field-value">${issuedByContact || 'ΓÇö'}</span></div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <colgroup>
      <col style="width:13%"><col style="width:9%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
    </colgroup>
    <thead>
      <tr>
        <th class="left" rowspan="2">SKU</th>
        <th class="left" rowspan="2">Category</th>
        <th class="left" rowspan="2">Metal</th>
        <th class="group-issued"  colspan="2">ISSUED</th>
        <th class="group-received" colspan="2">Received</th>
        <th class="group-loss"    colspan="2">Loss</th>
        <th class="group-reissue" colspan="2">Re-Issue</th>
      </tr>
      <tr>
        <th class="sub-issued">Qty</th><th class="sub-issued">Weight</th>
        <th class="sub-received">Qty</th><th class="sub-received">Weight</th>
        <th class="sub-loss">Qty</th><th class="sub-loss">Weight</th>
        <th class="sub-reissue">Qty</th><th class="sub-reissue">Weight</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <!-- RECEIVED BY + CONTACT + RATING -->
  <div class="footer-row">
    <div class="footer-box"><label>Received By</label><span>${receivedByName || 'ΓÇö'}</span></div>
    <div class="footer-box"><label>Contact</label><span>${receivedByContact || 'ΓÇö'}</span></div>
    <div class="footer-box">
      <label>Rate Workmanship</label>
      <div class="rating">${ratingDots}</div>
    </div>
  </div>

  <!-- NOTE FOR REISSUE VOUCHER -->
  <span class="note-label">Note for Reissue Voucher</span>
  <div class="note-box">${noteForReissue || ''}</div>

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

  const isCompleted = ['completed', 'replaced'].includes(voucherData?.approvalStatus)
  const isBaseLocked = isCompleted || voucherData?.approvalStatus === 'partially_complete'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1000px] w-[98vw] max-h-[92vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Receive Job Voucher</DialogTitle>
        <div className="relative">
          {/* Close + Print buttons */}
          <div className="flex justify-between items-center px-5 pt-3 pb-0">
            <div className="flex items-center gap-2">
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
                onClick={() => setPhotoGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 h-7 rounded border border-violet-500 text-violet-600 text-sm font-semibold hover:bg-violet-50 transition-colors"
                aria-label="Open photo guide"
                type="button"
              >
                <BookImage className="h-3.5 w-3.5" />
                Photo Guide
              </button>
              <button
                onClick={() => setDieGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 h-7 rounded border border-amber-500 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-colors"
                aria-label="Open die guide"
                type="button"
              >
                <Layers className="h-3.5 w-3.5" />
                Die Guide
              </button>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 pb-4 flex flex-col gap-2.5">
          {/* Header: Issue Date, Voucher Type, Voucher No. + Picklist + Order */}
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
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher Type</Label>
                <Select value={voucherType} onValueChange={setVoucherType}>
                  <SelectTrigger className="h-7 text-sm bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {picklistName && (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Picklist</Label>
                  <div className="h-7 px-2 flex items-center rounded border border-border bg-blue-50 text-sm font-semibold text-trust-blue min-w-[80px]">{picklistName}</div>
                </div>
              )}
              {orderName && (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Order</Label>
                  <div className="h-7 px-2 flex items-center rounded border border-border bg-blue-50 text-sm font-semibold text-trust-blue min-w-[80px]">{orderName}</div>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                <Input
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  placeholder="JW-2026-XXXX"
                  className="h-7 text-sm bg-background border-border"
                  readOnly={isBaseLocked}
                />
              </div>
            </div>
          </div>

          {/* Issued To Section */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(200px,260px)_1fr_minmax(200px,240px)] gap-5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Issued To</Label>
                <Select value={issuedTo} onValueChange={setIssuedTo} disabled={isBaseLocked}>
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
              <div className="flex items-center justify-center text-sm text-muted-foreground px-6">ΓÇö</div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Work Type</Label>
                <Select value={workType} onValueChange={setWorkType} disabled={isBaseLocked}>
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
                <Select value={deptFrom} onValueChange={setDeptFrom} disabled={isBaseLocked}>
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
                <Select value={deptTo} onValueChange={setDeptTo} disabled={isBaseLocked}>
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
                <Input placeholder="User Name" value={issuedByName} onChange={(e) => setIssuedByName(e.target.value)} className="h-7 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text" readOnly={isBaseLocked} />
              </div>
              <div className="hidden md:block" />
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="Contact Number" value={issuedByContact} onChange={(e) => setIssuedByContact(e.target.value)} className="h-7 text-sm bg-background border-border" readOnly={isBaseLocked} />
              </div>
            </div>
          </div>

          {/* Completed / Replaced banner */}
          {isCompleted && (
            <div className="rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-800 font-semibold">
              This voucher is <span className="uppercase">{voucherData?.approvalStatus}</span>. Received and loss quantities shown below are the final recorded values.
            </div>
          )}

          {/* Partially complete info banner */}
          {voucherData?.approvalStatus === 'partially_complete' && (
            <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800 font-semibold">
              This voucher is PARTIALLY COMPLETE. Received and loss quantities shown below are the final recorded values.
            </div>
          )}

          {/* SKU Table */}
          <div className="rounded-md overflow-auto border border-border text-xs">
            <table className="border-collapse" style={{ width: '100%' }}>
              <thead>
                {/* Row 1: group headers */}
                <tr className="bg-trust-blue text-white text-center text-[10px]">
                  <th rowSpan={2} className="py-1 px-1 font-semibold border-r border-white/20 align-middle">SKU</th>
                  <th rowSpan={2} className="py-1 px-1 font-semibold border-r border-white/20 align-middle">Category</th>
                  <th rowSpan={2} className="py-1 px-1 font-semibold border-r border-white/20 align-middle">Metal</th>
                  <th colSpan={2} className="py-1 px-0.5 font-semibold bg-blue-800 border-l-2 border-white/40">ISSUED</th>
                  <th colSpan={2} className="py-1 px-0.5 font-semibold bg-emerald-800 border-l-2 border-white/40">Received</th>
                  <th colSpan={2} className="py-1 px-0.5 font-semibold bg-rose-900 border-l-2 border-white/40">Loss</th>
                  <th colSpan={2} className="py-1 px-0.5 font-semibold bg-amber-800 border-l-2 border-white/40">Re-Issue</th>
                  <th rowSpan={2} className="py-1 px-0.5 font-semibold align-middle"></th>
                </tr>
                {/* Row 2: sub-headers */}
                <tr className="text-white text-center text-[10px]">
                  <th className="py-0.5 px-0.5 font-normal bg-blue-700 border-l-2 border-white/30">Qty</th>
                  <th className="py-0.5 px-0.5 font-normal bg-blue-700 border-l border-white/20">Weight</th>
                  <th className="py-0.5 px-0.5 font-normal bg-emerald-700 border-l-2 border-white/30">Qty</th>
                  <th className="py-0.5 px-0.5 font-normal bg-emerald-700 border-l border-white/20">Weight</th>
                  <th className="py-0.5 px-0.5 font-normal bg-rose-800 border-l-2 border-white/30">Qty</th>
                  <th className="py-0.5 px-0.5 font-normal bg-rose-800 border-l border-white/20">Weight</th>
                  <th className="py-0.5 px-0.5 font-normal bg-amber-700 border-l-2 border-white/30">Qty</th>
                  <th className="py-0.5 px-0.5 font-normal bg-amber-700 border-l border-white/20">Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border bg-white hover:bg-gray-50/50 text-xs">
                    {/* SKU */}
                    <td className="border-r border-border/40 p-0 whitespace-nowrap">
                      <input className={`h-7 px-1.5 bg-transparent border-0 outline-none text-xs ${isBaseLocked ? 'cursor-default font-semibold text-gray-500' : ''}`} style={{  width: '100%' }} placeholder="SKU" value={row.sku} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'sku', e.target.value)} />
                    </td>
                    {/* Category */}
                    <td className="border-r border-border/40 p-0 whitespace-nowrap">
                      <input className={`h-7 px-1.5 bg-transparent border-0 outline-none text-xs ${isBaseLocked ? 'cursor-default font-semibold text-gray-500' : ''}`} style={{  width: '100%' }} placeholder="Cat" value={row.category} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'category', e.target.value)} />
                    </td>
                    {/* Metal */}
                    <td className="border-r border-border/40 p-0 whitespace-nowrap">
                      <input className={`h-7 px-1.5 bg-transparent border-0 outline-none text-xs ${isBaseLocked ? 'cursor-default font-semibold text-gray-500' : ''}`} style={{  width: '100%' }} placeholder="Metal" value={row.metal} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'metal', e.target.value)} />
                    </td>
                    {/* Issued Qty+Unit */}
                    <td className="border-l-2 border-l-blue-300 bg-blue-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-gray-500' : ''}`} placeholder="0" value={row.issuedQty} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'issuedQty', e.target.value)} />
                        <select className={`bg-transparent border-0 outline-none appearance-none ${isBaseLocked ? 'cursor-default text-gray-400' : 'cursor-pointer flex-shrink-0 text-gray-400'}`} style={{ fontSize: 9 }} value={row.unit1} disabled={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'unit1', e.target.value)}>
                          <option>Pcs</option><option>Pairs</option>
                        </select>
                      </div>
                    </td>
                    {/* Issued Weight+Unit */}
                    <td className="border-r border-border/30 bg-blue-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-gray-500' : ''}`} placeholder="0.0" value={row.issuedWeight} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'issuedWeight', e.target.value)} />
                        <select className={`bg-transparent border-0 outline-none appearance-none ${isBaseLocked ? 'cursor-default text-gray-400' : 'cursor-pointer flex-shrink-0 text-gray-400'}`} style={{ fontSize: 9 }} value={row.unit2} disabled={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'unit2', e.target.value)}>
                          <option>g</option><option>Kg</option><option>mg</option><option>lb</option><option>oz</option><option>ct</option>
                        </select>
                      </div>
                    </td>
                    {/* Received Qty+Unit */}
                    <td className="border-l-2 border-l-emerald-300 bg-emerald-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-emerald-700' : ''}`} placeholder="0" value={row.receivedQty} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'receivedQty', e.target.value)} />
                        <select className="bg-transparent border-0 outline-none appearance-none cursor-pointer flex-shrink-0 text-gray-400" style={{ fontSize: 9 }} value={row.unit3 || 'Pcs'} disabled={isBaseLocked} onChange={(e) => updateRow(row.id, 'unit3', e.target.value)}>
                          <option>Pcs</option><option>Pairs</option>
                        </select>
                      </div>
                    </td>
                    {/* Received Weight+Unit */}
                    <td className="border-r border-border/30 bg-emerald-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-emerald-700' : ''}`} placeholder="0.0" value={row.receivedWeight} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'receivedWeight', e.target.value)} />
                        <select className="bg-transparent border-0 outline-none appearance-none cursor-pointer flex-shrink-0 text-gray-400" style={{ fontSize: 9 }} value={row.unit4 || 'Kg'} disabled={isBaseLocked} onChange={(e) => updateRow(row.id, 'unit4', e.target.value)}>
                          <option>g</option><option>Kg</option><option>mg</option><option>lb</option><option>oz</option><option>ct</option>
                        </select>
                      </div>
                    </td>
                    {/* Loss Qty+Unit */}
                    <td className="border-l-2 border-l-rose-300 bg-rose-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-rose-700' : ''}`} placeholder="0" value={row.lossQty} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'lossQty', e.target.value)} />
                        <select className="bg-transparent border-0 outline-none appearance-none cursor-pointer flex-shrink-0 text-gray-400" style={{ fontSize: 9 }} value={row.unit5 || 'Pcs'} disabled={isBaseLocked} onChange={(e) => updateRow(row.id, 'unit5', e.target.value)}>
                          <option>Pcs</option><option>Pairs</option>
                        </select>
                      </div>
                    </td>
                    {/* Loss Weight+Unit */}
                    <td className="border-r border-border/30 bg-rose-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-rose-700' : ''}`} placeholder="0.0" value={row.lossWeight} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'lossWeight', e.target.value)} />
                        <select className="bg-transparent border-0 outline-none appearance-none cursor-pointer flex-shrink-0 text-gray-400" style={{ fontSize: 9 }} value={row.unit6 || 'Kg'} disabled={isBaseLocked} onChange={(e) => updateRow(row.id, 'unit6', e.target.value)}>
                          <option>g</option><option>Kg</option><option>mg</option><option>lb</option><option>oz</option><option>ct</option>
                        </select>
                      </div>
                    </td>
                    {/* Re-Issue Qty+Unit — read-only, auto-filled from Loss Qty */}
                    <td className="border-l-2 border-l-amber-300 bg-amber-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className="w-11 bg-amber-100/70 border-0 outline-none text-xs text-center cursor-not-allowed" placeholder="0" value={row.reissueQty} readOnly tabIndex={-1} />
                        <span className="text-gray-400 flex-shrink-0" style={{ fontSize: 9 }}>{row.unit7 || 'Pcs'}</span>
                      </div>
                    </td>
                    {/* Re-Issue Weight+Unit */}
                    <td className="bg-amber-50 p-0 whitespace-nowrap">
                      <div className="flex items-center h-7 px-1 gap-0.5">
                        <input type="number" className={`w-11 bg-transparent border-0 outline-none text-xs text-center ${isBaseLocked ? 'cursor-default font-semibold text-amber-700' : ''}`} placeholder="0.0" value={row.reissueWeight} readOnly={isBaseLocked} onChange={isBaseLocked ? undefined : (e) => updateRow(row.id, 'reissueWeight', e.target.value)} />
                        <select className="bg-transparent border-0 outline-none appearance-none cursor-pointer flex-shrink-0 text-gray-400" style={{ fontSize: 9 }} value={row.unit8 || 'Kg'} disabled={isBaseLocked} onChange={(e) => updateRow(row.id, 'unit8', e.target.value)}>
                          <option>g</option><option>Kg</option><option>mg</option><option>lb</option><option>oz</option><option>ct</option>
                        </select>
                      </div>
                    </td>
                    {/* Delete */}
                    <td className="p-0 text-center align-middle">
                      {!isBaseLocked && (
                        <button type="button" onClick={() => deleteRow(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {!isBaseLocked && (
                  <tr className="border-t border-border bg-background">
                    <td colSpan={12} className="py-1 text-center">
                      <button type="button" className="text-trust-blue hover:text-deep-blue text-xs font-semibold transition-colors" onClick={addRow}>
                        + Add Row
                      </button>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Stone/Findings Reference — shown when voucher has stone rows */}
          {Array.isArray(voucherData?.stoneRows) && voucherData.stoneRows.some(r => r.variety || r.qty || r.shape) && (
            <div className="rounded-md overflow-hidden border border-amber-400/40">
              <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-400/40 flex items-center justify-between">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Stones / Findings (Reference Only)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isRecalcStone}
                    onClick={async () => {
                      if (!voucherData?.id) return;
                      setIsRecalcStone(true);
                      try {
                        const res = await fetch(`/api/jobs/${voucherData.id}/recalculate-stone-rows`, { method: 'POST' });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.success) {
                          window.location.reload();
                        } else {
                          alert(data.message || 'Recalculation failed');
                        }
                      } catch (e) {
                        alert('Error: ' + e.message);
                      } finally {
                        setIsRecalcStone(false);
                      }
                    }}
                    className="text-[9px] font-semibold text-amber-700 border border-amber-400 rounded px-1.5 py-0.5 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {isRecalcStone ? 'Refreshing…' : '↻ Refresh Stone Data'}
                  </button>
                  {stoneIssueRequests.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Stone Issue:</span>
                      {stoneIssueRequests.map((req, ri) => {
                        const statusColor = req.status === 'approved'
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        const statusLabel = req.status === 'approved' ? 'Accepted' : req.status === 'rejected' ? 'Rejected' : 'Pending'
                        return (
                          <span key={ri} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColor} uppercase`}>
                            {req.item_name ? `${req.item_name}: ` : ''}{statusLabel}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.5fr_0.5fr_0.5fr_0.6fr_1.6fr] gap-0 bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider">
                {['Variety', 'Color', 'Cut', 'Shape', 'L', 'W', 'H', 'Qty', 'Master SKUs'].map(h => (
                  <div key={h} className="px-1.5 py-1.5">{h}</div>
                ))}
              </div>
              {voucherData.stoneRows.filter(r => r.variety || r.qty || r.shape).map((sr, idx) => (
                <div key={idx} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.5fr_0.5fr_0.5fr_0.6fr_1.6fr] gap-0 border-t border-border bg-background items-start">
                  {[sr.variety, sr.color, sr.cut, sr.shape, sr.length, sr.width, sr.height, sr.qty].map((val, vi) => (
                    <div key={vi} className="px-1.5 py-1 text-xs">{val || '—'}</div>
                  ))}
                  <div className="px-1.5 py-1">
                    {Array.isArray(sr.master_sku_breakdown) && sr.master_sku_breakdown.length > 0
                      ? sr.master_sku_breakdown.map((b, bi) => (
                          <div key={bi} className="text-[10px] font-semibold text-midnight-ink leading-tight">
                            {b.master_sku ? `${b.master_sku}` : ''}[{Math.round((b.qty || 0) * 100) / 100}]
                          </div>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </div>
                </div>
              ))}
              {/* Stone issue request status row */}
              {stoneIssueRequests.length > 0 && (
                <div className="px-2.5 py-1.5 bg-amber-50/50 border-t border-amber-200 flex flex-wrap gap-2">
                  {stoneIssueRequests.map((req, ri) => {
                    const statusColor = req.status === 'approved'
                      ? 'text-green-700'
                      : req.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-700'
                    const statusIcon = req.status === 'approved' ? '✓' : req.status === 'rejected' ? '✗' : '⏳'
                    return (
                      <span key={ri} className={`text-[10px] font-medium ${statusColor}`}>
                        {statusIcon} {req.item_name || 'Stone'} ×{req.quantity} → {req.status === 'approved' ? 'Accepted' : req.status === 'rejected' ? 'Rejected' : 'Pending approval'}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error / Warning Display */}
          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}
          {submitWarnings.length > 0 && (
            <div className="rounded-md bg-yellow-50 border border-yellow-300 px-3 py-2 text-xs text-yellow-800">
              <p className="font-semibold mb-1">Warnings (inventory updated for other rows):</p>
              {submitWarnings.map((w, i) => <p key={i}>ΓÇó {w}</p>)}
            </div>
          )}

          {/* Action Button */}
          {!isBaseLocked && (
          <div className="flex">
            <Button
              className="flex-1 h-9 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded"
              onClick={handleSendForNextStage}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Send for Next Stage'}
            </Button>
          </div>
          )}

          {/* Received By, Contact, and Rate Workmanship - Single Row */}
          <div className="border border-border rounded-md px-3 py-2">
            <div className="grid grid-cols-[minmax(220px,320px)_minmax(220px,320px)_minmax(180px,220px)] gap-4 items-end justify-start">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Received By</Label>
                <Input placeholder="User Name" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className="h-7 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue focus:border-trust-blue transition-colors cursor-text" readOnly={isBaseLocked} />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
                <Input type="tel" placeholder="Contact Number" value={receivedByContact} onChange={(e) => setReceivedByContact(e.target.value)} className="h-7 text-sm bg-background border-border" readOnly={isBaseLocked} />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Rate Workmanship</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setRatingScore(num)}
                      disabled={isBaseLocked}
                      className={`h-6 w-6 rounded-full border text-sm font-semibold transition-colors ${
                        ratingScore >= num
                          ? "border-warning bg-warning text-white"
                          : "border-warning text-warning"
                      } ${isBaseLocked ? 'cursor-default opacity-85' : ''}`}
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
              readOnly={isBaseLocked}
            />
          </div>

        </div>
      </div>
      </DialogContent>
    </Dialog>

    <PhotoGuideModal
      open={photoGuideOpen}
      onOpenChange={setPhotoGuideOpen}
      jobId={voucherData?.id}
      voucherNo={voucherNo}
    />
    <DieGuideModal
      open={dieGuideOpen}
      onOpenChange={setDieGuideOpen}
      jobId={voucherData?.id}
      voucherNo={voucherNo}
    />
  </>
  )
}
