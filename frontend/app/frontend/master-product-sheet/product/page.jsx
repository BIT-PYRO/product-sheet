'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';

const LIVE_STOCK_ROWS = [
  ['Minimum Suggested', 'min'],
  ['Current Stock', 'current'],
  ['WIP', 'wip'],
  ['Location', 'location'],
];

const LIVE_STOCK_COLUMNS = [
  ['Wax Piece', 'rawMaterial'],
  ['Wax Setting', 'rawSetting'],
  ['Casting', 'wipLiquidCasting'],
  ['Filling', 'filing'],
  ['Pre Polish', 'packing'],
  ['Setting', 'setting'],
  ['Final Polish', 'finalPolish'],
  ['Ready for Plating', 'readyForPlacing'],
];

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sku = (searchParams.get('sku') || '').trim();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [products, setProducts] = useState([]);

  // Edit / Delete state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      if (!sku) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setFetchError('');

      try {
        const response = await fetch('/api/product-sheet', {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch product data');
        }

        setProducts(Array.isArray(result.products) ? result.products : []);
      } catch (error) {
        setFetchError(error.message || 'Failed to load product');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [sku]);

  const product = useMemo(() => {
    const normalizedSku = sku.toLowerCase();
    return products.find((item) => String(item.sku || '').trim().toLowerCase() === normalizedSku) || null;
  }, [products, sku]);

  // Initialise editData whenever the loaded product changes
  useEffect(() => {
    if (product) {
      setEditData({
        listingName: product.listingName || '',
        material: product.material || '',
        weight: product.weight || '',
        category: product.category || '',
        collection: product.collection || '',
        settingType: product.settingType || '',
        enamelType: product.enamelType || '',
        activeChannels: product.activeChannels || '',
        shopifyStatus: product.shopifyStatus || '',
        masterSku: product.masterSku || '',
        color: product.color || '',
        enamel: product.enamel || '',
        stoneName: product.stoneName || '',
        stoneCut: product.stoneCut || '',
        stoneColor: product.stoneColor || '',
        stoneSize: product.stoneSize || '',
        stoneQuantity: product.stoneQuantity || '',
        platingType: product.platingType || '',
        platingColor: product.platingColor || '',
        notes: product.notes || '',
        images: product.images || '',
      });
    }
  }, [product]);

  const handleFieldChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    // Reset editData to current saved product
    if (product) {
      setEditData({
        listingName: product.listingName || '',
        material: product.material || '',
        weight: product.weight || '',
        category: product.category || '',
        collection: product.collection || '',
        settingType: product.settingType || '',
        enamelType: product.enamelType || '',
        activeChannels: product.activeChannels || '',
        shopifyStatus: product.shopifyStatus || '',
        masterSku: product.masterSku || '',
        color: product.color || '',
        enamel: product.enamel || '',
        stoneName: product.stoneName || '',
        stoneCut: product.stoneCut || '',
        stoneColor: product.stoneColor || '',
        stoneSize: product.stoneSize || '',
        stoneQuantity: product.stoneQuantity || '',
        platingType: product.platingType || '',
        platingColor: product.platingColor || '',
        notes: product.notes || '',
        images: product.images || '',
      });
    }
    setSaveError('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!product?.id || !editData) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const payload = {
        name: editData.listingName,
        material: editData.material,
        weight: editData.weight,
        category: editData.category,
        collection: editData.collection,
        setting_type: editData.settingType,
        enamel_type: editData.enamelType,
        active_channels: editData.activeChannels,
        is_active: editData.shopifyStatus === 'active',
        master_sku: editData.masterSku,
        color: editData.color,
        enamel: editData.enamel,
        stone_name: editData.stoneName,
        stone_cut: editData.stoneCut,
        stone_color: editData.stoneColor,
        stone_size: editData.stoneSize,
        stone_quantity: editData.stoneQuantity,
        plating_type: editData.platingType,
        plating_color: editData.platingColor,
        notes: editData.notes,
        images: editData.images,
      };
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Failed to save product.');
      }
      // Merge saved values back into the products list so UI reflects them
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                listingName: editData.listingName,
                material: editData.material,
                weight: editData.weight,
                category: editData.category,
                collection: editData.collection,
                settingType: editData.settingType,
                enamelType: editData.enamelType,
                activeChannels: editData.activeChannels,
                shopifyStatus: editData.shopifyStatus,
                masterSku: editData.masterSku,
                color: editData.color,
                enamel: editData.enamel,
                stoneName: editData.stoneName,
                stoneCut: editData.stoneCut,
                stoneColor: editData.stoneColor,
                stoneSize: editData.stoneSize,
                stoneQuantity: editData.stoneQuantity,
                platingType: editData.platingType,
                platingColor: editData.platingColor,
                notes: editData.notes,
                images: editData.images,
              }
            : p
        )
      );
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!product?.id) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || result?.detail || 'Failed to delete product.');
      }
      router.push('/master-product-sheet');
    } catch (err) {
      setShowDeleteConfirm(false);
      setFetchError(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  const finalStockRows = Array.isArray(product?.finalStock) ? product.finalStock : [];

  return (
    <div className="w-full min-h-screen bg-cloud-gray">
      <div className="pt-16 px-3 md:px-4 pb-3 md:pb-4">
        {/* Header */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT SHEET DETAILS</h1>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <DateTimeStamp />
              {product && !isEditing && (
                <>
                  <Button
                    onClick={() => { setSaveError(''); setIsEditing(true); }}
                    className="bg-trust-blue hover:bg-deep-blue text-white rounded-full px-5"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-full px-5"
                  >
                    Delete
                  </Button>
                </>
              )}
              {product && isEditing && (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="rounded-full px-5"
                  >
                    Cancel
                  </Button>
                </>
              )}
              <Button asChild variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-5">
                <Link href="/master-product-sheet">← Back</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-base font-bold text-midnight-ink mb-2">Delete Product</h2>
              <p className="text-sm text-slate-text mb-5">
                Are you sure you want to delete <span className="font-semibold">{product?.sku}</span>? This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mb-4 rounded-md border border-trust-blue/30 bg-blue-50 px-4 py-2 text-sm text-deep-blue">
            Loading product details...
          </div>
        )}

        {!isLoading && fetchError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {saveError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {!isLoading && !fetchError && !sku && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
            SKU is missing. Please open this page by clicking an SKU in the product sheet.
          </div>
        )}

        {!isLoading && !fetchError && sku && !product && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
            Product with SKU &quot;{sku}&quot; was not found.
          </div>
        )}

        {product && (
          <>
            {/* Mode badge */}
            {isEditing && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800">
                ✏️ Edit mode — fields are now editable
              </div>
            )}

            {/* Top identity row — SKU never editable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <InfoCard label="SKU" value={product.sku} />
              <EditableCard label="LISTING NAME" field="listingName" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="SHOPIFY STATUS" field="shopifyStatus" editData={editData} isEditing={isEditing} onChange={handleFieldChange} hint="active / inactive" />
              <InfoCard label="LAST UPDATED" value={product.lastUpdated} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <EditableCard label="MATERIAL" field="material" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="WEIGHT" field="weight" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="CATEGORY" field="category" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="COLLECTION" field="collection" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="SETTING TYPE" field="settingType" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="ENAMEL TYPE" field="enamelType" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="ACTIVE CHANNELS" field="activeChannels" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <InfoCard
                label="DIE NUMBER/FINDINGS"
                value={
                  Array.isArray(product.dieNumberFindings) && product.dieNumberFindings.length > 0
                    ? product.dieNumberFindings.map((item) => item?.value || '').filter(Boolean).join(', ')
                    : undefined
                }
              />
              <EditableCard label="MASTER SKU" field="masterSku" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <EditableCard label="COLOR" field="color" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="ENAMEL" field="enamel" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="STONE NAME" field="stoneName" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="STONE CUT" field="stoneCut" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="STONE COLOR" field="stoneColor" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="STONE SIZE" field="stoneSize" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="STONE QUANTITY" field="stoneQuantity" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="PLATING TYPE" field="platingType" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="PLATING COLOR" field="platingColor" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
              <EditableCard label="IMAGES" field="images" editData={editData} isEditing={isEditing} onChange={handleFieldChange} />
            </div>

            {/* Notes */}
            <div className="mb-4 border border-soft-border rounded-lg bg-white overflow-hidden">
              <div className={`px-3 py-2 font-bold text-sm text-midnight-ink border-b border-soft-border ${isEditing ? 'bg-amber-50' : 'bg-trust-blue/40'}`}>
                NOTES {isEditing && <span className="text-xs font-normal text-amber-700 ml-1">(editable)</span>}
              </div>
              {isEditing ? (
                <Textarea
                  value={editData?.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="border-0 rounded-none min-h-[80px] p-3 text-sm resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Enter notes…"
                />
              ) : (
                <div className="p-3 text-sm whitespace-pre-wrap break-words min-h-[48px]">{product.notes || '—'}</div>
              )}
            </div>

            {/* Live Stock — always read-only (derived from inventory transactions) */}
            <div className="mb-4 border border-soft-border rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
                LIVE STOCK SITUATION
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-trust-blue/40 text-midnight-ink font-bold border-b-2 border-soft-border">
                      <th className="border border-soft-border p-2 min-w-[140px]">Metric</th>
                      {LIVE_STOCK_COLUMNS.map(([label]) => (
                        <th key={label} className="border border-soft-border p-2 min-w-[110px]">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LIVE_STOCK_ROWS.map(([rowLabel, field]) => (
                      <tr key={rowLabel} className="border-b border-soft-border">
                        <td className="border border-soft-border p-2 font-semibold bg-cloud-gray">{rowLabel}</td>
                        {LIVE_STOCK_COLUMNS.map(([, key]) => (
                          <td key={`${rowLabel}-${key}`} className="border border-soft-border p-2">
                            {product.liveStock?.[key]?.[field] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Stock — always read-only */}
            <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
                FINAL STOCK DATA
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-trust-blue/40 text-midnight-ink font-bold border-b-2 border-soft-border">
                      <th className="border border-soft-border p-2 min-w-[140px]">SKU</th>
                      <th className="border border-soft-border p-2 min-w-[140px]">Value</th>
                      <th className="border border-soft-border p-2 min-w-[120px]">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalStockRows.length === 0 && (
                      <tr>
                        <td className="border border-soft-border p-3 text-center text-sm text-cool-gray" colSpan={3}>
                          No final stock rows available.
                        </td>
                      </tr>
                    )}
                    {finalStockRows.map((row, index) => (
                      <tr key={`${row?.id || index}-${row?.sku || ''}`} className="border-b border-soft-border">
                        <td className="border border-soft-border p-2">{row?.sku || '—'}</td>
                        <td className="border border-soft-border p-2">{row?.value || '—'}</td>
                        <td className="border border-soft-border p-2">{row?.unit || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cloud-gray flex items-center justify-center"><p className="text-base text-cool-gray">Loading product…</p></div>}>
      <ProductDetailContent />
    </Suspense>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">{label}</div>
      <div className="px-3 py-2 text-sm min-h-[44px] whitespace-pre-wrap break-words">{value || '—'}</div>
    </div>
  );
}

function EditableCard({ label, field, editData, isEditing, onChange, hint }) {
  const value = editData?.[field] || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${isEditing ? 'border-amber-300 bg-amber-50' : 'border-soft-border bg-white'}`}>
      <div className={`px-3 py-2 font-bold text-sm border-b ${isEditing ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-trust-blue/40 border-soft-border text-midnight-ink'}`}>
        {label}
      </div>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={hint || `Enter ${label.toLowerCase()}…`}
          className="border-0 rounded-none h-auto min-h-[44px] px-3 py-2 text-sm bg-amber-50 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      ) : (
        <div className="px-3 py-2 text-sm min-h-[44px] whitespace-pre-wrap break-words">{value || '—'}</div>
      )}
    </div>
  );
}
