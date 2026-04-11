'use client'

import React, { Suspense } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, Download, Upload, Search, X, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import MasterNavigationDrawer from '@/components/master_navigation_drawer'
import DateTimeStamp from '@/components/date-time-stamp'

const ALLOY_DENSITIES = [
  { name: 'ALLOY',                density: 8.5,  colorClass: 'bg-orange-400 text-white' },
  { name: 'STERLING SILVER',      density: 10.36, colorClass: 'bg-gray-500 text-white' },
  { name: 'YELLOW GOLD 9K',       density: 11.08, colorClass: 'bg-yellow-400 text-white' },
  { name: 'WHITE GOLD 9K',        density: 12.59, colorClass: 'bg-gray-300 text-gray-800' },
  { name: 'ROSE GOLD 10K',        density: 11.54, colorClass: 'bg-rose-400 text-white' },
  { name: 'GREEN GOLD 10K',       density: 12.44, colorClass: 'bg-green-500 text-white' },
  { name: 'FINE GOLD (AU)',        density: 19.32, colorClass: 'bg-yellow-600 text-white' },
  { name: 'PLATINUM (PT)',         density: 20.6,  colorClass: 'bg-slate-400 text-white' },
  { name: 'PALLADIUM 950 (PD)',    density: 12.4,  colorClass: 'bg-slate-500 text-white' },
  { name: 'SILVER (AG)',           density: 10.4,  colorClass: 'bg-gray-400 text-white' },
  { name: 'YELLOW GOLD 10K',      density: 11.45, colorClass: 'bg-yellow-400 text-white' },
  { name: 'WHITE GOLD 10K',       density: 10.99, colorClass: 'bg-gray-300 text-gray-800' },
  { name: 'ROSE GOLD 14K',        density: 13.03, colorClass: 'bg-rose-400 text-white' },
  { name: 'GREEN GOLD 14K',       density: 14.17, colorClass: 'bg-green-500 text-white' },
  { name: 'YELLOW GOLD 14K',      density: 12.88, colorClass: 'bg-yellow-400 text-white' },
  { name: 'WHITE GOLD 14K',       density: 12.59, colorClass: 'bg-gray-300 text-gray-800' },
  { name: 'ROSE GOLD 18K',        density: 15.41, colorClass: 'bg-rose-400 text-white' },
  { name: 'GREEN GOLD 18K',       density: 15.9,  colorClass: 'bg-green-500 text-white' },
  { name: 'YELLOW GOLD 18K',      density: 15.41, colorClass: 'bg-yellow-400 text-white' },
  { name: 'WHITE GOLD 18K',       density: 14.66, colorClass: 'bg-gray-300 text-gray-800' },
  { name: 'YELLOW GOLD 20K',      density: 16.5,  colorClass: 'bg-yellow-400 text-white' },
  { name: 'YELLOW GOLD 22K',      density: 17.89, colorClass: 'bg-yellow-500 text-white' },
]

const WEIGHT_UNITS = [
  { id: 'g',   label: 'g',    convert: (g) => g },
  { id: 'ozt', label: 'oz t', convert: (g) => g * 0.032151 },
  { id: 'ct',  label: 'ct',   convert: (g) => g * 5 },
]

const STONE_DEFAULT_ROWS = () => [
  { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
  { id: 2, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
  { id: 3, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
]

const PLATING_DEFAULT_ROWS = () => [
  { id: 1, type: '', color: '' },
  { id: 2, type: '', color: '' },
  { id: 3, type: '', color: '' },
]

const TRACKING_DEFAULT_ROWS = () => [
  { id: 1, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
  { id: 2, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
  { id: 3, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
  { id: 4, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
]

const FINDINGS_DEFAULT_ROWS = () => [
  { id: 1, code: '', quantity: '' },
  { id: 2, code: '', quantity: '' },
]

const EMPTY_DESIGNER = () => ({
  sku: '',
  image1: '',
  image2: '',
  image3: '',
  designStage: '',
  settingType: '',
  enamel: '',
  tdmLength: '',
  tdmWidth: '',
  tdmHeight: '',
  designMaterial: '',
  totalDieCode: '',
  totalMoldQtyPerDie: '',
  totalCpxDeadWeight: '',
  mechanism: '',
  notes: '',
  stoneRows: STONE_DEFAULT_ROWS(),
  platingRows: PLATING_DEFAULT_ROWS(),
  trackingRows: TRACKING_DEFAULT_ROWS(),
  findingsRows: FINDINGS_DEFAULT_ROWS(),
})

function DesignerSheetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const idParam = (searchParams.get('id') || '').trim()
  const designCodeParam = (searchParams.get('motive_sku') || searchParams.get('motive_code') || '').trim()
  const skuParam = (searchParams.get('sku') || '').trim()

  const designerImageRef1 = useRef(null)
  const designerImageRef2 = useRef(null)
  const designerImageRef3 = useRef(null)
  const bulkUploadRef = useRef(null)

  const [searchInput, setSearchInput] = useState(designCodeParam || skuParam)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const [designerRecordId, setDesignerRecordId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [backendMode, setBackendMode] = useState('')

  const [designer, setDesigner] = useState(EMPTY_DESIGNER())
  const [globalWeightUnit, setGlobalWeightUnit] = useState('g')
  const [rowWeightUnits, setRowWeightUnits] = useState({})
  const notesMediaRef = useRef(null)
  const [notesMedia, setNotesMedia] = useState([])

  useEffect(() => {
    fetch('/api/backend-info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.backendMode) setBackendMode(String(d.backendMode)) })
      .catch(() => {})
  }, [])

  const populateFromRecord = (record) => {
    setDesignerRecordId(record.id)
    setDesigner({
      sku: record.sku || '',
      image1: record.rendered_photo || record.image || '',
      image2: record.technical_drawing || record.designer_image_2 || '',
      image3: record.designer_image_3 || '',
      designStage: record.design_stage || '',
      settingType: record.setting_type || '',
      enamel: record.enamel || '',
      tdmLength: (record.total_design_measurements?.length) || '',
      tdmWidth: (record.total_design_measurements?.width) || '',
      tdmHeight: (record.total_design_measurements?.height) || '',
      designMaterial: record.design_material || '',
      totalDieCode: record.total_die_code != null ? String(record.total_die_code) : '',
      totalMoldQtyPerDie: record.total_mold_qty_per_die != null ? String(record.total_mold_qty_per_die) : '',
      totalCpxDeadWeight: record.total_cpx_dead_weight != null ? String(record.total_cpx_dead_weight) : '',
      mechanism: record.mechanism || '',
      notes: record.designer_notes || '',
      stoneRows:
        Array.isArray(record.stone_entries) && record.stone_entries.length > 0
          ? record.stone_entries.map((r, i) => ({ id: i + 1, type: r.type || '', species: r.species || '', variety: r.variety || '', color: r.color || '', cut: r.cut || '', shape: r.shape || '', length: r.length || '', width: r.width || '', height: r.height || '', qty: r.qty || '' }))
          : STONE_DEFAULT_ROWS(),
      platingRows:
        Array.isArray(record.plating_entries) && record.plating_entries.length > 0
          ? record.plating_entries.map((r, i) => ({ id: i + 1, type: r.type || '', color: r.color || '' }))
          : PLATING_DEFAULT_ROWS(),
      trackingRows:
        Array.isArray(record.tracking_rows) && record.tracking_rows.length > 0
          ? record.tracking_rows.map((r, i) => ({
              id: r.id ?? i + 1,
              tdm: r.tdm ?? '',
              stl: r.stl ?? '',
              motiveCode: r.motiveCode ?? '',
              motiveSku: r.motiveSku ?? r.masterSku ?? '',
              dieCode: r.dieCode ?? '',
              moldDieQty: r.moldDieQty ?? '',
              length: r.length ?? '',
              width: r.width ?? '',
              height: r.height ?? '',
            }))
          : TRACKING_DEFAULT_ROWS(),
      findingsRows:
        Array.isArray(record.findings_entries) && record.findings_entries.length > 0
          ? record.findings_entries.map((r, i) => ({ id: i + 1, code: r.code || '', quantity: r.quantity || '' }))
          : FINDINGS_DEFAULT_ROWS(),
    })
  }

  const loadDesignerByDesignCode = useCallback(async (query) => {
    if (!query) return
    setIsSearching(true)
    setSearchError('')
    setIsEditing(false)
    try {
      const res = await fetch(`/api/designers?search=${encodeURIComponent(query)}`, { cache: 'no-store' })
      const json = await res.json()
      const rows = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.results)
        ? json.data.results
        : []

      const lq = query.toLowerCase()
      const record =
        rows.find((d) => String(d.motive_sku || '').trim().toLowerCase() === lq) ||
        rows.find((d) => String(d.sku || '').trim().toLowerCase() === lq) ||
        rows.find((d) => String(d.motive_code || '').trim().toLowerCase() === lq) ||
        rows[0]

      if (record) {
        populateFromRecord(record)
      } else {
        setDesignerRecordId(null)
        setDesigner(EMPTY_DESIGNER())
        setSearchError(`No designer record found for "${query}". Fill in the details and save to create a new one.`)
      }
    } catch {
      setSearchError('Failed to load designer data.')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Load by backend record ID (coming from Master Designer Sheet)
  const loadDesignerById = useCallback(async (id) => {
    if (!id) return
    setIsSearching(true)
    setSearchError('')
    setIsEditing(false)
    try {
      const res = await fetch(`/api/designers/${id}`, { cache: 'no-store' })
      const json = await res.json()
      const record = json.data || json
      if (record && record.id) {
        populateFromRecord(record)
      } else {
        setSearchError('Record not found')
      }
    } catch {
      setSearchError('Failed to load record')
    } finally {
      setIsSearching(false)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (idParam) {
      loadDesignerById(idParam)
    } else {
      const initial = designCodeParam || skuParam
      if (initial) {
        setSearchInput(initial)
        loadDesignerByDesignCode(initial)
      }
    }
  }, [idParam, designCodeParam, skuParam, loadDesignerById, loadDesignerByDesignCode])

  const handleSearch = (e) => {
    e.preventDefault()
    const s = searchInput.trim()
    if (!s) return
    router.replace(`/frontend/designer-sheet?motive_sku=${encodeURIComponent(s)}`)
    loadDesignerByDesignCode(s)
  }

  const handleClear = () => {
    setSearchInput('')
    setDesignerRecordId(null)
    setDesigner(EMPTY_DESIGNER())
    setSearchError('')
    router.replace('/frontend/designer-sheet')
  }

  const handleImageUpload = (slot) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setDesigner((prev) => ({ ...prev, [slot]: ev.target?.result || '' }))
    reader.readAsDataURL(file)
  }

  const handleImageDownload = (slot, label) => {
    const data = designer[slot]
    if (!data) return
    const a = document.createElement('a')
    a.href = data
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  const addTrackingRow = () => {
    const newId = Math.max(...designer.trackingRows.map((r) => r.id), 0) + 1
    setDesigner((prev) => ({
      ...prev,
      trackingRows: [...prev.trackingRows, { id: newId, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '' }],
    }))
  }

  const updateTrackingRow = (id, field, value) => {
    setDesigner((prev) => ({
      ...prev,
      trackingRows: prev.trackingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }))
  }

  const deleteTrackingRow = (id) => {
    setDesigner((prev) => ({ ...prev, trackingRows: prev.trackingRows.filter((r) => r.id !== id) }))
  }

  const addStoneRow = () => {
    const newId = Math.max(...designer.stoneRows.map((r) => r.id), 0) + 1
    setDesigner((prev) => ({ ...prev, stoneRows: [...prev.stoneRows, { id: newId, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' }] }))
  }
  const updateStoneRow = (id, field, value) => {
    setDesigner((prev) => ({ ...prev, stoneRows: prev.stoneRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }))
  }
  const deleteStoneRow = (id) => {
    setDesigner((prev) => ({ ...prev, stoneRows: prev.stoneRows.filter((r) => r.id !== id) }))
  }

  const addPlatingRow = () => {
    const newId = Math.max(...designer.platingRows.map((r) => r.id), 0) + 1
    setDesigner((prev) => ({ ...prev, platingRows: [...prev.platingRows, { id: newId, type: '', color: '' }] }))
  }
  const updatePlatingRow = (id, field, value) => {
    setDesigner((prev) => ({ ...prev, platingRows: prev.platingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }))
  }
  const deletePlatingRow = (id) => {
    setDesigner((prev) => ({ ...prev, platingRows: prev.platingRows.filter((r) => r.id !== id) }))
  }

  const addFindingsRow = () => {
    const newId = Math.max(...designer.findingsRows.map((r) => r.id), 0) + 1
    setDesigner((prev) => ({ ...prev, findingsRows: [...prev.findingsRows, { id: newId, code: '', quantity: '' }] }))
  }
  const updateFindingsRow = (id, field, value) => {
    setDesigner((prev) => ({ ...prev, findingsRows: prev.findingsRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }))
  }
  const deleteFindingsRow = (id) => {
    setDesigner((prev) => ({ ...prev, findingsRows: prev.findingsRows.filter((r) => r.id !== id) }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const payload = {
        ...(designer.sku ? { sku: designer.sku } : {}),
        image: designer.image1,
        rendered_photo: designer.image1,
        technical_drawing: designer.image2,
        designer_image_2: designer.image2,
        designer_image_3: designer.image3,
        design_stage: designer.designStage,
        setting_type: designer.settingType,
        enamel: designer.enamel,
        total_design_measurements: { length: designer.tdmLength, width: designer.tdmWidth, height: designer.tdmHeight },
        design_material: designer.designMaterial,
        total_die_code: designer.totalDieCode !== '' ? Number(designer.totalDieCode) : null,
        total_mold_qty_per_die: designer.totalMoldQtyPerDie !== '' ? Number(designer.totalMoldQtyPerDie) : null,
        total_cpx_dead_weight: designer.totalCpxDeadWeight !== '' ? Number(designer.totalCpxDeadWeight) : null,
        mechanism: designer.mechanism,
        designer_notes: designer.notes,
        stone_entries: designer.stoneRows.map(({ type, species, variety, color, cut, shape, length, width, height, qty }) => ({ type, species, variety, color, cut, shape, length, width, height, qty })),
        plating_entries: designer.platingRows.map(({ type, color }) => ({ type, color })),
        tracking_rows: designer.trackingRows,
        findings_entries: designer.findingsRows
          .filter((r) => r.code || r.quantity)
          .map(({ code, quantity }) => ({ code, quantity })),
      }
      const isUpdate = !!designerRecordId
      const url = isUpdate ? `/api/designers/${designerRecordId}` : '/api/designers'
      const method = isUpdate ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save')
      const savedId = result.data?.id || designerRecordId
      if (savedId) setDesignerRecordId(savedId)
      if (!designer.sku && result.data?.sku) {
        setDesigner((prev) => ({ ...prev, sku: result.data.sku }))
      }
      setSaveStatus({ success: true, message: isUpdate ? 'Designer updated' : 'Designer record created' })
      // Navigate back to master designer sheet after a short delay
      setTimeout(() => router.push('/frontend/master-designer-sheet'), 1200)
    } catch (err) {
      setSaveStatus({ success: false, message: err.message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 4000)
    }
  }

  const handleDelete = async () => {
    if (!designerRecordId) {
      setSaveStatus({ success: false, message: 'No record to delete' })
      setTimeout(() => setSaveStatus(null), 4000)
      return
    }
    if (!window.confirm('Delete this designer record?')) return
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`/api/designers/${designerRecordId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || 'Failed to delete')
      }
      setDesignerRecordId(null)
      setDesigner(EMPTY_DESIGNER())
      setSaveStatus({ success: true, message: 'Designer record deleted' })
    } catch (err) {
      setSaveStatus({ success: false, message: err.message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 4000)
    }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sheetType', 'designers')
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/bulk-upload', { method: 'POST', body: formData })
      const result = await res.json().catch(() => null)
      if (!res.ok || !result?.success) throw new Error(result?.message || 'Bulk upload failed')
      setSaveStatus({ success: true, message: result.message })
    } catch (err) {
      setSaveStatus({ success: false, message: err.message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 6000)
    }
  }

  const imageSlots = [
    { slot: 'image1', ref: designerImageRef1, label: 'Rendered Photo' },
    { slot: 'image2', ref: designerImageRef2, label: 'Technical Drawing' },
    { slot: 'image3', ref: designerImageRef3, label: 'Other Photo' },
  ]

  const isLoaded = !!designerRecordId

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white border-b border-soft-border shadow-sm px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MasterNavigationDrawer inHeader />
          <span className="text-sm font-bold text-midnight-ink tracking-wide">DESIGNER SHEET</span>
          {backendMode ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-trust-blue/10 text-deep-blue border border-trust-blue/30">
              Backend: {backendMode.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DateTimeStamp />
          <Link href="/frontend/master-designer-sheet" className="px-3 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Master Designer Sheet
          </Link>
          <Link href="/frontend" className="px-3 py-1.5 text-xs bg-midnight-ink text-white font-semibold rounded-full hover:bg-midnight-ink/80 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Product Sheet
          </Link>
        </div>
      </div>

      <div className="px-2 py-2">
        <div className="bg-cloud-gray p-3 rounded-xl mb-4 border border-soft-border shadow-sm">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <label className="text-xs font-semibold text-midnight-ink whitespace-nowrap">Search by Motive SKU</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter motive SKU…"
              className="flex-1 border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-white"
            />
            <button type="submit" disabled={isSearching} className="px-4 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
              <Search className="h-3.5 w-3.5" />
              {isSearching ? 'Loading…' : 'Load'}
            </button>
            {(isLoaded || searchError) && (
              <button type="button" onClick={handleClear} className="px-3 py-1.5 text-xs bg-soft-border text-midnight-ink font-semibold rounded-full hover:bg-cool-gray/30 flex items-center gap-1">
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </form>
          {searchError && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">{searchError}</p>
          )}
          {isLoaded && (
            <p className="mt-2 text-xs text-success-dark bg-success/10 border border-success/20 rounded px-2 py-1">
              Loaded record{designer.sku ? ` — SKU: ${designer.sku}` : ''}
            </p>
          )}
        </div>

        <div className="bg-cloud-gray p-3 rounded-xl border border-soft-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-trust-blue">DESIGNER</h2>
              {isLoaded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success-dark border border-success/20 font-semibold">
                  {designer.sku || 'Auto SKU'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {saveStatus && (
                <span className={`text-xs px-2 py-0.5 rounded ${saveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {saveStatus.message}
                </span>
              )}
              {isLoaded && !isEditing && (
                <button type="button" onClick={() => setIsEditing(true)} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue">
                  EDIT
                </button>
              )}
              {(!isLoaded || isEditing) && (
                <>
                  <button type="button" onClick={handleSave} disabled={isSaving} className="px-2.5 py-1 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">
                    {isSaving ? 'Saving…' : 'SAVE'}
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isSaving || !designerRecordId} className="px-2.5 py-1 text-xs bg-danger text-white font-semibold rounded-full hover:bg-danger/90 disabled:opacity-50">
                    DELETE
                  </button>
                  <button type="button" onClick={() => bulkUploadRef.current?.click()} disabled={isSaving} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    UPLOAD
                  </button>
                  <input ref={bulkUploadRef} type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleBulkUpload} className="hidden" />
                </>
              )}
            </div>
          </div>
          <fieldset disabled={isLoaded && !isEditing} className="contents">

          <div className="mb-3">
            <label className="text-xs font-semibold text-midnight-ink mb-1 block">
              Designer SKU <span className="font-normal text-cool-gray">(optional — auto-generated if left blank)</span>
            </label>
            <input
              type="text"
              value={designer.sku}
              onChange={(e) => setDesigner((prev) => ({ ...prev, sku: e.target.value }))}
              placeholder="e.g. RING-001 (leave blank to auto-generate)"
              disabled={isLoaded && !isEditing}
              className="w-full border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-white disabled:bg-cloud-gray disabled:text-cool-gray disabled:cursor-default"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {imageSlots.map(({ slot, ref, label }) => (
              <div key={slot} className="flex flex-col gap-1">
                <input ref={ref} type="file" accept="image/*" onChange={handleImageUpload(slot)} className="hidden" />
                <div className="text-center text-xs font-semibold text-trust-blue py-0.5 bg-trust-blue/10 rounded-t-lg border border-soft-border border-b-0">{label}</div>
                <div
                  className="bg-white border border-soft-border rounded-b-xl overflow-hidden flex items-center justify-center cursor-pointer hover:bg-cloud-gray"
                  style={{ minHeight: '12rem' }}
                  onClick={() => ref.current?.click()}
                >
                  {designer[slot] ? (
                    <img src={designer[slot]} alt={label} className="w-full h-full object-cover rounded-b-xl" />
                  ) : (
                    <span className="text-xs text-cool-gray text-center px-2">Click to upload image</span>
                  )}
                </div>
                <button type="button" onClick={() => handleImageDownload(slot, label)} disabled={!designer[slot]} className="w-full px-1 py-0.5 text-xs bg-midnight-ink text-white rounded font-semibold hover:bg-midnight-ink/80 disabled:opacity-40 flex items-center justify-center gap-1">
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="mb-3 bg-white border border-soft-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#dce8f5]">
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">3DM</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">STL</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Motive Code</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Motive SKU</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Die Code</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Mold/Die Qty</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Length</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Width</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Height</th>
                    <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {designer.trackingRows.map((row) => (
                    <tr key={row.id} className="hover:bg-cloud-gray/40">
                      <td className="border border-soft-border p-0">
                        <div className="flex items-center">
                          {row.tdm ? (
                            <a href={row.tdm} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate" title={row.tdm}>{row.tdm}</a>
                          ) : (
                            <input type="url" value={row.tdm} onChange={(e) => updateTrackingRow(row.id, 'tdm', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[100px]" />
                          )}
                          <button type="button" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.tdm); if (url !== null) updateTrackingRow(row.id, 'tdm', url.trim()) }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0">
                            <Upload className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="border border-soft-border p-0">
                        <div className="flex items-center">
                          {row.stl ? (
                            <a href={row.stl} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate" title={row.stl}>{row.stl}</a>
                          ) : (
                            <input type="url" value={row.stl} onChange={(e) => updateTrackingRow(row.id, 'stl', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[100px]" />
                          )}
                          <button type="button" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.stl); if (url !== null) updateTrackingRow(row.id, 'stl', url.trim()) }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0">
                            <Upload className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.motiveCode} onChange={(e) => updateTrackingRow(row.id, 'motiveCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[100px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.motiveSku} onChange={(e) => updateTrackingRow(row.id, 'motiveSku', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[110px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.dieCode} onChange={(e) => updateTrackingRow(row.id, 'dieCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.moldDieQty} onChange={(e) => updateTrackingRow(row.id, 'moldDieQty', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.length || ''} onChange={(e) => updateTrackingRow(row.id, 'length', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.width || ''} onChange={(e) => updateTrackingRow(row.id, 'width', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.height || ''} onChange={(e) => updateTrackingRow(row.id, 'height', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]" /></td>
                      <td className="border border-soft-border p-0 text-center">
                        <button type="button" onClick={() => deleteTrackingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addTrackingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">
              + Add Row
            </button>
          </div>

          <div className="mb-3 grid gap-3" style={{ gridTemplateColumns: '3fr 2fr' }}>
            {/* STONE INFO */}
            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">STONE INFO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      {['TYPE','SPECIES','VARIETY','COLOR','CUT','SHAPE','LENGTH','WIDTH','HEIGHT','QTY'].map((h) => (
                        <th key={h} className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {designer.stoneRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        {['type','species','variety','color','cut','shape','length','width','height','qty'].map((f) => (
                          <td key={f} className="border border-soft-border p-0">
                            <input type="text" value={row[f]} onChange={(e) => updateStoneRow(row.id, f, e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px] text-xs" />
                          </td>
                        ))}
                        <td className="border border-soft-border p-0 text-center">
                          <button type="button" onClick={() => deleteStoneRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addStoneRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
            </div>

            {/* PLATING INFO */}
            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">PLATING INFO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left w-1/2">PLATING TYPE</th>
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left w-1/2">PLATING COLOR</th>
                      <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {designer.platingRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        <td className="border border-soft-border p-0">
                          <input type="text" value={row.type} onChange={(e) => updatePlatingRow(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" />
                        </td>
                        <td className="border border-soft-border p-0">
                          <input type="text" value={row.color} onChange={(e) => updatePlatingRow(row.id, 'color', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" />
                        </td>
                        <td className="border border-soft-border p-0 text-center">
                          <button type="button" onClick={() => deletePlatingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addPlatingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="bg-white border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">SETTING TYPE</div>
              <div className="flex gap-2">
                {['WAX SETTING', 'HAND SETTING'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDesigner((prev) => {
                      const parts = (prev.settingType || '').split(',').map(s => s.trim()).filter(Boolean)
                      const active = parts.includes(opt)
                      const next = active ? parts.filter(p => p !== opt) : [...parts, opt]
                      return { ...prev, settingType: next.join(',') }
                    })}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      (designer.settingType || '').split(',').map(s => s.trim()).includes(opt)
                        ? 'bg-trust-blue text-white border-trust-blue shadow-sm'
                        : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">ENAMEL</div>
              <div className="flex gap-2">
                {['YES', 'NO'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDesigner((prev) => ({ ...prev, enamel: prev.enamel === opt ? '' : opt }))}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      designer.enamel === opt
                        ? 'bg-trust-blue text-white border-trust-blue shadow-sm'
                        : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 bg-white border border-soft-border rounded-xl p-3">
            <div className="text-xs font-semibold text-midnight-ink mb-2">DESIGN STAGE</div>
            <div className="flex flex-wrap gap-2">
              {['3DM', 'STL', 'RENDER', '3D PRINT', 'COMPLETE'].map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setDesigner((prev) => ({ ...prev, designStage: prev.designStage === stage ? '' : stage }))}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${designer.designStage === stage ? 'bg-trust-blue text-white border-trust-blue shadow-sm' : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'}`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
                <div className="text-xs font-semibold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">Total Design Measurements (Approx)</div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">LENGTH</th>
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">WIDTH</th>
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">HEIGHT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-soft-border p-0">
                        <input type="text" value={designer.tdmLength} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmLength: e.target.value }))} placeholder="e.g. 25mm" className="w-full bg-transparent outline-none px-2 py-1.5 min-w-[70px]" />
                      </td>
                      <td className="border border-soft-border p-0">
                        <input type="text" value={designer.tdmWidth} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmWidth: e.target.value }))} placeholder="e.g. 20mm" className="w-full bg-transparent outline-none px-2 py-1.5 min-w-[70px]" />
                      </td>
                      <td className="border border-soft-border p-0">
                        <input type="text" value={designer.tdmHeight} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmHeight: e.target.value }))} placeholder="e.g. 5mm" className="w-full bg-transparent outline-none px-2 py-1.5 min-w-[70px]" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex-1 bg-white border border-soft-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-midnight-ink">Notes</label>
                  <button
                    type="button"
                    onClick={() => notesMediaRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-trust-blue hover:text-deep-blue font-semibold"
                  >
                    <Upload className="h-3 w-3" />
                    Attach Photo / Video
                  </button>
                  <input
                    ref={notesMediaRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const oversized = files.filter((f) => f.size > 5 * 1024 * 1024)
                      if (oversized.length) alert(`${oversized.length} file(s) exceed 5 MB and were skipped.`)
                      files.filter((f) => f.size <= 5 * 1024 * 1024).forEach((file) => {
                        const reader = new FileReader()
                        reader.onload = (ev) => setNotesMedia((prev) => [...prev, { name: file.name, type: file.type, dataUrl: ev.target.result }])
                        reader.readAsDataURL(file)
                      })
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </div>
                <textarea
                  value={designer.notes}
                  onChange={(e) => setDesigner((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this design..."
                  rows={4}
                  className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent resize-none"
                />
                {notesMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {notesMedia.map((m, i) => (
                      <div key={i} className="relative group">
                        {m.type.startsWith('image/') ? (
                          <img src={m.dataUrl} alt={m.name} className="h-16 w-16 object-cover rounded border border-soft-border" />
                        ) : (
                          <video src={m.dataUrl} className="h-16 w-16 object-cover rounded border border-soft-border" />
                        )}
                        <button
                          type="button"
                          onClick={() => setNotesMedia((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-danger text-white rounded-full h-4 w-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                        <div className="text-[9px] text-cool-gray truncate max-w-[64px]">{m.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FINDINGS TABLE */}
              <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
                <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">FINDINGS</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-cloud-gray">
                        <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">FINDINGS CODE</th>
                        <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">QUANTITY</th>
                        <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                      </tr>
                    </thead>
                  </table>
                  <div className={designer.findingsRows.length > 2 ? 'overflow-y-auto max-h-[5.5rem]' : ''}>
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        {designer.findingsRows.map((row) => (
                          <tr key={row.id} className="hover:bg-cloud-gray/40">
                            <td className="border border-soft-border p-0">
                              <input type="text" value={row.code} onChange={(e) => updateFindingsRow(row.id, 'code', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[100px] text-xs" />
                            </td>
                            <td className="border border-soft-border p-0">
                              <input type="text" value={row.quantity} onChange={(e) => updateFindingsRow(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px] text-xs" />
                            </td>
                            <td className="border border-soft-border p-0 text-center w-6">
                              <button type="button" onClick={() => deleteFindingsRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button type="button" onClick={addFindingsRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ Add Row</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white border border-soft-border rounded-xl p-3">
                <div className="text-xs font-semibold text-midnight-ink mb-2">Total Die Code, Mold Qty &amp; CPX Dead Weight</div>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Total Die Code</label>
                    <input type="number" min="0" value={designer.totalDieCode} onChange={(e) => setDesigner((prev) => ({ ...prev, totalDieCode: e.target.value }))} placeholder="Total Die Code" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Total Mold Qty / Die</label>
                    <input type="number" min="0" value={designer.totalMoldQtyPerDie} onChange={(e) => setDesigner((prev) => ({ ...prev, totalMoldQtyPerDie: e.target.value }))} placeholder="Total Mold Qty / Die" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Total CPX Dead Weight</label>
                    <input type="number" min="0" step="0.0001" value={designer.totalCpxDeadWeight} onChange={(e) => setDesigner((prev) => ({ ...prev, totalCpxDeadWeight: e.target.value }))} placeholder="Total CPX Dead Weight" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white border border-soft-border rounded-xl p-3 flex flex-col">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Mechanism</label>
                <textarea value={designer.mechanism} onChange={(e) => setDesigner((prev) => ({ ...prev, mechanism: e.target.value }))} placeholder="Describe the mechanism used" rows={5} className="flex-1 w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent resize-none" />
              </div>
            </div>
          </div>

          <div className="mt-3 bg-white border border-soft-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-midnight-ink">DESIGN MATERIAL</div>
              <div className="flex items-center gap-2">
                {designer.designMaterial && (
                  <span className="text-xs text-cool-gray">
                    Selected: <span className="font-semibold text-midnight-ink">{designer.designMaterial}</span>
                    <button type="button" onClick={() => setDesigner((prev) => ({ ...prev, designMaterial: '' }))} className="ml-1.5 text-danger hover:text-danger/80">×</button>
                  </span>
                )}
                <span className="text-[11px] text-cool-gray">All units:</span>
                {WEIGHT_UNITS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setGlobalWeightUnit(u.id); setRowWeightUnits({}) }}
                    className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold transition-colors ${
                      globalWeightUnit === u.id && Object.keys(rowWeightUnits).length === 0
                        ? 'bg-midnight-ink text-white border-midnight-ink'
                        : 'bg-white text-cool-gray border-soft-border hover:bg-cloud-gray'
                    }`}
                  >{u.label}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold bg-cloud-gray border border-soft-border text-midnight-ink w-1/2">Design Material</th>
                    <th className="text-right px-3 py-1.5 font-semibold bg-cloud-gray border border-soft-border text-midnight-ink w-1/2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {ALLOY_DENSITIES.map((alloy) => {
                    const cpx = parseFloat(designer.cpxDeadWeight) || 0
                    const rowUnit = rowWeightUnits[alloy.name] || globalWeightUnit
                    const unitDef = WEIGHT_UNITS.find((u) => u.id === rowUnit)
                    const weightInG = cpx > 0 ? cpx * alloy.density / 8.5 : null
                    const weightDisplay = weightInG != null ? unitDef.convert(weightInG).toFixed(3) : '—'
                    const isSelected = designer.designMaterial === alloy.name
                    return (
                      <tr
                        key={alloy.name}
                        onClick={() => setDesigner((prev) => ({ ...prev, designMaterial: isSelected ? '' : alloy.name }))}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'ring-2 ring-inset ring-trust-blue bg-trust-blue/10' : 'hover:bg-cloud-gray/60'
                        }`}
                      >
                        <td className="border border-soft-border px-2 py-1">
                          <span className={`inline-block px-2 py-1 font-semibold text-[11px] rounded ${alloy.colorClass}`}>{alloy.name}</span>
                          <span className="text-[10px] text-cool-gray ml-1.5">({alloy.density} g/cm³)</span>
                        </td>
                        <td className="border border-soft-border px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-semibold tabular-nums text-xs ${
                              weightInG != null ? 'text-midnight-ink' : 'text-cool-gray'
                            }`}>{weightDisplay}</span>
                            <div className="flex gap-0.5">
                              {WEIGHT_UNITS.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setRowWeightUnits((prev) => ({ ...prev, [alloy.name]: u.id }))}
                                  className={`px-1 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                    rowUnit === u.id
                                      ? 'bg-midnight-ink text-white'
                                      : 'text-cool-gray hover:bg-cloud-gray border border-soft-border'
                                  }`}
                                >{u.label}</button>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!designer.cpxDeadWeight && (
              <p className="text-[11px] text-cool-gray mt-1.5">Enter CPX Dead Weight above to calculate material weights. Click a row to select the design material.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Link href="/frontend/master-designer-sheet" className="text-xs text-trust-blue underline hover:text-deep-blue flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              View all records in Master Designer Sheet
            </Link>
            {(!isLoaded || isEditing) && (
              <div className="flex items-center gap-2">
                {saveStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded ${saveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                    {saveStatus.message}
                  </span>
                )}
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">
                  {isSaving ? 'Saving…' : 'SAVE'}
                </button>
              </div>
            )}
          </div>
          </fieldset>
        </div>
      </div>
    </div>
  )
}

export default function DesignerSheetPage() {
  return (
    <Suspense>
      <DesignerSheetContent />
    </Suspense>
  )
}
