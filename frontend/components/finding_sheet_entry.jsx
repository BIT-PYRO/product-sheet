'use client'

import React, { Suspense } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fmtNum } from '@/lib/utils'
import { Trash2, Download, Upload, Search, X, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import MasterNavigationDrawer from '@/components/master_navigation_drawer'
import DateTimeStamp from '@/components/date-time-stamp'
import { useSheetPermissions } from '@/hooks/use-sheet-permissions'

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
  { id: 1, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
  { id: 2, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
  { id: 3, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
]

const PLATING_DEFAULT_ROWS = () => [
  { id: 1, type: '', color: '' },
  { id: 2, type: '', color: '' },
  { id: 3, type: '', color: '' },
]

const TRACKING_DEFAULT_ROWS = () => [
  { id: 1, findingCode: '', dieNumber: '', size: '', quantity: '', weight: '' },
  { id: 2, findingCode: '', dieNumber: '', size: '', quantity: '', weight: '' },
  { id: 3, findingCode: '', dieNumber: '', size: '', quantity: '', weight: '' },
  { id: 4, findingCode: '', dieNumber: '', size: '', quantity: '', weight: '' },
]

const EMPTY_FINDING = () => ({
  findingCode: '',
  image1: '',
  image2: '',
  image3: '',
  findingStage: '',
  material: '',
  polish: '',
  size: '',
  totalMeasurements: '',
  designMaterial: '',
  dieNumber: '',
  moldQtyPerDie: '',
  deadWeight: '',
  mechanism: '',
  notes: '',
  stoneRows: STONE_DEFAULT_ROWS(),
  platingRows: PLATING_DEFAULT_ROWS(),
  trackingRows: TRACKING_DEFAULT_ROWS(),
})

function FindingSheetEntryContent() {
  const { canView, canEdit, canCreate, loading: permsLoading } = useSheetPermissions('finding-entry')
  const router = useRouter()
  const searchParams = useSearchParams()
  const findingCodeParam = (searchParams.get('finding_code') || '').trim()

  const imageRef1 = useRef(null)
  const imageRef2 = useRef(null)
  const imageRef3 = useRef(null)
  const bulkUploadRef = useRef(null)

  const [searchInput, setSearchInput] = useState(findingCodeParam)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [findingRecordId, setFindingRecordId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [backendMode, setBackendMode] = useState('')

  const [finding, setFinding] = useState(EMPTY_FINDING())
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
    setFindingRecordId(record.id)
    setFinding({
      findingCode: record.finding_code || record.code || '',
      image1: record.image || record.photo || record.primary_photo || '',
      image2: record.image2 || record.reference_photo || '',
      image3: record.image3 || '',
      findingStage: record.finding_stage || '',
      material: record.material || '',
      polish: record.polish || '',
      size: record.size || '',
      totalMeasurements: record.total_measurements || '',
      designMaterial: record.design_material || '',
      dieNumber: record.die_number || '',
      moldQtyPerDie: record.mold_qty_per_die || '',
      deadWeight: record.dead_weight || '',
      mechanism: record.mechanism || '',
      notes: record.notes || '',
      stoneRows:
        Array.isArray(record.stone_entries) && record.stone_entries.length > 0
          ? record.stone_entries.map((r, i) => ({ id: i + 1, name: r.name || '', cut: r.cut || '', color: r.color || '', size: r.size || '', material: r.material || '', weight: r.weight || '', quantity: r.quantity || '' }))
          : STONE_DEFAULT_ROWS(),
      platingRows:
        Array.isArray(record.plating_entries) && record.plating_entries.length > 0
          ? record.plating_entries.map((r, i) => ({ id: i + 1, type: r.type || '', color: r.color || '' }))
          : PLATING_DEFAULT_ROWS(),
      trackingRows:
        Array.isArray(record.tracking_rows) && record.tracking_rows.length > 0
          ? record.tracking_rows
          : TRACKING_DEFAULT_ROWS(),
    })
  }

  const loadFindingByCode = useCallback(async (query) => {
    if (!query) return
    setIsSearching(true)
    setSearchError('')
    try {
      const res = await fetch(`/api/findings?search=${encodeURIComponent(query)}`, { cache: 'no-store' })
      const json = await res.json()
      const rows = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.results)
        ? json.data.results
        : []

      const lq = query.toLowerCase()
      const record =
        rows.find((d) => String(d.finding_code || '').trim().toLowerCase() === lq) ||
        rows.find((d) => String(d.code || '').trim().toLowerCase() === lq) ||
        rows[0]

      if (record) {
        populateFromRecord(record)
      } else {
        setFindingRecordId(null)
        setFinding(EMPTY_FINDING())
        setSearchError(`No finding found for "${query}". Fill in the details and save to create a new one.`)
      }
    } catch {
      setSearchError('Failed to load finding data.')
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (findingCodeParam) {
      setSearchInput(findingCodeParam)
      loadFindingByCode(findingCodeParam)
    }
  }, [findingCodeParam, loadFindingByCode])

  const handleSearch = (e) => {
    e.preventDefault()
    const s = searchInput.trim()
    if (!s) return
    router.replace(`/frontend/finding-entry?finding_code=${encodeURIComponent(s)}`)
    loadFindingByCode(s)
  }

  const handleClear = () => {
    setSearchInput('')
    setFindingRecordId(null)
    setFinding(EMPTY_FINDING())
    setSearchError('')
    router.replace('/frontend/finding-entry')
  }

  const handleImageUpload = (slot) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setFinding((prev) => ({ ...prev, [slot]: ev.target?.result || '' }))
    reader.readAsDataURL(file)
  }

  const handleImageDownload = (slot, label) => {
    const data = finding[slot]
    if (!data) return
    const a = document.createElement('a')
    a.href = data
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  const addTrackingRow = () => {
    const newId = Math.max(...finding.trackingRows.map((r) => r.id), 0) + 1
    setFinding((prev) => ({
      ...prev,
      trackingRows: [...prev.trackingRows, { id: newId, findingCode: '', dieNumber: '', size: '', quantity: '', weight: '' }],
    }))
  }

  const updateTrackingRow = (id, field, value) => {
    setFinding((prev) => ({
      ...prev,
      trackingRows: prev.trackingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }))
  }

  const deleteTrackingRow = (id) => {
    setFinding((prev) => ({ ...prev, trackingRows: prev.trackingRows.filter((r) => r.id !== id) }))
  }

  const addStoneRow = () => {
    const newId = Math.max(...finding.stoneRows.map((r) => r.id), 0) + 1
    setFinding((prev) => ({ ...prev, stoneRows: [...prev.stoneRows, { id: newId, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' }] }))
  }
  const updateStoneRow = (id, field, value) => {
    setFinding((prev) => ({ ...prev, stoneRows: prev.stoneRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }))
  }
  const deleteStoneRow = (id) => {
    setFinding((prev) => ({ ...prev, stoneRows: prev.stoneRows.filter((r) => r.id !== id) }))
  }

  const addPlatingRow = () => {
    const newId = Math.max(...finding.platingRows.map((r) => r.id), 0) + 1
    setFinding((prev) => ({ ...prev, platingRows: [...prev.platingRows, { id: newId, type: '', color: '' }] }))
  }
  const updatePlatingRow = (id, field, value) => {
    setFinding((prev) => ({ ...prev, platingRows: prev.platingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }))
  }
  const deletePlatingRow = (id) => {
    setFinding((prev) => ({ ...prev, platingRows: prev.platingRows.filter((r) => r.id !== id) }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const payload = {
        ...(finding.findingCode ? { finding_code: finding.findingCode } : {}),
        image: finding.image1,
        primary_photo: finding.image1,
        reference_photo: finding.image2,
        image2: finding.image2,
        image3: finding.image3,
        finding_stage: finding.findingStage,
        material: finding.material,
        polish: finding.polish,
        size: finding.size,
        total_measurements: finding.totalMeasurements,
        design_material: finding.designMaterial,
        die_number: finding.dieNumber,
        mold_qty_per_die: finding.moldQtyPerDie,
        dead_weight: finding.deadWeight,
        mechanism: finding.mechanism,
        notes: finding.notes,
        stone_entries: finding.stoneRows.map(({ name, cut, color, size, material, weight, quantity }) => ({ name, cut, color, size, material, weight, quantity })),
        plating_entries: finding.platingRows.map(({ type, color }) => ({ type, color })),
        tracking_rows: finding.trackingRows,
      }
      const isUpdate = !!findingRecordId
      const url = isUpdate ? `/api/findings/${findingRecordId}` : '/api/findings'
      const method = isUpdate ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save')
      const savedId = result.data?.id || findingRecordId
      if (savedId) setFindingRecordId(savedId)
      if (!finding.findingCode && result.data?.finding_code) {
        setFinding((prev) => ({ ...prev, findingCode: result.data.finding_code }))
      }
      setSaveStatus({ success: true, message: isUpdate ? 'Finding updated' : 'Finding record created' })
    } catch (err) {
      setSaveStatus({ success: false, message: err.message })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 4000)
    }
  }

  const handleDelete = async () => {
    if (!findingRecordId) {
      setSaveStatus({ success: false, message: 'No record to delete' })
      setTimeout(() => setSaveStatus(null), 4000)
      return
    }
    if (!window.confirm('Delete this finding record?')) return
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`/api/findings/${findingRecordId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || 'Failed to delete')
      }
      setFindingRecordId(null)
      setFinding(EMPTY_FINDING())
      setSaveStatus({ success: true, message: 'Finding record deleted' })
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
    formData.append('sheetType', 'findings')
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
    { slot: 'image1', ref: imageRef1, label: 'Primary Photo' },
    { slot: 'image2', ref: imageRef2, label: 'Reference Photo' },
    { slot: 'image3', ref: imageRef3, label: 'Other Photo' },
  ]

  const isLoaded = !!findingRecordId

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 border-b border-soft-border shadow-sm px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MasterNavigationDrawer inHeader />
          <span className="text-xl font-bold text-midnight-ink tracking-wide">FINDING SHEET</span>
          {backendMode ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-trust-blue/10 text-deep-blue border border-trust-blue/30">
              Backend: {backendMode.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DateTimeStamp />
          <Link href="/finding-sheet" className="px-3 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Master Finding Sheet
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
            <label className="text-xs font-semibold text-midnight-ink whitespace-nowrap">Search by Finding Code</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter finding code..."
              className="flex-1 border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-background"
            />
            <button type="submit" disabled={isSearching} className="px-4 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
              <Search className="h-3.5 w-3.5" />
              {isSearching ? 'Loading...' : 'Load'}
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
              Loaded record{finding.findingCode ? ` — Finding Code: ${finding.findingCode}` : ''}
            </p>
          )}
        </div>

        <div className="bg-cloud-gray p-3 rounded-xl border border-soft-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-trust-blue">FINDING</h2>
              {isLoaded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success-dark border border-success/20 font-semibold">
                  {finding.findingCode || 'Auto Code'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {saveStatus && (
                <span className={`text-xs px-2 py-0.5 rounded ${saveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {saveStatus.message}
                </span>
              )}
              {(canCreate || canEdit) && (
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-2.5 py-1 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'SAVE'}
                </button>
              )}
              {canEdit && (
                <button type="button" onClick={handleDelete} disabled={isSaving || !findingRecordId} className="px-2.5 py-1 text-xs bg-danger text-white font-semibold rounded-full hover:bg-danger/90 disabled:opacity-50">
                  DELETE
                </button>
              )}
              {canCreate && (
                <button type="button" onClick={() => bulkUploadRef.current?.click()} disabled={isSaving} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  UPLOAD
                </button>
              )}
              <input ref={bulkUploadRef} type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleBulkUpload} className="hidden" />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-midnight-ink mb-1 block">
              Finding Code <span className="font-normal text-cool-gray">(optional — auto-generated if left blank)</span>
            </label>
            <input
              type="text"
              value={finding.findingCode}
              onChange={(e) => setFinding((prev) => ({ ...prev, findingCode: e.target.value }))}
              placeholder="e.g. FC-001 (leave blank to auto-generate)"
              className="w-full border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {imageSlots.map(({ slot, ref, label }) => (
              <div key={slot} className="flex flex-col gap-1">
                <input ref={ref} type="file" accept="image/*" onChange={handleImageUpload(slot)} className="hidden" />
                <div className="text-center text-xs font-semibold text-trust-blue py-0.5 bg-trust-blue/10 rounded-t-lg border border-soft-border border-b-0">{label}</div>
                <div
                  className="bg-background border border-soft-border rounded-b-xl overflow-hidden flex items-center justify-center cursor-pointer hover:bg-cloud-gray"
                  style={{ minHeight: '12rem' }}
                  onClick={() => ref.current?.click()}
                >
                  {finding[slot] ? (
                    <img src={finding[slot]} alt={label} className="w-full h-full object-cover rounded-b-xl" />
                  ) : (
                    <span className="text-xs text-cool-gray text-center px-2">Click to upload image</span>
                  )}
                </div>
                <button type="button" onClick={() => handleImageDownload(slot, label)} disabled={!finding[slot]} className="w-full px-1 py-0.5 text-xs bg-midnight-ink text-white rounded font-semibold hover:bg-midnight-ink/80 disabled:opacity-40 flex items-center justify-center gap-1">
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="mb-3 bg-background border border-soft-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100 dark:bg-blue-900/30">
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Finding Code</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Die Number</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Size</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Quantity</th>
                    <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left">Weight</th>
                    <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {finding.trackingRows.map((row) => (
                    <tr key={row.id} className="hover:bg-cloud-gray/40">
                      <td className="border border-soft-border p-0"><input type="text" value={row.findingCode} onChange={(e) => updateTrackingRow(row.id, 'findingCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[100px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.dieNumber} onChange={(e) => updateTrackingRow(row.id, 'dieNumber', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.size} onChange={(e) => updateTrackingRow(row.id, 'size', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.quantity} onChange={(e) => updateTrackingRow(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
                      <td className="border border-soft-border p-0"><input type="text" value={row.weight} onChange={(e) => updateTrackingRow(row.id, 'weight', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]" /></td>
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

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="bg-background border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-blue-100 dark:bg-blue-900/30 border-b border-soft-border">STONE INFO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      {['NAME','CUT','COLOR','SIZE','MATERIAL','WEIGHT','QUANTITY'].map((h) => (
                        <th key={h} className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {finding.stoneRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        {['name','cut','color','size','material','weight','quantity'].map((f) => (
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

            <div className="bg-background border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-blue-100 dark:bg-blue-900/30 border-b border-soft-border">PLATING INFO</div>
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
                    {finding.platingRows.map((row) => (
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
            <div className="bg-background border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">MATERIAL</div>
              <div className="flex gap-2">
                {['GOLD', 'SILVER', 'BRASS', 'ALLOY', 'PLATINUM'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFinding((prev) => ({ ...prev, material: prev.material === opt ? '' : opt }))}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      finding.material === opt
                        ? 'bg-midnight-ink text-white border-midnight-ink shadow-sm'
                        : 'bg-background text-foreground border-soft-border hover:bg-cloud-gray'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-background border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">POLISH</div>
              <div className="flex gap-2">
                {['YES', 'NO'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFinding((prev) => ({ ...prev, polish: prev.polish === opt ? '' : opt }))}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      finding.polish === opt
                        ? 'bg-midnight-ink text-white border-midnight-ink shadow-sm'
                        : 'bg-background text-foreground border-soft-border hover:bg-cloud-gray'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 bg-background border border-soft-border rounded-xl p-3">
            <div className="text-xs font-semibold text-midnight-ink mb-2">FINDING STAGE</div>
            <div className="flex flex-wrap gap-2">
              {['NEW', 'IN PROGRESS', 'SAMPLE', 'APPROVED', 'COMPLETE'].map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setFinding((prev) => ({ ...prev, findingStage: prev.findingStage === stage ? '' : stage }))}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${finding.findingStage === stage ? 'bg-trust-blue text-white border-trust-blue shadow-sm' : 'bg-background text-foreground border-soft-border hover:bg-cloud-gray'}`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <div className="bg-background border border-soft-border rounded-xl p-3">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Size</label>
                <input type="text" value={finding.size} onChange={(e) => setFinding((prev) => ({ ...prev, size: e.target.value }))} placeholder="e.g. 12mm x 8mm" className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent" />
              </div>
              <div className="bg-background border border-soft-border rounded-xl p-3">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Total Measurements (Approx)</label>
                <input type="text" value={finding.totalMeasurements} onChange={(e) => setFinding((prev) => ({ ...prev, totalMeasurements: e.target.value }))} placeholder="e.g. 25mm x 20mm x 5mm" className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent" />
              </div>
              <div className="flex-1 bg-background border border-soft-border rounded-xl p-3 flex flex-col gap-2">
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
                  value={finding.notes}
                  onChange={(e) => setFinding((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this finding..."
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
                        >x</button>
                        <div className="text-[9px] text-cool-gray truncate max-w-[64px]">{m.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-background border border-soft-border rounded-xl p-3">
                <div className="text-xs font-semibold text-midnight-ink mb-2">Die Number / Mold Qty &amp; Dead Weight</div>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Die Number</label>
                    <input type="text" value={finding.dieNumber} onChange={(e) => setFinding((prev) => ({ ...prev, dieNumber: e.target.value }))} placeholder="Die Number" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Mold Qty / Die</label>
                    <input type="text" value={finding.moldQtyPerDie} onChange={(e) => setFinding((prev) => ({ ...prev, moldQtyPerDie: e.target.value }))} placeholder="Mold Qty / Die" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Dead Weight</label>
                    <input type="text" value={finding.deadWeight} onChange={(e) => setFinding((prev) => ({ ...prev, deadWeight: e.target.value }))} placeholder="Dead Weight" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-background border border-soft-border rounded-xl p-3 flex flex-col">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Mechanism</label>
                <textarea value={finding.mechanism} onChange={(e) => setFinding((prev) => ({ ...prev, mechanism: e.target.value }))} placeholder="Describe the mechanism used" rows={5} className="flex-1 w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent resize-none" />
              </div>
            </div>
          </div>

          <div className="mt-3 bg-background border border-soft-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-midnight-ink">FINDING MATERIAL</div>
              <div className="flex items-center gap-2">
                {finding.designMaterial && (
                  <span className="text-xs text-cool-gray">
                    Selected: <span className="font-semibold text-midnight-ink">{finding.designMaterial}</span>
                    <button type="button" onClick={() => setFinding((prev) => ({ ...prev, designMaterial: '' }))} className="ml-1.5 text-danger hover:text-danger/80">x</button>
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
                        : 'bg-background text-foreground border-soft-border hover:bg-cloud-gray'
                    }`}
                  >{u.label}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold bg-cloud-gray border border-soft-border text-midnight-ink w-1/2">Finding Material</th>
                    <th className="text-right px-3 py-1.5 font-semibold bg-cloud-gray border border-soft-border text-midnight-ink w-1/2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {ALLOY_DENSITIES.map((alloy) => {
                    const dw = parseFloat(finding.deadWeight) || 0
                    const rowUnit = rowWeightUnits[alloy.name] || globalWeightUnit
                    const unitDef = WEIGHT_UNITS.find((u) => u.id === rowUnit)
                    const weightInG = dw > 0 ? dw * alloy.density / 8.5 : null
                    const weightDisplay = weightInG != null ? fmtNum(unitDef.convert(weightInG)) : '—'
                    const isSelected = finding.designMaterial === alloy.name
                    return (
                      <tr
                        key={alloy.name}
                        onClick={() => setFinding((prev) => ({ ...prev, designMaterial: isSelected ? '' : alloy.name }))}
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
                            <span className={`font-semibold tabular-nums text-xs ${weightInG != null ? 'text-midnight-ink' : 'text-cool-gray'}`}>{weightDisplay}</span>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FindingSheetEntry() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-cool-gray text-sm">Loading...</div>}>
      <FindingSheetEntryContent />
    </Suspense>
  )
}