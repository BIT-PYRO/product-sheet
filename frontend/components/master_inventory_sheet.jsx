'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PRODUCT_SHEET_SYNC_KEY = 'product_sheet_updated_at';
const PRODUCT_SHEET_SYNC_EVENT = 'product_sheet_sync';

const INVENTORY_COLUMNS = [
  { key: '__select__', label: '' },
  { key: 'sku', label: 'SKU' },
  { key: 'waxPiece', label: 'Wax Piece' },
  { key: 'waxSetting', label: 'Wax Setting' },
  { key: 'casting', label: 'Casting' },
  { key: 'finalCasting', label: 'Final Casting' },
  { key: 'filling', label: 'Filling' },
  { key: 'prePolish', label: 'Pre Polish' },
  { key: 'setting', label: 'Setting' },
  { key: 'finalPolish', label: 'Final Polish' },
  { key: 'readyForPlating', label: 'Ready for Plating' },
  { key: 'finalStockSku', label: 'Final Stock SKU' },
  { key: 'finalStockValue', label: 'Final Stock Value' },
  { key: 'finalStockUnit', label: 'Final Stock Unit' },
];

const STOCK_FILTER_OPTIONS = [
  { value: 'min', label: 'Minimum Suggested' },
  { value: 'current', label: 'Current Stock' },
  { value: 'wip', label: 'WIP' },
  { value: 'location', label: 'Location' },
];

function formatFinalStockColumn(rows, key) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  return rows
    .map((row) => String(row?.[key] || '').trim())
    .filter(Boolean)
    .join(' | ');
}

function buildInventoryRow(product, stockField) {
  const liveStock = product?.liveStock || {};
  const finalStock = Array.isArray(product?.finalStock) ? product.finalStock : [];
  const safeStockField = stockField || 'current';

  return {
    id: product.id,
    sku: product.sku || product.masterSku || '',
    waxPiece: liveStock?.rawMaterial?.[safeStockField] || '',
    waxSetting: liveStock?.rawSetting?.[safeStockField] || '',
    casting: liveStock?.wipLiquidCasting?.[safeStockField] || '',
    finalCasting: liveStock?.postCasting?.[safeStockField] || '',
    filling: liveStock?.filing?.[safeStockField] || '',
    prePolish: liveStock?.packing?.[safeStockField] || '',
    setting: liveStock?.setting?.[safeStockField] || '',
    finalPolish: liveStock?.finalPolish?.[safeStockField] || '',
    readyForPlating: liveStock?.readyForPlacing?.[safeStockField] || '',
    finalStockSku: formatFinalStockColumn(finalStock, 'sku'),
    finalStockValue: formatFinalStockColumn(finalStock, 'value'),
    finalStockUnit: formatFinalStockColumn(finalStock, 'unit'),
  };
}

export default function MasterInventorySheet() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [stockField, setStockField] = useState('current');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(INVENTORY_COLUMNS.map((column) => column.key))
  );
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/save-to-sheets', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch inventory data');
      }

      const nextProducts = Array.isArray(result.products) ? result.products : [];
      setProducts(nextProducts);

    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load inventory data');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (event.key === PRODUCT_SHEET_SYNC_KEY) {
        loadProducts();
      }
    };

    const handleSameTabSync = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener(PRODUCT_SHEET_SYNC_EVENT, handleSameTabSync);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener(PRODUCT_SHEET_SYNC_EVENT, handleSameTabSync);
    };
  }, [loadProducts]);

  const effectiveSearch = useMemo(() => {
    if (selectedSku) {
      return selectedSku;
    }

    return searchTerm.trim();
  }, [searchTerm, selectedSku]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = effectiveSearch.toLowerCase();

    return products.filter((product) => {
      if (selectedSku) {
        return String(product.sku || '').trim() === selectedSku;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [product.sku, product.masterSku, product.listingName]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [products, effectiveSearch, selectedSku]);

  const skuOptions = useMemo(() => {
    const seen = new Set();
    return products
      .map((product) => ({
        sku: String(product.sku || '').trim(),
        listingName: String(product.listingName || '').trim(),
      }))
      .filter((entry) => entry.sku && !seen.has(entry.sku) && seen.add(entry.sku));
  }, [products]);

  const skuValues = useMemo(
    () => new Set(skuOptions.map((option) => option.sku)),
    [skuOptions]
  );

  const skuLabelBySku = useMemo(() => {
    const map = new Map();
    skuOptions.forEach((option) => {
      const label = option.listingName
        ? `${option.sku} — ${option.listingName}`
        : option.sku;
      map.set(option.sku, label);
    });
    return map;
  }, [skuOptions]);

  const skuSearchOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return skuOptions;
    }

    return skuOptions.filter((option) => {
      const sku = option.sku.toLowerCase();
      const name = option.listingName.toLowerCase();
      return sku.includes(normalized) || name.includes(normalized);
    });
  }, [searchTerm, skuOptions]);

  const findSkuFromInput = useCallback(
    (inputValue) => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        return '';
      }

      if (skuValues.has(trimmed)) {
        return trimmed;
      }

      const matched = skuOptions.find((option) => {
        const label = skuLabelBySku.get(option.sku) || option.sku;
        return label.toLowerCase() === trimmed.toLowerCase();
      });

      if (matched) {
        return matched.sku;
      }

      const startMatch = skuOptions.find((option) => trimmed.startsWith(option.sku));
      return startMatch ? startMatch.sku : '';
    },
    [skuLabelBySku, skuOptions, skuValues]
  );

  const inventoryRows = useMemo(
    () => filteredProducts.map((product) => buildInventoryRow(product, stockField)),
    [filteredProducts, stockField]
  );

  const rowsToRender = useMemo(() => {
    const minRows = 16;
    if (inventoryRows.length >= minRows) {
      return inventoryRows;
    }

    const emptyRows = Array.from({ length: minRows - inventoryRows.length }, (_, index) => ({
      id: `empty-${index}`,
      isEmpty: true,
    }));

    return [...inventoryRows, ...emptyRows];
  }, [inventoryRows]);

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectableRowIds = useMemo(
    () => inventoryRows.map((row) => row.id),
    [inventoryRows]
  );

  const allRowsSelected = useMemo(() => {
    if (selectableRowIds.length === 0) {
      return false;
    }
    return selectableRowIds.every((id) => selectedRows.has(id));
  }, [selectableRowIds, selectedRows]);

  const toggleSelectAll = () => {
    setSelectedRows((prev) => {
      if (allRowsSelected) {
        return new Set();
      }
      return new Set(selectableRowIds);
    });
  };

  const visibleColumnList = useMemo(() => {
    const columns = INVENTORY_COLUMNS.filter((column) => visibleColumns.has(column.key));
    if (!columns.some((column) => column.key === '__select__')) {
      return [{ key: '__select__', label: '' }, ...columns];
    }
    return columns;
  }, [visibleColumns]);

  const toggleColumnSelection = (columnKey) => {
    setSelectedColumnsForAction((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const handleHideColumns = () => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      selectedColumnsForAction.forEach((columnKey) => next.delete(columnKey));
      return next;
    });
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      selectedColumnsForAction.forEach((columnKey) => next.add(columnKey));
      return next;
    });
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleExport = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to export');
      return;
    }

    const exportColumns = visibleColumnList.filter((column) => column.key !== '__select__');
    const header = exportColumns.map((column) => column.label).join(',');
    const body = inventoryRows
      .filter((row) => selectedRows.has(row.id))
      .map((row) =>
        exportColumns
          .map((column) => {
            const value = String(row[column.key] || '').replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(',')
      )
      .join('\n');

    const csv = [header, body].filter(Boolean).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master-inventory-sheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
      <MasterNavigationDrawer />

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[380px] overflow-y-auto py-2">
            {INVENTORY_COLUMNS.filter((column) => column.key !== '__select__').map((column) => (
              <div key={column.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={column.key}
                    checked={selectedColumnsForAction.has(column.key)}
                    onCheckedChange={() => toggleColumnSelection(column.key)}
                  />
                  <label htmlFor={column.key} className="text-sm">
                    {column.label}
                  </label>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100">
                  {visibleColumns.has(column.key) ? 'Visible' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleHideColumns}
              disabled={selectedColumnsForAction.size === 0}
            >
              Hide
            </Button>
            <Button
              onClick={handleShowColumns}
              disabled={selectedColumnsForAction.size === 0}
            >
              Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-[1400px] mx-auto border border-gray-300 bg-white p-4 md:p-6">
        <h1 className="text-center text-xs md:text-sm font-semibold tracking-wide text-yellow-700 mb-4">
          MASTER INVENTORY SHEET
        </h1>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="w-full md:max-w-[360px] relative">
              <Input
                value={searchTerm}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchTerm(nextValue);
                  const matchedSku = findSkuFromInput(nextValue);
                  setSelectedSku(matchedSku);
                }}
                onFocus={() => setIsSkuDropdownOpen(true)}
                onBlur={() => {
                  setIsSkuDropdownOpen(false);
                  const matchedSku = findSkuFromInput(searchTerm);
                  if (matchedSku) {
                    setSelectedSku(matchedSku);
                    setSearchTerm(skuLabelBySku.get(matchedSku) || matchedSku);
                  }
                }}
                placeholder="Search or select SKU"
                className="w-full"
              />
              {isSkuDropdownOpen && skuSearchOptions.length > 0 && (
                <div
                  className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {skuSearchOptions.map((option) => {
                    const label = skuLabelBySku.get(option.sku) || option.sku;
                    return (
                      <button
                        key={option.sku}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => {
                          setSelectedSku(option.sku);
                          setSearchTerm(label);
                          setIsSkuDropdownOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-full md:max-w-[260px]">
              <select
                value={stockField}
                onChange={(event) => setStockField(event.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
              >
                {STOCK_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => (window.location.href = '/')}
            >
              Create a Job
            </Button>
            <Button variant="outline" onClick={() => setIsManageColumnsOpen(true)}>
              Manage Columns
            </Button>
            <Button variant="outline" onClick={handleExport}>Export</Button>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full min-w-[1200px] border-collapse text-xs">
            <thead>
              <tr>
                {visibleColumnList.map((column) => (
                  <th
                    key={column.key}
                    className="border border-gray-400 bg-yellow-300 px-2 py-2 text-center font-semibold"
                  >
                    {column.key === '__select__' ? (
                      <Checkbox
                        checked={allRowsSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all rows"
                      />
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsToRender.map((row) => (
                <tr key={row.id}>
                  {visibleColumnList.map((column) => (
                    <td key={`${row.id}-${column.key}`} className="border border-gray-300 px-2 py-2 h-9 text-center">
                      {column.key === '__select__' ? (
                        row.isEmpty ? null : (
                          <Checkbox
                            checked={selectedRows.has(row.id)}
                            onCheckedChange={() => toggleRowSelection(row.id)}
                          />
                        )
                      ) : (
                        row.isEmpty ? '' : row[column.key] || ''
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && <p className="mt-2 text-xs text-gray-600">Loading live stock data...</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {!isLoading && !error && filteredProducts.length === 0 && (
          <p className="mt-2 text-xs text-gray-600">No inventory data found.</p>
        )}
      </div>
    </div>
  );
}
