'use client'

import React from "react"
import { Trash2, LayoutDashboard, X } from 'lucide-react'

import { useState, useRef } from 'react'
import { CreateJobModal } from '@/components/create-job-modal'

export default function ProductSheet() {
  const fileInputRef = useRef(null)
  const manufacturingImagesRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [productImage, setProductImage] = useState(null)

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

  const toggleChannel = (channel) => {
    setActiveChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const [variations, setVariations] = useState([
    { id: 1, label: 'COLOR', col1: '', col2: '' },
    { id: 2, label: 'ENAMEL', col1: '', col2: '' },
  ])

  const [stoneInfo, setStoneInfo] = useState([
    { id: 1, name: '', cut: '', color: '', size: '', quantity: '' },
    { id: 2, name: '', cut: '', color: '', size: '', quantity: '' },
    { id: 3, name: '', cut: '', color: '', size: '', quantity: '' },
  ])

  const [liveStock, setLiveStock] = useState({
    rawMaterial: { min: '', current: '', wip: '', location: '' },
    rawSetting: { min: '', current: '', wip: '', location: '' },
    tyre: { min: '', current: '', wip: '', location: '' },
    dustunuing: { min: '', current: '', wip: '', location: '' },
    wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
    postCasting: { min: '', current: '', wip: '', location: '' },
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

  // Handle image upload
  const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProductImage(event.target?.result);
            };
            reader.readAsDataURL(file);
        }
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
        setVariations(variations.map(row => row.id === id ? { ...row, [field]: value } : row));
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
    
    // Handle saving to Google Sheets
    const handleSaveToGoogleSheets = async () => {
      setIsSaving(true);
      setSaveStatus(null);
      
      try {
        const productData = {
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
        };
        
        const response = await fetch('/api/save-to-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });
        
        const result = await response.json();
        
        if (result.success) {
          const message = result.isUpdate 
            ? `✓ Product updated in Google Sheets (${result.message})`
            : '✓ New product added to Google Sheets';
          setSaveStatus({ success: true, message });
          setTimeout(() => setSaveStatus(null), 4000);
        } else {
          setSaveStatus({ success: false, message: `Error: ${result.message}` });
        }
      } catch (error) {
        setSaveStatus({ success: false, message: `Error: ${error.message}` });
      } finally {
        setIsSaving(false);
      }
    };
    
    // Handle deleting from Google Sheets
    const handleDeleteFromGoogleSheets = async () => {
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
        const response = await fetch('/api/save-to-sheets', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sku }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setSaveStatus({ success: true, message: result.message });
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
      } finally {
        setIsSaving(false);
      }
    };
    
    return (<div className="min-h-screen bg-white p-2 flex flex-col">
      <div className="flex justify-between items-center mb-2 sticky top-0 z-50 bg-white py-2 border-b border-gray-300">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDashboardOpen(!isDashboardOpen)} className="p-2 border-2 border-black bg-white rounded hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="h-5 w-5 text-black" />
          </button>
          <h1 className="text-xl font-bold">PRODUCT SHEET</h1>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setIsModalOpen(true)} className="w-fit px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">+ ADD PRODUCT</button>
          <button onClick={handleSaveToGoogleSheets} disabled={isSaving} className="w-fit px-2 py-1 text-xs bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'SAVE'}</button>
          <button onClick={handleDeleteFromGoogleSheets} disabled={isSaving} className="w-fit px-2 py-1 text-xs bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">DELETE</button>
          {saveStatus && (
            <div className={`text-xs px-2 py-1 rounded ${saveStatus.success ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
              {saveStatus.message}
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isDashboardOpen ? 'ml-80' : ''}`}>
      {/* Top Section - Product Details & Variations Combined */}
      <div className="bg-gray-200 p-2 rounded-lg mb-2">
        <div className="flex gap-3 h-auto">
          {/* Product Image - Left Side - 1/4 width */}
          <div className="w-1/4 h-[27rem] bg-white border-2 border-gray-400 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-100 relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
            {productImage ? (<img src={productImage || "/placeholder.svg"} alt="Product" className="w-full h-full object-cover"/>) : (<span className="text-gray-600 text-center text-xs font-semibold">
                PRODUCT<br />IMAGE
              </span>)}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden"/>
          </div>

          {/* Product Details & Variations - Right Side - 3/4 width */}
          <div className="w-3/4 flex flex-col gap-2 overflow-y-auto">
            {/* SKU Table */}
            <div className="bg-white border-2 border-gray-400">
              <div className="flex border-b border-gray-400">
                <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                  <div className="font-semibold text-xs mb-1">SKU</div>
                  <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                </div>
                <div className="flex-1 px-2 py-1">
                  <div className="font-semibold text-xs mb-1">LISTING NAME</div>
                  <input type="text" value={listingName} onChange={(e) => setListingName(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                </div>
              </div>
            </div>

            {/* Dropdowns Table */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-1">Material</div>
                <select value={dropdown1} onChange={(e) => setDropdown1(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Select...</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Brass">Brass</option>
                  <option value="Copper">Copper</option>
                </select>
              </div>
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-1">Weight</div>
                <div className="flex gap-1">
                  <input type="text" placeholder="Value" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className="flex-1 bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1"/>
                  <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Unit</option>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="grams">grams</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-1">Category</div>
                <select value={dropdown2} onChange={(e) => setDropdown2(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Select...</option>
                  <option value="Ring">Ring</option>
                  <option value="Necklace">Necklace</option>
                  <option value="Bracelet">Bracelet</option>
                  <option value="Earring">Earring</option>
                  <option value="Pendant">Pendant</option>
                </select>
              </div>
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-1">Collection</div>
                <select value={dropdown3} onChange={(e) => setDropdown3(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Select...</option>
                  <option value="Classic">Classic</option>
                  <option value="Modern">Modern</option>
                  <option value="Vintage">Vintage</option>
                  <option value="Contemporary">Contemporary</option>
                </select>
              </div>
            </div>

            {/* Two Separate Spaces */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-2">SETTING TYPE</div>
                <div className="flex gap-2">
                  <button onClick={() => setSettingType('wax')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                    settingType === 'wax'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}>
                    WAX SETTING
                  </button>
                  <button onClick={() => setSettingType('hand')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                    settingType === 'hand'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}>
                    HAND SETTING
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                <div className="font-semibold text-xs mb-2">ENAMEL</div>
                <div className="flex gap-2">
                  <button onClick={() => setEnamelType('yes')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                    enamelType === 'yes'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}>
                    YES
                  </button>
                  <button onClick={() => setEnamelType('no')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                    enamelType === 'no'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
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
                  <div className="font-semibold text-xs mb-1">Active Channels</div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                      className="bg-white border-2 border-gray-400 rounded px-2 py-1 text-xs min-h-[2rem] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-wrap gap-1 flex-1">
                        {activeChannels.length > 0 ? (
                          activeChannels.map(channel => (
                            <span 
                              key={channel} 
                              className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {channel}
                              <button onClick={() => toggleChannel(channel)} className="hover:text-red-200 font-bold">&times;</button>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">Select channels...</span>
                        )}
                      </div>
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {isChannelDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                        {channelOptions.map(channel => (
                          <div
                            key={channel}
                            onClick={() => toggleChannel(channel)}
                            className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                              activeChannels.includes(channel) ? 'bg-blue-50' : ''
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

                <div className="bg-white border-2 border-gray-400 max-h-[8rem] overflow-y-auto">
                  <div className="flex flex-col">
                    {manufacturing.dieNumbers.map((row, index) => (
                      <div key={row.id} className={`flex items-center ${index > 0 ? 'border-t border-gray-400' : ''}`}>
                        <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                          <input type="text" placeholder="DIE NUMBER/FINDINGS" value={row.dieNumber} onChange={(e) => updateDieNumber(row.id, 'dieNumber', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                        </div>
                        <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                          <input type="text" placeholder="QUANTITY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                        </div>
                        <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addDieNumberRow} className="w-fit px-2 py-1 mt-2 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                  + Add Rows
                </button>
              </div>

              {/* Variations Panel - Right 50% */}
              <div className="flex-1 flex flex-col">
                {/* Shopify Status */}
                <div className="mb-2">
                  <div className="font-semibold text-xs mb-1">Shopify Status</div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="bg-white border-2 border-gray-400 rounded px-2 py-1 text-xs min-h-[2rem] flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-xs">
                        {shopifyStatus === 'active' ? 'Active' : shopifyStatus === 'draft' ? 'Draft' : 'Unlisted'}
                      </span>
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {isStatusDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                        <div
                          onClick={() => {
                            setShopifyStatus('active')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                            shopifyStatus === 'active' ? 'bg-blue-50' : ''
                          }`}
                        >
                          Active
                        </div>
                        <div
                          onClick={() => {
                            setShopifyStatus('draft')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                            shopifyStatus === 'draft' ? 'bg-blue-50' : ''
                          }`}
                        >
                          Draft
                        </div>
                        <div
                          onClick={() => {
                            setShopifyStatus('unlisted')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                            shopifyStatus === 'unlisted' ? 'bg-blue-50' : ''
                          }`}
                        >
                          Unlisted
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-400">
                  <div className="flex border-b border-gray-400">
                    <div className="w-32 px-2 py-1 border-r-2 border-gray-400 font-semibold text-xs flex items-center flex-shrink-0">
                      MASTER SKU
                    </div>
                    <div className="flex-1 px-2 py-1">
                      <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </div>
                  </div>

                  <div className="max-h-[5.5rem] overflow-y-auto">
                    {variations.map((variation, index) => (
                      <div key={variation.id} className={`flex items-center ${index < variations.length - 1 ? 'border-b border-gray-400' : ''}`}>
                        <div className="w-32 px-2 py-1 border-r-2 border-gray-400 font-semibold text-xs flex items-center flex-shrink-0">
                          {variation.label ? (
                            <span>{variation.label}</span>
                          ) : (
                            <input type="text" placeholder="Label" value={variation.label} onChange={(e) => updateVariation(variation.id, 'label', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                          )}
                        </div>
                        <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                          <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                        </div>
                        <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                          <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                        </div>
                        <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addVariation} className="w-fit px-2 py-1 mt-2 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                  + ADD Variation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stock Situation Panel (tabular view) */}
      <div className="bg-gray-200 p-3 rounded-lg mb-2">
        <h2 className="text-sm font-semibold mb-2 text-center text-yellow-600">LIVE STOCK SITUATION</h2>
        <div className="flex gap-2">
          {/* Main Live Stock Table - 80% */}
          <div className="flex-shrink-0 bg-white border-2 border-gray-400 p-2 overflow-auto" style={{width: '80%'}}>
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-xs border-collapse text-center">
                <thead>
                  <tr>
                    <th className="w-36 px-1 py-0.5 text-center font-semibold"></th>
                    <th className="w-20 px-0.5 py-0.5">Wax Piece</th>
                    <th className="w-20 px-0.5 py-0.5">Wax Setting</th>
                    <th className="w-24 px-0.5 py-0.5">Casting</th>
                    <th className="w-20 px-0.5 py-0.5">Final Casting</th>
                    <th className="w-20 px-0.5 py-0.5">Filling</th>
                    <th className="w-20 px-0.5 py-0.5">Pre Polish</th>
                    <th className="w-20 px-0.5 py-0.5">Setting</th>
                    <th className="w-20 px-0.5 py-0.5">Final Polish</th>
                    <th className="w-24 px-0.5 py-0.5">Ready for Plating</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-1 py-0.5 font-semibold text-center">Minimum Suggested</td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.min} onChange={(e) => updateLiveStock('rawMaterial','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.min} onChange={(e) => updateLiveStock('rawSetting','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.min} onChange={(e) => updateLiveStock('wipLiquidCasting','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.min} onChange={(e) => updateLiveStock('postCasting','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.min} onChange={(e) => updateLiveStock('filing','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.min} onChange={(e) => updateLiveStock('packing','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.min} onChange={(e) => updateLiveStock('setting','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.min} onChange={(e) => updateLiveStock('finalPolish','min', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.min} onChange={(e) => updateLiveStock('readyForPlacing','min', e.target.value)} /></td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-1 py-0.5 font-semibold text-center">Current Stock</td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.current} onChange={(e) => updateLiveStock('rawMaterial','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.current} onChange={(e) => updateLiveStock('rawSetting','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.current} onChange={(e) => updateLiveStock('wipLiquidCasting','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.current} onChange={(e) => updateLiveStock('postCasting','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.current} onChange={(e) => updateLiveStock('filing','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.current} onChange={(e) => updateLiveStock('packing','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.current} onChange={(e) => updateLiveStock('setting','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.current} onChange={(e) => updateLiveStock('finalPolish','current', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.current} onChange={(e) => updateLiveStock('readyForPlacing','current', e.target.value)} /></td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-1 py-0.5 font-semibold text-center">WIP</td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.wip} onChange={(e) => updateLiveStock('rawMaterial','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.wip} onChange={(e) => updateLiveStock('rawSetting','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.wip} onChange={(e) => updateLiveStock('wipLiquidCasting','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.wip} onChange={(e) => updateLiveStock('postCasting','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.wip} onChange={(e) => updateLiveStock('filing','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.wip} onChange={(e) => updateLiveStock('packing','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.wip} onChange={(e) => updateLiveStock('setting','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.wip} onChange={(e) => updateLiveStock('finalPolish','wip', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.wip} onChange={(e) => updateLiveStock('readyForPlacing','wip', e.target.value)} /></td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-1 py-0.5 font-semibold text-center">Location</td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.location} onChange={(e) => updateLiveStock('rawMaterial','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.location} onChange={(e) => updateLiveStock('rawSetting','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.location} onChange={(e) => updateLiveStock('wipLiquidCasting','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.location} onChange={(e) => updateLiveStock('postCasting','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.location} onChange={(e) => updateLiveStock('filing','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.location} onChange={(e) => updateLiveStock('packing','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.location} onChange={(e) => updateLiveStock('setting','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.location} onChange={(e) => updateLiveStock('finalPolish','location', e.target.value)} /></td>
                    <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.location} onChange={(e) => updateLiveStock('readyForPlacing','location', e.target.value)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Stock Table - 20% */}
          <div className="flex-shrink-0 bg-white border-2 border-gray-400 p-1 flex flex-col" style={{width: '20%'}}>
            <h3 className="text-xs font-semibold mb-1 text-center flex-shrink-0">FINAL STOCK</h3>
            <div className="flex-1 overflow-auto">
              <table className="w-full table-fixed text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">SKU</th>
                    <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">Value</th>
                    <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {finalStock.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="SKU" value={row.sku} onChange={(e) => updateFinalStock(row.id, 'sku', e.target.value)} /></td>
                      <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="Value" value={row.value} onChange={(e) => updateFinalStock(row.id, 'value', e.target.value)} /></td>
                      <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="Unit" value={row.unit} onChange={(e) => updateFinalStock(row.id, 'unit', e.target.value)} /></td>
                      <td className="px-0.5 py-0.5 text-center">
                        <button type="button" onClick={() => deleteFinalStock(row.id)} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addFinalStockRow} className="w-full mt-1 px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex-shrink-0">+ Add Row</button>
          </div>
        </div>
        <div className="mt-2 flex justify-center">
          <button onClick={() => setIsCreateJobModalOpen(true)} className="px-6 py-1.5 bg-green-500 text-white font-semibold rounded text-sm hover:bg-green-600">Create a Job</button>
        </div>
      </div>

      {/* Stone Info and Plating Type - Side by Side */}
      <div className="flex gap-2 mb-2 items-stretch">
        <div className="w-1/2 bg-gray-200 p-2 rounded-lg flex flex-col h-full">
          <h2 className="text-sm font-semibold mb-2">STONE INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-gray-400 table-fixed">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    NAME
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    CUT
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    COLOR
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    SIZE
                  </th>
                  <th className="w-32 px-2 py-1 text-left font-semibold text-xs bg-white">
                    QUANTITY
                  </th>
                </tr>
              </thead>
              <tbody>
                {stoneInfo.map((stone, index) => (
                  <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-gray-400' : ''}>
                    <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={stone.name} onChange={(e) => updateStoneInfo(stone.id, 'name', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={stone.cut} onChange={(e) => updateStoneInfo(stone.id, 'cut', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={stone.color} onChange={(e) => updateStoneInfo(stone.id, 'color', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={stone.size} onChange={(e) => updateStoneInfo(stone.id, 'size', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={stone.quantity} onChange={(e) => updateStoneInfo(stone.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="px-2 py-1 bg-white text-center">
                      <button type="button" onClick={() => deleteStoneInfo(stone.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <button onClick={addStoneInfoRow} className="w-fit mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
            +ADD ROW
          </button>
        </div>

        <div className="w-1/2 bg-gray-200 p-2 rounded-lg flex flex-col h-full">
          <h2 className="text-sm font-semibold mb-2">PLATING INFO</h2>
          <div className="bg-white flex-1 flex flex-col">
            <div className="max-h-36 overflow-y-auto">
              <table className="w-full border-2 border-gray-400 table-fixed">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="w-2/5 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    PLATING TYPE
                  </th>
                  <th className="w-2/5 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                    PLATING COLOR
                  </th>
                  <th className="w-1/5 px-2 py-1 text-center font-semibold text-xs bg-white">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {platingType.map((row, index) => (
                  <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-gray-400' : ''}>
                    <td className="w-2/5 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-2/5 px-2 py-1 border-r-2 border-gray-400 bg-white">
                      <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                    </td>
                    <td className="w-1/5 px-2 py-1 bg-white text-center">
                      <button type="button" onClick={() => deletePlatingType(row.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <button onClick={addPlatingTypeRow} className="w-fit mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
            +ADD ROW
          </button>
        </div>
      </div>

      {/* Manufacturing Section */}
      <div className="bg-gray-200 p-3 rounded-lg mb-2">
        <h2 className="text-sm font-semibold mb-2">MANUFACTURING</h2>
        <div className="bg-white">
          <div className="border-2 border-gray-400">
            <div className="flex border-b-2 border-gray-400">
              <div className="w-24 p-3 border-r-2 border-gray-400 font-semibold text-sm bg-white flex-shrink-0">
                NOTES
              </div>
              <div className="flex-1 p-3 bg-white">
                <input type="text" value={manufacturing.notes ?? ''} onChange={(e) => setManufacturing({ ...manufacturing, notes: e.target.value })} className="w-full bg-transparent outline-none text-sm"/>
              </div>
            </div>

            <div className="flex">
              <div className="w-24 p-3 border-r-2 border-gray-400 font-semibold text-sm bg-white flex-shrink-0">
                IMAGES
              </div>
              <div className="flex-1 p-3 bg-white">
                <div className="flex flex-wrap gap-2">
                  {manufacturing.images.length > 0 ? (
                    manufacturing.images.map((src, index) => (
                      <div key={`${index}-${src}`} className="relative">
                        <img src={src} alt={`Manufacturing ${index + 1}`} className="w-40 h-40 object-cover border border-gray-300 rounded"/>
                        <button type="button" onClick={() => removeManufacturingImage(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">Select images</span>
                  )}
                </div>
                <button onClick={() => manufacturingImagesRef.current?.click()} className="mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
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
              <div className="bg-gray-200 p-2 rounded-lg mb-2">
                <div className="flex gap-3 h-auto">
                  {/* Product Image - Left Side - 1/4 width */}
                  <div className="w-1/4 h-[20rem] bg-white border-2 border-gray-400 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-100 relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                    {productImage ? (<img src={productImage || "/placeholder.svg"} alt="Product" className="w-full h-full object-cover"/>) : (<span className="text-gray-600 text-center text-xs font-semibold">
                        PRODUCT<br />IMAGE
                      </span>)}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden"/>
                  </div>

                  {/* Product Details & Variations - Right Side - 3/4 width */}
                  <div className="w-3/4 flex flex-col gap-2 overflow-y-auto">
                    {/* SKU Table */}
                    <div className="bg-white border-2 border-gray-400">
                      <div className="flex border-b border-gray-400">
                        <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                          <div className="font-semibold text-xs mb-1">SKU</div>
                          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                        </div>
                        <div className="flex-1 px-2 py-1">
                          <div className="font-semibold text-xs mb-1">LISTING NAME</div>
                          <input type="text" value={listingName} onChange={(e) => setListingName(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                        </div>
                      </div>
                    </div>

                    {/* Dropdowns Table */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-1">Material</div>
                        <select value={dropdown1} onChange={(e) => setDropdown1(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                          <option value="">Select...</option>
                          <option value="Silver">Silver</option>
                          <option value="Gold">Gold</option>
                          <option value="Brass">Brass</option>
                          <option value="Copper">Copper</option>
                        </select>
                      </div>
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-1">Weight</div>
                        <div className="flex gap-1">
                          <input type="text" placeholder="Value" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} className="flex-1 bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1"/>
                          <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                            <option value="">Unit</option>
                            <option value="kg">kg</option>
                            <option value="lbs">lbs</option>
                            <option value="grams">grams</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-1">Category</div>
                        <select value={dropdown2} onChange={(e) => setDropdown2(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                          <option value="">Select...</option>
                          <option value="Ring">Ring</option>
                          <option value="Necklace">Necklace</option>
                          <option value="Bracelet">Bracelet</option>
                          <option value="Earring">Earring</option>
                          <option value="Pendant">Pendant</option>
                        </select>
                      </div>
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-1">Collection</div>
                        <select value={dropdown3} onChange={(e) => setDropdown3(e.target.value)} className="w-full bg-transparent outline-none text-xs border border-gray-300 rounded px-2 py-1">
                          <option value="">Select...</option>
                          <option value="Classic">Classic</option>
                          <option value="Modern">Modern</option>
                          <option value="Vintage">Vintage</option>
                          <option value="Contemporary">Contemporary</option>
                        </select>
                      </div>
                    </div>

                    {/* Two Separate Spaces */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-2">SETTING TYPE</div>
                        <div className="flex gap-2">
                          <button onClick={() => setSettingType('wax')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                            settingType === 'wax'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}>
                            WAX SETTING
                          </button>
                          <button onClick={() => setSettingType('hand')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                            settingType === 'hand'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}>
                            HAND SETTING
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border-2 border-gray-400 px-2 py-1">
                        <div className="font-semibold text-xs mb-2">ENAMEL</div>
                        <div className="flex gap-2">
                          <button onClick={() => setEnamelType('yes')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                            enamelType === 'yes'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}>
                            YES
                          </button>
                          <button onClick={() => setEnamelType('no')} className={`flex-1 px-2 py-1 text-xs font-semibold rounded border ${
                            enamelType === 'no'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300'
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
                          <div className="font-semibold text-xs mb-1">Active Channels</div>
                          <div className="relative">
                            <div 
                              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                              className="bg-white border-2 border-gray-400 rounded px-2 py-1 text-xs min-h-[2rem] flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex flex-wrap gap-1 flex-1">
                                {activeChannels.length > 0 ? (
                                  activeChannels.map(channel => (
                                    <span 
                                      key={channel} 
                                      className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {channel}
                                      <button onClick={() => toggleChannel(channel)} className="hover:text-red-200 font-bold">&times;</button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400">Select channels...</span>
                                )}
                              </div>
                              <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {isChannelDropdownOpen && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                {channelOptions.map(channel => (
                                  <div
                                    key={channel}
                                    onClick={() => toggleChannel(channel)}
                                    className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                                      activeChannels.includes(channel) ? 'bg-blue-50' : ''
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

                        <div className="bg-white border-2 border-gray-400 max-h-[8rem] overflow-y-auto">
                          <div className="flex flex-col">
                            {manufacturing.dieNumbers.map((row, index) => (
                              <div key={row.id} className={`flex items-center ${index > 0 ? 'border-t border-gray-400' : ''}`}>
                                <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                                  <input type="text" placeholder="DIE NUMBER" value={row.dieNumber} onChange={(e) => updateDieNumber(row.id, 'dieNumber', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                                </div>
                                <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                                  <input type="text" placeholder="QUANTITY" value={row.quantity} onChange={(e) => updateDieNumber(row.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                                </div>
                                <button type="button" onClick={() => deleteDieNumber(row.id)} className="px-2 py-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button onClick={addDieNumberRow} className="w-fit px-2 py-1 mt-2 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                          + Add Rows
                        </button>
                      </div>

                      {/* Variations Panel - Right 50% */}
                      <div className="flex-1 flex flex-col">
                        {/* Shopify Status */}
                        <div className="mb-2">
                          <div className="font-semibold text-xs mb-1">Shopify Status</div>
                          <div className="relative">
                            <div 
                              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                              className="bg-white border-2 border-gray-400 rounded px-2 py-1 text-xs min-h-[2rem] flex items-center justify-between cursor-pointer"
                            >
                              <span className="text-xs">
                                {shopifyStatus === 'active' ? 'Active' : shopifyStatus === 'draft' ? 'Draft' : 'Unlisted'}
                              </span>
                              <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {isStatusDropdownOpen && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
                                <div
                                  onClick={() => {
                                    setShopifyStatus('active')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                                    shopifyStatus === 'active' ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  Active
                                </div>
                                <div
                                  onClick={() => {
                                    setShopifyStatus('draft')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                                    shopifyStatus === 'draft' ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  Draft
                                </div>
                                <div
                                  onClick={() => {
                                    setShopifyStatus('unlisted')
                                    setIsStatusDropdownOpen(false)
                                  }}
                                  className={`px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 ${
                                    shopifyStatus === 'unlisted' ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  Unlisted
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border-2 border-gray-400">
                          <div className="flex border-b border-gray-400">
                            <div className="w-32 px-2 py-1 border-r-2 border-gray-400 font-semibold text-xs flex items-center flex-shrink-0">
                              MASTER SKU
                            </div>
                            <div className="flex-1 px-2 py-1">
                              <input type="text" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </div>
                          </div>

                          <div className="max-h-[5.5rem] overflow-y-auto">
                            {variations.map((variation, index) => (
                              <div key={variation.id} className={`flex items-center ${index < variations.length - 1 ? 'border-b border-gray-400' : ''}`}>
                                <div className="w-32 px-2 py-1 border-r-2 border-gray-400 font-semibold text-xs flex items-center flex-shrink-0">
                                  {variation.label ? (
                                    <span>{variation.label}</span>
                                  ) : (
                                    <input type="text" placeholder="Label" value={variation.label} onChange={(e) => updateVariation(variation.id, 'label', e.target.value)} className="w-full bg-transparent outline-none text-xs placeholder-gray-400"/>
                                  )}
                                </div>
                                <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                                  <input type="text" value={variation.col1} onChange={(e) => updateVariation(variation.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                                </div>
                                <div className="flex-1 px-2 py-1 border-r-2 border-gray-400">
                                  <input type="text" value={variation.col2} onChange={(e) => updateVariation(variation.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                                </div>
                                <button type="button" onClick={() => deleteVariation(variation.id)} className="px-2 py-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button onClick={addVariation} className="w-fit px-2 py-1 mt-2 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                          + ADD Variation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Stock Situation Panel (tabular view) */}
              <div className="bg-gray-200 p-3 rounded-lg mb-2">
                <h2 className="text-sm font-semibold mb-2 text-center text-yellow-600">LIVE STOCK SITUATION ON PRODUCT SHEET</h2>
                <div className="flex gap-2">
                  {/* Main Live Stock Table - 80% */}
                  <div className="flex-shrink-0 bg-white border-2 border-gray-400 p-2 overflow-auto" style={{width: '80%'}}>
                    <div className="w-full overflow-hidden">
                      <table className="w-full table-fixed text-xs border-collapse text-center">
                        <thead>
                          <tr>
                            <th className="w-36 px-1 py-0.5 text-center font-semibold"></th>
                            <th className="w-20 px-0.5 py-0.5">Wax Piece</th>
                            <th className="w-20 px-0.5 py-0.5">Wax Setting</th>
                            <th className="w-24 px-0.5 py-0.5">Casting</th>
                            <th className="w-20 px-0.5 py-0.5">Final Casting</th>
                            <th className="w-20 px-0.5 py-0.5">Filling</th>
                            <th className="w-20 px-0.5 py-0.5">Pre Polish</th>
                            <th className="w-20 px-0.5 py-0.5">Setting</th>
                            <th className="w-20 px-0.5 py-0.5">Final Polish</th>
                            <th className="w-24 px-0.5 py-0.5">Ready for Plating</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-center">Minimum Suggested</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.min} onChange={(e) => updateLiveStock('rawMaterial','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.min} onChange={(e) => updateLiveStock('rawSetting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.min} onChange={(e) => updateLiveStock('wipLiquidCasting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.min} onChange={(e) => updateLiveStock('postCasting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.min} onChange={(e) => updateLiveStock('filing','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.min} onChange={(e) => updateLiveStock('packing','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.min} onChange={(e) => updateLiveStock('setting','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.min} onChange={(e) => updateLiveStock('finalPolish','min', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.min} onChange={(e) => updateLiveStock('readyForPlacing','min', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-center">Current Stock</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.current} onChange={(e) => updateLiveStock('rawMaterial','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.current} onChange={(e) => updateLiveStock('rawSetting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.current} onChange={(e) => updateLiveStock('wipLiquidCasting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.current} onChange={(e) => updateLiveStock('postCasting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.current} onChange={(e) => updateLiveStock('filing','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.current} onChange={(e) => updateLiveStock('packing','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.current} onChange={(e) => updateLiveStock('setting','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.current} onChange={(e) => updateLiveStock('finalPolish','current', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.current} onChange={(e) => updateLiveStock('readyForPlacing','current', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-center">WIP</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.wip} onChange={(e) => updateLiveStock('rawMaterial','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.wip} onChange={(e) => updateLiveStock('rawSetting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.wip} onChange={(e) => updateLiveStock('wipLiquidCasting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.wip} onChange={(e) => updateLiveStock('postCasting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.wip} onChange={(e) => updateLiveStock('filing','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.wip} onChange={(e) => updateLiveStock('packing','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.wip} onChange={(e) => updateLiveStock('setting','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.wip} onChange={(e) => updateLiveStock('finalPolish','wip', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.wip} onChange={(e) => updateLiveStock('readyForPlacing','wip', e.target.value)} /></td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-1 py-0.5 font-semibold text-center">Location</td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawMaterial.location} onChange={(e) => updateLiveStock('rawMaterial','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.rawSetting.location} onChange={(e) => updateLiveStock('rawSetting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.wipLiquidCasting.location} onChange={(e) => updateLiveStock('wipLiquidCasting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.postCasting.location} onChange={(e) => updateLiveStock('postCasting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.filing.location} onChange={(e) => updateLiveStock('filing','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.packing.location} onChange={(e) => updateLiveStock('packing','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.setting.location} onChange={(e) => updateLiveStock('setting','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.finalPolish.location} onChange={(e) => updateLiveStock('finalPolish','location', e.target.value)} /></td>
                            <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" value={liveStock.readyForPlacing.location} onChange={(e) => updateLiveStock('readyForPlacing','location', e.target.value)} /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Final Stock Table - 20% */}
                  <div className="flex-shrink-0 bg-white border-2 border-gray-400 p-1 flex flex-col" style={{width: '20%'}}>
                    <h3 className="text-xs font-semibold mb-1 text-center flex-shrink-0">FINAL STOCK</h3>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full table-fixed text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">SKU</th>
                            <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">Value</th>
                            <th className="px-0.5 py-0.5 text-center text-xs border-b flex-1">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finalStock.map((row) => (
                            <tr key={row.id} className="border-b">
                              <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="SKU" value={row.sku} onChange={(e) => updateFinalStock(row.id, 'sku', e.target.value)} /></td>
                              <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="Value" value={row.value} onChange={(e) => updateFinalStock(row.id, 'value', e.target.value)} /></td>
                              <td className="px-0.5 py-0.5"><input className="w-full text-xs px-0.5 py-0.5 border rounded" placeholder="Unit" value={row.unit} onChange={(e) => updateFinalStock(row.id, 'unit', e.target.value)} /></td>
                              <td className="px-0.5 py-0.5 text-center">
                                <button type="button" onClick={() => deleteFinalStock(row.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={addFinalStockRow} className="w-full mt-1 px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex-shrink-0">+ Add Row</button>
                  </div>
                </div>
                <div className="mt-2 flex justify-center">
                  <button className="px-6 py-1.5 bg-green-500 text-white font-semibold rounded text-sm hover:bg-green-600">Create a Job</button>
                </div>
              </div>

              {/* Stone Info and Plating Type - Side by Side */}
              <div className="flex gap-2 mb-2 items-stretch">
                <div className="w-1/2 bg-gray-200 p-2 rounded-lg flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">STONE INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-gray-400 table-fixed">
                      <thead>
                        <tr className="border-b-2 border-gray-400">
                          <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            NAME
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            CUT
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            COLOR
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            SIZE
                          </th>
                          <th className="w-32 px-2 py-1 text-left font-semibold text-xs bg-white">
                            QUANTITY
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stoneInfo.map((stone, index) => (
                          <tr key={stone.id} className={index < stoneInfo.length - 1 ? 'border-b-2 border-gray-400' : ''}>
                            <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={stone.name} onChange={(e) => updateStoneInfo(stone.id, 'name', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={stone.cut} onChange={(e) => updateStoneInfo(stone.id, 'cut', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={stone.color} onChange={(e) => updateStoneInfo(stone.id, 'color', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={stone.size} onChange={(e) => updateStoneInfo(stone.id, 'size', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-32 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={stone.quantity} onChange={(e) => updateStoneInfo(stone.id, 'quantity', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="px-2 py-1 bg-white text-center">
                              <button type="button" onClick={() => deleteStoneInfo(stone.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <button onClick={addStoneInfoRow} className="w-fit mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                    +ADD ROW
                  </button>
                </div>

                <div className="w-1/2 bg-gray-200 p-2 rounded-lg flex flex-col h-full">
                  <h2 className="text-sm font-semibold mb-2">PLATING INFO</h2>
                  <div className="bg-white flex-1 flex flex-col">
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full border-2 border-gray-400 table-fixed">
                      <thead>
                        <tr className="border-b-2 border-gray-400">
                          <th className="w-2/5 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            PLATING TYPE
                          </th>
                          <th className="w-2/5 px-2 py-1 text-left font-semibold text-xs border-r-2 border-gray-400 bg-white">
                            PLATING COLOR
                          </th>
                          <th className="w-1/5 px-2 py-1 text-center font-semibold text-xs bg-white">
                            ACTION
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {platingType.map((row, index) => (
                          <tr key={row.id} className={index < platingType.length - 1 ? 'border-b-2 border-gray-400' : ''}>
                            <td className="w-2/5 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={row.col1} onChange={(e) => updatePlatingType(row.id, 'col1', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-2/5 px-2 py-1 border-r-2 border-gray-400 bg-white">
                              <input type="text" value={row.col2} onChange={(e) => updatePlatingType(row.id, 'col2', e.target.value)} className="w-full bg-transparent outline-none text-xs"/>
                            </td>
                            <td className="w-1/5 px-2 py-1 bg-white text-center">
                              <button type="button" onClick={() => deletePlatingType(row.id)} className="text-red-500 hover:text-red-700 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <button onClick={addPlatingTypeRow} className="w-fit mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
                    +ADD ROW
                  </button>
                </div>
              </div>

              {/* Manufacturing Section */}
              <div className="bg-gray-200 p-3 rounded-lg mb-2">
                <h2 className="text-sm font-semibold mb-2">MANUFACTURING</h2>
                <div className="bg-white">
                  <div className="border-2 border-gray-400">
                    <div className="flex border-b-2 border-gray-400">
                      <div className="w-24 p-3 border-r-2 border-gray-400 font-semibold text-sm bg-white flex-shrink-0">
                        NOTES
                      </div>
                      <div className="flex-1 p-3 bg-white">
                        <input type="text" value={manufacturing.notes ?? ''} onChange={(e) => setManufacturing({ ...manufacturing, notes: e.target.value })} className="w-full bg-transparent outline-none text-sm"/>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="w-24 p-3 border-r-2 border-gray-400 font-semibold text-sm bg-white flex-shrink-0">
                        IMAGES
                      </div>
                      <div className="flex-1 p-3 bg-white">
                        <div className="flex flex-wrap gap-2">
                          {manufacturing.images.length > 0 ? (
                            manufacturing.images.map((src, index) => (
                              <div key={`${index}-${src}`} className="relative">
                                <img src={src} alt={`Manufacturing ${index + 1}`} className="w-40 h-40 object-cover border border-gray-300 rounded"/>
                                <button type="button" onClick={() => removeManufacturingImage(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Select images</span>
                          )}
                        </div>
                        <button onClick={() => manufacturingImagesRef.current?.click()} className="mt-2 px-2 py-1 text-xs bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
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
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-400 text-white font-semibold rounded hover:bg-gray-500">
                  Cancel
                </button>
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700">
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Dashboard Panel */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 top-16" onClick={() => setIsDashboardOpen(false)}></div>
      )}
      <div className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-80 bg-white border-r-2 border-gray-300 shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto ${
        isDashboardOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <button onClick={() => setIsDashboardOpen(false)} className="p-1 hover:bg-gray-200 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Master Job Sheet Button */}
          <a href="/master-job-sheet" className="w-full mb-6 px-4 py-3 text-sm bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-600 transition-colors block text-center">
            Master Job Sheet
          </a>

          {/* Master Product Sheet Button */}
          <a href="/master-product-sheet" className="w-full mb-6 px-4 py-3 text-sm bg-teal-500 text-white font-semibold rounded hover:bg-teal-600 transition-colors block text-center">
            Master Product Sheet
          </a>

          {/* Managers Dashboard Button */}
          <a href="/managers-dashboard" className="w-full mb-6 px-4 py-3 text-sm bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition-colors block text-center">
            Managers Dashboard
          </a>

          {/* Dashboard Content */}
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 font-semibold uppercase">Total Products</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">12</p>
              <p className="text-xs text-gray-500 mt-1">+2 this week</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 font-semibold uppercase">Stock Status</p>
              <p className="text-2xl font-bold text-green-600 mt-2">In Stock</p>
              <p className="text-xs text-gray-500 mt-1">245 items available</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 font-semibold uppercase">Pending Orders</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">5</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting shipment</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 font-semibold uppercase">Active Channels</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">7</p>
              <p className="text-xs text-gray-500 mt-1">All online</p>
            </div>

            <hr className="my-4" />

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">
                  Generate Report
                </button>
                <button className="w-full p-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700">
                  Sync Inventory
                </button>
                <button className="w-full p-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700">
                  View Analytics
                </button>
              </div>
            </div>

            <hr className="my-4" />

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                  <p className="font-semibold">Product Added</p>
                  <p className="text-gray-600">Gold Earrings - 2 mins ago</p>
                </div>
                <div className="p-2 bg-gray-50 rounded border-l-4 border-green-500">
                  <p className="font-semibold">Order Placed</p>
                  <p className="text-gray-600">3 units sold - 1 hour ago</p>
                </div>
                <div className="p-2 bg-gray-50 rounded border-l-4 border-orange-500">
                  <p className="font-semibold">Stock Updated</p>
                  <p className="text-gray-600">Inventory adjusted - 3 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
