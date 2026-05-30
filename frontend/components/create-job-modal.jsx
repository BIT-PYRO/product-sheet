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
import { CalendarIcon, Plus, Trash2, X, ArrowRight, FileText, Loader2 } from "lucide-react"
import { useDrafts, useDraftLoader } from "@/components/drafts-manager"
import { fmtNum } from "@/lib/utils"

function workStyleToWorkType(ws) {
  const s = (ws || '').toLowerCase()
  if (s.includes('contract')) return 'Contract'
  if (s.includes('job')) return 'Job Work'
  return 'In-House'
}

function generateVoucherNo() {
  if (typeof window === 'undefined') return 'JJ-01'
  // Get current counter from localStorage or start at 1
  const currentCount = parseInt(localStorage.getItem('jj_counter') || '0') + 1
  // Save next counter value
  localStorage.setItem('jj_counter', currentCount.toString())
  // Return formatted voucher number JJ-01, JJ-02, etc.
  return `JJ-${String(currentCount).padStart(2, '0')}`
}

export function CreateJobModal({ open, onOpenChange, onQuickEnroll, onJobCreated, initialSku = '', mode = 'single', picklistGroupNumber = null }) {
  const { saveDraft } = useDrafts()
  const loadedDraft = useDraftLoader()
  const [isQuickEnrollModalOpen, setIsQuickEnrollModalOpen] = useState(false)
  const [isPrintVoucherModalOpen, setIsPrintVoucherModalOpen] = useState(false)
  const [printVoucherData, setPrintVoucherData] = useState(null)
  const [activeTab, setActiveTab] = useState("stone")
  const [enrolledPeople, setEnrolledPeople] = useState([])
  const [allWorkers, setAllWorkers] = useState([])
  const [rows, setRows] = useState([
    { id: 1, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
    { id: 2, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
    { id: 3, sku: "", category: "", metal: "", issuedQty: "", unit1: "", issuedWeight: "", unit2: "" },
  ])

  // Picklist state (only used when mode === 'all')
  const [picklists, setPicklists] = useState([])
  const [selectedPicklistId, setSelectedPicklistId] = useState("")
  const [isPicklistLoading, setIsPicklistLoading] = useState(false)
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [isIssueStoneLoading, setIsIssueStoneLoading] = useState(false)
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
    { id: 1, variety: "", color: "", cut: "", shape: "", length: "", width: "", height: "", qty: "" },
  ])
  const [dieWeightRows, setDieWeightRows] = useState([
    { id: 1, dieNumber: "", quantity: "", weight: "", unit: "" },
  ])
  // Die rows for pre-casting stages (wax-pieces, wax-setting, casting)
  const [dieRows, setDieRows] = useState([])
  // [{id, masterSku, dieCode, qtyPerPiece, issuedQty}]
  const [dieCodesTab, setDieCodesTab] = useState([])
  // [{id, dieCode, dieQty, dieLocation}] — reference tab

  async function loadWorkforceMembers() {
    try {
      const [wfRes, sessionRes] = await Promise.all([
        fetch('/api/workforce?active=true&page_size=500', { cache: 'no-store' }),
        fetch('/api/auth/session', { cache: 'no-store' }),
      ])
      const [wfResult, sessionData] = await Promise.all([
        wfRes.json().catch(() => null),
        sessionRes.json().catch(() => null),
      ])
      const all = Array.isArray(wfResult?.data) ? wfResult.data : (wfResult?.data?.results || [])
      const prod = all.filter(w => (w.department || '').toLowerCase().includes('production'))
      setEnrolledPeople(prod)
      setAllWorkers(all)
      if (sessionData?.user) {
        const u = sessionData.user
        const name = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.username || '')
        const email = (u.email || '').toLowerCase()
        const wfRecord = all.find(m => (m.email || '').toLowerCase() === email)
        if (name) setIssuedByName(name)
        if (wfRecord) setIssuedByContact(wfRecord.phone || wfRecord.whatsapp || '')
      }
    } catch {
      // Keep form usable even if workforce list fails.
    }
  }

  // Generate voucher number on client mount (localStorage is not available on server)
  useEffect(() => {
    setVoucherNo(generateVoucherNo())
  }, [])

  // Pre-fill first SKU row when initialSku is provided
  useEffect(() => {
    if (initialSku && open) {
      setRows(prev => prev.map((r, i) => i === 0 ? { ...r, sku: initialSku } : r))
    }
  }, [initialSku, open])

  // Refresh enrolled people from backend when modal opens
  useEffect(() => {
    if (open) {
      loadWorkforceMembers()
    }
  }, [open])

  // Load picklists when mode is 'all' or 'single' and modal opens
  useEffect(() => {
    if (open && (mode === 'all' || mode === 'single')) {
      setIsPicklistLoading(true)
      setSelectedPicklistId("")
      fetch('/api/picklist-groups', { cache: 'no-store' })
        .then(r => r.json())
        .then(result => {
          const groups = Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.picklists)
              ? result.picklists
              : []
          setPicklists(groups)
        })
        .catch(() => setPicklists([]))
        .finally(() => setIsPicklistLoading(false))
    } else if (open && mode === 'repair') {
      setIsPicklistLoading(true)
      setSelectedPicklistId("")
      fetch('/api/inventory/repair-batches/?confirmed=true&voucher_created=false', { cache: 'no-store' })
        .then(r => r.json())
        .then(result => {
          const activeBatches = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
          setPicklists(activeBatches.map(b => ({
            id: b.batch_no,
            number: b.batch_no,
            name: `Batch Date: ${new Date(b.date).toLocaleDateString()}`,
            items_count: b.items_count,
            ...b
          })))
        })
        .catch(() => setPicklists([]))
        .finally(() => setIsPicklistLoading(false))
    }
  }, [open, mode])

  // Auto-populate SKU rows when a picklist is selected
  useEffect(() => {
    if (mode === 'repair' && selectedPicklistId) {
      const batch = picklists.find(b => String(b.id) === selectedPicklistId)
      if (!batch) return

      setIsPicklistLoading(true)
      fetch(`/api/inventory/repair-queue/?batch=${batch.id}&confirmed=true`, { cache: 'no-store' })
        .then(r => r.json())
        .then(result => {
          const items = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
          const skuMap = new Map()
          items.forEach(item => {
            const sku = String(item.sku || '').trim()
            if (!sku) return
            if (skuMap.has(sku)) {
              const existing = skuMap.get(sku)
              existing.issuedQty = String(parseInt(existing.issuedQty) + (parseInt(item.quantity) || 1))
            } else {
              skuMap.set(sku, {
                sku,
                category: '',
                metal: '',
                issuedQty: String(item.quantity || 1),
                unit1: 'Pcs',
                issuedWeight: '',
                unit2: ''
              })
            }
          })
          const newRows = Array.from(skuMap.values()).map((r, idx) => ({
            id: idx + 1,
            ...r
          }))
          setRows(newRows)
        })
        .catch(() => setRows([]))
        .finally(() => setIsPicklistLoading(false))
      return
    }

    if ((mode !== 'all' && mode !== 'single') || !selectedPicklistId) return
    const pl = picklists.find(p => String(p.id) === selectedPicklistId)
    if (!pl || !Array.isArray(pl.items) || pl.items.length === 0) return
    // Picklist items use Final Stock SKUs (e.g. AJB9/G). Convert to Master SKU
    // by stripping the variation suffix after the last '/'.
    const toMasterSku = (fsSku) => {
      const s = String(fsSku || '').trim()
      return s.includes('/') ? s.substring(0, s.lastIndexOf('/')) : s
    }
    // Deduplicate by master SKU and sum up "needed" quantities
    const masterMap = new Map()
    pl.items.forEach((item) => {
      const finalSku = item.sku || item.master_sku || ''
      const masterSku = toMasterSku(finalSku)
      if (!masterSku) return
      if (masterMap.has(masterSku)) {
        const existing = masterMap.get(masterSku)
        const prev = parseFloat(existing.issuedQty) || 0
        const add = parseFloat(item.needed || item.quantity || 0)
        existing.issuedQty = String(prev + add)
      } else {
        masterMap.set(masterSku, {
          sku: masterSku,
          category: item.category || '',
          metal: item.metal || '',
          issuedQty: String(item.needed || item.quantity || ''),
        })
      }
    })
    const newRows = Array.from(masterMap.values()).map((entry, idx) => ({
      id: idx + 1,
      ...entry,
      unit1: 'Pcs',
      issuedWeight: '',
      unit2: '',
    }))
    setRows(newRows)
    // Auto-fill departments for first pipeline step when in 'all' mode
    if (mode === 'all') {
      setDeptFrom('wax-pieces')
      setDeptTo('wax-setting')
    }
  }, [selectedPicklistId, mode, picklists])

  // Force voucherType to 'Repair' when in repair mode
  useEffect(() => {
    if (mode === 'repair') {
      setVoucherType('Repair')
    }
  }, [mode])

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
      if (draft.stoneRows) setStoneRows(draft.stoneRows.map(r => ({ id: r.id, variety: r.variety ?? r.name ?? '', color: r.color ?? '', cut: r.cut ?? '', shape: r.shape ?? r.size ?? '', length: r.length ?? '', width: r.width ?? '', height: r.height ?? '', qty: r.qty ?? r.quantity ?? '' })))
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
      { id: Date.now(), variety: "", color: "", cut: "", shape: "", length: "", width: "", height: "", qty: "" },
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

  // Derived key from SKU values only — changes when SKUs change, NOT when category/metal fill
  const skuKey = rows.map(r => String(r.sku || '').trim()).join('|')

  // Pre-casting stages that show die sub-rows
  const PRE_CASTING_STAGES = ['wax-pieces', 'wax-setting', 'casting']
  const isPreCasting = PRE_CASTING_STAGES.includes(deptTo)

  // Key that changes when SKU or issued qty changes (for die rows auto-fetch)
  const skuIssuedKey = rows.map(r => `${String(r.sku || '').trim()}:${String(r.issuedQty || '').trim()}`).join('|')

  // Auto-fetch die codes from product.die_numbers when dept is pre-casting and SKU/qty changes
  useEffect(() => {
    if (!isPreCasting) { setDieRows([]); return }
    const skuEntries = rows.filter(r => String(r.sku || '').trim() && String(r.issuedQty || '').trim())
    if (!skuEntries.length) { setDieRows([]); return }
    const timer = setTimeout(async () => {
      const allDieRows = []
      for (const row of skuEntries) {
        const sku = String(row.sku).trim()
        const qty = parseInt(row.issuedQty) || 0
        try {
          const res = await fetch(`/api/products?master_sku=${encodeURIComponent(sku)}`, { cache: 'no-store' })
          const result = await res.json().catch(() => null)
          const items = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
          const product = items.find(p => String(p.master_sku || '').toLowerCase() === sku.toLowerCase()) || items[0]
          const dies = Array.isArray(product?.die_numbers) ? product.die_numbers.filter(d => d.value) : []
          for (const die of dies) {
            const qpp = parseInt(die.quantity) || 1
            allDieRows.push({
              id: `${sku}-${die.value}`,
              masterSku: sku,
              dieCode: die.value,
              qtyPerPiece: qpp,
              issuedQty: qty * qpp,
              location: die.location || '',
            })
          }
        } catch {}
      }
      setDieRows(allDieRows)
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreCasting, skuIssuedKey])

  // Auto-fill category, metal, and stone rows from product when a Master SKU is entered
  useEffect(() => {
    const skuEntries = rows
      .map(r => ({ id: r.id, sku: String(r.sku || '').trim() }))
      .filter(e => e.sku)
    if (!skuEntries.length) return
    const timer = setTimeout(async () => {
      const fetchedProducts = new Map()
      const uniqueSkus = [...new Set(skuEntries.map(e => e.sku))]
      await Promise.all(uniqueSkus.map(async (sku) => {
        try {
          const r = await fetch(`/api/products?master_sku=${encodeURIComponent(sku)}`, { cache: 'no-store' })
          const result = await r.json().catch(() => null)
          const items = Array.isArray(result?.data) ? result.data : (result?.data?.results || [])
          const product = items.find(p => String(p.master_sku || '').toLowerCase() === sku.toLowerCase()) || items[0]
          if (product) fetchedProducts.set(sku.toLowerCase(), product)
        } catch {}
      }))
      if (!fetchedProducts.size) return
      // Fill category + metal for each row (only if currently empty)
      setRows(prev => prev.map(row => {
        const sku = String(row.sku || '').trim().toLowerCase()
        if (!sku) return row
        const product = fetchedProducts.get(sku)
        if (!product) return row
        return {
          ...row,
          category: row.category || String(product.category || ''),
          metal: row.metal || String(product.material || ''),
        }
      }))
      // Fill stone rows from first SKU's product
      const firstProduct = fetchedProducts.get(skuEntries[0].sku.toLowerCase())
      if (firstProduct && Array.isArray(firstProduct.stone_entries) && firstProduct.stone_entries.length > 0) {
        setStoneRows(firstProduct.stone_entries.map((s, i) => ({
          id: i + 1,
          variety: s.variety || '',
          color: s.color || '',
          cut: s.cut || '',
          shape: s.shape || '',
          length: s.length || '',
          width: s.width || '',
          height: s.height || '',
          qty: s.qty || '',
        })))
      }
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey])

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

  // Department pipeline for bulk voucher creation (matches backend DEPARTMENT_PIPELINE)
  const DEPARTMENT_PIPELINE = [
    { key: 'die', label: 'Die' },
    { key: 'wax-pieces', label: 'Wax Piece' },
    { key: 'wax-setting', label: 'Wax Setting' },
    { key: 'casting', label: 'Casting' },
    { key: 'filing', label: 'Filing / Grinding' },
    { key: 'pre-polish', label: 'Pre-Polish' },
    { key: 'hand-setting', label: 'Hand Setting' },
    { key: 'polishing', label: 'Final Polish' },
    { key: 'plating', label: 'Plating' },
    { key: 'final-stock', label: 'Final Stock' },
  ]

  async function handleSubmit() {
    if (mode === 'repair') {
      setIsBulkCreating(true)
      try {
        const res = await fetch('/api/jobs/create-repair-vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_no: selectedPicklistId,
            issued_to: issuedTo,
            issued_by: issuedByName,
            contact: issuedByContact,
            work_type: workType,
            schedule: scheduleFuture || null,
            notes: noteByIssuer,
          })
        })
        const result = await res.json().catch(() => null)
        if (res.ok && result?.success) {
          alert(result?.message || 'Successfully created repair vouchers!')
          if (onJobCreated) onJobCreated()
          onOpenChange(false)
        } else {
          alert(result?.error?.message || 'Failed to create repair vouchers.')
        }
      } catch {
        alert('Network error. Failed to create repair vouchers.')
      } finally {
        setIsBulkCreating(false)
      }
      return
    }

    // Bulk-create mode: one voucher per department step, ALL SKUs as material rows in each
    if (mode === 'all' || mode === 'single-pipeline') {
      const skuRows = rows.filter(r => String(r.sku || '').trim())
      if (skuRows.length === 0) {
        alert('No SKU rows to create vouchers for. Please enter at least one SKU.')
        return
      }
      setIsBulkCreating(true)

      // Resolve picklist group DB id once before the loop
      let picklistGroupDbId = null
      const plNumber = mode === 'all'
        ? (() => { const pl = picklists.find(p => String(p.id) === selectedPicklistId); return pl?.number ?? null })()
        : picklistGroupNumber
      if (plNumber !== null && plNumber !== undefined) {
        try {
          const pgRes = await fetch(`/api/picklist-groups?number=${plNumber}`, { cache: 'no-store' })
          const pgResult = await pgRes.json().catch(() => null)
          const pgData = Array.isArray(pgResult?.data) ? pgResult.data
            : Array.isArray(pgResult?.data?.results) ? pgResult.data.results : []
          picklistGroupDbId = pgData[0]?.db_id ?? null
        } catch { /* skip */ }
      }

      const results = { created: 0, failed: 0, errors: [] }

      try {
        // 1. Resolve all products first
        const productMap = new Map() // sku -> product
        for (const row of skuRows) {
          const sku = String(row.sku).trim()
          if (productMap.has(sku)) continue
          try {
            const prodRes = await fetch(`/api/products?master_sku=${encodeURIComponent(sku)}`, { cache: 'no-store' })
            const prodResult = await prodRes.json().catch(() => null)
            const prodData = Array.isArray(prodResult?.data) ? prodResult.data : (prodResult?.data?.results || [])
            const product = prodData.find(p => String(p.master_sku || '').toLowerCase() === sku.toLowerCase()) || prodData[0]
            if (product) productMap.set(sku, product)
          } catch { /* skip */ }
        }

        // Use the first found product for the voucher's product FK
        const firstProduct = productMap.values().next().value
        if (!firstProduct) {
          alert('No matching products found for any SKU.')
          setIsBulkCreating(false)
          return
        }

        // 2. Build per-product custom pipelines based on setting_type
        //    and group material rows by transition
        const transitionBuckets = new Map() // "from->to" => { fromDept, toDept, materialRows[], productId }

        for (const row of skuRows) {
          const sku = String(row.sku).trim()
          const product = productMap.get(sku)

          // Determine which stages this product needs
          let pipeline = [...DEPARTMENT_PIPELINE]
          if (product) {
            const settingType = (product.setting_type || '').toLowerCase()
            const tags = settingType.split(',').map(s => s.trim()).filter(Boolean)
            const wantsWax  = tags.length === 0 || tags.some(t => t.includes('wax'))
            const wantsHand = tags.length === 0 || tags.some(t => t.includes('hand'))

            pipeline = DEPARTMENT_PIPELINE.filter(dept => {
              if (dept.key === 'wax-setting' && !wantsWax) return false
              if (dept.key === 'hand-setting' && !wantsHand) return false
              return true
            })
          }

          const materialRow = {
            sku,
            category: row.category || '',
            metal: row.metal || '',
            issued_qty: row.issuedQty || '',
            unit1: row.unit1 || 'Pcs',
            issued_weight: row.issuedWeight || '',
            unit2: row.unit2 || '',
          }

          // Add this SKU's material row to each transition in its custom pipeline
          for (let i = 0; i < pipeline.length - 1; i++) {
            const fromDept = pipeline[i]
            const toDept = pipeline[i + 1]
            const key = `${fromDept.key}->${toDept.key}`
            if (!transitionBuckets.has(key)) {
              transitionBuckets.set(key, {
                fromDept,
                toDept,
                materialRows: [],
                productId: product ? product.id : firstProduct.id,
              })
            }
            transitionBuckets.get(key).materialRows.push(materialRow)
          }
        }

        // Sort transitions by pipeline order
        const deptOrder = {}
        DEPARTMENT_PIPELINE.forEach((d, i) => { deptOrder[d.key] = i })
        const sortedTransitions = Array.from(transitionBuckets.values()).sort((a, b) => {
          const aFrom = deptOrder[a.fromDept.key] ?? 99
          const bFrom = deptOrder[b.fromDept.key] ?? 99
          if (aFrom !== bFrom) return aFrom - bFrom
          return (deptOrder[a.toDept.key] ?? 99) - (deptOrder[b.toDept.key] ?? 99)
        })

        // Filter to only transitions within the user-selected From→To range
        // In 'all' mode always create the full pipeline regardless of the selector values
        const filteredTransitions = (mode !== 'all' && deptFrom && deptTo)
          ? sortedTransitions.filter(t =>
              (deptOrder[t.fromDept.key] ?? 99) >= (deptOrder[deptFrom] ?? 99) &&
              (deptOrder[t.toDept.key] ?? 99) <= (deptOrder[deptTo] ?? 99)
            )
          : sortedTransitions

        // 3. Create one voucher per unique transition
        let localCounter = parseInt(localStorage.getItem('jj_counter') || '0')
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        for (let i = 0; i < filteredTransitions.length; i++) {
          const { fromDept, toDept, materialRows, productId } = filteredTransitions[i]
          const totalQty = materialRows.reduce((sum, r) => sum + (parseInt(r.issued_qty) || 0), 0)

          // Compute die_rows for pre-casting stages from product.die_numbers
          const PRE_CASTING_KEYS = new Set(['wax-pieces', 'wax-setting', 'casting'])
          const isPreCastingTransition = PRE_CASTING_KEYS.has(toDept.key)
          const dieRowsForVoucher = []
          if (isPreCastingTransition) {
            for (const materialRow of materialRows) {
              const sku = String(materialRow.sku || '').trim()
              const product = productMap.get(sku)
              const dies = Array.isArray(product?.die_numbers) ? product.die_numbers.filter(d => d.value) : []
              const skuQty = parseInt(materialRow.issued_qty) || 0
              for (const die of dies) {
                const qpp = parseInt(die.quantity) || 1
                dieRowsForVoucher.push({
                  master_sku: sku,
                  die_code: die.value,
                  qty_per_piece: qpp,
                  issued_qty: String(skuQty * qpp),
                })
              }
            }
          }

          // For pre-casting stages, use die code aggregate rows as material_rows
          const dieCodeAgg = {}
          if (isPreCastingTransition) {
            for (const dr of dieRowsForVoucher) {
              if (!dieCodeAgg[dr.die_code]) {
                dieCodeAgg[dr.die_code] = { sku: dr.die_code, category: 'Die', metal: '', issued_qty: 0, unit1: 'Pcs', issued_weight: '', unit2: '' }
              }
              dieCodeAgg[dr.die_code].issued_qty += parseInt(dr.issued_qty) || 0
            }
          }
          const effectiveMaterialRows = isPreCastingTransition && Object.keys(dieCodeAgg).length > 0
            ? Object.values(dieCodeAgg).map(r => ({ ...r, issued_qty: String(r.issued_qty) }))
            : materialRows

          localCounter++
          const vNo = `JJ-${String(localCounter).padStart(2, '0')}`
          const title = `${vNo} - ${fromDept.label} to ${toDept.label}`

          try {
            const createRes = await fetch('/api/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                product: productId,
                status: 'created',
                voucher_no: vNo,
                voucher_type: voucherType,
                issued_to: issuedTo,
                issued_by: issuedByName,
                contact: issuedByContact,
                work_type: workType,
                schedule: scheduleFuture || null,
                dept_from: fromDept.key,
                dept_to: toDept.key,
                batch_id: batchId,
                department_order: i,
                notes: noteByIssuer || `Step ${i + 1}: ${fromDept.label} → ${toDept.label}`,
                material_rows: effectiveMaterialRows,
                stone_rows: stoneRows.map(({ variety, color, cut, shape, length, width, height, qty }) => ({ variety, color, cut, shape, length, width, height, qty })),
                die_weight_rows: dieWeightRows.map(({ dieNumber, quantity, weight, unit }) => ({ die_number: dieNumber, quantity, weight, unit })),
                die_rows: dieRowsForVoucher,
                ...(picklistGroupDbId ? { picklist_group: picklistGroupDbId } : {}),
              }),
            })
            const createResult = await createRes.json().catch(() => null)
            if (createRes.ok && createResult?.success) {
              results.created++
            } else {
              results.failed++
              results.errors.push(`${fromDept.label}→${toDept.label}: ${createResult?.error?.message || 'Creation failed'}`)
            }
          } catch {
            results.failed++
            results.errors.push(`${fromDept.label}→${toDept.label}: Network error`)
          }
        }

        // Save the updated counter
        localStorage.setItem('jj_counter', String(localCounter))

        // Show summary
        let msg = `${results.created} voucher(s) created (filtered by setting type)!`
        if (results.failed > 0) {
          msg += `\n${results.failed} failed:\n${results.errors.join('\n')}`
        }
        alert(msg)

        if (results.created > 0 && onJobCreated) {
          onJobCreated({ vouchers_created: results.created })
        }
        if (results.created > 0) {
          onOpenChange(false)
        }
      } catch {
        alert('Unable to create vouchers right now. Please try again.')
      } finally {
        setIsBulkCreating(false)
      }
      return
    }

    // Single-create mode (original flow)
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
        productsData.find((item) => String(item.master_sku || '').toLowerCase() === primarySku.toLowerCase()) ||
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
          approval_status: 'in_process',
          voucher_no: voucherNo,
          voucher_type: voucherType,
          issued_to: issuedTo,
          issued_by: issuedByName,
          contact: issuedByContact,
          work_type: workType,
          schedule: scheduleFuture || null,
          dept_from: deptFrom,
          dept_to: deptTo,
          notes: noteByIssuer,
          material_rows: isPreCasting && dieRows.length > 0
            ? (() => {
                const agg = {}
                for (const r of dieRows) {
                  if (!agg[r.dieCode]) {
                    agg[r.dieCode] = { sku: r.dieCode, category: 'Die', metal: '', issued_qty: 0, unit1: 'Pcs', issued_weight: '', unit2: '' }
                  }
                  agg[r.dieCode].issued_qty += parseInt(r.issuedQty) || 0
                }
                return Object.values(agg).map(r => ({ ...r, issued_qty: String(r.issued_qty) }))
              })()
            : rows.map(({ sku, category, metal, issuedQty, unit1, issuedWeight, unit2 }) => ({ sku, category, metal, issued_qty: issuedQty, unit1, issued_weight: issuedWeight, unit2 })),
          stone_rows: stoneRows.map(({ variety, color, cut, shape, length, width, height, qty }) => ({ variety, color, cut, shape, length, width, height, qty })),
          die_weight_rows: dieWeightRows.map(({ dieNumber, quantity, weight, unit }) => ({ die_number: dieNumber, quantity, weight, unit })),
          die_rows: isPreCasting ? dieRows.map(r => ({
            master_sku: r.masterSku,
            die_code: r.dieCode,
            qty_per_piece: r.qtyPerPiece,
            issued_qty: String(r.issuedQty),
          })) : [],
        }),
      })

      const createResult = await createResponse.json().catch(() => null)
      if (!createResponse.ok || !createResult?.success) {
        const message = createResult?.error?.message || createResult?.message || 'Unable to create job.'
        alert(message)
        return
      }

      const createdJob = createResult?.data || null
      if (onJobCreated) {
        onJobCreated(createdJob)
      }
      alert('Job created successfully!')
      onOpenChange(false)
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

  // Group dieRows by die code for bifurcated display
  const dieCodeGroups = (() => {
    const map = {}
    for (const dr of dieRows) {
      if (!map[dr.dieCode]) {
        map[dr.dieCode] = { dieCode: dr.dieCode, location: dr.location || '', entries: [], total: 0 }
      }
      const qty = parseInt(dr.issuedQty) || 0
      map[dr.dieCode].entries.push({ masterSku: dr.masterSku, qtyPerPiece: dr.qtyPerPiece, totalQty: qty })
      map[dr.dieCode].total += qty
    }
    return Object.values(map)
  })()

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

            {/* RIGHT: TYPE, PICKLIST (if all mode) & VOUCHER NO. */}
            <div className="flex gap-2">
              {/* TYPE */}
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
                <Select value={voucherType} onValueChange={setVoucherType} disabled={mode === 'repair'}>
                  <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mode === 'repair' ? (
                      <SelectItem value="Repair">Repair</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* PICKLIST DROPDOWN - in "all" and "single" mode */}
              {(mode === 'all' || mode === 'single') && (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Picklist</Label>
                  <Select value={selectedPicklistId} onValueChange={setSelectedPicklistId}>
                    <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 focus:outline-none min-w-[150px]">
                      <SelectValue placeholder={isPicklistLoading ? "Loading..." : "Select Picklist"} />
                    </SelectTrigger>
                    <SelectContent>
                      {picklists.map(pl => (
                        <SelectItem key={pl.id} value={String(pl.id)}>
                          #{pl.number} — {pl.name}
                          {pl.items?.length ? ` (${pl.items.length})` : ''}
                        </SelectItem>
                      ))}
                      {picklists.length === 0 && !isPicklistLoading && (
                        <SelectItem value="__none" disabled>No picklists available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* REPAIR BATCH DROPDOWN - in "repair" mode */}
              {mode === 'repair' && (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Repair Batch</Label>
                  <Select value={selectedPicklistId} onValueChange={setSelectedPicklistId}>
                    <SelectTrigger className="h-8 px-2 py-1 text-sm bg-background border-border focus:ring-0 focus:outline-none min-w-[150px]">
                      <SelectValue placeholder={isPicklistLoading ? "Loading..." : "Select Batch"} />
                    </SelectTrigger>
                    <SelectContent>
                      {picklists.map(pl => (
                        <SelectItem key={pl.id} value={String(pl.id)}>
                          #{pl.number} — {pl.name}
                        </SelectItem>
                      ))}
                      {picklists.length === 0 && !isPicklistLoading && (
                        <SelectItem value="__none" disabled>No active batches</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                <Select value={issuedTo} onValueChange={(v) => {
                  setIssuedTo(v)
                  const person = enrolledPeople.find(p => p.full_name === v)
                  if (person?.working_style) setWorkType(workStyleToWorkType(person.working_style))
                }}>
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

          {/* DEPARTMENT TRANSFER — hidden for single-pipeline and repair mode */}
          {mode !== 'repair' && (
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
          )}

          {/* SKU Table */}
          <div className="rounded-md overflow-hidden border border-border">
            {/* Table Header - blue */}
            <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_60px_0.8fr_60px_32px] gap-0 bg-trust-blue text-white text-[9px] font-bold uppercase tracking-wider">
              <div className="px-1.5 py-2">Master SKU</div>
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
                  <Input className="h-6 text-sm bg-background border-border" placeholder="Master SKU" value={row.sku} onChange={(e) => updateRow(row.id, "sku", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" placeholder="Category" value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" placeholder="Metal" value={row.metal} onChange={(e) => updateRow(row.id, "metal", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Input className="h-6 text-sm bg-background border-border" type="number" placeholder="0" value={row.issuedQty} onChange={(e) => updateRow(row.id, "issuedQty", e.target.value)} />
                </div>
                <div className="px-0.5 py-0.5">
                  <Select value={row.unit1} onValueChange={(v) => updateRow(row.id, "unit1", v)}>
                    <SelectTrigger className="h-6 text-sm bg-background border-border p-0.5 focus:ring-0 focus:outline-none"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pcs">Pcs</SelectItem>
                      <SelectItem value="Pairs">Pairs</SelectItem>
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
                    <div className="text-sm font-bold text-foreground">{qtyByUnit[unit] ? fmtNum(qtyByUnit[unit]) : "-"}</div>
                  </div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-semibold text-foreground">{qtyByUnit[unit] ? unit : ""}</div>
                  </div>
                  <div className="px-1.5 py-0.5">
                    <div className="text-sm font-bold text-foreground">{weightByUnit[unit] ? fmtNum(weightByUnit[unit]) : "-"}</div>
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
            </div>
          </div>

          {/* DIE SUB-ROWS — visible only for pre-casting stages */}
          {isPreCasting && (
            <div className="rounded-md overflow-hidden border border-blue-400/40">
              <div className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-400/40">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  Die Codes — Auto-calculated from Product Die Numbers
                </p>
              </div>
              {dieCodeGroups.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {rows.some(r => String(r.sku || '').trim()) ? 'No die numbers configured on the entered SKUs. Add them in the Master Product Sheet.' : 'Enter a Master SKU and Qty above to auto-populate die rows.'}
                </p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-blue-500 px-1.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[30%]">Die Code</th>
                      <th className="border border-blue-500 px-1.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[30%]">Master SKU</th>
                      <th className="border border-blue-500 px-1.5 py-2 text-right text-[9px] font-bold uppercase tracking-wider w-[40%]">Qty</th>
                    </tr>
                  </thead>
                  {dieCodeGroups.map((group) => (
                    <tbody key={group.dieCode}>
                      {group.entries.map((entry, idx) => (
                        <tr key={`${group.dieCode}-${entry.masterSku}`} className="bg-background">
                          <td className="border border-border px-1.5 py-1 font-bold text-foreground align-middle">{idx === 0 ? group.dieCode : ''}</td>
                          <td className="border border-border px-1.5 py-1 text-muted-foreground align-middle">{entry.masterSku}</td>
                          <td className="border border-border px-1.5 py-1 text-right align-middle">
                            <span className="text-muted-foreground">{entry.qtyPerPiece}/pc × {Math.round(entry.totalQty / (entry.qtyPerPiece || 1))} =</span>{' '}
                            <span className="font-bold text-foreground">{entry.totalQty} pcs</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                        <td className="border border-border px-1.5 py-1" />
                        <td className="border border-border px-1.5 py-1 font-bold text-blue-700 dark:text-blue-300">Total</td>
                        <td className="border border-border px-1.5 py-1 text-right font-bold text-blue-700 dark:text-blue-300">{group.total} pcs</td>
                      </tr>
                    </tbody>
                  ))}
                </table>
              )}
            </div>
          )}

          {/* STONE & FINDINGS TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-trust-blue/10">
              <TabsTrigger value="stone" className="text-sm font-semibold">Stone</TabsTrigger>
              <TabsTrigger value="die" className="text-sm font-semibold">Findings</TabsTrigger>
              <TabsTrigger value="die-codes" className="text-sm font-semibold">Die Codes</TabsTrigger>
            </TabsList>

            {/* STONE AND FINDINGS TAB */}
            <TabsContent value="stone" className="mt-2">
              <div className="flex flex-col gap-1">
                <div className="rounded-md overflow-hidden border border-border">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_32px] gap-0 bg-trust-blue text-white text-[9px] font-bold uppercase tracking-wider">
                    <div className="px-1.5 py-2">Variety</div>
                    <div className="px-1.5 py-2">Color</div>
                    <div className="px-1.5 py-2">Cut</div>
                    <div className="px-1.5 py-2">Shape</div>
                    <div className="px-1.5 py-2">L</div>
                    <div className="px-1.5 py-2">W</div>
                    <div className="px-1.5 py-2">H</div>
                    <div className="px-1.5 py-2">Qty</div>
                    <div className="px-1.5 py-2"></div>
                  </div>
                  {stoneRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_32px] gap-0 border-t border-border items-center bg-background"
                    >
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Variety" value={row.variety} onChange={(e) => updateStoneRow(row.id, "variety", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Color" value={row.color} onChange={(e) => updateStoneRow(row.id, "color", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Cut" value={row.cut} onChange={(e) => updateStoneRow(row.id, "cut", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Shape" value={row.shape} onChange={(e) => updateStoneRow(row.id, "shape", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="L" value={row.length} onChange={(e) => updateStoneRow(row.id, "length", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="W" value={row.width} onChange={(e) => updateStoneRow(row.id, "width", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" placeholder="H" value={row.height} onChange={(e) => updateStoneRow(row.id, "height", e.target.value)} />
                      </div>
                      <div className="px-0.5 py-0.5">
                        <Input className="h-6 text-sm bg-background border-border" type="number" placeholder="0" value={row.qty} onChange={(e) => updateStoneRow(row.id, "qty", e.target.value)} />
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
                    <div className="px-1.5 py-2">Finding Code</div>
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
                        <Input className="h-6 text-sm bg-background border-border" placeholder="Finding Code" value={row.finding_code || row.dieNumber} onChange={(e) => updateDieWeightRow(row.id, "finding_code", e.target.value)} />
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

            {/* DIE CODES REFERENCE TAB */}
            <TabsContent value="die-codes" className="mt-2">
              <div className="flex flex-col gap-1">
                {!isPreCasting ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Select a pre-casting stage (Wax Pieces, Wax Setting, Casting) to see die codes.</p>
                ) : dieCodeGroups.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No die numbers configured on the entered SKUs. Add them in the Master Product Sheet.</p>
                ) : (
                  <div className="rounded-md overflow-hidden border border-blue-400/40">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-blue-500 px-1.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[30%]">Die Code</th>
                          <th className="border border-blue-500 px-1.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider w-[30%]">Master SKU</th>
                          <th className="border border-blue-500 px-1.5 py-2 text-right text-[9px] font-bold uppercase tracking-wider w-[40%]">Qty</th>
                        </tr>
                      </thead>
                      {dieCodeGroups.map((group) => (
                        <tbody key={group.dieCode}>
                          {group.entries.map((entry, idx) => (
                            <tr key={`${group.dieCode}-${entry.masterSku}`} className="bg-background">
                              <td className="border border-border px-1.5 py-1 font-bold text-foreground align-middle">{idx === 0 ? group.dieCode : ''}</td>
                              <td className="border border-border px-1.5 py-1 text-muted-foreground align-middle">{entry.masterSku}</td>
                              <td className="border border-border px-1.5 py-1 text-right align-middle">
                                <span className="text-muted-foreground">{entry.qtyPerPiece}/pc × {Math.round(entry.totalQty / (entry.qtyPerPiece || 1))} =</span>{' '}
                                <span className="font-bold text-foreground">{entry.totalQty} pcs</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                            <td className="border border-border px-1.5 py-1" />
                            <td className="border border-border px-1.5 py-1 font-bold text-blue-700 dark:text-blue-300">Total</td>
                            <td className="border border-border px-1.5 py-1 text-right font-bold text-blue-700 dark:text-blue-300">{group.total} pcs</td>
                          </tr>
                          <tr className="bg-background">
                            <td className="border border-border px-1.5 py-1" />
                            <td className="border border-border px-1.5 py-1 text-muted-foreground">📍 Location</td>
                            <td className="border border-border px-1.5 py-1 text-right text-muted-foreground">{group.location || '—'}</td>
                          </tr>
                        </tbody>
                      ))}
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* ISSUED BY */}
          <div className="border border-border rounded-md px-2.5 py-1.5">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium text-muted-foreground">Issued By</Label>
                <Select
                  value={issuedByName}
                  onValueChange={(v) => {
                    setIssuedByName(v)
                    const person = allWorkers.find(p => p.full_name === v)
                    if (person) setIssuedByContact(person.phone || person.whatsapp || '')
                  }}
                >
                  <SelectTrigger className="h-8 text-sm bg-background border-border focus:ring-1 focus:ring-trust-blue">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {allWorkers.map(p => (
                      <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>
                    ))}
                    {issuedByName && !allWorkers.find(p => p.full_name === issuedByName) && (
                      <SelectItem value={issuedByName}>{issuedByName}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
              className="flex-1 h-7 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded disabled:opacity-60"
              disabled={isIssueStoneLoading}
              onClick={async () => {
                if (activeTab === 'stone') {
                  const validRows = stoneRows.filter(r => r.variety || r.shape || r.qty)
                  if (validRows.length === 0) {
                    alert('No stone rows to issue.')
                    return
                  }
                  setIsIssueStoneLoading(true)
                  try {
                    // Fetch stone inventory to match rows by fingerprint
                    const invRes = await fetch('/api/inventory/stone-items/?page_size=500', { cache: 'no-store' })
                    const invData = await invRes.json().catch(() => ({}))
                    const stoneItems = Array.isArray(invData?.data?.results)
                      ? invData.data.results
                      : Array.isArray(invData?.data) ? invData.data : []

                    function matchStoneItem(row) {
                      return stoneItems.find(si => {
                        const matches = [
                          !row.variety || (si.variety || '').toLowerCase() === (row.variety || '').toLowerCase(),
                          !row.color   || (si.color   || '').toLowerCase() === (row.color   || '').toLowerCase(),
                          !row.cut     || (si.cut     || '').toLowerCase() === (row.cut     || '').toLowerCase(),
                          !row.shape   || (si.shape   || '').toLowerCase() === (row.shape   || '').toLowerCase(),
                        ]
                        return matches.every(Boolean)
                      }) || null
                    }

                    let successCount = 0
                    let errorMessages = []
                    for (const row of validRows) {
                      const matched = matchStoneItem(row)
                      const payload = {
                        inventory_type: 'stone',
                        item_id: matched ? matched.id : null,
                        item_name: row.variety || row.shape || 'Stone',
                        quantity: parseFloat(row.qty) || 1,
                        issued_to: issuedTo || 'Unknown',
                        issued_by: issuedByName || '',
                        reason: `From voucher no ${voucherNo}`,
                        reference_id: voucherNo,
                      }
                      const res = await fetch('/api/issue-requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      })
                      if (res.ok) {
                        successCount++
                      } else {
                        const d = await res.json().catch(() => ({}))
                        errorMessages.push(d?.message || `Error for ${row.variety || 'stone'}`)
                      }
                    }

                    if (errorMessages.length > 0) {
                      alert(`${successCount} request(s) sent. Errors:\n${errorMessages.join('\n')}`)
                    } else {
                      alert(`${successCount} stone issue request(s) sent to inventory for manager approval.`)
                    }
                  } catch (err) {
                    alert('Failed to send stone issue request: ' + (err.message || 'Unknown error'))
                  } finally {
                    setIsIssueStoneLoading(false)
                  }
                } else if (activeTab === 'die') {
                  // Finding issue — keep existing localStorage behaviour for now
                  const requests = dieWeightRows.map(row => ({
                    findingName: row.finding_code || row.dieNumber,
                    finding_code: row.finding_code || row.dieNumber,
                    dieNumber: row.dieNumber,
                    quantity: row.quantity,
                    weight: row.weight,
                    unit: row.unit,
                    issuedBy: issuedByName,
                    contact: issuedByContact,
                    date,
                    voucherNo,
                    issuedTo,
                    workType,
                    deptFrom,
                    deptTo,
                    reason: `From voucher no ${voucherNo}`,
                    note: noteByIssuer,
                    status: 'pending',
                    requestedAt: new Date().toISOString(),
                  }))
                  try {
                    const key = 'finding_issue_requests_v1'
                    const prev = JSON.parse(localStorage.getItem(key) || '[]')
                    localStorage.setItem(key, JSON.stringify([...requests, ...prev]))
                    alert('Finding issue request(s) sent!')
                  } catch (e) {
                    alert('Failed to save finding request.')
                  }
                }
              }}
              type="button"
            >
              {isIssueStoneLoading ? 'Sending...' : (activeTab === 'die' ? 'Issue Finding' : 'Issue Stone')}
            </Button>
            <Button
              className="flex-1 h-7 bg-success hover:bg-success text-white font-bold text-sm rounded"
              onClick={handleSubmit}
              disabled={isBulkCreating}
            >
              {isBulkCreating ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Creating...
                </>
              ) : mode === 'all' ? 'Create All Vouchers' : mode === 'single-pipeline' ? 'Create Job Vouchers' : 'Issue Job'}
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
