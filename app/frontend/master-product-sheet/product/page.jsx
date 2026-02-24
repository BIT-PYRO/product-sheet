'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

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
  ['Final Casting', 'postCasting'],
  ['Filling', 'filing'],
  ['Pre Polish', 'packing'],
  ['Setting', 'setting'],
  ['Final Polish', 'finalPolish'],
  ['Ready for Plating', 'readyForPlacing'],
];

export default function ProductDetailPage() {
  const searchParams = useSearchParams();
  const sku = (searchParams.get('sku') || '').trim();

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [products, setProducts] = useState([]);

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
        const response = await fetch('/api/save-to-sheets', {
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

  const finalStockRows = Array.isArray(product?.finalStock) ? product.finalStock : [];

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto border border-gray-300 bg-white p-4 md:p-6">
        <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">PRODUCT SHEET DETAILS</h1>
            </div>
            <Button asChild variant="outline" className="border-gray-800 text-gray-800 rounded-full px-6">
              <Link href="/master-product-sheet">Back to Product Sheet</Link>
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            Loading product details...
          </div>
        )}

        {!isLoading && fetchError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && !sku && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            SKU is missing. Please open this page by clicking an SKU in the product sheet.
          </div>
        )}

        {!isLoading && !fetchError && sku && !product && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Product with SKU "{sku}" was not found.
          </div>
        )}

        {product && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <InfoCard label="SKU" value={product.sku} />
              <InfoCard label="LISTING NAME" value={product.listingName} />
              <InfoCard label="SHOPIFY STATUS" value={product.shopifyStatus} />
              <InfoCard label="LAST UPDATED" value={product.lastUpdated} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <InfoCard label="MATERIAL" value={product.material} />
              <InfoCard label="WEIGHT" value={product.weight} />
              <InfoCard label="CATEGORY" value={product.category} />
              <InfoCard label="COLLECTION" value={product.collection} />
              <InfoCard label="SETTING TYPE" value={product.settingType} />
              <InfoCard label="ENAMEL TYPE" value={product.enamelType} />
              <InfoCard label="ACTIVE CHANNELS" value={product.activeChannels} />
              <InfoCard label="DIE NUMBER/FINDINGS" value={product.dieNumberFindings} />
              <InfoCard label="MASTER SKU" value={product.masterSku} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <InfoCard label="COLOR" value={product.color} />
              <InfoCard label="ENAMEL" value={product.enamel} />
              <InfoCard label="STONE NAME" value={product.stoneName} />
              <InfoCard label="STONE CUT" value={product.stoneCut} />
              <InfoCard label="STONE COLOR" value={product.stoneColor} />
              <InfoCard label="STONE SIZE" value={product.stoneSize} />
              <InfoCard label="STONE QUANTITY" value={product.stoneQuantity} />
              <InfoCard label="PLATING TYPE" value={product.platingType} />
              <InfoCard label="PLATING COLOR" value={product.platingColor} />
              <InfoCard label="IMAGES" value={product.images} />
            </div>

            <div className="mb-4 border border-gray-300 rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-indigo-300 font-bold text-sm text-gray-800 border-b border-gray-400">
                NOTES
              </div>
              <div className="p-3 text-sm whitespace-pre-wrap break-words min-h-[48px]">{product.notes || '—'}</div>
            </div>

            <div className="mb-4 border border-gray-300 rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-indigo-300 font-bold text-sm text-gray-800 border-b border-gray-400">
                LIVE STOCK SITUATION
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-300 text-gray-800 font-bold border-b-2 border-gray-400">
                      <th className="border border-gray-400 p-2 min-w-[140px]">Metric</th>
                      {LIVE_STOCK_COLUMNS.map(([label]) => (
                        <th key={label} className="border border-gray-400 p-2 min-w-[110px]">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LIVE_STOCK_ROWS.map(([rowLabel, field]) => (
                      <tr key={rowLabel} className="border-b border-gray-300">
                        <td className="border border-gray-400 p-2 font-semibold bg-gray-50">{rowLabel}</td>
                        {LIVE_STOCK_COLUMNS.map(([, key]) => (
                          <td key={`${rowLabel}-${key}`} className="border border-gray-400 p-2">
                            {product.liveStock?.[key]?.[field] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-indigo-300 font-bold text-sm text-gray-800 border-b border-gray-400">
                FINAL STOCK DATA
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-300 text-gray-800 font-bold border-b-2 border-gray-400">
                      <th className="border border-gray-400 p-2 min-w-[140px]">SKU</th>
                      <th className="border border-gray-400 p-2 min-w-[140px]">Value</th>
                      <th className="border border-gray-400 p-2 min-w-[120px]">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalStockRows.length === 0 && (
                      <tr>
                        <td className="border border-gray-400 p-3 text-center text-sm text-gray-500" colSpan={3}>
                          No final stock rows available.
                        </td>
                      </tr>
                    )}
                    {finalStockRows.map((row, index) => (
                      <tr key={`${row?.id || index}-${row?.sku || ''}`} className="border-b border-gray-300">
                        <td className="border border-gray-400 p-2">{row?.sku || '—'}</td>
                        <td className="border border-gray-400 p-2">{row?.value || '—'}</td>
                        <td className="border border-gray-400 p-2">{row?.unit || '—'}</td>
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

function InfoCard({ label, value }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 bg-indigo-300 font-bold text-xs text-gray-800 border-b border-gray-400">{label}</div>
      <div className="px-3 py-2 text-sm min-h-[44px] whitespace-pre-wrap break-words">{value || '—'}</div>
    </div>
  );
}
