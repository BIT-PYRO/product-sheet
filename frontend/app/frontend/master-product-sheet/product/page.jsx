'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  ['Final Casting', 'postCasting'],
  ['Filling', 'filing'],
  ['Pre Polish', 'packing'],
  ['Setting', 'setting'],
  ['Final Polish', 'finalPolish'],
  ['Ready for Plating', 'readyForPlacing'],
];

function ProductDetailContent() {
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
    <div className="w-full min-h-screen bg-cloud-gray">
      <div className="pt-16 px-3 md:px-4 pb-3 md:pb-4">
        <div className="sheet-fixed-header fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT SHEET DETAILS</h1>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <DateTimeStamp />
              <Button asChild variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">
                <Link href="/master-product-sheet">Back to Product Sheet</Link>
              </Button>
            </div>
          </div>
        </div>

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

        {!isLoading && !fetchError && !sku && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
            SKU is missing. Please open this page by clicking an SKU in the product sheet.
          </div>
        )}

        {!isLoading && !fetchError && sku && !product && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
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

            <div className="mb-4 border border-soft-border rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
                NOTES
              </div>
              <div className="p-3 text-sm whitespace-pre-wrap break-words min-h-[48px]">{product.notes || '—'}</div>
            </div>

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
