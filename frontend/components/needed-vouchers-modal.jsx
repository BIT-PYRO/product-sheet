'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickEnrollModal } from '@/components/quick-enroll-modal'
import { fmtNum } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, X, ArrowRight, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

// Full manufacturing pipeline, ordered
const DEPT_PIPELINE = [
  { key: 'die',          label: 'Die' },
  { key: 'wax-pieces',   label: 'Wax Piece' },
  { key: 'wax-setting',  label: 'Wax Setting' },
  { key: 'casting',      label: 'Casting' },
  { key: 'filing',       label: 'Filing / Grinding' },
  { key: 'pre-polish',   label: 'Pre-Polish' },
  { key: 'hand-setting', label: 'Hand Setting' },
  { key: 'polishing',    label: 'Final Polish' },
  { key: 'plating',      label: 'Plating' },
  { key: 'final-stock',  label: 'Final Stock' },
]

const JEWELLERY_DEPARTMENTS = [
  { value: 'die',              label: 'Die' },
  { value: 'design',           label: 'Design / CAD' },
  { value: '3d-print',         label: '3D Print' },
  { value: 'mold-die',         label: 'Mold Die' },
  { value: 'wax-pieces',       label: 'Wax Pieces' },
  { value: 'wax-setting',      label: 'Wax Setting' },
  { value: 'casting',          label: 'Casting' },
  { value: 'filing',           label: 'Filing / Grinding' },
  { value: 'pre-polish',       label: 'Pre-Polish' },
  { value: 'hand-setting',     label: 'Hand Setting' },
  { value: 'polishing',        label: 'Polishing' },
  { value: 'plating',          label: 'Plating' },
  { value: 'final-qc',         label: 'Final Quality Check' },
  { value: 'hallmarking',      label: 'Hallmarking' },
  { value: 'laser-soldering',  label: 'Laser Soldering' },
  { value: 'final-packaging',  label: 'Final Packaging' },
  { value: 'final-stock',      label: 'Final Stock' },
]

function generateVoucherNo() {
  if (typeof window === 'undefined') return 'JJ-01'
  const n = parseInt(localStorage.getItem('jj_counter') || '0') + 1
  localStorage.setItem('jj_counter', String(n))
  return `JJ-${String(n).padStart(2, '0')}`
}

/**
 * neededItems: Array<{
 *   productId,
 *   sku,          // master SKU
 *   category,
 *   material,
 *   shortage,     // total needed qty (demand - finalStock)
 *   settingType,  // optional, used to build correct pipeline
 * }>
 *
 * Creates one full set of pipeline vouchers (die->wax-pieces->...->final-stock)
 * per transition, with issued_qty = shortage for each product.
 * batch_id starts with "needed-" so PendingVouchersModal can filter them.
 */
export function NeededVouchersModal({ open, onOpenChange, neededItems = [], onVouchersCreated }) {
  // ── Build one form per pipeline transition across all needed products ──
  const transitionGroups = useMemo(() => {
    if (!neededItems.length) return []

    // Collect all pipeline steps needed across all items
    // (use the full pipeline if no setting_type info — conservative)
    const transitionMap = new Map() // "from->to" -> { fromDept, toDept, skuRows[] }

    for (const item of neededItems) {
      const settingType = String(item.settingType || '').toLowerCase()
      const tags = settingType.split(',').map(s => s.trim()).filter(Boolean)
      const wantsWax  = tags.length === 0 || tags.some(t => t.includes('wax'))
      const wantsHand = tags.length === 0 || tags.some(t => t.includes('hand'))

      const pipeline = DEPT_PIPELINE.filter(d => {
        if (d.key === 'wax-setting'  && !wantsWax)  return false
        if (d.key === 'hand-setting' && !wantsHand) return false
        return true
      })

      for (let i = 0; i < pipeline.length - 1; i++) {
        const from = pipeline[i]
        const to   = pipeline[i + 1]
        const key  = `${from.key}->${to.key}`
        if (!transitionMap.has(key)) {
          transitionMap.set(key, { key, fromDept: from, toDept: to, skuRows: [] })
        }
        transitionMap.get(key).skuRows.push({
          sku:      item.sku,
          category: item.category || '',
          metal:    item.material || '',
          neededQty: item.shortage,
        })
      }
    }

    // Sort by pipeline order
    const order = Object.fromEntries(DEPT_PIPELINE.map((d, i) => [d.key, i]))
    return Array.from(transitionMap.values()).sort(
      (a, b) => (order[a.fromDept.key] ?? 99) - (order[b.fromDept.key] ?? 99)
    )
  }, [neededItems])

  const [forms,            setForms]            = useState([])
  const [currentStep,      setCurrentStep]      = useState(0)
  const [enrolledPeople,   setEnrolledPeople]   = useState([])
  const [allWorkers,       setAllWorkers]       = useState([])
  const [isQuickEnrollOpen,setIsQuickEnrollOpen]= useState(false)
  const [isCreating,       setIsCreating]       = useState(false)
  const [created,          setCreated]          = useState(false)
  const [createdCount,     setCreatedCount]     = useState(0)
  const [error,            setError]            = useState('')

  const buildInitialForm = useCallback((group) => ({
    voucherNo:        generateVoucherNo(),
    date:             new Date().toISOString().split('T')[0],
    scheduleFuture:   '',
    voucherType:      'New',
    issuedTo:         'Existing Workforce / Vendor',
    workType:         'In-House',
    deptFrom:         group.fromDept.key,
    deptTo:           group.toDept.key,
    noteByIssuer:     `Demand replenishment: ${group.fromDept.label} \u2192 ${group.toDept.label}`,
    issuedByName:     '',
    issuedByContact:  '',
    activeTab:        'stone',
    rows: group.skuRows.map((r, i) => ({
      id: i + 1,
      sku:          r.sku,
      category:     r.category,
      metal:        r.metal,
      issuedQty:    String(r.neededQty),
      unit1:        'Pcs',
      issuedWeight: '',
      unit2:        '',
    })),
    stoneRows:    [{ id: 1, variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' }],
    dieWeightRows:[{ id: 1, dieNumber: '', quantity: '', weight: '', unit: '' }],
  }), [])

  // Initialise forms when modal opens
  useEffect(() => {
    if (open && transitionGroups.length > 0) {
      setForms(transitionGroups.map(buildInitialForm))
      setCurrentStep(0)
      setCreated(false)
      setError('')
    }
  }, [open, transitionGroups, buildInitialForm])

  // Load workforce members
  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/workforce?active=true&page_size=500', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ]).then(([wfResult, sessionData]) => {
      const all = Array.isArray(wfResult?.data) ? wfResult.data : (wfResult?.data?.results || [])
      const prod = all.filter(w => (w.department || '').toLowerCase().includes('production'))
      setEnrolledPeople(prod)
      setAllWorkers(all)
      if (sessionData?.user) {
        const u = sessionData.user
        const name = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.username || '')
        const email = (u.email || '').toLowerCase()
        const wfRecord = all.find(m => (m.email || '').toLowerCase() === email)
        const contact = wfRecord?.phone || wfRecord?.whatsapp || ''
        if (name) {
          setForms(prev => prev.map(f => ({
            ...f,
            issuedByName: f.issuedByName || name,
            issuedByContact: f.issuedByContact || contact,
          })))
        }
      }
    }).catch(() => {})
  }, [open])

  // Auto-fill category + metal from /api/products for each form's rows
  useEffect(() => {
    if (!open || forms.length === 0) return
    forms.forEach((form, formIdx) => {
      const skus = [...new Set(form.rows.map(r => r.sku).filter(Boolean))]
      if (!skus.length) return
      Promise.all(skus.map(async sku => {
        try {
          const r = await fetch(`/api/products?master_sku=${encodeURIComponent(sku)}`, { cache: 'no-store' })
          const result = await r.json().catch(() => null)
          const items = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
          return items.find(p => String(p.master_sku || '').toLowerCase() === sku.toLowerCase()) || null
        } catch { return null }
      })).then(products => {
        const productMap = new Map()
        skus.forEach((sku, i) => { if (products[i]) productMap.set(sku.toLowerCase(), products[i]) })
        if (!productMap.size) return
        setForms(prev => {
          const next = [...prev]
          const f = { ...next[formIdx] }
          f.rows = f.rows.map(row => {
            const p = productMap.get(String(row.sku || '').toLowerCase())
            if (!p) return row
            return { ...row, category: row.category || String(p.category || ''), metal: row.metal || String(p.material || '') }
          })
          const firstProduct = productMap.get(f.rows[0]?.sku?.toLowerCase())
          if (firstProduct?.stone_entries?.length) {
            f.stoneRows = firstProduct.stone_entries.map((s, i) => ({
              id: i + 1, variety: s.variety || '', color: s.color || '', cut: s.cut || '',
              shape: s.shape || '', length: s.length || '', width: s.width || '',
              height: s.height || '', qty: s.qty || '',
            }))
          }
          next[formIdx] = f
          return next
        })
      }).catch(() => {})
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Form field helpers ──
  const updateForm = (field, value) => setForms(prev => {
    const next = [...prev]; next[currentStep] = { ...next[currentStep], [field]: value }; return next
  })
  const updateRow = (id, field, value) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.rows = f.rows.map(r => r.id === id ? { ...r, [field]: value } : r)
    next[currentStep] = f; return next
  })
  const addRow = () => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.rows = [...f.rows, { id: Date.now(), sku: '', category: '', metal: '', issuedQty: '', unit1: 'Pcs', issuedWeight: '', unit2: '' }]
    next[currentStep] = f; return next
  })
  const deleteRow = (id) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.rows = f.rows.filter(r => r.id !== id); next[currentStep] = f; return next
  })
  const updateStoneRow = (id, field, value) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.stoneRows = f.stoneRows.map(r => r.id === id ? { ...r, [field]: value } : r)
    next[currentStep] = f; return next
  })
  const addStoneRow = () => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.stoneRows = [...f.stoneRows, { id: Date.now(), variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' }]
    next[currentStep] = f; return next
  })
  const deleteStoneRow = (id) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.stoneRows = f.stoneRows.filter(r => r.id !== id); next[currentStep] = f; return next
  })
  const updateDieRow = (id, field, value) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.dieWeightRows = f.dieWeightRows.map(r => r.id === id ? { ...r, [field]: value } : r)
    next[currentStep] = f; return next
  })
  const addDieRow = () => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.dieWeightRows = [...f.dieWeightRows, { id: Date.now(), dieNumber: '', quantity: '', weight: '', unit: '' }]
    next[currentStep] = f; return next
  })
  const deleteDieRow = (id) => setForms(prev => {
    const next = [...prev]; const f = { ...next[currentStep] }
    f.dieWeightRows = f.dieWeightRows.filter(r => r.id !== id); next[currentStep] = f; return next
  })

  async function handleEnrollPerson(name) {
    const n = String(name || '').trim()
    if (!n) return
    const exists = enrolledPeople.some(p => p.full_name?.toLowerCase() === n.toLowerCase())
    if (!exists) {
      await fetch('/api/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: n, phone: '', active: true }),
      }).catch(() => {})
    }
    const res = await fetch('/api/workforce', { cache: 'no-store' }).catch(() => null)
    const result = await res?.json().catch(() => null)
    setEnrolledPeople(Array.isArray(result?.data) ? result.data : [])
    updateForm('issuedTo', n)
    setIsQuickEnrollOpen(false)
  }

  async function handleCreateAll() {
    setIsCreating(true)
    setError('')
    const batchId = `needed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    let count = 0
    try {
      for (const form of forms) {
        const materialRows = form.rows
          .filter(r => String(r.sku || '').trim() && (parseFloat(r.issuedQty) || 0) > 0)
          .map(r => ({
            sku: r.sku, category: r.category, metal: r.metal,
            issued_qty: r.issuedQty, unit1: r.unit1 || 'Pcs',
            issued_weight: r.issuedWeight || '', unit2: r.unit2 || '',
          }))
        if (!materialRows.length) continue

        let productId = null
        try {
          const pRes = await fetch(`/api/products?master_sku=${encodeURIComponent(form.rows[0].sku)}`, { cache: 'no-store' })
          const pResult = await pRes.json().catch(() => null)
          const pData = Array.isArray(pResult?.data) ? pResult.data : (pResult?.data?.results || [])
          productId = pData[0]?.id ?? null
        } catch {}

        const fromLabel = JEWELLERY_DEPARTMENTS.find(d => d.value === form.deptFrom)?.label ?? form.deptFrom
        const toLabel   = JEWELLERY_DEPARTMENTS.find(d => d.value === form.deptTo)?.label   ?? form.deptTo
        const title = `${form.voucherNo} - ${fromLabel} to ${toLabel} (Needed)`

        const body = {
          title,
          ...(productId ? { product: productId } : {}),
          status:           'created',
          approval_status:  'pending',
          voucher_no:       form.voucherNo,
          voucher_type:     form.voucherType,
          issued_to:        form.issuedTo,
          issued_by:        form.issuedByName,
          contact:          form.issuedByContact,
          work_type:        form.workType,
          schedule:         form.scheduleFuture || null,
          dept_from:        form.deptFrom,
          dept_to:          form.deptTo,
          batch_id:         batchId,
          notes:            form.noteByIssuer,
          material_rows:    materialRows,
          stone_rows:       form.stoneRows.map(({ variety, color, cut, shape, length, width, height, qty }) => ({ variety, color, cut, shape, length, width, height, qty })),
          die_weight_rows:  form.dieWeightRows.map(({ dieNumber, quantity, weight, unit }) => ({ die_number: dieNumber, quantity, weight, unit })),
        }

        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const result = await res.json().catch(() => null)
        if (!res.ok || (!result?.success && !result?.id)) {
          const msg = result?.error?.message || result?.message || `Voucher ${form.voucherNo} failed`
          throw new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg)
        }
        count++
      }
      setCreatedCount(count)
      setCreated(true)
      if (onVouchersCreated) onVouchersCreated()
    } catch (err) {
      setError(err.message || 'Failed to create vouchers.')
    } finally {
      setIsCreating(false)
    }
  }

  function handleClose() {
    setCreated(false); setError(''); setCurrentStep(0); onOpenChange(false)
  }

  const form       = forms[currentStep]
  const totalSteps = transitionGroups.length

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[700px] w-[95vw] max-h-[92vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Create Needed Vouchers</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-xs shrink-0">!</div>
              <span className="text-sm font-bold text-midnight-ink">Create Needed Vouchers</span>
              {totalSteps > 1 && (
                <span className="text-xs text-cool-gray ml-2">Voucher {currentStep + 1} of {totalSteps}</span>
              )}
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          {/* Stepper dots */}
          {totalSteps > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-2 px-4">
              {transitionGroups.map((g, i) => (
                <button key={g.key} onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all ${i === currentStep ? 'w-6 bg-red-500' : i < currentStep ? 'w-2 bg-green-400' : 'w-2 bg-gray-300'}`}
                  title={`${g.fromDept.label} \u2192 ${g.toDept.label}`} />
              ))}
            </div>
          )}

          {created ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-4">
              <CheckCircle className="h-14 w-14 text-green-500" />
              <div className="text-center">
                <p className="text-base font-bold text-midnight-ink">{createdCount} needed voucher{createdCount !== 1 ? 's' : ''} created!</p>
                <p className="text-sm text-cool-gray mt-1">Find them under <strong>Vouchers &rarr; Needed</strong>. Approve to start production.</p>
              </div>
              <Button onClick={handleClose} className="bg-trust-blue text-white rounded-full px-8">Done</Button>
            </div>
          ) : !form ? (
            <div className="flex flex-col items-center justify-center py-16 text-cool-gray">
              <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
              <p className="text-sm">No products have demand exceeding final stock. No vouchers needed.</p>
            </div>
          ) : (
            <div className="px-4 pb-1 flex flex-col gap-2 mt-2">

              {/* DATE / SCHEDULE / TYPE / VOUCHER NO. */}
              <div className="flex justify-between gap-2 flex-wrap">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Date</Label>
                    <Input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="pl-1 h-8 py-1 text-sm bg-background border-border !w-fit max-w-[130px]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Schedule</Label>
                    <Input type="date" value={form.scheduleFuture} onChange={e => updateForm('scheduleFuture', e.target.value)} className="h-8 pl-1 py-1 text-sm bg-background border-border !w-fit max-w-[130px]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
                    <Select value={form.voucherType} onValueChange={v => updateForm('voucherType', v)}>
                      <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 min-w-[90px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Voucher No.</Label>
                    <Input value={form.voucherNo} readOnly className="h-8 px-2 py-1 text-sm bg-muted border-border font-semibold !w-fit max-w-[110px]" />
                  </div>
                </div>
              </div>

              {/* Issued To / Work Type */}
              <div className="border border-border rounded-md px-2.5 py-2">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">Issued To</Label>
                    <Select value={form.issuedTo} onValueChange={v => updateForm('issuedTo', v)}>
                      <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Existing Workforce / Vendor">Existing Workforce / Vendor</SelectItem>
                        <SelectItem value="New Workforce / Vendor">New Workforce / Vendor</SelectItem>
                        {enrolledPeople.map(p => <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <button type="button" onClick={() => setIsQuickEnrollOpen(true)}
                    className="h-8 px-4 border-2 border-dashed border-trust-blue text-trust-blue rounded font-semibold text-sm hover:bg-trust-blue/10 transition-colors flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Enroll
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">Work Type</Label>
                    <Select value={form.workType} onValueChange={v => updateForm('workType', v)}>
                      <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In-House">In-House</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Job Work">Job Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* From -> To Department */}
              <div className="border border-border rounded-md px-2.5 py-2">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">From</Label>
                    <Select value={form.deptFrom} onValueChange={v => updateForm('deptFrom', v)}>
                      <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>{JEWELLERY_DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-center h-8 px-1"><ArrowRight className="h-4 w-5 text-trust-blue" /></div>
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">To</Label>
                    <Select value={form.deptTo} onValueChange={v => updateForm('deptTo', v)}>
                      <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-0"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>{JEWELLERY_DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SKU Table */}
              <div className="rounded-md overflow-hidden border border-border">
                <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_60px_0.8fr_60px_28px] bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                  {['Master SKU','Category','Metal','Qty','Unit','Weight','Unit',''].map((h,i) => <div key={i} className="px-1.5 py-2">{h}</div>)}
                </div>
                {form.rows.map(row => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_0.8fr_60px_0.8fr_60px_28px] border-t border-border items-center bg-background">
                    <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" placeholder="SKU" value={row.sku} onChange={e => updateRow(row.id,'sku',e.target.value)} /></div>
                    <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" placeholder="Category" value={row.category} onChange={e => updateRow(row.id,'category',e.target.value)} /></div>
                    <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" placeholder="Metal" value={row.metal} onChange={e => updateRow(row.id,'metal',e.target.value)} /></div>
                    <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" type="number" placeholder="0" value={row.issuedQty} onChange={e => updateRow(row.id,'issuedQty',e.target.value)} /></div>
                    <div className="px-0.5 py-0.5">
                      <Select value={row.unit1} onValueChange={v => updateRow(row.id,'unit1',v)}>
                        <SelectTrigger className="h-6 text-xs bg-background border-border px-1 focus:ring-0"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Pcs">Pcs</SelectItem><SelectItem value="Pairs">Pairs</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" placeholder="0" value={row.issuedWeight} onChange={e => updateRow(row.id,'issuedWeight',e.target.value)} /></div>
                    <div className="px-0.5 py-0.5">
                      <Select value={row.unit2} onValueChange={v => updateRow(row.id,'unit2',v)}>
                        <SelectTrigger className="h-6 text-xs bg-background border-border px-1 focus:ring-0"><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>{['g','Kg','mg','lb','oz','ct'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-center">
                      <button type="button" onClick={() => deleteRow(row.id)} className="text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                {/* Totals */}
                {(() => {
                  const qtyByUnit = {}; const wtByUnit = {}
                  form.rows.forEach(r => {
                    if (r.issuedQty) qtyByUnit[r.unit1] = (qtyByUnit[r.unit1] || 0) + parseFloat(r.issuedQty)
                    if (r.issuedWeight) wtByUnit[r.unit2] = (wtByUnit[r.unit2] || 0) + parseFloat(r.issuedWeight)
                  })
                  const units = [...new Set([...Object.keys(qtyByUnit), ...Object.keys(wtByUnit)])]
                  return units.map((unit, idx) => (
                    <div key={unit} className="grid grid-cols-[1fr_1fr_0.8fr_60px_0.8fr_60px_28px] border-t border-border bg-red-50 items-center">
                      <div className="px-1.5 py-0.5 text-xs font-bold">{idx === 0 ? 'Total' : ''}</div>
                      <div className="px-1.5 py-0.5" />
                      <div className="px-1.5 py-0.5 text-xs font-bold">{qtyByUnit[unit] ? fmtNum(qtyByUnit[unit]) : '-'}</div>
                      <div className="px-1.5 py-0.5 text-xs font-semibold">{qtyByUnit[unit] ? unit : ''}</div>
                      <div className="px-1.5 py-0.5 text-xs font-bold">{wtByUnit[unit] ? fmtNum(wtByUnit[unit]) : '-'}</div>
                      <div className="px-1.5 py-0.5 text-xs font-semibold">{wtByUnit[unit] ? unit : ''}</div>
                      <div />
                    </div>
                  ))
                })()}
                <div className="border-t border-border bg-background">
                  <button type="button" className="w-full py-1 text-trust-blue text-sm font-semibold hover:text-deep-blue" onClick={addRow}>+ Add Row</button>
                </div>
              </div>

              {/* Stone / Findings Tabs */}
              <Tabs value={form.activeTab} onValueChange={v => updateForm('activeTab', v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-red-50">
                  <TabsTrigger value="stone" className="text-sm font-semibold">Stone</TabsTrigger>
                  <TabsTrigger value="die"   className="text-sm font-semibold">Findings</TabsTrigger>
                </TabsList>
                <TabsContent value="stone" className="mt-1.5">
                  <div className="rounded-md overflow-hidden border border-border">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_28px] bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                      {['Variety','Color','Cut','Shape','L','W','H','Qty',''].map((h,i) => <div key={i} className="px-1.5 py-2">{h}</div>)}
                    </div>
                    {form.stoneRows.map(row => (
                      <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_28px] border-t border-border items-center bg-background">
                        {['variety','color','cut','shape','length','width','height','qty'].map(field => (
                          <div key={field} className="px-0.5 py-0.5">
                            <Input className="h-6 text-xs bg-background border-border"
                              placeholder={field[0].toUpperCase()+field.slice(1)} value={row[field]}
                              onChange={e => updateStoneRow(row.id, field, e.target.value)}
                              type={field === 'qty' ? 'number' : 'text'} />
                          </div>
                        ))}
                        <div className="flex items-center justify-center">
                          <button type="button" onClick={() => deleteStoneRow(row.id)} className="text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border bg-background">
                      <button type="button" className="w-full py-1 text-trust-blue text-sm font-semibold" onClick={addStoneRow}>+ Add Row</button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="die" className="mt-1.5">
                  <div className="rounded-md overflow-hidden border border-border">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                      {['Finding Code','Qty','Weight','Unit',''].map((h,i) => <div key={i} className="px-1.5 py-2">{h}</div>)}
                    </div>
                    {form.dieWeightRows.map(row => (
                      <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] border-t border-border items-center bg-background">
                        <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" placeholder="Finding Code" value={row.dieNumber} onChange={e => updateDieRow(row.id,'dieNumber',e.target.value)} /></div>
                        <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" type="number" placeholder="0" value={row.quantity} onChange={e => updateDieRow(row.id,'quantity',e.target.value)} /></div>
                        <div className="px-0.5 py-0.5"><Input className="h-6 text-xs bg-background border-border" type="number" step="0.01" placeholder="0" value={row.weight} onChange={e => updateDieRow(row.id,'weight',e.target.value)} /></div>
                        <div className="px-0.5 py-0.5">
                          <Select value={row.unit} onValueChange={v => updateDieRow(row.id,'unit',v)}>
                            <SelectTrigger className="h-6 text-xs bg-background border-border focus:ring-0"><SelectValue placeholder="Unit" /></SelectTrigger>
                            <SelectContent>{['g','Kg','mg','lb','oz','ct'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-center">
                          <button type="button" onClick={() => deleteDieRow(row.id)} className="text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border bg-background">
                      <button type="button" className="w-full py-1 text-trust-blue text-sm font-semibold" onClick={addDieRow}>+ Add Row</button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Issued By / Contact */}
              <div className="border border-border rounded-md px-2.5 py-2">
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">Issued By</Label>
                    <Select
                      value={form.issuedByName}
                      onValueChange={(v) => {
                        updateForm('issuedByName', v)
                        const person = allWorkers.find(p => p.full_name === v)
                        if (person) updateForm('issuedByContact', person.phone || person.whatsapp || '')
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm bg-background border-border">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {allWorkers.map(p => (
                          <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>
                        ))}
                        {form.issuedByName && !allWorkers.find(p => p.full_name === form.issuedByName) && (
                          <SelectItem value={form.issuedByName}>{form.issuedByName}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium text-muted-foreground">Contact</Label>
                    <Input type="tel" placeholder="+91 XXXXX XXXXX" value={form.issuedByContact} onChange={e => updateForm('issuedByContact', e.target.value)} className="h-8 text-sm bg-background border-border" />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="border border-border rounded-md px-2.5 py-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Add Note</Label>
                <Textarea value={form.noteByIssuer} onChange={e => updateForm('noteByIssuer', e.target.value)}
                  placeholder="Enter notes..." className="min-h-[36px] max-h-[36px] resize-none text-sm bg-background border-border p-1 mt-0.5" />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">{error}</div>
              )}

              {/* Footer buttons */}
              <div className="flex items-center gap-2 mb-2">
                {totalSteps > 1 && (
                  <>
                    <Button variant="outline" size="sm" disabled={currentStep === 0}
                      onClick={() => setCurrentStep(s => s - 1)} className="h-8 px-3 text-sm gap-1">
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    {currentStep < totalSteps - 1 && (
                      <Button variant="outline" size="sm"
                        onClick={() => setCurrentStep(s => s + 1)} className="h-8 px-3 text-sm gap-1">
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={handleClose} className="h-8 px-4 text-sm">Cancel</Button>
                  <Button size="sm" onClick={handleCreateAll} disabled={isCreating}
                    className="h-8 px-4 text-sm bg-red-600 hover:bg-red-700 text-white font-bold">
                    {isCreating
                      ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Creating...</>
                      : `Create Job Vouchers (${totalSteps})`}
                  </Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      <QuickEnrollModal open={isQuickEnrollOpen} onOpenChange={setIsQuickEnrollOpen} onEnroll={handleEnrollPerson} />
    </>
  )
}
