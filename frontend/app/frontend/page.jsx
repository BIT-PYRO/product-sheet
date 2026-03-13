'use client'

import React, { Suspense } from "react"
import { Trash2 } from 'lucide-react'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreateJobModal } from '@/components/create-job-modal'
import DateTimeStamp from '@/components/date-time-stamp'
import MasterNavigationDrawer from '@/components/master_navigation_drawer'

const PRODUCT_SHEET_SYNC_KEY = 'product_sheet_updated_at'
const PRODUCT_SHEET_SYNC_EVENT = 'product_sheet_sync'

function ProductSheetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const newProductToken = searchParams.get('new')
  const fileInputRef = useRef(null)
  const manufacturingImagesRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false)
  const [productImages, setProductImages] = useState([])
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0)

  const [platingType, setPlatingType] = useState([
    { id: 1, col1: '', col2: '', col3: '' },
    { id: 2, col1: '', col2: '', col3: '' },
    { id: 3, col1: '', col2: '', col3: '' },
  ])

  const [manufacturing, setManufacturing] = useState({
    dieNumbers: [
      { id: 1, dieNumber: '', quantity: '' },
      { id: 2, dieNumber: '', quantity: '' },
      { id: 3, dieNumber: '', quantity: '' },
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
  const [listingName, setListingName] = useState('')
  const [material, setMaterial] = useState('')
  const [materialSku, setMaterialSku] = useState('')
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
  ])
  const [colorCodeByColor, setColorCodeByColor] = useState({})

  const [stoneInfo, setStoneInfo] = useState([
    { id: 1, name: '', cut: '', color: '', size: '', quantity: '' },
    { id: 2, name: '', cut: '', color: '', size: '', quantity: '' },
    { id: 3, name: '', cut: '', color: '', size: '', quantity: '' },
  ])

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
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [showViewSheetButton, setShowViewSheetButton] = useState(false)

  const resetProductForm = useCallback(() => {
    setProductImages([])
    setPrimaryImageIndex(0)
    setSku('')
    setListingName('')
    setMaterial('')
    setMaterialSku('')
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
        { id: 1, dieNumber: '', quantity: '' },
        { id: 2, dieNumber: '', quantity: '' },
        { id: 3, dieNumber: '', quantity: '' },
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
    ])
    setColorCodeByColor({})
    setStoneInfo([
      { id: 1, name: '', cut: '', color: '', size: '', quantity: '' },
      { id: 2, name: '', cut: '', color: '', size: '', quantity: '' },
      { id: 3, name: '', cut: '', color: '', size: '', quantity: '' },
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
    setIsModalOpen(false)
    setSaveStatus(null)
    setShowViewSheetButton(false)
  }, [])

  const handleAddProduct = () => {
    resetProductForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!newProductToken) return
    resetProductForm()
  }, [newProductToken, resetProductForm])

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

  const buildProductData = (overrideValues = {}) => ({
    sku,
    listingName,
    material,
    materialSku,
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
    setFinalStock([...finalStock, { id: newId, sku: '', value: '', unit: '' }])
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
    // Handlers for Plating Type
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
            dieNumbers: [...prev.dieNumbers, { id: newId, dieNumber: '', quantity: '' }]
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
            { id: newId, name: '', cut: '', color: '', size: '', quantity: '' },
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
          setSaveStatus({ success: true, message: result.message });
          setShowViewSheetButton(false)
          localStorage.setItem(PRODUCT_SHEET_SYNC_KEY, Date.now().toString());
          setTimeout(() => setSaveStatus(null), 4000);
          
          // Clear form after successful deletion
          setSku('');
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
          <DateTimeStamp className="mr-1 text-xs" />
          <button onClick={handleAddProduct} className="w-fit px-3 h-8 text-sm bg-trust-blue text-white font-semibold rounded-full shadow-sm hover:bg-deep-blue">+ ADD PRODUCT</button>
          <button onClick={handleSaveProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-success text-white font-semibold rounded-full shadow-sm hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'SAVE'}</button>
          <button onClick={handleDeleteProduct} disabled={isSaving} className="w-fit px-3 h-8 text-sm bg-danger text-white font-semibold rounded-full shadow-sm hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed">DELETE</button>
          {saveStatus && (
            <div className={`text-sm px-2 py-1 rounded-md ${saveStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {saveStatus.message}
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

      <div className="flex-1 pt-16 px-3 md:px-4 pb-3 transition-all duration-300">
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
                <div className="font-semibold text-sm mb-0.5">SKU</div>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
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

                <div className="bg-white border-2 border-soft-border rounded-xl shadow-sm max-h-[6rem] overflow-y-auto">
                  <div className="flex flex-col">
                    {manufacturing.dieNumbers.map((row, index) => (
                      <div key={row.id} className={`flex items-center ${index > 0 ? 'border-t border-soft-border' : ''}`}>
                        <div className="flex-1 px-2 py-0.2 border-r-2 border-soft-border">
                          <input type="text" placeholder="DIE NUMBER/FINDINGS" value={row.dieNumber} onChange={(e) => updateDieNumber(row.id, 'dieNumber', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                        </div>
                        <div className="flex-1 px-2 py-0.2 border-r-2 border-soft-border">
                          <input type="text" placeholder="QUANTITY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                        </div>
                        <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-0.2 text-danger hover:text-danger-dark transition-colors flex-shrink-0">
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

                <div className="bg-white border-2 border-soft-border rounded-xl shadow-sm max-h-[6rem] flex flex-col">
                  <div className="flex divide-x-2 divide-soft-border border-b border-soft-border flex-shrink-0">
                    <div className="w-32 px-2 py-0.2 font-semibold text-sm flex items-center flex-shrink-0">
                      MASTER SKU
                    </div>
                    <div className="flex-1 px-2 py-0.2">
                      <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {variations.map((variation, index) => (
                      <div key={variation.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index < variations.length - 1 ? 'border-b border-soft-border' : ''}`}>
                        <div className="w-32 px-2 py-0.2 font-semibold text-sm flex items-center flex-shrink-0">
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
                            <div className="flex-1 px-2 py-0.2 flex items-center">
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
                            <div className="flex-1 px-2 py-0.2 flex items-center">
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
                            <div className="flex-1 px-2 py-0.2 flex items-center">
                              <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </div>
                            <div className="flex-1 px-2 py-0.2 flex items-center">
                              <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </div>
                          </>
                        )}
                        <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-0.2 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
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
                  <input className="flex-1 min-w-0 px-1 py-1 text-sm bg-transparent outline-none text-center border-r border-soft-border" placeholder="SKU" value={row.sku} onChange={(e) => updateFinalStock(row.id, 'sku', e.target.value)} />
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
        <div className="mt-2 flex justify-center">
          <button onClick={() => setIsCreateJobModalOpen(true)} className="px-6 py-1.5 bg-success text-white font-semibold rounded text-sm hover:bg-success">Create a Job</button>
        </div>
      </div>

      {/* Stone Info and Plating Type - Side by Side */}
      <div className="flex gap-2 mb-2 items-stretch">
        <div className="w-1/2 bg-cloud-gray p-1.5 rounded-xl border border-soft-border shadow-sm flex flex-col h-full">
          <h2 className="text-sm font-semibold mb-1">STONE INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-soft-border table-fixed break-words">
              <thead>
                <tr className="border-b-2 border-soft-border">
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    NAME
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    CUT
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    COLOR
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    SIZE
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-sm bg-white break-words">
                    QUANTITY
                  </th>
                </tr>
              </thead>
              <tbody>
                {stoneInfo.map((stone, index) => (
                  <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={stone.name} onChange={(e) => updateStoneInfo(stone.id, 'name', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={stone.cut} onChange={(e) => updateStoneInfo(stone.id, 'cut', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={stone.color} onChange={(e) => updateStoneInfo(stone.id, 'color', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={stone.size} onChange={(e) => updateStoneInfo(stone.id, 'size', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={stone.quantity} onChange={(e) => updateStoneInfo(stone.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="px-2 py-1 bg-white text-center">
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

        <div className="w-1/2 bg-cloud-gray p-1.5 rounded-xl border border-soft-border shadow-sm flex flex-col h-full">
          <h2 className="text-sm font-semibold mb-1">PLATING INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-soft-border table-fixed break-words">
              <thead>
                <tr className="border-b-2 border-soft-border">
                  <th className="w-2/5 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    PLATING TYPE
                  </th>
                  <th className="w-2/5 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white break-words">
                    PLATING COLOR
                  </th>
                  <th className="w-1/5 px-2 py-1 text-center font-semibold text-sm bg-white break-words">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {platingType.map((row, index) => (
                  <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                    <td className="w-2/5 px-2 py-1 border-r-2 border-soft-border bg-white break-words">
                      <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-2/5 px-2 py-1 border-r-2 border-soft-border bg-white">
                      <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                    </td>
                    <td className="w-1/5 px-2 py-1 bg-white text-center">
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
                        <div className="font-semibold text-sm mb-0.5">SKU</div>
                        <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-sm border border-soft-border rounded px-2 py-0"/>
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

                        <div className="bg-white border-2 border-soft-border max-h-[8rem] overflow-y-auto">
                          <div className="flex flex-col">
                            {manufacturing.dieNumbers.map((row, index) => (
                              <div key={row.id} className={`flex items-center ${index > 0 ? 'border-t border-soft-border' : ''}`}>
                                <div className="flex-1 px-2 py-0.2 border-r-2 border-soft-border">
                                  <input type="text" placeholder="DIE NUMBER" value={row.dieNumber} onChange={(e) => updateDieNumber(row.id, 'dieNumber', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                                </div>
                                <div className="flex-1 px-2 py-0.2 border-r-2 border-soft-border">
                                  <input type="text" placeholder="QUANTITY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm placeholder-cool-gray"/>
                                </div>
                                <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-0.2 text-danger hover:text-danger-dark transition-colors flex-shrink-0">
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

                        <div className="bg-white border-2 border-soft-border max-h-[6rem] flex flex-col">
                          <div className="flex divide-x-2 divide-soft-border border-b border-soft-border flex-shrink-0">
                            <div className="w-32 px-2 py-0.2 font-semibold text-sm flex items-center flex-shrink-0">
                              MASTER SKU
                            </div>

                            <div className="flex-1 px-2 py-0.2">
                              <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </div>
                          </div>

                          <div className="overflow-y-auto flex-1">
                            {variations.map((variation, index) => (
                              <div key={variation.id} className={`flex items-stretch divide-x-2 divide-soft-border ${index < variations.length - 1 ? 'border-b border-soft-border' : ''}`}>
                                <div className="w-32 px-2 py-0.2 font-semibold text-sm flex items-center flex-shrink-0">
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
                                    <div className="flex-1 px-2 py-0.2 border-r-2 border-soft-border flex items-center">
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
                                    <div className="flex-1 px-2 py-0.2 flex items-center">
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
                                    <div className="flex-1 px-2 py-0.2 flex items-center">
                                      <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                                    </div>
                                    <div className="flex-1 px-2 py-0.2 flex items-center">
                                      <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                                    </div>
                                  </>
                                )}
                                <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-0.2 text-danger hover:text-danger-dark transition-colors flex-shrink-0 flex items-center">
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
                              <td className="px-0.5 py-0.5"><input className="w-full text-sm px-0.5 py-0.5 border rounded" placeholder="SKU" value={row.sku} onChange={(e) => updateFinalStock(row.id, 'sku', e.target.value)} /></td>
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
                <div className="w-1/2 bg-cloud-gray p-2 rounded-lg flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">STONE INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-soft-border table-fixed">
                      <thead>
                        <tr className="border-b-2 border-soft-border">
                          <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            NAME
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            CUT
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            COLOR
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            SIZE
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-sm bg-white">
                            QUANTITY
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stoneInfo.map((stone, index) => (
                          <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                            <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={stone.name} onChange={(e) => updateStoneInfo(stone.id, 'name', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={stone.cut} onChange={(e) => updateStoneInfo(stone.id, 'cut', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={stone.color} onChange={(e) => updateStoneInfo(stone.id, 'color', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={stone.size} onChange={(e) => updateStoneInfo(stone.id, 'size', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={stone.quantity} onChange={(e) => updateStoneInfo(stone.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="px-2 py-1 bg-white text-center">
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

                <div className="w-1/2 bg-cloud-gray p-2 rounded-xl border border-soft-border shadow-sm flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">PLATING INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-soft-border table-fixed">
                      <thead>
                        <tr className="border-b-2 border-soft-border">
                          <th className="w-2/5 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            PLATING TYPE
                          </th>
                          <th className="w-2/5 px-2 py-1 text-left font-semibold text-sm border-r-2 border-soft-border bg-white">
                            PLATING COLOR
                          </th>
                          <th className="w-1/5 px-2 py-1 text-center font-semibold text-sm bg-white">
                            ACTION
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {platingType.map((row, index) => (
                          <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-soft-border' : ''}>
                            <td className="w-2/5 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-2/5 px-2 py-1 border-r-2 border-soft-border bg-white">
                              <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-sm"/>
                            </td>
                            <td className="w-1/5 px-2 py-1 bg-white text-center">
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