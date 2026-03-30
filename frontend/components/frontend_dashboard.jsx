'use client'

import React, { Suspense } from "react"
import { Trash2, Download, Eye, Upload, Edit3, Search, X } from 'lucide-react'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreateJobModal } from '@/components/create-job-modal'
import { GenericJobModal } from '@/components/generic-job-modal'
import { PrintJobCardModal } from '@/components/print-job-card-modal'
import DateTimeStamp from '@/components/date-time-stamp'
import MasterNavigationDrawer from '@/components/master_navigation_drawer'
import Link from 'next/link'

const PRODUCT_SHEET_SYNC_KEY = 'product_sheet_updated_at'
const PRODUCT_SHEET_SYNC_EVENT = 'product_sheet_sync'

function ProductSheetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const newProductToken = searchParams.get('new')
  const skuParam = (searchParams.get('sku') || '').trim()
  const fileInputRef = useRef(null)
  const manufacturingImagesRef = useRef(null)
  const designerImageRef1 = useRef(null)
  const designerImageRef2 = useRef(null)
  const designerImageRef3 = useRef(null)
  const designerBulkUploadRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)
  const designerSkuLookupRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false)
  const [isGenericJobModalOpen, setIsGenericJobModalOpen] = useState(false)
  const [isPrintJobCardModalOpen, setIsPrintJobCardModalOpen] = useState(false)
  const [jobCardToPrint, setJobCardToPrint] = useState(null)
  const [productImages, setProductImages] = useState([])
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0)

  const [platingType, setPlatingType] = useState([
    { id: 1, col1: '', col2: '', col3: '' },
    { id: 2, col1: '', col2: '', col3: '' },
    { id: 3, col1: '', col2: '', col3: '' },
  ])

  const [manufacturing, setManufacturing] = useState({
    dieNumbers: [
      { id: 1, type: 'die_number', value: '', quantity: '', location: '' },
      { id: 2, type: 'die_number', value: '', quantity: '', location: '' },
      { id: 3, type: 'die_number', value: '', quantity: '', location: '' },
      { id: 4, type: 'die_number', value: '', quantity: '', location: '' },
      { id: 5, type: 'die_number', value: '', quantity: '', location: '' },
    ],
    images: [],
    notes: '',
  })

  const [others, setOthers] = useState([
    { id: 1, key: '', value: '' },
    { id: 2, key: '', value: '' },
    { id: 3, key: '', value: '' },
    { id: 4, key: '', value: '' },
    { id: 5, key: '', value: '' },
  ])

  const [sku, setSku] = useState('')
  const [designerSku, setDesignerSku] = useState('')
  const [listingName, setListingName] = useState('')
  const [material, setMaterial] = useState('')
  const [materialSku, setMaterialSku] = useState('')
  const [materialSkuLocation, setMaterialSkuLocation] = useState('')
  const [dropdown1, setDropdown1] = useState('')
  const [weightValue, setWeightValue] = useState('')
  const [weightUnit, setWeightUnit] = useState('')
  const [dropdown2, setDropdown2] = useState('')
  const [dropdown3, setDropdown3] = useState('')
  const [settingType, setSettingType] = useState('')
  const [enamelType, setEnamelType] = useState('')
  const [activeChannels, setActiveChannels] = useState([])
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false)
  const [shopifyStatus, setShopifyStatus] = useState('active')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  const channelOptions = [
    'Amazon',
    'eBay',
    'Shopify',
    'Etsy',
    'Website',
    'Wholesale',
    'Retail Store'
  ]

  const colorOptions = [
    'BLACK',
    'WHITE',
    'GRAY',
    'SILVER',
    'GOLD',
    'ROSE GOLD',
    'BRONZE',
    'COPPER',
    'BROWN',
    'BEIGE',
    'RED',
    'MAROON',
    'PINK',
    'PURPLE',
    'BLUE',
    'NAVY',
    'TEAL',
    'GREEN',
    'OLIVE',
    'YELLOW',
    'AMBER',
    'ORANGE',
    'MULTICOLOR',
  ]

  const variationTypeOptions = ['COLOR', 'ENAMEL']

  const toggleChannel = (channel) => {
    setActiveChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const [variations, setVariations] = useState([
    { id: 1, label: '', col1: '', col2: '' },
    { id: 2, label: '', col1: '', col2: '' },
    { id: 3, label: '', col1: '', col2: '' },
    { id: 4, label: '', col1: '', col2: '' },
  ])
  const [colorCodeByColor, setColorCodeByColor] = useState({})

  const [stoneInfo, setStoneInfo] = useState([
    { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
    { id: 2, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
    { id: 3, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
  ])

  // Designer Panel stone/plating – separate from product's own stone/plating
  const DESIGNER_STONE_DEFAULT = () => [
    { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
  ]
  const DESIGNER_PLATING_DEFAULT = () => [
    { id: 1, type: '', color: '' },
  ]
  const [designerStoneRows, setDesignerStoneRows] = useState(DESIGNER_STONE_DEFAULT())
  const [designerPlatingRows, setDesignerPlatingRows] = useState(DESIGNER_PLATING_DEFAULT())

  const [liveStock, setLiveStock] = useState({
    rawMaterial: { min: '', current: '', wip: '', location: '' },
    rawSetting: { min: '', current: '', wip: '', location: '' },
    tyre: { min: '', current: '', wip: '', location: '' },
    wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
    filing: { min: '', current: '', wip: '', location: '' },
    packing: { min: '', current: '', wip: '', location: '' },
    setting: { min: '', current: '', wip: '', location: '' },
    finalPolish: { min: '', current: '', wip: '', location: '' },
    readyForPlacing: { min: '', current: '', wip: '', location: '' },
  })

  const [finalStock, setFinalStock] = useState([
    { id: 1, sku: '', value: '', unit: '' },
  ])

  const TRACKING_DEFAULT_ROWS = () => [
    { id: 1, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
    { id: 2, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
    { id: 3, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
    { id: 4, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' },
  ]

  const DESIGNER_FINDINGS_DEFAULT = () => [
    { id: 1, code: '', quantity: '' },
    { id: 2, code: '', quantity: '' },
  ]

  const [designer, setDesigner] = useState({
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
    dieCode: '',
    moldQtyPerDie: '',
    cpxDeadWeight: '',
    mechanism: '',
    notes: '',
    trackingRows: TRACKING_DEFAULT_ROWS(),
    findingsRows: DESIGNER_FINDINGS_DEFAULT(),
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [showViewSheetButton, setShowViewSheetButton] = useState(false)
  const [backendMode, setBackendMode] = useState('')
  const [isDesignerSaving, setIsDesignerSaving] = useState(false)
  const [designerSaveStatus, setDesignerSaveStatus] = useState(null)
  const [designerRecordId, setDesignerRecordId] = useState(null)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editSearchTerm, setEditSearchTerm] = useState('')
  const [editSearchResults, setEditSearchResults] = useState([])
  const [isEditSearching, setIsEditSearching] = useState(false)
  const [editProductId, setEditProductId] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)

  useEffect(() => {
    fetch('/api/backend-info', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.backendMode) setBackendMode(String(data.backendMode))
      })
      .catch(() => {})
  }, [])

  const resetProductForm = useCallback(() => {
    setProductImages([])
    setPrimaryImageIndex(0)
    setSku('')
    setDesignerSku('')
    setListingName('')
    setMaterial('')
    setMaterialSku('')
    setMaterialSkuLocation('')
    setDropdown1('')
    setWeightValue('')
    setWeightUnit('')
    setDropdown2('')
    setDropdown3('')
    setSettingType('')
    setEnamelType('')
    setActiveChannels([])
    setIsChannelDropdownOpen(false)
    setShopifyStatus('active')
    setIsStatusDropdownOpen(false)
    setPlatingType([
      { id: 1, col1: '', col2: '', col3: '' },
      { id: 2, col1: '', col2: '', col3: '' },
      { id: 3, col1: '', col2: '', col3: '' },
    ])
    setManufacturing({
      dieNumbers: [
        { id: 1, type: 'die_number', value: '', quantity: '', location: '' },
        { id: 2, type: 'die_number', value: '', quantity: '', location: '' },
        { id: 3, type: 'die_number', value: '', quantity: '', location: '' },
        { id: 4, type: 'die_number', value: '', quantity: '', location: '' },
        { id: 5, type: 'die_number', value: '', quantity: '', location: '' },
      ],
      images: [],
      notes: '',
    })
    setOthers([
      { id: 1, key: '', value: '' },
      { id: 2, key: '', value: '' },
      { id: 3, key: '', value: '' },
      { id: 4, key: '', value: '' },
      { id: 5, key: '', value: '' },
    ])
    setVariations([
      { id: 1, label: '', col1: '', col2: '' },
      { id: 2, label: '', col1: '', col2: '' },
      { id: 3, label: '', col1: '', col2: '' },
      { id: 4, label: '', col1: '', col2: '' },
    ])
    setColorCodeByColor({})
    setStoneInfo([
      { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
      { id: 2, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
      { id: 3, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
    ])
    setLiveStock({
      rawMaterial: { min: '', current: '', wip: '', location: '' },
      rawSetting: { min: '', current: '', wip: '', location: '' },
      tyre: { min: '', current: '', wip: '', location: '' },
      wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
      filing: { min: '', current: '', wip: '', location: '' },
      packing: { min: '', current: '', wip: '', location: '' },
      setting: { min: '', current: '', wip: '', location: '' },
      finalPolish: { min: '', current: '', wip: '', location: '' },
      readyForPlacing: { min: '', current: '', wip: '', location: '' },
    })
    setFinalStock([{ id: 1, sku: '', value: '', unit: '' }])
    setDesignerStoneRows(DESIGNER_STONE_DEFAULT())
    setDesignerPlatingRows(DESIGNER_PLATING_DEFAULT())
    setDesigner({
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
      dieCode: '',
      moldQtyPerDie: '',
      cpxDeadWeight: '',
      mechanism: '',
      notes: '',
      trackingRows: TRACKING_DEFAULT_ROWS(),
      findingsRows: DESIGNER_FINDINGS_DEFAULT(),
    })
    setIsModalOpen(false)
    setSaveStatus(null)
    setShowViewSheetButton(false)
    setEditProductId(null)
  }, [])

  const handleAddProduct = () => {
    resetProductForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!newProductToken) return
    resetProductForm()
  }, [newProductToken, resetProductForm])

  // Load product from SKU param (clicking SKU in master product sheet)
  useEffect(() => {
    if (!skuParam) return
    let cancelled = false
    fetch(`/api/products?search=${encodeURIComponent(skuParam)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const rows = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.results)
          ? json.data.results
          : []
        const product = rows.find((p) => String(p.master_sku || '').trim().toLowerCase() === skuParam.toLowerCase())
        if (!product) return
        setEditProductId(product.id)
        setSku(product.master_sku || '')
        setDesignerSku(product.designer_sku || '')
        setListingName(product.name || '')
        setMaterial(product.material || '')
        setDropdown1(product.material || '')
        setWeightValue(product.weight || '')
        setWeightUnit('')
        setDropdown2(product.category || '')
        setDropdown3(product.collection || '')
        setSettingType(product.setting_type || '')
        setEnamelType(product.enamel_type || '')
        setShopifyStatus(product.is_active ? 'active' : 'inactive')
        setMaterialSku(product.master_sku || '')
        setMaterialSkuLocation('')
        const ch = product.active_channels || ''
        setActiveChannels(ch ? ch.split(',').map((c) => c.trim()).filter(Boolean) : [])
        const dieRows = Array.isArray(product.die_numbers) ? product.die_numbers : []
        const findingRows = Array.isArray(product.findings) ? product.findings : []
        const combined = [
          ...dieRows.map((d, i) => ({ id: i + 1, type: 'die_number', value: d.value || '', quantity: d.quantity || '', location: d.location || '' })),
          ...findingRows.map((f, i) => ({ id: dieRows.length + i + 1, type: 'findings', value: f.value || '', quantity: f.quantity || '', location: f.location || '' })),
        ]
        while (combined.length < 5) combined.push({ id: combined.length + 1, type: 'die_number', value: '', quantity: '', location: '' })
        setManufacturing((prev) => ({ ...prev, dieNumbers: combined, notes: product.notes || '' }))
        if (Array.isArray(product.stone_entries) && product.stone_entries.length > 0) {
          setStoneInfo(
            product.stone_entries.map((s, i) => ({ id: i + 1, type: s.type || '', species: s.species || '', variety: s.variety || '', color: s.color || '', cut: s.cut || '', shape: s.shape || '', length: s.length || '', width: s.width || '', height: s.height || '', qty: s.qty || '' }))
          )
        } else {
          setStoneInfo([
            { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
            { id: 2, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
            { id: 3, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
          ])
        }
        setPlatingType((() => {
          const entries = Array.isArray(product.platingEntries) && product.platingEntries.length > 0
            ? product.platingEntries
            : (product.plating_entries && product.plating_entries.length > 0
              ? product.plating_entries
              : (product.plating_type ? [{ type: product.plating_type, color: product.plating_color || '' }] : []));
          const rows = entries.map((e, i) => ({ id: i + 1, col1: e.type || '', col2: e.color || '', col3: '' }));
          while (rows.length < 3) rows.push({ id: rows.length + 1, col1: '', col2: '', col3: '' });
          return rows;
        })())
        setProductImages(Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []))
        setPrimaryImageIndex(0)
        const parseVarStr = (str) => (str || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => { const m = s.match(/^([^\[]+?)(?:\[([^\]]*)\])?$/); return m ? { col1: m[1].trim(), col2: (m[2] || '').trim() } : { col1: s, col2: '' }; })
        const savedColors = parseVarStr(product.color)
        const savedEnamels = parseVarStr(product.enamel)
        const restoredVariations = [
          ...savedColors.map((c, i) => ({ id: i + 1, label: 'COLOR', col1: c.col1, col2: c.col2 })),
          ...savedEnamels.map((e, i) => ({ id: savedColors.length + i + 1, label: 'ENAMEL', col1: e.col1, col2: e.col2 })),
        ]
        while (restoredVariations.length < 4) restoredVariations.push({ id: restoredVariations.length + 1, label: '', col1: '', col2: '' })
        setVariations(restoredVariations)
        setIsViewMode(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })

        // Load live stock situation and final stock values from saved inventory transactions
        fetch(`/api/inventory?product=${encodeURIComponent(product.id)}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(invJson => {
            if (cancelled) return
            const txns = Array.isArray(invJson.data)
              ? invJson.data
              : Array.isArray(invJson.data?.results)
              ? invJson.data.results
              : []

            // Build running totals per stage__stock_type
            const totals = new Map()
            txns.forEach((txn) => {
              if (String(txn?.txn_type || '').toLowerCase() === 'demand') return
              const stage = String(txn?.stage || '').trim() || 'default'
              const stockType = String(txn?.stock_type || 'current').trim() || 'current'
              const qty = Number(txn?.quantity || 0)
              const key = `${stage}__${stockType}`
              const delta = String(txn?.txn_type || '').toLowerCase() === 'out' ? -qty : qty
              totals.set(key, (totals.get(key) || 0) + delta)
            })

            const get = (stage, type) => {
              const v = totals.get(`${stage}__${type}`)
              return v != null && v !== 0 ? String(v) : ''
            }

            // Stage key → liveStock frontend key
            const STAGE_TO_KEY = {
              wax_piece:        'rawMaterial',
              wax_setting:      'rawSetting',
              casting:          'wipLiquidCasting',
              filling:          'filing',
              pre_polish:       'packing',
              setting:          'setting',
              final_polish:     'finalPolish',
              ready_for_plating:'readyForPlacing',
            }

            setLiveStock(prev => {
              const next = { ...prev }
              for (const [stageKey, frontendKey] of Object.entries(STAGE_TO_KEY)) {
                next[frontendKey] = {
                  min:      get(stageKey, 'min'),
                  current:  get(stageKey, 'current'),
                  wip:      get(stageKey, 'wip'),
                  location: prev[frontendKey]?.location || '',
                }
              }
              return next
            })

            // Populate per-variation final stock values from final_stock__{varSku} transactions
            setFinalStock(prev =>
              prev.map(row => {
                const varSku = String(row.sku || '').trim()
                if (!varSku) return row
                const varStageKey = `final_stock__${varSku.toLowerCase()}`
                const value = get(varStageKey, 'current')
                return value !== '' ? { ...row, value } : row
              })
            )
          })
          .catch(() => {})

        // Load designer data for this SKU
        fetch(`/api/designers?sku=${encodeURIComponent(product.master_sku)}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(json => {
            if (cancelled) return
            const rows = Array.isArray(json.data) ? json.data : (json.data?.results || [])
            const d = rows.find(r => String(r.sku || '').trim().toLowerCase() === skuParam.toLowerCase())
            if (d) {
              setDesignerRecordId(d.id)
              setDesigner(prev => ({
                ...prev,
                image1: d.rendered_photo || d.image || '',
                image2: d.technical_drawing || d.designer_image_2 || '',
                image3: d.designer_image_3 || '',
                designStage: d.design_stage || '',
                settingType: d.setting_type || '',
                enamel: d.enamel || '',
                tdmLength: (d.total_design_measurements?.length) || '',
                tdmWidth: (d.total_design_measurements?.width) || '',
                tdmHeight: (d.total_design_measurements?.height) || '',
                designMaterial: d.design_material || '',
                dieCode: d.total_die_code != null ? String(d.total_die_code) : '',
                moldQtyPerDie: d.total_mold_qty_per_die != null ? String(d.total_mold_qty_per_die) : '',
                cpxDeadWeight: d.total_cpx_dead_weight != null ? String(d.total_cpx_dead_weight) : '',
                mechanism: d.mechanism || '',
                notes: d.designer_notes || '',
                trackingRows: Array.isArray(d.tracking_rows) && d.tracking_rows.length
                  ? d.tracking_rows.map((r, i) => ({ id: r.id ?? i + 1, tdm: r.tdm ?? '', stl: r.stl ?? '', motiveCode: r.motiveCode ?? '', motiveSku: r.motiveSku ?? r.masterSku ?? '', dieCode: r.dieCode ?? '', moldDieQty: r.moldDieQty ?? '', length: r.length ?? '', width: r.width ?? '', height: r.height ?? '' }))
                  : TRACKING_DEFAULT_ROWS(),
                findingsRows: Array.isArray(d.findings_entries) && d.findings_entries.length
                  ? d.findings_entries.map((r, i) => ({ id: i + 1, code: r.code || '', quantity: r.quantity || '' }))
                  : DESIGNER_FINDINGS_DEFAULT(),
              }))
              if (Array.isArray(d.stone_entries) && d.stone_entries.length > 0) {
                setDesignerStoneRows(d.stone_entries.map((s, i) => ({ id: i + 1, type: s.type || '', species: s.species || '', variety: s.variety || '', color: s.color || '', cut: s.cut || '', shape: s.shape || '', length: s.length || '', width: s.width || '', height: s.height || '', qty: s.qty || '' })))
              } else {
                setDesignerStoneRows(DESIGNER_STONE_DEFAULT())
              }
              if (Array.isArray(d.plating_entries) && d.plating_entries.length > 0) {
                setDesignerPlatingRows(d.plating_entries.map((p, i) => ({ id: i + 1, type: p.type || '', color: p.color || '' })))
              } else {
                setDesignerPlatingRows(DESIGNER_PLATING_DEFAULT())
              }
            }
          })
          .catch(() => {})
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [skuParam])

  // Auto-fill designer panel, stone info, and plating when Designer SKU is typed
  useEffect(() => {
    const dSku = designerSku.trim()
    if (!dSku) return
    if (designerSkuLookupRef.current) clearTimeout(designerSkuLookupRef.current)
    designerSkuLookupRef.current = setTimeout(() => {
      fetch(`/api/designers?sku=${encodeURIComponent(dSku)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(json => {
          const rows = Array.isArray(json.data) ? json.data : (json.data?.results || [])
          const d = rows.find(r => String(r.sku || '').trim().toLowerCase() === dSku.toLowerCase())
          if (!d) return
          setDesignerRecordId(d.id)
          setDesigner(prev => ({
            ...prev,
            image1: d.rendered_photo || d.image || prev.image1,
            image2: d.technical_drawing || d.designer_image_2 || prev.image2,
            image3: d.designer_image_3 || prev.image3,
            designStage: d.design_stage || prev.designStage,
            settingType: d.setting_type || prev.settingType,
            enamel: d.enamel || prev.enamel,
            tdmLength: (d.total_design_measurements?.length) || prev.tdmLength || '',
            tdmWidth: (d.total_design_measurements?.width) || prev.tdmWidth || '',
            tdmHeight: (d.total_design_measurements?.height) || prev.tdmHeight || '',
            designMaterial: d.design_material || prev.designMaterial,
            dieCode: d.total_die_code != null ? String(d.total_die_code) : (d.die_code || prev.dieCode),
            moldQtyPerDie: d.total_mold_qty_per_die != null ? String(d.total_mold_qty_per_die) : (d.mold_qty_per_die || prev.moldQtyPerDie),
            cpxDeadWeight: d.total_cpx_dead_weight != null ? String(d.total_cpx_dead_weight) : (d.cpx_dead_weight || prev.cpxDeadWeight),
            mechanism: d.mechanism || prev.mechanism,
            notes: d.designer_notes || prev.notes,
            trackingRows: Array.isArray(d.tracking_rows) && d.tracking_rows.length
              ? d.tracking_rows.map((r, i) => ({ id: r.id ?? i + 1, tdm: r.tdm ?? '', stl: r.stl ?? '', motiveCode: r.motiveCode ?? '', motiveSku: r.motiveSku ?? r.masterSku ?? '', dieCode: r.dieCode ?? '', moldDieQty: r.moldDieQty ?? '', length: r.length ?? '', width: r.width ?? '', height: r.height ?? '' }))
              : prev.trackingRows,
            findingsRows: Array.isArray(d.findings_entries) && d.findings_entries.length
              ? d.findings_entries.map((r, i) => ({ id: i + 1, code: r.code || '', quantity: r.quantity || '' }))
              : prev.findingsRows,
          }))
          if (Array.isArray(d.stone_entries) && d.stone_entries.length > 0) {
            setDesignerStoneRows(d.stone_entries.map((s, i) => ({ id: i + 1, type: s.type || '', species: s.species || '', variety: s.variety || '', color: s.color || '', cut: s.cut || '', shape: s.shape || '', length: s.length || '', width: s.width || '', height: s.height || '', qty: s.qty || '' })))
            // Auto-fill product stone: cut/shape/length/width/height/qty; type/species/variety/color stay manual
            setStoneInfo(prev => {
              return d.stone_entries.map((s, i) => ({
                id: i + 1,
                type: prev[i]?.type || '',
                species: prev[i]?.species || '',
                variety: prev[i]?.variety || '',
                color: prev[i]?.color || '',
                cut: s.cut || '',
                shape: s.shape || '',
                length: s.length || '',
                width: s.width || '',
                height: s.height || '',
                qty: s.qty || '',
              }))
            })
          }
          if (Array.isArray(d.plating_entries) && d.plating_entries.length > 0) {
            setDesignerPlatingRows(d.plating_entries.map((p, i) => ({ id: i + 1, type: p.type || '', color: p.color || '' })))
          }
          // Auto-fill product sheet: die codes from tracking_rows, findings from findings_entries
          const dieEntries = Array.isArray(d.tracking_rows)
            ? d.tracking_rows.filter(r => r.dieCode).map((r, i) => ({ id: i + 1, type: 'die_number', value: r.dieCode || '', quantity: r.moldDieQty || '', location: '' }))
            : []
          const findingEntries = Array.isArray(d.findings_entries)
            ? d.findings_entries.filter(r => r.code).map((r, i) => ({ id: dieEntries.length + i + 1, type: 'findings', value: r.code || '', quantity: r.quantity || '', location: '' }))
            : []
          const combined = [...dieEntries, ...findingEntries]
          if (combined.length > 0) {
            while (combined.length < 5) combined.push({ id: combined.length + 1, type: 'die_number', value: '', quantity: '', location: '' })
            setManufacturing(prev => ({ ...prev, dieNumbers: combined }))
          }
          // Auto-fill product sheet: setting type and enamel
          if (d.setting_type) {
            const st = d.setting_type.toLowerCase()
            if (st.includes('wax')) setSettingType('wax')
            else if (st.includes('hand')) setSettingType('hand')
          }
          if (d.enamel) {
            const en = d.enamel.toLowerCase()
            if (en === 'yes') setEnamelType('yes')
            else if (en === 'no') setEnamelType('no')
          }
          setDesignerSaveStatus({ success: true, message: `Designer data loaded for "${dSku}"` })
          setTimeout(() => setDesignerSaveStatus(null), 3000)
        })
        .catch(() => {})
    }, 600)
    return () => { if (designerSkuLookupRef.current) clearTimeout(designerSkuLookupRef.current) }
  }, [designerSku])

  useEffect(() => {
    const pendingDraft = localStorage.getItem('pending_draft_load')
    if (!pendingDraft) return

    try {
      const parsed = JSON.parse(pendingDraft)
      window.dispatchEvent(
        new CustomEvent('draftLoad', {
          detail: parsed,
        })
      )
    } catch (error) {
      console.error('Failed to load pending draft:', error)
    } finally {
      localStorage.removeItem('pending_draft_load')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Auto-sync finalStock SKU rows from variation col2 values
  useEffect(() => {
    const varSkus = [...new Set(variations.map(v => String(v.col2 || '').trim()).filter(Boolean))]
    setFinalStock(prev => {
      const manualRows = prev.filter(r => !r.fromVariation)
      const existingVarMap = new Map(prev.filter(r => r.fromVariation).map(r => [r.sku, r]))
      const varRows = varSkus.map(sku => existingVarMap.get(sku) || { sku, value: '', unit: '', fromVariation: true })
      const allRows = [...varRows, ...manualRows]
      return allRows.length > 0
        ? allRows.map((r, i) => ({ ...r, id: i + 1 }))
        : [{ id: 1, sku: '', value: '', unit: '', fromVariation: false }]
    })
  }, [variations])

  const buildProductData = (overrideValues = {}) => ({
    sku,
    designerSku,
    listingName,
    material,
    materialSku,
    materialSkuLocation,
    dropdown1,
    weightValue,
    weightUnit,
    dropdown2,
    dropdown3,
    settingType,
    enamelType,
    activeChannels,
    shopifyStatus,
    platingType,
    manufacturing,
    variations,
    stoneInfo,
    finalStock,
    liveStock,
    productImages,
    primaryImageIndex,
    designer,
    existingProductId: editProductId,
    ...overrideValues,
  })

  const saveProductData = async (productData, isAutoSave = false) => {
    const response = await fetch('/api/product-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to save product')
    }

    const syncTimestamp = Date.now().toString()
    localStorage.setItem(PRODUCT_SHEET_SYNC_KEY, syncTimestamp)
    window.dispatchEvent(
      new CustomEvent(PRODUCT_SHEET_SYNC_EVENT, {
        detail: { updatedAt: syncTimestamp },
      })
    )

    if (isAutoSave) {
      setSaveStatus({ success: true, message: '✓ Auto-saved' })
      setShowViewSheetButton(false)
      setTimeout(() => setSaveStatus(null), 1500)
      return
    }

    const message = result.isUpdate
      ? `✓ Product updated (${result.message})`
      : '✓ New product added'
    setSaveStatus({ success: true, message })
    setShowViewSheetButton(true)
    setTimeout(() => setSaveStatus(null), 4000)
  }

  const scheduleAutoSave = (overrideValues = {}) => {
    const nextProductData = buildProductData(overrideValues)

    if (!nextProductData.sku?.trim()) {
      return
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveProductData(nextProductData, true)
      } catch (error) {
        setSaveStatus({ success: false, message: `Auto-save failed: ${error.message}` })
      }
    }, 600)
  }

  const updateLiveStock = (stage, field, value) => {
    setLiveStock(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: value,
      }
    }))
  }

  const updateFinalStock = (id, field, value) => {
    setFinalStock(finalStock.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  const addFinalStockRow = () => {
    const newId = Math.max(...finalStock.map(r => r.id), 0) + 1
    setFinalStock([...finalStock, { id: newId, sku: '', value: '', unit: '', fromVariation: false }])
  }

  const deleteFinalStock = (id) => {
    setFinalStock(finalStock.filter(row => row.id !== id))
  }

  // Handle image upload (multiple)
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))).then((results) => {
      setProductImages((prev) => {
        const updated = [...prev, ...results];
        if (prev.length === 0) setPrimaryImageIndex(0);
        return updated;
      });
      e.target.value = '';
    });
  };

  const removeProductImage = (indexToRemove) => {
    setProductImages((prev) => {
      const newImages = prev.filter((_, i) => i !== indexToRemove);
      setPrimaryImageIndex((current) => {
        if (newImages.length === 0) return 0;
        if (current > indexToRemove) return current - 1;
        if (current === indexToRemove) return Math.min(current, newImages.length - 1);
        return current;
      });
      return newImages;
    });
  };

  const dragIndexRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleThumbnailDrop = (dropIdx) => {
    const fromIdx = dragIndexRef.current;
    if (fromIdx === null || fromIdx === dropIdx) {
      dragIndexRef.current = null;
      setDragOverIdx(null);
      return;
    }
    setProductImages((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(dropIdx, 0, moved);
      setPrimaryImageIndex((current) => {
        if (current === fromIdx) return dropIdx;
        if (fromIdx < dropIdx) {
          if (current > fromIdx && current <= dropIdx) return current - 1;
        } else {
          if (current >= dropIdx && current < fromIdx) return current + 1;
        }
        return current;
      });
      return reordered;
    });
    dragIndexRef.current = null;
    setDragOverIdx(null);
  };
    const handleManufacturingImagesUpload = (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      Promise.all(files.map((file) => (
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      ))).then((results) => {
        setManufacturing((prev) => ({
          ...prev,
          images: [...prev.images, ...results],
        }));
        e.target.value = '';
      });
    };
    const removeManufacturingImage = (indexToRemove) => {
      setManufacturing((prev) => ({
        ...prev,
        images: prev.images.filter((_, index) => index !== indexToRemove),
      }));
    };

    // ── Designer handlers ──────────────────────────────────
    const handleDesignerImageSlotUpload = (slot) => (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setDesigner((prev) => ({ ...prev, [slot]: event.target?.result || '' }));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };

    const handleDesignerImageDownload = (slot, index) => {
      const data = designer[slot];
      if (!data) return;
      const a = document.createElement('a');
      a.href = data;
      a.download = `designer-image-${index}.png`;
      a.click();
    };

    const handleOpenDriveLink = (linkField) => {
      const url = designer[linkField];
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    // ── Designer Tracking Table handlers ──────────────────
    const addDesignerTrackingRow = () => {
      const newId = Math.max(...designer.trackingRows.map((r) => r.id), 0) + 1;
      setDesigner((prev) => ({
        ...prev,
        trackingRows: [...prev.trackingRows, { id: newId, tdm: '', stl: '', motiveCode: '', motiveSku: '', dieCode: '', moldDieQty: '', length: '', width: '', height: '' }],
      }));
    };

    const updateDesignerTrackingRow = (id, field, value) => {
      setDesigner((prev) => ({
        ...prev,
        trackingRows: prev.trackingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      }));
    };

    const deleteDesignerTrackingRow = (id) => {
      setDesigner((prev) => ({
        ...prev,
        trackingRows: prev.trackingRows.filter((r) => r.id !== id),
      }));
    };

    const addDesignerFindingsRow = () => {
      const newId = Math.max(...designer.findingsRows.map((r) => r.id), 0) + 1;
      setDesigner((prev) => ({ ...prev, findingsRows: [...prev.findingsRows, { id: newId, code: '', quantity: '' }] }));
    };
    const updateDesignerFindingsRow = (id, field, value) => {
      setDesigner((prev) => ({ ...prev, findingsRows: prev.findingsRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
    };
    const deleteDesignerFindingsRow = (id) => {
      setDesigner((prev) => ({ ...prev, findingsRows: prev.findingsRows.filter((r) => r.id !== id) }));
    };

    // ── Designer Save / Delete / Bulk Upload ──────────────
    const handleSaveDesigner = async () => {
      if (!sku) {
        setDesignerSaveStatus({ success: false, message: 'Enter a SKU first' });
        setTimeout(() => setDesignerSaveStatus(null), 4000);
        return;
      }
      setIsDesignerSaving(true);
      setDesignerSaveStatus(null);
      try {
        const payload = {
          sku,
          image: designer.image1,
          rendered_photo: designer.image1,
          designer_image_2: designer.image2,
          technical_drawing: designer.image2,
          designer_image_3: designer.image3,
          design_stage: designer.designStage,
          setting_type: designer.settingType,
          enamel: designer.enamel,
          design_motive_size: '',
          total_design_measurements: { length: designer.tdmLength, width: designer.tdmWidth, height: designer.tdmHeight },
          design_material: designer.designMaterial,
          total_die_code: designer.dieCode !== '' ? Number(designer.dieCode) || null : null,
          total_mold_qty_per_die: designer.moldQtyPerDie !== '' ? Number(designer.moldQtyPerDie) || null : null,
          total_cpx_dead_weight: designer.cpxDeadWeight !== '' ? Number(designer.cpxDeadWeight) || null : null,
          mechanism: designer.mechanism,
          designer_notes: designer.notes,
          stone_entries: designerStoneRows.map(({ type, species, variety, color, cut, shape, length, width, height, qty }) => ({ type, species, variety, color, cut, shape, length, width, height, qty })),
          plating_entries: designerPlatingRows.map(({ type, color }) => ({ type, color })),
          tracking_rows: designer.trackingRows,
          findings_entries: designer.findingsRows.map(({ code, quantity }) => ({ code, quantity })),
        };
        const isUpdate = !!designerRecordId;
        const url = isUpdate ? `/api/designers/${designerRecordId}` : '/api/designers';
        const method = isUpdate ? 'PATCH' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to save designer data');
        }
        const savedId = result.data?.id || designerRecordId;
        if (savedId) setDesignerRecordId(savedId);
        setDesignerSaveStatus({ success: true, message: isUpdate ? 'Designer updated' : 'Designer saved' });
      } catch (error) {
        setDesignerSaveStatus({ success: false, message: error.message });
      } finally {
        setIsDesignerSaving(false);
        setTimeout(() => setDesignerSaveStatus(null), 4000);
      }
    };

    const handleDeleteDesigner = async () => {
      if (!designerRecordId) {
        setDesignerSaveStatus({ success: false, message: 'No designer record to delete' });
        setTimeout(() => setDesignerSaveStatus(null), 4000);
        return;
      }
      const confirmed = window.confirm('Delete the designer record for this SKU?');
      if (!confirmed) return;
      setIsDesignerSaving(true);
      setDesignerSaveStatus(null);
      try {
        const response = await fetch(`/api/designers/${designerRecordId}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 204) {
          throw new Error(result.message || 'Failed to delete designer');
        }
        setDesignerRecordId(null);
        setDesigner({
          image1: '', image2: '', image3: '',
          designStage: '',
          settingType: '',
          enamel: '',
          tdmLength: '',
          tdmWidth: '',
          tdmHeight: '',
          designMaterial: '',
          dieCode: '',
          moldQtyPerDie: '',
          cpxDeadWeight: '',
          mechanism: '',
          notes: '',
          trackingRows: TRACKING_DEFAULT_ROWS(),
          findingsRows: DESIGNER_FINDINGS_DEFAULT(),
        });
        setDesignerSaveStatus({ success: true, message: 'Designer record deleted' });
      } catch (error) {
        setDesignerSaveStatus({ success: false, message: error.message });
      } finally {
        setIsDesignerSaving(false);
        setTimeout(() => setDesignerSaveStatus(null), 4000);
      }
    };

    const handleDesignerBulkUpload = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetType', 'designers');
      setIsDesignerSaving(true);
      setDesignerSaveStatus(null);
      try {
        const response = await fetch('/api/bulk-upload', { method: 'POST', body: formData });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Bulk upload failed');
        }
        setDesignerSaveStatus({ success: true, message: result.message });
      } catch (error) {
        setDesignerSaveStatus({ success: false, message: error.message });
      } finally {
        setIsDesignerSaving(false);
        setTimeout(() => setDesignerSaveStatus(null), 6000);
      }
    };

    // Handlers for Plating Type (product sheet – saved to Product model)
    const updatePlatingType = (id, field, value) => {
        setPlatingType(platingType.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const addPlatingTypeRow = () => {
        const newId = Math.max(...platingType.map(r => r.id), 0) + 1;
        setPlatingType([
            ...platingType,
            { id: newId, col1: '', col2: '', col3: '' },
        ]);
    };
    const deletePlatingType = (id) => {
        setPlatingType(platingType.filter(row => row.id !== id));
    };

    // Handlers for Designer Panel Stone rows (saved to DesignerSheet model)
    const updateDesignerStoneRow = (id, field, value) => setDesignerStoneRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const addDesignerStoneRow = () => {
      const newId = Math.max(...designerStoneRows.map(r => r.id), 0) + 1;
      setDesignerStoneRows(prev => [...prev, { id: newId, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' }]);
    };
    const deleteDesignerStoneRow = (id) => setDesignerStoneRows(prev => prev.filter(r => r.id !== id));

    // Handlers for Designer Panel Plating rows (saved to DesignerSheet model)
    const updateDesignerPlatingRow = (id, field, value) => setDesignerPlatingRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const addDesignerPlatingRow = () => {
      const newId = Math.max(...designerPlatingRows.map(r => r.id), 0) + 1;
      setDesignerPlatingRows(prev => [...prev, { id: newId, type: '', color: '' }]);
    };
    const deleteDesignerPlatingRow = (id) => setDesignerPlatingRows(prev => prev.filter(r => r.id !== id));

    // Handlers for Others
    const updateOthers = (id, field, value) => {
        setOthers(others.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const addOthersRow = () => {
        const newId = Math.max(...others.map(r => r.id), 0) + 1;
        setOthers([...others, { id: newId, key: '', value: '' }]);
    };
    const deleteOthers = (id) => {
        setOthers(others.filter(row => row.id !== id));
    };
    // Handlers for Die Numbers
    const updateDieNumber = (id, field, value) => {
        setManufacturing(prev => ({
            ...prev,
            dieNumbers: prev.dieNumbers.map(row => row.id === id ? { ...row, [field]: value } : row)
        }));
    };
    const addDieNumberRow = () => {
        const newId = Math.max(...manufacturing.dieNumbers.map(r => r.id), 0) + 1;
        setManufacturing(prev => ({
            ...prev,
            dieNumbers: [...prev.dieNumbers, { id: newId, type: 'die_number', value: '', quantity: '', location: '' }]
        }));
    };
    const deleteDieNumber = (id) => {
        setManufacturing(prev => ({
            ...prev,
            dieNumbers: prev.dieNumbers.filter(row => row.id !== id)
        }));
    };
    // Handlers for Variations
    const updateVariation = (id, field, value) => {
        setVariations((prev) => {
          const nextVariations = prev.map((row) => row.id === id ? { ...row, [field]: value } : row)
          scheduleAutoSave({ variations: nextVariations })
          return nextVariations
        })
    };

    const updateVariationLabel = (id, selectedLabel) => {
      const normalizedLabel = selectedLabel.toUpperCase()

      setVariations((prev) => {
        const nextVariations = prev.map((row) => {
          if (row.id !== id) {
            return row
          }

          if (normalizedLabel === 'COLOR') {
            const selectedColor = (row.col1 || '').toUpperCase()
            const mappedCode = selectedColor ? (colorCodeByColor[selectedColor] || row.col2 || '') : (row.col2 || '')
            return {
              ...row,
              label: normalizedLabel,
              col1: selectedColor,
              col2: mappedCode,
            }
          }

          return {
            ...row,
            label: normalizedLabel,
          }
        })

        scheduleAutoSave({ variations: nextVariations })
        return nextVariations
      })
    }

    const updateColorVariationColor = (id, selectedColor) => {
      const normalizedColor = selectedColor.toUpperCase();
      const mappedCode = colorCodeByColor[normalizedColor] || '';
      const nextVariations = variations.map(row => 
        row.id === id ? { ...row, col1: normalizedColor, col2: mappedCode } : row
      )

      setVariations(nextVariations)
      scheduleAutoSave({ variations: nextVariations })
    };

    const updateColorVariationCode = (id, codeValue) => {
      const normalizedCode = codeValue.toUpperCase();

      setVariations((prev) => {
        const nextVariations = prev.map((row) => {
          if (row.id !== id) {
            return row;
          }

          if (row.label === 'COLOR' && row.col1) {
            setColorCodeByColor((prevMap) => ({
              ...prevMap,
              [row.col1]: normalizedCode,
            }));
          }

          return { ...row, col2: normalizedCode };
        })

        scheduleAutoSave({ variations: nextVariations })
        return nextVariations
      });
    };

    const addVariation = () => {
      const newId = Math.max(...variations.map(r => r.id), 0) + 1;
      setVariations([...variations, { id: newId, label: '', col1: '', col2: '' }]);
    };
    const deleteVariation = (id) => {
      setVariations(variations.filter(row => row.id !== id));
    };
    // Handlers for Stone Info
    const updateStoneInfo = (id, field, value) => {
        setStoneInfo(stoneInfo.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const addStoneInfoRow = () => {
        const newId = Math.max(...stoneInfo.map(r => r.id), 0) + 1;
        setStoneInfo([
            ...stoneInfo,
            { id: newId, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
        ]);
    };
    const deleteStoneInfo = (id) => {
        setStoneInfo(stoneInfo.filter(row => row.id !== id));
    };
    
    const handleSaveProduct = async () => {
      setIsSaving(true);
      setSaveStatus(null);
      
      try {
        const productData = buildProductData()
        await saveProductData(productData)
      } catch (error) {
        setSaveStatus({ success: false, message: `Error: ${error.message}` });
      } finally {
        setIsSaving(false);
      }
    };
    
    const handleEditProduct = () => {
    setEditSearchTerm('')
    setEditSearchResults([])
    setIsEditDialogOpen(true)
  }

  const handleEditSearch = async () => {
    const term = editSearchTerm.trim()
    if (!term) return
    setIsEditSearching(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(term)}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok && json?.success) {
        const rows = Array.isArray(json.data) ? json.data : (json.data?.results || [])
        setEditSearchResults(rows)
      } else {
        setEditSearchResults([])
      }
    } catch {
      setEditSearchResults([])
    } finally {
      setIsEditSearching(false)
    }
  }

  const handleSelectProductForEdit = (product) => {
    setIsEditDialogOpen(false)
    setEditProductId(product.id)

    // Populate all form fields from the backend product
    setSku(product.master_sku || '')
    setDesignerSku(product.designer_sku || '')
    setListingName(product.name || '')
    setMaterial(product.material || '')
    setDropdown1(product.material || '')
    setWeightValue(product.weight || '')
    setWeightUnit('')
    setDropdown2(product.category || '')
    setDropdown3(product.collection || '')
    setSettingType(product.setting_type || '')
    setEnamelType(product.enamel_type || '')
    setShopifyStatus(product.is_active ? 'active' : 'inactive')
    setMaterialSku(product.master_sku || '')
    setMaterialSkuLocation('')

    // Active channels
    const ch = product.active_channels || ''
    if (ch) {
      setActiveChannels(ch.split(',').map(c => c.trim()).filter(Boolean))
    } else {
      setActiveChannels([])
    }

    // Die numbers / findings
    const dieRows = Array.isArray(product.die_numbers) ? product.die_numbers : []
    const findingRows = Array.isArray(product.findings) ? product.findings : []
    const combined = [
      ...dieRows.map((d, i) => ({ id: i + 1, type: 'die_number', value: d.value || '', quantity: d.quantity || '', location: d.location || '' })),
      ...findingRows.map((f, i) => ({ id: dieRows.length + i + 1, type: 'findings', value: f.value || '', quantity: f.quantity || '', location: f.location || '' })),
    ]
    // Pad to at least 5 rows
    while (combined.length < 5) {
      combined.push({ id: combined.length + 1, type: 'die_number', value: '', quantity: '', location: '' })
    }
    setManufacturing(prev => ({ ...prev, dieNumbers: combined, notes: product.notes || '' }))

    // Stone info
    if (Array.isArray(product.stone_entries) && product.stone_entries.length > 0) {
      setStoneInfo(
        product.stone_entries.map((s, i) => ({ id: i + 1, type: s.type || '', species: s.species || '', variety: s.variety || '', color: s.color || '', cut: s.cut || '', shape: s.shape || '', length: s.length || '', width: s.width || '', height: s.height || '', qty: s.qty || '' }))
      )
    } else {
      setStoneInfo([
        { id: 1, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
        { id: 2, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
        { id: 3, type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' },
      ])
    }

    // Plating
    setPlatingType((() => {
      const entries = Array.isArray(product.platingEntries) && product.platingEntries.length > 0
        ? product.platingEntries
        : (Array.isArray(product.plating_entries) && product.plating_entries.length > 0
          ? product.plating_entries
          : (product.plating_type ? [{ type: product.plating_type, color: product.plating_color || '' }] : []));
      const rows = entries.map((e, i) => ({ id: i + 1, col1: e.type || '', col2: e.color || '', col3: '' }));
      while (rows.length < 3) rows.push({ id: rows.length + 1, col1: '', col2: '', col3: '' });
      return rows;
    })())

    // Notes & images
    setProductImages(product.images ? [product.images] : [])
    setPrimaryImageIndex(0)

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setSaveStatus({ success: true, message: `Loaded: ${product.master_sku} - ${product.name || ''}` })
    setTimeout(() => setSaveStatus(null), 3000)

    // Load designer data for this SKU
    fetch(`/api/designers?sku=${encodeURIComponent(product.master_sku)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => {
        const rows = Array.isArray(json.data) ? json.data : (json.data?.results || [])
        const d = rows.find(r => String(r.sku || '').trim() === String(product.master_sku || '').trim())
        if (d) {
          setDesignerRecordId(d.id)
          setDesigner(prev => ({
            ...prev,
            image1: d.image || '',
            image2: d.designer_image_2 || '',
            image3: d.designer_image_3 || '',
            designStage: d.design_stage || '',
            tdmLength: (d.total_design_measurements?.length) || '',
            tdmWidth: (d.total_design_measurements?.width) || '',
            tdmHeight: (d.total_design_measurements?.height) || '',
            designMaterial: d.design_material || '',
            dieCode: d.die_code || '',
            moldQtyPerDie: d.mold_qty_per_die || '',
            cpxDeadWeight: d.cpx_dead_weight || '',
            mechanism: d.mechanism || '',
            trackingRows: Array.isArray(d.tracking_rows) && d.tracking_rows.length
              ? d.tracking_rows.map((r, i) => ({ id: r.id ?? i + 1, tdm: r.tdm ?? '', stl: r.stl ?? '', motiveCode: r.motiveCode ?? '', motiveSku: r.motiveSku ?? r.masterSku ?? '', dieCode: r.dieCode ?? '', moldDieQty: r.moldDieQty ?? '', length: r.length ?? '', width: r.width ?? '', height: r.height ?? '' }))
              : TRACKING_DEFAULT_ROWS(),
            findingsRows: Array.isArray(d.findings_entries) && d.findings_entries.length
              ? d.findings_entries.map((r, i) => ({ id: i + 1, code: r.code || '', quantity: r.quantity || '' }))
              : DESIGNER_FINDINGS_DEFAULT(),
          }))
        }
      })
      .catch(() => {})
  }

  const handleDeleteProduct = async () => {
      if (!sku) {
        setSaveStatus({ success: false, message: 'Please enter a SKU to delete' });
        setTimeout(() => setSaveStatus(null), 4000);
        return;
      }
      
      const confirmed = window.confirm(`Are you sure you want to delete product with SKU "${sku}"?`);
      if (!confirmed) return;
      
      setIsSaving(true);
      setSaveStatus(null);
      
      try {
        const response = await fetch('/api/product-sheet', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sku }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          localStorage.setItem(PRODUCT_SHEET_SYNC_KEY, Date.now().toString());
          // When opened via SKU link, redirect back to the master sheet after deletion
          if (skuParam) {
            router.push('/master-product-sheet')
            return
          }
          setSaveStatus({ success: true, message: result.message });
          setShowViewSheetButton(false)
          setTimeout(() => setSaveStatus(null), 4000);
          
          // Clear form after successful deletion
          setSku('');
          setDesignerSku('');
          setListingName('');
          setDropdown1('');
          setWeightValue('');
          setWeightUnit('');
          setDropdown2('');
          setDropdown3('');
          setSettingType('');
          setEnamelType('');
          setActiveChannels([]);
          setShopifyStatus('active');
          setMaterialSku('');
          setMaterialSkuLocation('');
        } else {
          setSaveStatus({ success: false, message: result.message });
        }
      } catch (error) {
        setSaveStatus({ success: false, message: `Error: ${error.message}` });
        setShowViewSheetButton(false)
      } finally {
        setIsSaving(false);
      }
    };

    const handleViewProductSheet = () => {
      router.push('/master-product-sheet')
    }
    
    return (<div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      <div className="sheet-fixed-header fixed top-0 left-0 right-0 z-[70] flex justify-between items-center bg-white/95 backdrop-blur py-2 px-3 md:px-4 border-b border-soft-border shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2">
          <MasterNavigationDrawer inHeader />
          <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT SHEET</h1>
        </div>
        <div className="flex gap-1.5 items-center">
          {backendMode && (
            <span
              className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                backendMode === 'DEPLOYED'
                  ? 'bg-success/10 text-success-dark border-success/30'
                  : 'bg-danger/10 text-danger-dark border-danger/30'
              }`}
            >
              Backend: {backendMode}
            </span>
          )}
          <DateTimeStamp className="mr-1 text-xs" />
          {skuParam ? (
            <>
              <button onClick={() => router.push('/master-product-sheet')} className="w-fit px-3 h-8 text-sm bg-midnight-ink text-white font-semibold rounded-full shadow-sm hover:bg-midnight-ink/90">
                ← BACK
              </button>
              {isViewMode ? (
                <button onClick={() => setIsViewMode(false)} className="w-fit px-3 h-8 text-sm bg-trust-blue text-white font-semibold rounded-full shadow-sm hover:bg-deep-blue flex items-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" />
                  EDIT
                </button>
              ) : (
                <button onClick={handleSaveProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-success text-white font-semibold rounded-full shadow-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'SAVE'}</button>
              )}
              <button onClick={handleDeleteProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-danger text-white font-semibold rounded-full shadow-sm hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed">DELETE</button>
            </>
          ) : (
            <>
              <button onClick={handleEditProduct} className="w-fit px-3 h-8 text-sm bg-trust-blue text-white font-semibold rounded-full shadow-sm hover:bg-deep-blue flex items-center gap-1">
                <Edit3 className="h-3.5 w-3.5" />
                EDIT
              </button>
              <button onClick={handleAddProduct} className="w-fit px-3 h-8 text-sm bg-trust-blue text-white font-semibold rounded-full shadow-sm hover:bg-deep-blue">+ ADD PRODUCT</button>
              <button onClick={handleSaveProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-success text-white font-semibold rounded-full shadow-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'SAVE'}</button>
              <button onClick={handleDeleteProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-danger text-white font-semibold rounded-full shadow-sm hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed">DELETE</button>
            </>
          )}
          {saveStatus && (
            <div className={`text-sm px-2 py-1 rounded-md ${saveStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {saveStatus.message}
            </div>
          )}
          {designerSaveStatus && (
            <div className={`text-sm px-2 py-1 rounded-md ${designerSaveStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {designerSaveStatus.message}
            </div>
          )}
          {showViewSheetButton && saveStatus?.success && (
            <button
              onClick={handleViewProductSheet}
              className="w-fit px-3 h-8 text-sm bg-midnight-ink text-white font-semibold rounded-full shadow-sm hover:bg-midnight-ink/90"
            >
              VIEW PRODUCT SHEET
            </button>
          )}
        </div>
      </div>

      {/* Edit Product Search Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-soft-border">
              <h2 className="text-lg font-bold text-midnight-ink">Edit Product</h2>
              <button onClick={() => setIsEditDialogOpen(false)} className="p-1 rounded-full hover:bg-cloud-gray">
                <X className="h-5 w-5 text-cool-gray" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-cool-gray mb-3">Search by Master SKU, SKU, or product name:</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-gray" />
                  <input
                    type="text"
                    placeholder="Enter Master SKU or SKU..."
                    value={editSearchTerm}
                    onChange={(e) => setEditSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditSearch() }}
                    className="w-full border border-soft-border rounded-lg pl-9 pr-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue/40"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleEditSearch}
                  disabled={isEditSearching || !editSearchTerm.trim()}
                  className="px-4 h-10 bg-trust-blue text-white text-sm font-semibold rounded-lg hover:bg-deep-blue disabled:opacity-50"
                >
                  {isEditSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {editSearchResults.length === 0 && !isEditSearching && editSearchTerm.trim() && (
                <p className="text-sm text-cool-gray text-center py-6">No products found. Try a different search term.</p>
              )}
              {editSearchResults.length > 0 && (
                <div className="space-y-2">
                  {editSearchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProductForEdit(product)}
                      className="w-full text-left p-3 border border-soft-border rounded-lg hover:bg-trust-blue/5 hover:border-trust-blue/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-midnight-ink">{product.master_sku}</p>
                          <p className="text-xs text-cool-gray">{product.name || 'Unnamed product'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-cool-gray">{product.category || ''}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isViewMode && (
        <div className="fixed top-[52px] left-0 right-0 z-[65] bg-amber-50 border-b border-amber-300 px-4 py-1.5 text-center text-xs font-semibold text-amber-800">
          👁 Viewing <strong>{sku}</strong> — click <strong>Edit</strong> to make changes
        </div>
      )}
      <div className={`flex-1 transition-all duration-300 px-3 md:px-4 pb-3 ${isViewMode ? 'pt-24 pointer-events-none select-none opacity-80' : 'pt-16'}`}>
      {/* Top Section - Product Details & Variations Combined */}
      <div className="bg-cloud-gray p-1.5 rounded-xl mb-2 border border-soft-border shadow-sm">
        <div className="flex gap-2 h-auto">
          {/* Product Image - Left Side - 1/5 width */}
          <div className="w-1/5 h-[25.5rem] flex flex-col gap-1 flex-shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden"/>
            {/* Primary image */}
            <div
              className="flex-1 min-h-0 bg-white border-2 border-soft-border rounded-xl shadow-sm ring-1 ring-soft-border flex items-center justify-center cursor-pointer hover:bg-cloud-gray relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {productImages.length > 0 ? (
                <img src={productImages[primaryImageIndex]} alt="Product" className="w-full h-full object-cover"/>
              ) : (
                <span className="text-cool-gray text-center text-sm font-semibold">PRODUCT<br/>IMAGE</span>
              )}
            </div>
            {/* Thumbnails strip */}
            {productImages.length > 0 && (
              <div className="h-[5.5rem] flex gap-1 overflow-x-auto flex-shrink-0 pb-0.5">
                {productImages.map((img, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => { dragIndexRef.current = idx; }}
                    onDragEnter={() => setDragOverIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleThumbnailDrop(idx)}
                    onDragEnd={() => { dragIndexRef.current = null; setDragOverIdx(null); }}
                    className={`relative flex-shrink-0 w-[4.8rem] h-[4.8rem] rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all select-none
                      ${idx === primaryImageIndex ? 'border-midnight-ink ring-1 ring-midnight-ink' : 'border-soft-border hover:border-cool-gray'}
                      ${dragOverIdx === idx && dragIndexRef.current !== idx ? 'ring-2 ring-trust-blue scale-105' : ''}
                      ${dragIndexRef.current === idx ? 'opacity-40' : ''}`}
                    onClick={() => setPrimaryImageIndex(idx)}
                  >
                    <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover pointer-events-none"/>
                    <button
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 leading-none"
                      onClick={(e) => { e.stopPropagation(); removeProductImage(idx); }}
                    >×</button>
                    {idx === primaryImageIndex && (
                      <div className="absolute bottom-0 left-0 right-0 bg-midnight-ink/80 text-white text-[8px] text-center py-0.5 leading-tight">MAIN</div>
                    )}
                  </div>
                ))}
                <div
                  className="flex-shrink-0 w-[4.8rem] h-[4.8rem] rounded-lg border-2 border-dashed border-soft-border flex items-center justify-center cursor-pointer hover:bg-cloud-gray text-cool-gray"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-2xl font-light leading-none">+</span>
                </div>
              </div>
            )}
          </div>

          {/* Product Details & Variations - Right Side - 4/5 width */}
          <div className="w-4/5 flex flex-col gap-1.5">
            {/* SKU Table */}
            <div className="flex gap-2 h-auto">
              <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                <div className="font-semibold text-sm mb-0.5">MASTER SKU</div>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
              </div>
              <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                <div className="font-semibold text-sm mb-0.5">DESIGNER SKU</div>
                <input type="text" value={designerSku} onChange={(e) => setDesignerSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
              </div>
              <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                <div className="font-semibold text-sm mb-0.5">LISTING NAME</div>
                <input type="text" value={listingName} onChange={(e) => setListingName(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
              </div>
            </div>

            {/* Dropdowns Table - 50/50 split matching SKU/Listing Name */}
            <div className="flex gap-2">
              {/* Left half: Material + Weight (under SKU) */}
              <div className="flex-1 flex gap-2">
                <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                  <div className="font-semibold text-sm mb-1">Material</div>
                  <select value={dropdown1} onChange={(e) => setDropdown1(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                    <option value="">Select...</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Brass">Brass</option>
                    <option value="Copper">Copper</option>
                  </select>
                </div>
                <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                  <div className="font-semibold text-sm mb-1">Weight</div>
                  <div className="flex gap-1">
                    <input type="text" placeholder="Value" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className="flex-1 bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1"/>
                    <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                      <option value="">Unit</option>
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                      <option value="grams">grams</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Right half: Category + Collection (under Listing Name) */}
              <div className="flex-1 flex gap-2">
                <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                  <div className="font-semibold text-sm mb-1">Category</div>
                  <select value={dropdown2} onChange={(e) => setDropdown2(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                    <option value="">Select...</option>
                    <option value="Ring">Ring</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Earring">Earring</option>
                    <option value="Pendant">Pendant</option>
                  </select>
                </div>
                <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                  <div className="font-semibold text-sm mb-1">Collection</div>
                  <select value={dropdown3} onChange={(e) => setDropdown3(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                    <option value="">Select...</option>
                    <option value="Classic">Classic</option>
                    <option value="Modern">Modern</option>
                    <option value="Vintage">Vintage</option>
                    <option value="Contemporary">Contemporary</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Two Separate Spaces */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                <div className="font-semibold text-sm mb-2">SETTING TYPE</div>
                <div className="flex gap-2">
                  <button onClick={() => setSettingType('wax')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                    settingType === 'wax'
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-white text-slate-text border-soft-border'
                  }`}>
                    WAX SETTING
                  </button>
                  <button onClick={() => setSettingType('hand')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                    settingType === 'hand'
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-white text-slate-text border-soft-border'
                  }`}>
                    HAND SETTING
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white border-2 border-soft-border rounded-xl shadow-sm px-2 py-1">
                <div className="font-semibold text-sm mb-2">ENAMEL</div>
                <div className="flex gap-2">
                  <button onClick={() => setEnamelType('yes')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                    enamelType === 'yes'
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-white text-slate-text border-soft-border'
                  }`}>
                    YES
                  </button>
                  <button onClick={() => setEnamelType('no')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                    enamelType === 'no'
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-white text-slate-text border-soft-border'
                  }`}>
                    NO
                  </button>
                </div>
              </div>
            </div>

            {/* DIE NUMBERS AND MASTER SKU ROW */}
            <div className="flex gap-2">
              {/* Die Numbers Panel - Left 50% */}
              <div className="flex-1 flex flex-col">
                {/* Active Channels Multi-Select */}
                <div className="mb-2">
                  <div className="font-semibold text-sm mb-1">Active Channels</div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                      className="bg-white border-2 border-soft-border rounded px-2 py-1 text-sm min-h-[2rem] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-wrap gap-1 flex-1">
                        {activeChannels.length > 0 ? (
                          activeChannels.map(channel => (
                            <span 
                              key={channel} 
                              className="bg-trust-blue text-white px-2 py-0.5 rounded text-sm flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {channel}
                              <button onClick={() => toggleChannel(channel)} className="hover:text-danger/30 font-bold">&times;</button>
                            </span>
                          ))
                        ) : (
                          <span className="text-cool-gray">Select channels...</span>
                        )}
                      </div>
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {isChannelDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-soft-border rounded shadow-lg max-h-40 overflow-y-auto">
                        {channelOptions.map(channel => (
                          <div
                            key={channel}
                            onClick={() => toggleChannel(channel)}
                            className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray flex items-center gap-2 ${
                              activeChannels.includes(channel) ? 'bg-trust-blue/10' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={activeChannels.includes(channel)}
                              onChange={() => {}}
                              className="pointer-events-none"
                            />
                            {channel}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border-2 border-soft-border rounded-xl shadow-sm h-[8.75rem] flex flex-col overflow-y-auto">
                  <div className="flex flex-col">
                    {manufacturing.dieNumbers.map((row, index) => (
                      <div key={row.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index > 0 ? 'border-t border-soft-border' : ''}`}>
                        <div className="w-32 flex-shrink-0 px-2 py-1 font-semibold text-sm flex items-center">
                          <select value={row.type} onChange={(e) => updateDieNumber(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none text-sm">
                            <option value="die_number">DIE NUMBER</option>
                            <option value="findings">FINDINGS</option>
                          </select>
                        </div>
                        <div className="flex-1 px-2 py-1 flex items-center gap-1">
                          <input type="text" value={row.value} onChange={(e) => updateDieNumber(row.id, 'value', e.target.value)} className="flex-1 bg-transparent outline-none text-sm"/>
                          <input type="text" placeholder="LOCATION" value={row.location} onChange={(e) => updateDieNumber(row.id, 'location', e.target.value)} className="w-24 bg-transparent outline-none text-sm placeholder-cool-gray text-right"/>
                        </div>
                        <div className="w-16 flex-shrink-0 px-2 py-1 flex items-center">
                          <input type="text" placeholder="QTY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                        </div>
                        <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-1 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addDieNumberRow} className="w-fit px-2 py-1 mt-2 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
                  + Add Rows
                </button>
              </div>

              {/* Variations Panel - Right 50% */}
              <div className="flex-1 flex flex-col">
                {/* Shopify Status */}
                <div className="mb-2">
                  <div className="font-semibold text-sm mb-1">Shopify Status</div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="bg-white border-2 border-soft-border rounded px-2 py-1 text-sm min-h-[2rem] flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-sm">
                        {shopifyStatus === 'active' ? 'Active' : shopifyStatus === 'draft' ? 'Draft' : 'Unlisted'}
                      </span>
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {isStatusDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-soft-border rounded shadow-lg max-h-40 overflow-y-auto">
                        <div
                          onClick={() => {
                            setShopifyStatus('active')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                            shopifyStatus === 'active' ? 'bg-trust-blue/10' : ''
                          }`}
                        >
                          Active
                        </div>
                        <div
                          onClick={() => {
                            setShopifyStatus('draft')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                            shopifyStatus === 'draft' ? 'bg-trust-blue/10' : ''
                          }`}
                        >
                          Draft
                        </div>
                        <div
                          onClick={() => {
                            setShopifyStatus('unlisted')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                            shopifyStatus === 'unlisted' ? 'bg-trust-blue/10' : ''
                          }`}
                        >
                          Unlisted
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border-2 border-soft-border rounded-xl shadow-sm h-[8.75rem] flex flex-col">
                  <div className="flex divide-x-2 divide-soft-border border-b border-soft-border flex-shrink-0">
                    <div className="w-32 px-2 py-1 font-semibold text-sm flex items-center flex-shrink-0">
                      MASTER SKU
                    </div>
                    <div className="flex-1 px-2 py-1 flex items-center gap-1">
                      <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="flex-1 bg-transparent outline-none text-sm"/>
                      <input type="text" placeholder="LOCATION" value={materialSkuLocation} onChange={(e) => setMaterialSkuLocation(e.target.value)} className="w-24 bg-transparent outline-none text-sm placeholder-cool-gray text-right"/>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {variations.map((variation, index) => (
                      <div key={variation.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index < variations.length - 1 ? 'border-b border-soft-border' : ''}`}>
                        <div className="w-32 px-2 py-1 font-semibold text-sm flex items-center flex-shrink-0">
                          <select
                            value={variation.label}
                            onChange={(e) => updateVariationLabel(variation.id, e.target.value)}
                            className="w-full bg-transparent outline-none text-sm"
                          >
                            <option value="" disabled>Variation</option>
                            {variationTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        {variation.label === 'COLOR' ? (
                          <>
                            <div className="flex-1 px-2 py-1 flex items-center">
                              <select
                                value={variation.col1}
                                onChange={(e) => updateColorVariationColor(variation.id, e.target.value)}
                                className="w-full bg-transparent outline-none text-sm"
                              >
                                <option value="">Select Color</option>
                                {colorOptions.map((color) => (
                                  <option key={color} value={color}>{color}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1 px-2 py-1 flex items-center">
                              <input
                                type="text"
                                value={variation.col2}
                                placeholder="e.g. AJP36/G"
                                onChange={(e) => updateColorVariationCode(variation.id, e.target.value)}
                                className="w-full bg-transparent outline-none text-sm"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 px-2 py-1 flex items-center">
                              <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </div>
                            <div className="flex-1 px-2 py-1 flex items-center">
                              <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </div>
                          </>
                        )}
                        <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-1 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addVariation} className="w-fit px-2 py-1 mt-2 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
                  + ADD Variation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stock Situation Panel (tabular view) */}
      <div className="bg-cloud-gray p-2 rounded-xl mb-2 border border-soft-border shadow-sm">
        <h2 className="text-sm font-semibold mb-1.5 text-center text-warning">LIVE STOCK SITUATION</h2>
        <div className="flex gap-2 items-start">
          {/* Main Live Stock Table - 80% */}
          <div className="flex-shrink-0 bg-white border border-soft-border rounded-xl overflow-hidden" style={{width: '80%'}}>
            <table className="w-full table-fixed text-sm border-collapse text-center">
              <thead>
                <tr className="bg-[#dce8f5]">
                  <th className="border border-soft-border px-1 py-1 text-left font-semibold text-midnight-ink w-36 whitespace-nowrap"></th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Wax Piece</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Wax Setting</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Casting</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Filling</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Pre Polish</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Setting</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Final Polish</th>
                  <th className="border border-soft-border px-0.5 py-1 font-semibold text-midnight-ink">Ready for Plating</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-soft-border px-1 py-1 font-semibold text-left text-midnight-ink bg-[#f5f8fc] whitespace-nowrap">Minimum Suggested</td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawMaterial.min} onChange={(e) => updateLiveStock('rawMaterial','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawSetting.min} onChange={(e) => updateLiveStock('rawSetting','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.wipLiquidCasting.min} onChange={(e) => updateLiveStock('wipLiquidCasting','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.filing.min} onChange={(e) => updateLiveStock('filing','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.packing.min} onChange={(e) => updateLiveStock('packing','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.setting.min} onChange={(e) => updateLiveStock('setting','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.finalPolish.min} onChange={(e) => updateLiveStock('finalPolish','min', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.readyForPlacing.min} onChange={(e) => updateLiveStock('readyForPlacing','min', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="border border-soft-border px-1 py-1 font-semibold text-left text-midnight-ink bg-[#f5f8fc] whitespace-nowrap">Current Stock</td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawMaterial.current} onChange={(e) => updateLiveStock('rawMaterial','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawSetting.current} onChange={(e) => updateLiveStock('rawSetting','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.wipLiquidCasting.current} onChange={(e) => updateLiveStock('wipLiquidCasting','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.filing.current} onChange={(e) => updateLiveStock('filing','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.packing.current} onChange={(e) => updateLiveStock('packing','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.setting.current} onChange={(e) => updateLiveStock('setting','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.finalPolish.current} onChange={(e) => updateLiveStock('finalPolish','current', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.readyForPlacing.current} onChange={(e) => updateLiveStock('readyForPlacing','current', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="border border-soft-border px-1 py-1 font-semibold text-left text-midnight-ink bg-[#f5f8fc] whitespace-nowrap">WIP</td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawMaterial.wip} onChange={(e) => updateLiveStock('rawMaterial','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawSetting.wip} onChange={(e) => updateLiveStock('rawSetting','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.wipLiquidCasting.wip} onChange={(e) => updateLiveStock('wipLiquidCasting','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.filing.wip} onChange={(e) => updateLiveStock('filing','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.packing.wip} onChange={(e) => updateLiveStock('packing','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.setting.wip} onChange={(e) => updateLiveStock('setting','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.finalPolish.wip} onChange={(e) => updateLiveStock('finalPolish','wip', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.readyForPlacing.wip} onChange={(e) => updateLiveStock('readyForPlacing','wip', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="border border-soft-border px-1 py-1 font-semibold text-left text-midnight-ink bg-[#f5f8fc] whitespace-nowrap">Location</td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawMaterial.location} onChange={(e) => updateLiveStock('rawMaterial','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.rawSetting.location} onChange={(e) => updateLiveStock('rawSetting','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.wipLiquidCasting.location} onChange={(e) => updateLiveStock('wipLiquidCasting','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.filing.location} onChange={(e) => updateLiveStock('filing','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.packing.location} onChange={(e) => updateLiveStock('packing','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.setting.location} onChange={(e) => updateLiveStock('setting','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.finalPolish.location} onChange={(e) => updateLiveStock('finalPolish','location', e.target.value)} /></td>
                  <td className="border border-soft-border p-0"><input className="w-full h-full px-1 py-1 text-sm bg-transparent outline-none text-center" value={liveStock.readyForPlacing.location} onChange={(e) => updateLiveStock('readyForPlacing','location', e.target.value)} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Stock Table - 20% */}
          <div className="flex-shrink-0 border border-soft-border rounded-xl overflow-hidden flex flex-col max-h-[170px]" style={{width: '20%'}}>
            {/* Fixed header */}
            <div className="flex flex-shrink-0 bg-[#dce8f5] border-b border-soft-border">
              <div className="flex-1 border-r border-soft-border px-1 py-1 text-center text-sm font-semibold text-midnight-ink">SKU</div>
              <div className="flex-1 border-r border-soft-border px-1 py-1 text-center text-sm font-semibold text-midnight-ink">Value</div>
              <div className="flex-1 border-r border-soft-border px-1 py-1 text-center text-sm font-semibold text-midnight-ink">Unit</div>
              <div className="w-6"></div>
            </div>
            {/* Scrollable body — constrained to left table's height */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {finalStock.map((row) => (
                <div key={row.id} className="flex border-b border-soft-border">
                  <input className={`flex-1 min-w-0 px-1 py-1 text-sm outline-none text-center border-r border-soft-border ${row.fromVariation ? 'bg-blue-50 text-trust-blue font-medium cursor-default' : 'bg-transparent'}`} placeholder="SKU" value={row.sku} onChange={(e) => !row.fromVariation && updateFinalStock(row.id, 'sku', e.target.value)} readOnly={!!row.fromVariation} />
                  <input className="flex-1 min-w-0 px-1 py-1 text-sm bg-transparent outline-none text-center border-r border-soft-border" placeholder="Value" value={row.value} onChange={(e) => updateFinalStock(row.id, 'value', e.target.value)} />
                  <input className="flex-1 min-w-0 px-1 py-1 text-sm bg-transparent outline-none text-center border-r border-soft-border" placeholder="Unit" value={row.unit} onChange={(e) => updateFinalStock(row.id, 'unit', e.target.value)} />
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <button type="button" onClick={() => deleteFinalStock(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Fixed Add Row button */}
            <button onClick={addFinalStockRow} className="w-full px-1 py-1 bg-trust-blue text-white text-sm hover:bg-deep-blue flex-shrink-0">+ Add Row</button>
          </div>
        </div>
        <div className="mt-2 flex justify-center gap-3">
          <button onClick={() => setIsCreateJobModalOpen(true)} className="px-6 py-1.5 bg-success text-white font-semibold rounded text-sm hover:bg-success">Create Job</button>
        </div>
      </div>

      {/* Stone Info and Plating Type - Side by Side */}
      <div className="flex gap-2 mb-2 items-stretch">
        <div className="w-[65%] bg-cloud-gray p-1.5 rounded-xl border border-soft-border shadow-sm flex flex-col h-full min-h-[240px]">
          <h2 className="text-sm font-semibold mb-1">STONE INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-soft-border table-fixed break-words">
              <thead>
                <tr className="border-b-2 border-soft-border">
                  {['TYPE','SPECIES','VARIETY','COLOR','CUT','SHAPE','LENGTH','WIDTH','HEIGHT','QTY'].map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words whitespace-nowrap">{h}</th>
                  ))}
                  <th className="w-6 bg-white"></th>
                </tr>
              </thead>
              <tbody>
                {stoneInfo.map((stone, index) => (
                  <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                    {['type','species','variety','color','cut','shape','length','width','height','qty'].map((f) => (
                      <td key={f} className="px-2 py-1 border-r-2 border-soft-border bg-white">
                        <input type="text" value={stone[f]} onChange={(e) => updateStoneInfo(stone.id, f, e.target.value)} className="w-full bg-transparent outline-none text-sm min-w-[60px]"/>
                      </td>
                    ))}
                    <td className="w-4 px-2 py-1 bg-white text-center" style={{maxWidth: '1.5rem'}}>
                      <button type="button" onClick={() => deleteStoneInfo(stone.id)} className="text-danger hover:text-danger-dark transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <button onClick={addStoneInfoRow} className="w-fit mt-1.5 px-2 py-1 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
            +ADD ROW
          </button>
        </div>

        <div className="w-[35%] bg-cloud-gray p-1.5 rounded-xl border border-soft-border shadow-sm flex flex-col h-full min-h-[240px]">
          <h2 className="text-sm font-semibold mb-1">PLATING INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-soft-border table-fixed break-words">
              <thead>
                <tr className="border-b-2 border-soft-border">
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    PLATING TYPE
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    PLATING COLOR
                  </th>
                  <th className="w-6 px-2 py-1 text-center font-semibold text-sm bg-white break-words">
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {platingType.map((row, index) => (
                  <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white break-words">
                      <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-6 px-2 py-1 bg-white text-center">
                      <button type="button" onClick={() => deletePlatingType(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <button onClick={addPlatingTypeRow} className="w-fit mt-2 px-3 py-1 text-sm bg-trust-blue text-white font-semibold rounded-md shadow-sm hover:bg-deep-blue">
            +ADD ROW
          </button>
        </div>
      </div>

      {/* Manufacturing Section */}
      <div className="bg-cloud-gray p-2 rounded-xl mb-2 border border-soft-border shadow-sm">
        <h2 className="text-sm font-semibold mb-1.5">MANUFACTURING</h2>
        <div className="bg-white rounded-xl">
          <div className="border-2 border-soft-border rounded-xl shadow-sm">
            <div className="flex border-b-2 border-soft-border">
              <div className="w-20 p-2 border-r-2 border-soft-border font-semibold text-sm bg-white flex-shrink-0">
                NOTES
              </div>
              <div className="flex-1 p-2 bg-white">
                <input type="text" value={manufacturing.notes ?? ''} onChange={(e) => setManufacturing({ ...manufacturing, notes: e.target.value })} className="w-full bg-transparent outline-none text-sm"/>
              </div>
            </div>

            <div className="flex">
              <div className="w-20 p-2 border-r-2 border-soft-border font-semibold text-sm bg-white flex-shrink-0">
                IMAGES
              </div>
              <div className="flex-1 p-3 bg-white">
                <div className="flex flex-wrap gap-2">
                  {manufacturing.images.length > 0 ? (
                    manufacturing.images.map((src, index) => (
                      <div key={`${index}-${src}`} className="relative">
                        <img src={src} alt={`Manufacturing ${index + 1}`} className="w-40 h-40 object-cover border border-soft-border rounded-xl"/>
                        <button type="button" onClick={() => removeManufacturingImage(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-sm rounded-full flex items-center justify-center">
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-cool-gray">Select images</span>
                  )}
                </div>
                  <button onClick={() => manufacturingImagesRef.current?.click()} className="mt-2 px-3 py-1 text-sm bg-trust-blue text-white font-semibold rounded-md shadow-sm hover:bg-deep-blue">
                  Select Images
                </button>
                <input ref={manufacturingImagesRef} type="file" accept="image/*" multiple onChange={handleManufacturingImagesUpload} className="hidden"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Designer Panel */}
      <div className="bg-cloud-gray p-2 rounded-xl mb-2 border border-soft-border shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold text-trust-blue">DESIGNER</h2>
          <div className="flex items-center gap-1.5">
            {designerSaveStatus && (
              <span className={`text-xs px-2 py-0.5 rounded ${designerSaveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>{designerSaveStatus.message}</span>
            )}
            <Link href={sku ? `/frontend/designer-sheet?sku=${encodeURIComponent(sku)}` : '/frontend/designer-sheet'} className="px-2.5 py-1 text-xs bg-midnight-ink text-white font-semibold rounded-full hover:bg-midnight-ink/80 flex items-center gap-1"><Eye className="h-3 w-3"/>OPEN SHEET</Link>
            <button type="button" onClick={handleSaveDesigner} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">{isDesignerSaving ? 'Saving...' : 'SAVE'}</button>
            <button type="button" onClick={handleDeleteDesigner} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-danger text-white font-semibold rounded-full hover:bg-danger/90 disabled:opacity-50">DELETE</button>
            <button type="button" onClick={() => designerBulkUploadRef.current?.click()} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1"><Upload className="h-3 w-3"/>UPLOAD</button>
            <input ref={designerBulkUploadRef} type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleDesignerBulkUpload} className="hidden"/>
          </div>
        </div>
        <div>
          {/* 3 Image Upload Slots – equal columns */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Hidden file inputs */}
            <input ref={designerImageRef1} type="file" accept="image/*" onChange={handleDesignerImageSlotUpload('image1')} className="hidden"/>
            <input ref={designerImageRef2} type="file" accept="image/*" onChange={handleDesignerImageSlotUpload('image2')} className="hidden"/>
            <input ref={designerImageRef3} type="file" accept="image/*" onChange={handleDesignerImageSlotUpload('image3')} className="hidden"/>
            {[
              { slot: 'image1', ref: designerImageRef1, label: 'Rendered Photo' },
              { slot: 'image2', ref: designerImageRef2, label: 'Technical Drawing' },
              { slot: 'image3', ref: designerImageRef3, label: 'Other Photo' },
            ].map(({ slot, ref, label }) => (
              <div key={slot} className="flex flex-col gap-1">
                <div className="text-center text-xs font-semibold text-trust-blue py-0.5 bg-trust-blue/10 rounded-t-lg border border-soft-border border-b-0">{label}</div>
                <div
                  className="bg-white border border-soft-border rounded-b-xl overflow-hidden flex items-center justify-center cursor-pointer hover:bg-cloud-gray"
                  style={{minHeight: '9rem'}}
                  onClick={() => ref.current?.click()}
                >
                  {designer[slot] ? (
                    <img src={designer[slot]} alt={label} className="w-full h-full object-cover rounded-b-xl"/>
                  ) : (
                    <span className="text-xs text-cool-gray text-center px-2">Click to upload image</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDesignerImageDownload(slot, label)}
                  disabled={!designer[slot]}
                  className="w-full px-1 py-0.5 text-xs bg-midnight-ink text-white rounded font-semibold hover:bg-midnight-ink/80 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Download className="h-3 w-3"/>Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking Table */}
        <div className="mt-2 bg-white border border-soft-border rounded-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#dce8f5]">
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">3DM</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">STL</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Motive Code</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Motive SKU</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Die Code</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Mold/Die Qty</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Length</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Width</th>
                  <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Height</th>
                  <th className="border border-soft-border px-1 py-1 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {designer.trackingRows.map((row) => (
                  <tr key={row.id} className="hover:bg-cloud-gray/40">
                    <td className="border border-soft-border p-0">
                      <div className="flex items-center">
                        {row.tdm ? (
                          <a href={row.tdm} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate text-xs" title={row.tdm}>{row.tdm}</a>
                        ) : (
                          <input type="url" value={row.tdm} onChange={(e) => updateDesignerTrackingRow(row.id, 'tdm', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[60px]"/>
                        )}
                        <button type="button" title="Set Drive link" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.tdm); if (url !== null) updateDesignerTrackingRow(row.id, 'tdm', url.trim()); }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0"><Upload className="h-3 w-3"/></button>
                      </div>
                    </td>
                    <td className="border border-soft-border p-0">
                      <div className="flex items-center">
                        {row.stl ? (
                          <a href={row.stl} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate text-xs" title={row.stl}>{row.stl}</a>
                        ) : (
                          <input type="url" value={row.stl} onChange={(e) => updateDesignerTrackingRow(row.id, 'stl', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[60px]"/>
                        )}
                        <button type="button" title="Set Drive link" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.stl); if (url !== null) updateDesignerTrackingRow(row.id, 'stl', url.trim()); }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0"><Upload className="h-3 w-3"/></button>
                      </div>
                    </td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.motiveCode} onChange={(e) => updateDesignerTrackingRow(row.id, 'motiveCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[80px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.motiveSku} onChange={(e) => updateDesignerTrackingRow(row.id, 'motiveSku', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.dieCode} onChange={(e) => updateDesignerTrackingRow(row.id, 'dieCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.moldDieQty} onChange={(e) => updateDesignerTrackingRow(row.id, 'moldDieQty', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.length ?? ''} onChange={(e) => updateDesignerTrackingRow(row.id, 'length', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[55px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.width ?? ''} onChange={(e) => updateDesignerTrackingRow(row.id, 'width', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[55px]"/></td>
                    <td className="border border-soft-border p-0"><input type="text" value={row.height ?? ''} onChange={(e) => updateDesignerTrackingRow(row.id, 'height', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[55px]"/></td>
                    <td className="border border-soft-border p-0 text-center">
                      <button type="button" onClick={() => deleteDesignerTrackingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addDesignerTrackingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ Add Row</button>
        </div>

        {/* Stone Info + Plating Info (Designer Sheet data) */}
        <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: '3fr 2fr' }}>
          {/* Stone Info */}
          <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
            <div className="text-xs font-bold text-midnight-ink px-3 py-1.5 bg-[#dce8f5] border-b border-soft-border">STONE INFO</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-cloud-gray">
                    {['TYPE','SPECIES','VARIETY','COLOR','CUT','SHAPE','LENGTH','WIDTH','HEIGHT','QTY'].map((h) => (
                      <th key={h} className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left whitespace-nowrap">{h}</th>
                    ))}
                    <th className="border border-soft-border px-1 py-1 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {designerStoneRows.map((row) => (
                    <tr key={row.id} className="hover:bg-cloud-gray/40">
                      {['type','species','variety','color','cut','shape','length','width','height','qty'].map((f) => (
                        <td key={f} className="border border-soft-border p-0">
                          <input type="text" value={row[f]} onChange={(e) => updateDesignerStoneRow(row.id, f, e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[60px] text-xs"/>
                        </td>
                      ))}
                      <td className="border border-soft-border p-0 text-center">
                        <button type="button" onClick={() => deleteDesignerStoneRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addDesignerStoneRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
          </div>
          {/* Plating Info */}
          <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
            <div className="text-xs font-bold text-midnight-ink px-3 py-1.5 bg-[#dce8f5] border-b border-soft-border">PLATING INFO</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-cloud-gray">
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left w-1/2">PLATING TYPE</th>
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left w-1/2">PLATING COLOR</th>
                    <th className="border border-soft-border px-1 py-1 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {designerPlatingRows.map((row) => (
                    <tr key={row.id} className="hover:bg-cloud-gray/40">
                      <td className="border border-soft-border p-0">
                        <input type="text" value={row.type} onChange={(e) => updateDesignerPlatingRow(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs"/>
                      </td>
                      <td className="border border-soft-border p-0">
                        <input type="text" value={row.color} onChange={(e) => updateDesignerPlatingRow(row.id, 'color', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs"/>
                      </td>
                      <td className="border border-soft-border p-0 text-center">
                        <button type="button" onClick={() => deleteDesignerPlatingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addDesignerPlatingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
          </div>
        </div>

        {/* Setting Type + Enamel */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="bg-white border border-soft-border rounded-xl p-2">
            <div className="text-xs font-semibold text-midnight-ink mb-1.5">SETTING TYPE</div>
            <div className="flex gap-2">
              {['WAX SETTING', 'HAND SETTING'].map((opt) => (
                <button key={opt} type="button" onClick={() => setDesigner((prev) => ({ ...prev, settingType: prev.settingType === opt ? '' : opt }))}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${designer.settingType === opt ? 'bg-trust-blue text-white border-trust-blue shadow-sm' : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-soft-border rounded-xl p-2">
            <div className="text-xs font-semibold text-midnight-ink mb-1.5">ENAMEL</div>
            <div className="flex gap-2">
              {['YES', 'NO'].map((opt) => (
                <button key={opt} type="button" onClick={() => setDesigner((prev) => ({ ...prev, enamel: prev.enamel === opt ? '' : opt }))}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${designer.enamel === opt ? 'bg-trust-blue text-white border-trust-blue shadow-sm' : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Design Stage Buttons */}
        <div className="mt-2 bg-white border border-soft-border rounded-xl p-2">
          <div className="text-xs font-semibold text-midnight-ink mb-1.5">DESIGN STAGE</div>
          <div className="flex flex-wrap gap-2">
            {['3DM', 'STL', 'RENDER', '3D PRINT', 'COMPLETE'].map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setDesigner((prev) => ({ ...prev, designStage: prev.designStage === stage ? '' : stage }))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  designer.designStage === stage
                    ? 'bg-trust-blue text-white border-trust-blue shadow-sm'
                    : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* 50/50 split: Left = measurements + notes | Right = Total Die info + Mechanism */}
        <div className="mt-2 flex gap-2 items-stretch">
          {/* Left 50%: Measurements, Material, Notes */}
          <div className="flex flex-col gap-2" style={{width:'50%'}}>
            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-semibold text-midnight-ink px-2 py-1.5 bg-[#dce8f5] border-b border-soft-border">Total Design Measurements (Approx)</div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-cloud-gray">
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">LENGTH</th>
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">WIDTH</th>
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">HEIGHT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-soft-border p-0"><input type="text" value={designer.tdmLength} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmLength: e.target.value }))} placeholder="e.g. 25mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                    <td className="border border-soft-border p-0"><input type="text" value={designer.tdmWidth} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmWidth: e.target.value }))} placeholder="e.g. 20mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                    <td className="border border-soft-border p-0"><input type="text" value={designer.tdmHeight} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmHeight: e.target.value }))} placeholder="e.g. 5mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white border border-soft-border rounded-xl p-2">
              <label className="text-xs font-semibold text-midnight-ink mb-1 block">Design Material</label>
              <input type="text" value={designer.designMaterial} onChange={(e) => setDesigner((prev) => ({ ...prev, designMaterial: e.target.value }))} placeholder="e.g. Silver 925" className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1"/>
            </div>
            <div className="flex-1 bg-white border border-soft-border rounded-xl p-2 flex flex-col">
              <label className="text-xs font-semibold text-midnight-ink mb-1 block">Notes</label>
              <textarea value={designer.notes} onChange={(e) => setDesigner((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Add notes about this design..." className="flex-1 w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-1 resize-none min-h-[4rem]"/>
            </div>
            {/* Findings Table */}
            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-2 py-1.5 bg-[#dce8f5] border-b border-soft-border">FINDINGS</div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-cloud-gray">
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">FINDINGS CODE</th>
                    <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">QUANTITY</th>
                    <th className="border border-soft-border px-1 py-1 w-6"></th>
                  </tr>
                </thead>
              </table>
              <div className={designer.findingsRows.length > 2 ? 'overflow-y-auto max-h-[5.5rem]' : ''}>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {designer.findingsRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        <td className="border border-soft-border p-0"><input type="text" value={row.code} onChange={(e) => updateDesignerFindingsRow(row.id, 'code', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" /></td>
                        <td className="border border-soft-border p-0"><input type="text" value={row.quantity} onChange={(e) => updateDesignerFindingsRow(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" /></td>
                        <td className="border border-soft-border p-0 text-center w-6"><button type="button" onClick={() => deleteDesignerFindingsRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addDesignerFindingsRow} className="w-full text-left px-2 py-1 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ Add Row</button>
            </div>
          </div>

          {/* Right 50%: Total Die info + Mechanism */}
          <div className="flex flex-col gap-2" style={{width:'50%'}}>
            {/* Total Die Code / Total Mold Qty / Total CPX Dead Weight */}
            <div className="bg-white border border-soft-border rounded-xl p-2">
              <div className="text-xs font-semibold text-midnight-ink mb-1">Total Die Code, Mold Qty &amp; CPX Dead Weight</div>
              <div className="flex flex-col gap-1">
                <div>
                  <label className="text-[11px] text-cool-gray block">Total Die Code</label>
                  <input type="text" value={designer.dieCode} onChange={(e) => setDesigner((prev) => ({ ...prev, dieCode: e.target.value }))} placeholder="Total Die Code" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/>
                </div>
                <div>
                  <label className="text-[11px] text-cool-gray block">Total Mold Qty / Die</label>
                  <input type="text" value={designer.moldQtyPerDie} onChange={(e) => setDesigner((prev) => ({ ...prev, moldQtyPerDie: e.target.value }))} placeholder="Total Mold Qty / Die" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/>
                </div>
                <div>
                  <label className="text-[11px] text-cool-gray block">Total CPX Dead Weight</label>
                  <input type="text" value={designer.cpxDeadWeight} onChange={(e) => setDesigner((prev) => ({ ...prev, cpxDeadWeight: e.target.value }))} placeholder="Total CPX Dead Weight" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/>
                </div>
              </div>
            </div>

            {/* Mechanism */}
            <div className="flex-1 bg-white border border-soft-border rounded-xl p-2 flex flex-col">
              <label className="text-xs font-semibold text-midnight-ink mb-1 block">Mechanism</label>
              <textarea value={designer.mechanism} onChange={(e) => setDesigner((prev) => ({ ...prev, mechanism: e.target.value }))} placeholder="Describe the mechanism used" className="flex-1 w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5 resize-none"/>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-11/12 my-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold">ADD NEW PRODUCT</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl font-bold cursor-pointer">×</button>
            </div>
            
            {/* Same Product Sheet Form in Modal */}
            <div className="max-h-[80vh] bg-white p-2 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-xl font-bold">PRODUCT SHEET</h1>
              </div>

              {/* Top Section - Product Details & Variations Combined */}
              <div className="bg-cloud-gray p-2 rounded-lg mb-2">
                <div className="flex gap-3 h-auto">
                  {/* Product Image - Left Side */}
                  <div className="w-1/4 h-[20rem] flex flex-col gap-1 flex-shrink-0">
                    {/* Primary image */}
                    <div
                      className="flex-1 min-h-0 bg-white border-2 border-soft-border flex items-center justify-center cursor-pointer hover:bg-cloud-gray relative overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {productImages.length > 0 ? (
                        <img src={productImages[primaryImageIndex]} alt="Product" className="w-full h-full object-cover"/>
                      ) : (
                        <span className="text-cool-gray text-center text-sm font-semibold">PRODUCT<br/>IMAGE</span>
                      )}
                    </div>
                    {/* Thumbnails strip */}
                    {productImages.length > 0 && (
                      <div className="h-[4.5rem] flex gap-1 overflow-x-auto flex-shrink-0">
                        {productImages.map((img, idx) => (
                          <div
                            key={idx}
                            draggable
                            onDragStart={() => { dragIndexRef.current = idx; }}
                            onDragEnter={() => setDragOverIdx(idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleThumbnailDrop(idx)}
                            onDragEnd={() => { dragIndexRef.current = null; setDragOverIdx(null); }}
                            className={`relative flex-shrink-0 w-[4rem] h-[4rem] overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all select-none
                              ${idx === primaryImageIndex ? 'border-midnight-ink ring-1 ring-midnight-ink' : 'border-soft-border hover:border-cool-gray'}
                              ${dragOverIdx === idx && dragIndexRef.current !== idx ? 'ring-2 ring-trust-blue scale-105' : ''}
                              ${dragIndexRef.current === idx ? 'opacity-40' : ''}`}
                            onClick={() => setPrimaryImageIndex(idx)}
                          >
                            <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover pointer-events-none"/>
                            <button
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 leading-none"
                              onClick={(e) => { e.stopPropagation(); removeProductImage(idx); }}
                            >×</button>
                            {idx === primaryImageIndex && (
                              <div className="absolute bottom-0 left-0 right-0 bg-midnight-ink/80 text-white text-[8px] text-center py-0.5 leading-tight">MAIN</div>
                            )}
                          </div>
                        ))}
                        <div
                          className="flex-shrink-0 w-[4rem] h-[4rem] border-2 border-dashed border-soft-border flex items-center justify-center cursor-pointer hover:bg-cloud-gray text-cool-gray"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="text-xl font-light leading-none">+</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Details & Variations - Right Side - 3/4 width */}
                  <div className="w-3/4 flex flex-col gap-2">
                    {/* SKU Table */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                        <div className="font-semibold text-sm mb-0.5">MASTER SKU</div>
                        <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
                      </div>
                      <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                        <div className="font-semibold text-sm mb-0.5">DESIGNER SKU</div>
                        <input type="text" value={designerSku} onChange={(e) => setDesignerSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
                      </div>
                      <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                        <div className="font-semibold text-sm mb-0.5">LISTING NAME</div>
                        <input type="text" value={listingName} onChange={(e) => setListingName(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
                      </div>
                    </div>

                    {/* Dropdowns Table - 50/50 split matching SKU/Listing Name */}
                    <div className="flex gap-2">
                      {/* Left half: Material + Weight (under SKU) */}
                      <div className="flex-1 flex gap-2">
                        <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                          <div className="font-semibold text-sm mb-1">Material</div>
                          <select value={dropdown1} onChange={(e) => setDropdown1(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                            <option value="">Select...</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Brass">Brass</option>
                            <option value="Copper">Copper</option>
                          </select>
                        </div>
                        <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                          <div className="font-semibold text-sm mb-1">Weight</div>
                          <div className="flex gap-1">
                            <input type="text" placeholder="Value" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className="flex-1 bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1"/>
                            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                              <option value="">Unit</option>
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                              <option value="grams">grams</option>
                              <option value="oz">oz</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      {/* Right half: Category + Collection (under Listing Name) */}
                      <div className="flex-1 flex gap-2">
                        <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                          <div className="font-semibold text-sm mb-1">Category</div>
                          <select value={dropdown2} onChange={(e) => setDropdown2(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                            <option value="">Select...</option>
                            <option value="Ring">Ring</option>
                            <option value="Necklace">Necklace</option>
                            <option value="Bracelet">Bracelet</option>
                            <option value="Earring">Earring</option>
                            <option value="Pendant">Pendant</option>
                          </select>
                        </div>
                        <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                          <div className="font-semibold text-sm mb-1">Collection</div>
                          <select value={dropdown3} onChange={(e) => setDropdown3(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1">
                            <option value="">Select...</option>
                            <option value="Classic">Classic</option>
                            <option value="Modern">Modern</option>
                            <option value="Vintage">Vintage</option>
                            <option value="Contemporary">Contemporary</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Two Separate Spaces */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                        <div className="font-semibold text-sm mb-2">SETTING TYPE</div>
                        <div className="flex gap-2">
                          <button onClick={() => setSettingType('wax')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                            settingType === 'wax'
                              ? 'bg-trust-blue text-white border-trust-blue'
                              : 'bg-white text-slate-text border-soft-border'
                          }`}>
                            WAX SETTING
                          </button>
                          <button onClick={() => setSettingType('hand')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                            settingType === 'hand'
                              ? 'bg-trust-blue text-white border-trust-blue'
                              : 'bg-white text-slate-text border-soft-border'
                          }`}>
                            HAND SETTING
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border-2 border-soft-border px-2 py-1">
                        <div className="font-semibold text-sm mb-2">ENAMEL</div>
                        <div className="flex gap-2">
                          <button onClick={() => setEnamelType('yes')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                            enamelType === 'yes'
                              ? 'bg-trust-blue text-white border-trust-blue'
                              : 'bg-white text-slate-text border-soft-border'
                          }`}>
                            YES
                          </button>
                          <button onClick={() => setEnamelType('no')} className={`flex-1 px-2 py-1 text-sm font-semibold rounded border ${
                            enamelType === 'no'
                              ? 'bg-trust-blue text-white border-trust-blue'
                              : 'bg-white text-slate-text border-soft-border'
                          }`}>
                            NO
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* DIE NUMBERS AND MASTER SKU ROW */}
                    <div className="flex gap-2">
                      {/* Die Numbers Panel - Left 50% */}
                      <div className="flex-1 flex flex-col">
                        {/* Active Channels Multi-Select */}
                        <div className="mb-2">
                          <div className="font-semibold text-sm mb-1">Active Channels</div>
                          <div className="relative">
                            <div 
                              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                              className="bg-white border-2 border-soft-border rounded px-2 py-1 text-sm min-h-[2rem] flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex flex-wrap gap-1 flex-1">
                                {activeChannels.length > 0 ? (
                                  activeChannels.map(channel => (
                                    <span 
                                      key={channel} 
                                      className="bg-trust-blue text-white px-2 py-0.5 rounded text-sm flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {channel}
                                      <button onClick={() => toggleChannel(channel)} className="hover:text-danger/30 font-bold">&times;</button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-cool-gray">Select channels...</span>
                                )}
                              </div>
                              <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {isChannelDropdownOpen && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-soft-border rounded shadow-lg max-h-40 overflow-y-auto">
                                {channelOptions.map(channel => (
                                  <div
                                    key={channel}
                                    onClick={() => toggleChannel(channel)}
                                    className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray flex items-center gap-2 ${
                                      activeChannels.includes(channel) ? 'bg-trust-blue/10' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={activeChannels.includes(channel)}
                                      onChange={() => {}}
                                      className="pointer-events-none"
                                    />
                                    {channel}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border-2 border-soft-border h-[8.75rem] flex flex-col overflow-y-auto">
                          <div className="flex flex-col">
                            {manufacturing.dieNumbers.map((row, index) => (
                              <div key={row.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index > 0 ? 'border-t border-soft-border' : ''}`}>
                                <div className="w-32 flex-shrink-0 px-2 py-1 font-semibold text-sm flex items-center">
                                  <select value={row.type} onChange={(e) => updateDieNumber(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none text-sm">
                                    <option value="die_number">DIE NUMBER</option>
                                    <option value="findings">FINDINGS</option>
                                  </select>
                                </div>
                                <div className="flex-1 px-2 py-1 flex items-center gap-1">
                                  <input type="text" value={row.value} onChange={(e) => updateDieNumber(row.id, 'value', e.target.value)} className="flex-1 bg-transparent outline-none text-sm"/>
                                  <input type="text" placeholder="LOCATION" value={row.location} onChange={(e) => updateDieNumber(row.id, 'location', e.target.value)} className="w-24 bg-transparent outline-none text-sm placeholder-cool-gray text-right"/>
                                </div>
                                <div className="w-16 flex-shrink-0 px-2 py-1 flex items-center">
                                  <input type="text" placeholder="QTY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                                </div>
                                <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-1 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button onClick={addDieNumberRow} className="w-fit px-2 py-1 mt-2 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
                          + Add Rows
                        </button>
                      </div>

                      {/* Variations Panel - Right 50% */}
                      <div className="flex-1 flex flex-col">
                        {/* Shopify Status */}
                        <div className="mb-2">
                          <div className="font-semibold text-sm mb-1">Shopify Status</div>
                          <div className="relative">
                            <div 
                              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                              className="bg-white border-2 border-soft-border rounded px-2 py-1 text-sm min-h-[2rem] flex items-center justify-between cursor-pointer"
                            >
                              <span className="text-sm">
                                {shopifyStatus === 'active' ? 'Active' : shopifyStatus === 'draft' ? 'Draft' : 'Unlisted'}
                              </span>
                              <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {isStatusDropdownOpen && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-soft-border rounded shadow-lg max-h-40 overflow-y-auto">
                                <div
                                  onClick={() => {
                                    setShopifyStatus('active')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                                    shopifyStatus === 'active' ? 'bg-trust-blue/10' : ''
                                  }`}
                                >
                                  Active
                                </div>
                                <div
                                  onClick={() => {
                                    setShopifyStatus('draft')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                                    shopifyStatus === 'draft' ? 'bg-trust-blue/10' : ''
                                  }`}
                                >
                                  Draft
                                </div>
                                <div
                                  onClick={() => {
                                    setShopifyStatus('unlisted')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-sm cursor-pointer hover:bg-cloud-gray ${
                                    shopifyStatus === 'unlisted' ? 'bg-trust-blue/10' : ''
                                  }`}
                                >
                                  Unlisted
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border-2 border-soft-border h-[8.75rem] flex flex-col">
                          <div className="flex divide-x-2 divide-soft-border border-b border-soft-border flex-shrink-0">
                            <div className="w-32 px-2 py-1 font-semibold text-sm flex items-center flex-shrink-0">
                              MASTER SKU
                            </div>

                            <div className="flex-1 px-2 py-1 flex items-center gap-1">
                              <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="flex-1 bg-transparent outline-none text-sm"/>
                              <input type="text" placeholder="LOCATION" value={materialSkuLocation} onChange={(e) => setMaterialSkuLocation(e.target.value)} className="w-24 bg-transparent outline-none text-sm placeholder-cool-gray text-right"/>
                            </div>
                          </div>

                          <div className="overflow-y-auto flex-1">
                            {variations.map((variation, index) => (
                              <div key={variation.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index < variations.length - 1 ? 'border-b border-soft-border' : ''}`}>
                                <div className="w-32 px-2 py-1 font-semibold text-sm flex items-center flex-shrink-0">
                                  <select
                                    value={variation.label}
                                    onChange={(e) => updateVariationLabel(variation.id, e.target.value)}
                                    className="w-full bg-transparent outline-none text-sm"
                                  >
                                    <option value="" disabled>Variation</option>
                                    {variationTypeOptions.map((type) => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                </div>
                                {variation.label === 'COLOR' ? (
                                  <>
                                    <div className="flex-1 px-2 py-1 border-r-2 border-soft-border flex items-center">
                                      <select
                                        value={variation.col1}
                                        onChange={(e) => updateColorVariationColor(variation.id, e.target.value)}
                                        className="w-full bg-transparent outline-none text-sm"
                                      >
                                        <option value="">Select Color</option>
                                        {colorOptions.map((color) => (
                                          <option key={color} value={color}>{color}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex-1 px-2 py-1 flex items-center">
                                      <input
                                        type="text"
                                        value={variation.col2}
                                        placeholder="e.g. AJP36/G"
                                        onChange={(e) => updateColorVariationCode(variation.id, e.target.value)}
                                        className="w-full bg-transparent outline-none text-sm"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex-1 px-2 py-1 flex items-center">
                                      <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                                    </div>
                                    <div className="flex-1 px-2 py-1 flex items-center">
                                      <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                                    </div>
                                  </>
                                )}
                                <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-1 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button onClick={addVariation} className="w-fit px-2 py-1 mt-2 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
                          + ADD Variation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Stock Situation Panel (tabular view) */}
              <div className="bg-cloud-gray p-3 rounded-lg mb-2">
                <h2 className="text-sm font-semibold mb-2 text-center text-warning">LIVE STOCK SITUATION ON PRODUCT SHEET</h2>
                <div className="flex gap-2">
                  {/* Main Live Stock Table - 80% */}
                  <div className="flex-shrink-0 bg-white border-2 border-soft-border p-2 overflow-auto" style={{width: '80%'}}>
                    <div className="w-full overflow-hidden">
                      <table className="w-full table-fixed text-sm border-collapse text-center">
                        <thead>
                          <tr>
                            <th className="w-36 px-1 py-0.5 text-left font-semibold whitespace-nowrap"></th>
                            <th className="w-20 px-0.5 py-0.5">Wax Piece</th>
                            <th className="w-20 px-0.5 py-0.5">Wax Setting</th>
                            <th className="w-24 px-0.5 py-0.5">Casting</th>
                            <th className="w-20 px-0.5 py-0.5">Filling</th>
                            <th className="w-20 px-0.5 py-0.5">Pre Polish</th>
                            <th className="w-20 px-0.5 py-0.5">Setting</th>
                            <th className="w-20 px-0.5 py-0.5">Final Polish</th>
                            <th className="w-24 px-0.5 py-0.5">Ready for Plating</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-left whitespace-nowrap">Minimum Suggested</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.min} onChange={(e) => updateLiveStock('rawMaterial','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.min} onChange={(e) => updateLiveStock('rawSetting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.min} onChange={(e) => updateLiveStock('wipLiquidCasting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.filing.min} onChange={(e) => updateLiveStock('filing','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.packing.min} onChange={(e) => updateLiveStock('packing','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.setting.min} onChange={(e) => updateLiveStock('setting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.min} onChange={(e) => updateLiveStock('finalPolish','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.min} onChange={(e) => updateLiveStock('readyForPlacing','min', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-left whitespace-nowrap">Current Stock</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.current} onChange={(e) => updateLiveStock('rawMaterial','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.current} onChange={(e) => updateLiveStock('rawSetting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.current} onChange={(e) => updateLiveStock('wipLiquidCasting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.filing.current} onChange={(e) => updateLiveStock('filing','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.packing.current} onChange={(e) => updateLiveStock('packing','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.setting.current} onChange={(e) => updateLiveStock('setting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.current} onChange={(e) => updateLiveStock('finalPolish','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.current} onChange={(e) => updateLiveStock('readyForPlacing','current', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-left whitespace-nowrap">WIP</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.wip} onChange={(e) => updateLiveStock('rawMaterial','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.wip} onChange={(e) => updateLiveStock('rawSetting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.wip} onChange={(e) => updateLiveStock('wipLiquidCasting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.filing.wip} onChange={(e) => updateLiveStock('filing','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.packing.wip} onChange={(e) => updateLiveStock('packing','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.setting.wip} onChange={(e) => updateLiveStock('setting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.wip} onChange={(e) => updateLiveStock('finalPolish','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.wip} onChange={(e) => updateLiveStock('readyForPlacing','wip', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-left whitespace-nowrap">Location</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.location} onChange={(e) => updateLiveStock('rawMaterial','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.location} onChange={(e) => updateLiveStock('rawSetting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.location} onChange={(e) => updateLiveStock('wipLiquidCasting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.filing.location} onChange={(e) => updateLiveStock('filing','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.packing.location} onChange={(e) => updateLiveStock('packing','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.setting.location} onChange={(e) => updateLiveStock('setting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.location} onChange={(e) => updateLiveStock('finalPolish','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.location} onChange={(e) => updateLiveStock('readyForPlacing','location', e.target.value)} /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Final Stock Table - 20% */}
                  <div className="flex-shrink-0 bg-white border-2 border-soft-border p-1 flex flex-col" style={{width: '20%'}}>
                    <h3 className="text-sm font-semibold mb-1 text-center flex-shrink-0">FINAL STOCK</h3>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full table-fixed text-sm border-collapse">
                        <thead>
                          <tr>
                            <th className="px-0.5 py-0.5 text-center text-sm border-b flex-1">SKU</th>
                            <th className="px-0.5 py-0.5 text-center text-sm border-b flex-1">Value</th>
                            <th className="px-0.5 py-0.5 text-center text-sm border-b flex-1">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finalStock.map((row) => (
                            <tr key={row.id} className="border-b">
                              <td className="px-0.5 py-0.5"><input className={`w-full text-sm px-0.5 py-0.5 border rounded ${row.fromVariation ? 'bg-blue-50 text-trust-blue font-medium cursor-default' : ''}`} placeholder="SKU" value={row.sku} onChange={(e) => !row.fromVariation && updateFinalStock(row.id, 'sku', e.target.value)} readOnly={!!row.fromVariation} /></td>
                              <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" placeholder="Value" value={row.value} onChange={(e) => updateFinalStock(row.id, 'value', e.target.value)} /></td>
                              <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" placeholder="Unit" value={row.unit} onChange={(e) => updateFinalStock(row.id, 'unit', e.target.value)} /></td>
                              <td className="px-0.5 py-0.5 text-center">
                                <button type="button" onClick={() => deleteFinalStock(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={addFinalStockRow} className="w-full mt-1 px-1 py-0.5 bg-trust-blue text-white text-sm rounded hover:bg-trust-blue flex-shrink-0">+ Add Row</button>
                  </div>
                </div>
                <div className="mt-2 flex justify-center">
                  <button className="px-6 py-1.5 bg-success text-white font-semibold rounded text-sm hover:bg-success">Create a Job</button>
                </div>
              </div>

              {/* Stone Info and Plating Type - Side by Side */}
              <div className="flex gap-2 mb-2 items-stretch">
                <div className="w-[65%] bg-cloud-gray p-2 rounded-lg flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">STONE INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-soft-border table-fixed">
                      <thead>
                        <tr className="border-b-2 border-soft-border">
                          {['TYPE','SPECIES','VARIETY','COLOR','CUT','SHAPE','LENGTH','WIDTH','HEIGHT','QTY'].map((h) => (
                            <th key={h} className="px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white whitespace-nowrap">{h}</th>
                          ))}
                          <th className="w-6 bg-white"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stoneInfo.map((stone, index) => (
                          <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                            {['type','species','variety','color','cut','shape','length','width','height','qty'].map((f) => (
                              <td key={f} className="px-2 py-1 border-r-2 border-soft-border bg-white">
                                <input type="text" value={stone[f]} onChange={(e) => updateStoneInfo(stone.id, f, e.target.value)} className="w-full bg-transparent outline-none text-sm min-w-[55px]"/>
                              </td>
                            ))}
                            <td className="w-6 px-0.5 py-0.5 bg-white text-center" style={{maxWidth: '1.5rem'}}>
                              <button type="button" onClick={() => deleteStoneInfo(stone.id)} className="text-danger hover:text-danger-dark transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <button onClick={addStoneInfoRow} className="w-fit mt-2 px-2 py-1 text-sm bg-trust-blue text-white font-semibold rounded hover:bg-deep-blue">
                    +ADD ROW
                  </button>
                </div>

                <div className="w-[35%] bg-cloud-gray p-2 rounded-xl border border-soft-border shadow-sm flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">PLATING INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-soft-border table-fixed">
                      <thead>
                        <tr className="border-b-2 border-soft-border">
                          <th className="w-1/3 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            PLATING TYPE
                          </th>
                          <th className="w-1/3 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            PLATING COLOR
                          </th>
                          <th className="w-1/3 px-2 py-1 text-center font-semibold text-sm bg-white">
                            ACTION
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {platingType.map((row, index) => (
                          <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                            <td className="w-1/3 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-1/3 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-1/3 px-2 py-1 bg-white text-center">
                              <button type="button" onClick={() => deletePlatingType(row.id)} className="text-danger hover:text-danger-dark transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <button onClick={addPlatingTypeRow} className="w-fit mt-2 px-3 py-1 text-sm bg-trust-blue text-white font-semibold rounded-md shadow-sm hover:bg-deep-blue">
                    +ADD ROW
                  </button>
                </div>
              </div>

              {/* Manufacturing Section */}
              <div className="bg-cloud-gray p-3 rounded-xl mb-2 border border-soft-border shadow-sm">
                <h2 className="text-sm font-semibold mb-2">MANUFACTURING</h2>
                <div className="bg-white rounded-xl">
                  <div className="border-2 border-soft-border rounded-xl shadow-sm">
                    <div className="flex border-b-2 border-soft-border">
                      <div className="w-24 p-3 border-r-2 border-soft-border font-semibold text-sm bg-white flex-shrink-0">
                        NOTES
                      </div>
                      <div className="flex-1 p-3 bg-white">
                        <input type="text" value={manufacturing.notes ?? ''} onChange={(e) => setManufacturing({ ...manufacturing, notes: e.target.value })} className="w-full bg-transparent outline-none text-sm"/>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="w-24 p-3 border-r-2 border-soft-border font-semibold text-sm bg-white flex-shrink-0">
                        IMAGES
                      </div>
                      <div className="flex-1 p-3 bg-white">
                        <div className="flex flex-wrap gap-2">
                          {manufacturing.images.length > 0 ? (
                            manufacturing.images.map((src, index) => (
                              <div key={`${index}-${src}`} className="relative">
                                <img src={src} alt={`Manufacturing ${index + 1}`} className="w-40 h-40 object-cover border border-soft-border rounded-xl"/>
                                <button type="button" onClick={() => removeManufacturingImage(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-sm rounded-full flex items-center justify-center">
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-cool-gray">Select images</span>
                          )}
                        </div>
                        <button onClick={() => manufacturingImagesRef.current?.click()} className="mt-2 px-3 py-1 text-sm bg-trust-blue text-white font-semibold rounded-md shadow-sm hover:bg-deep-blue">
                          Select Images
                        </button>
                        <input ref={manufacturingImagesRef} type="file" accept="image/*" multiple onChange={handleManufacturingImagesUpload} className="hidden"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Designer Panel (Modal) */}
              <div className="bg-cloud-gray p-2 rounded-xl mb-2 border border-soft-border shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-sm font-semibold text-trust-blue">DESIGNER</h2>
                  <div className="flex items-center gap-1.5">
                    {designerSaveStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded ${designerSaveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>{designerSaveStatus.message}</span>
                    )}
                    <button type="button" onClick={handleSaveDesigner} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">{isDesignerSaving ? 'Saving...' : 'SAVE'}</button>
                    <button type="button" onClick={handleDeleteDesigner} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-danger text-white font-semibold rounded-full hover:bg-danger/90 disabled:opacity-50">DELETE</button>
                    <button type="button" onClick={() => designerBulkUploadRef.current?.click()} disabled={isDesignerSaving} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1"><Upload className="h-3 w-3"/>UPLOAD</button>
                  </div>
                </div>
                <div>
                  {/* 3 Image Upload Slots – equal columns */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { slot: 'image1', ref: designerImageRef1, label: 'Rendered Photo' },
                      { slot: 'image2', ref: designerImageRef2, label: 'Technical Drawing' },
                      { slot: 'image3', ref: designerImageRef3, label: 'Other Photo' },
                    ].map(({ slot, ref, label }) => (
                      <div key={slot} className="flex flex-col gap-1">
                        <div className="text-center text-xs font-semibold text-trust-blue py-0.5 bg-trust-blue/10 rounded-t-lg border border-soft-border border-b-0">{label}</div>
                        <div
                          className="bg-white border border-soft-border rounded-b-xl overflow-hidden flex items-center justify-center cursor-pointer hover:bg-cloud-gray"
                          style={{minHeight: '9rem'}}
                          onClick={() => ref.current?.click()}
                        >
                          {designer[slot] ? (
                            <img src={designer[slot]} alt={label} className="w-full h-full object-cover rounded-b-xl"/>
                          ) : (
                            <span className="text-xs text-cool-gray text-center px-2">Click to upload image</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDesignerImageDownload(slot, label)}
                          disabled={!designer[slot]}
                          className="w-full px-1 py-0.5 text-xs bg-midnight-ink text-white rounded font-semibold hover:bg-midnight-ink/80 disabled:opacity-40 flex items-center justify-center gap-1"
                        >
                          <Download className="h-3 w-3"/>Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Tracking Table (Modal) */}
                <div className="mt-2 bg-white border border-soft-border rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#dce8f5]">
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">3DM</th>
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">STL</th>
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Motive Code</th>
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Master SKU</th>
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Die Code</th>
                          <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">Mold/Die Qty</th>
                          <th className="border border-soft-border px-1 py-1 w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {designer.trackingRows.map((row) => (
                          <tr key={row.id} className="hover:bg-cloud-gray/40">
                            <td className="border border-soft-border p-0">
                              <div className="flex items-center">
                                {row.tdm ? (
                                  <a href={row.tdm} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate text-xs" title={row.tdm}>{row.tdm}</a>
                                ) : (
                                  <input type="url" value={row.tdm} onChange={(e) => updateDesignerTrackingRow(row.id, 'tdm', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[60px]"/>
                                )}
                                <button type="button" title="Set Drive link" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.tdm); if (url !== null) updateDesignerTrackingRow(row.id, 'tdm', url.trim()); }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0"><Upload className="h-3 w-3"/></button>
                              </div>
                            </td>
                            <td className="border border-soft-border p-0">
                              <div className="flex items-center">
                                {row.stl ? (
                                  <a href={row.stl} target="_blank" rel="noopener noreferrer" className="flex-1 px-2 py-1 text-trust-blue underline truncate text-xs" title={row.stl}>{row.stl}</a>
                                ) : (
                                  <input type="url" value={row.stl} onChange={(e) => updateDesignerTrackingRow(row.id, 'stl', e.target.value)} placeholder="Drive link" className="flex-1 bg-transparent outline-none px-2 py-1 min-w-[60px]"/>
                                )}
                                <button type="button" title="Set Drive link" onClick={() => { const url = window.prompt('Paste Google Drive link:', row.stl); if (url !== null) updateDesignerTrackingRow(row.id, 'stl', url.trim()); }} className="px-1 py-1 text-cool-gray hover:text-trust-blue flex-shrink-0"><Upload className="h-3 w-3"/></button>
                              </div>
                            </td>
                            <td className="border border-soft-border p-0"><input type="text" value={row.motiveCode} onChange={(e) => updateDesignerTrackingRow(row.id, 'motiveCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[80px]"/></td>
                            <td className="border border-soft-border p-0"><input type="text" value={row.masterSku} onChange={(e) => updateDesignerTrackingRow(row.id, 'masterSku', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[90px]"/></td>
                            <td className="border border-soft-border p-0"><input type="text" value={row.dieCode} onChange={(e) => updateDesignerTrackingRow(row.id, 'dieCode', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]"/></td>
                            <td className="border border-soft-border p-0"><input type="text" value={row.moldDieQty} onChange={(e) => updateDesignerTrackingRow(row.id, 'moldDieQty', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px]"/></td>
                            <td className="border border-soft-border p-0 text-center">
                              <button type="button" onClick={() => deleteDesignerTrackingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addDesignerTrackingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ Add Row</button>
                </div>

                {/* Design Stage Buttons */}
                <div className="mt-2 bg-white border border-soft-border rounded-xl p-2">
                  <div className="text-xs font-semibold text-midnight-ink mb-1.5">DESIGN STAGE</div>
                  <div className="flex flex-wrap gap-2">
                    {['3DM', 'STL', 'RENDER', '3D PRINT', 'COMPLETE'].map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setDesigner((prev) => ({ ...prev, designStage: prev.designStage === stage ? '' : stage }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                          designer.designStage === stage
                            ? 'bg-trust-blue text-white border-trust-blue shadow-sm'
                            : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 50/50 split: Left = measurements + material | Right = Die info + Mechanism */}
                <div className="mt-2 flex gap-2 items-stretch">
                  {/* Left 50% */}
                  <div className="flex flex-col gap-2" style={{width:'50%'}}>
                    <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
                      <div className="text-xs font-semibold text-midnight-ink px-2 py-1.5 bg-[#dce8f5] border-b border-soft-border">Total Design Measurements (Approx)</div>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-cloud-gray">
                            <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">LENGTH</th>
                            <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">WIDTH</th>
                            <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">HEIGHT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-soft-border p-0"><input type="text" value={designer.tdmLength} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmLength: e.target.value }))} placeholder="e.g. 25mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                            <td className="border border-soft-border p-0"><input type="text" value={designer.tdmWidth} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmWidth: e.target.value }))} placeholder="e.g. 20mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                            <td className="border border-soft-border p-0"><input type="text" value={designer.tdmHeight} onChange={(e) => setDesigner((prev) => ({ ...prev, tdmHeight: e.target.value }))} placeholder="e.g. 5mm" className="w-full bg-transparent outline-none text-xs px-2 py-1" /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex-1 bg-white border border-soft-border rounded-xl p-2">
                      <label className="text-xs font-semibold text-midnight-ink mb-1 block">Design Material</label>
                      <input type="text" value={designer.designMaterial} onChange={(e) => setDesigner((prev) => ({ ...prev, designMaterial: e.target.value }))} placeholder="e.g. Silver 925" className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-1"/>
                    </div>
                    {/* Findings Table */}
                    <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
                      <div className="text-xs font-bold text-midnight-ink px-2 py-1.5 bg-[#dce8f5] border-b border-soft-border">FINDINGS</div>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-cloud-gray">
                            <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">FINDINGS CODE</th>
                            <th className="border border-soft-border px-2 py-1 font-semibold text-midnight-ink text-left">QUANTITY</th>
                            <th className="border border-soft-border px-1 py-1 w-6"></th>
                          </tr>
                        </thead>
                      </table>
                      <div className={designer.findingsRows.length > 2 ? 'overflow-y-auto max-h-[5.5rem]' : ''}>
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            {designer.findingsRows.map((row) => (
                              <tr key={row.id} className="hover:bg-cloud-gray/40">
                                <td className="border border-soft-border p-0"><input type="text" value={row.code} onChange={(e) => updateDesignerFindingsRow(row.id, 'code', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" /></td>
                                <td className="border border-soft-border p-0"><input type="text" value={row.quantity} onChange={(e) => updateDesignerFindingsRow(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" /></td>
                                <td className="border border-soft-border p-0 text-center w-6"><button type="button" onClick={() => deleteDesignerFindingsRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" onClick={addDesignerFindingsRow} className="w-full text-left px-2 py-1 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ Add Row</button>
                    </div>
                  </div>
                  {/* Right 50% */}
                  <div className="flex flex-col gap-2" style={{width:'50%'}}>
                    <div className="bg-white border border-soft-border rounded-xl p-2">
                      <div className="text-xs font-semibold text-midnight-ink mb-1">Die Code / Mold Qty &amp; CPX Dead Weight</div>
                      <div className="flex flex-col gap-1">
                        <div><label className="text-[11px] text-cool-gray block">Die Code</label><input type="text" value={designer.dieCode} onChange={(e) => setDesigner((prev) => ({ ...prev, dieCode: e.target.value }))} placeholder="Die Code" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/></div>
                        <div><label className="text-[11px] text-cool-gray block">Mold Qty / Die</label><input type="text" value={designer.moldQtyPerDie} onChange={(e) => setDesigner((prev) => ({ ...prev, moldQtyPerDie: e.target.value }))} placeholder="Mold Qty / Die" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/></div>
                        <div><label className="text-[11px] text-cool-gray block">CPX Dead Weight</label><input type="text" value={designer.cpxDeadWeight} onChange={(e) => setDesigner((prev) => ({ ...prev, cpxDeadWeight: e.target.value }))} placeholder="CPX Dead Weight" className="w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5"/></div>
                      </div>
                    </div>
                    <div className="flex-1 bg-white border border-soft-border rounded-xl p-2 flex flex-col">
                      <label className="text-xs font-semibold text-midnight-ink mb-1 block">Mechanism</label>
                      <textarea value={designer.mechanism} onChange={(e) => setDesigner((prev) => ({ ...prev, mechanism: e.target.value }))} placeholder="Describe the mechanism used" className="flex-1 w-full bg-transparent outline-none text-xs border border-soft-border rounded px-2 py-0.5 resize-none"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-4 justify-end mt-2">
                <button onClick={() => setIsModalOpen(false)} className="px-6 h-11 bg-cool-gray text-white font-semibold rounded hover:bg-slate-text">
                  Cancel
                </button>
                <button onClick={() => setIsModalOpen(false)} className="px-6 h-11 bg-success text-white font-semibold rounded hover:bg-success/90">
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      <CreateJobModal 
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        initialSku={sku}
        onQuickEnroll={() => {
          // Handle quick enroll action
          console.log('Quick enroll clicked')
        }}
        onJobCreated={(data) => {
          // Handle job creation - data includes: date, issuedTo, deptFrom, deptTo, rows
          console.log('Job created:', data)
          // Add your logic here to save the job data
        }}
      />
      <GenericJobModal
        open={isGenericJobModalOpen}
        onOpenChange={setIsGenericJobModalOpen}
        onJobCreated={(jobData) => {
          console.log('Generic job created:', jobData)
          setJobCardToPrint(jobData)
          setIsGenericJobModalOpen(false)
          setIsPrintJobCardModalOpen(true)
        }}
      />
      <PrintJobCardModal
        open={isPrintJobCardModalOpen}
        onOpenChange={setIsPrintJobCardModalOpen}
        data={jobCardToPrint}
      />

    </div>);
}

export default function ProductSheet() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <p className="text-base text-cool-gray">Loading...</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-cloud-gray flex items-center justify-center"><p className="text-base text-cool-gray">Loading…</p></div>}>
      <ProductSheetContent />
    </Suspense>
  );
}