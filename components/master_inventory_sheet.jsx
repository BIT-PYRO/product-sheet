'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { CreateJobModal } from '@/components/create-job-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Component to render composite WIP vs Current Stock values
function CompositeStockDisplay({ value }) {
  if (!value?.isComposite) {
    return <span>{value}</span>;
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <span className="text-orange-600 font-medium">{value.wip || '-'}</span>
      <span className="text-gray-400">/</span>
      <span className="text-green-600 font-medium">{value.current || '-'}</span>
    </div>
  );
}

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
  { value: 'wip-vs-current', label: 'WIP vs Current Stock' },
];

const PRODUCT_SORT_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'listingName', label: 'Listing Name' },
  { value: 'material', label: 'Material' },
  { value: 'weight', label: 'Weight' },
  { value: 'category', label: 'Category' },
  { value: 'collection', label: 'Collection' },
  { value: 'settingType', label: 'Setting Type' },
  { value: 'enamelType', label: 'Enamel Type' },
  { value: 'activeChannels', label: 'Active Channels' },
  { value: 'shopifyStatus', label: 'Shopify Status' },
  { value: 'dieNumberFindings', label: 'Die Number/Findings' },
  { value: 'masterSku', label: 'Master SKU' },
  { value: 'color', label: 'Color' },
  { value: 'enamel', label: 'Enamel' },
  { value: 'stoneName', label: 'Stone Name' },
  { value: 'stoneCut', label: 'Stone Cut' },
  { value: 'stoneColor', label: 'Stone Color' },
  { value: 'stoneSize', label: 'Stone Size' },
  { value: 'stoneQuantity', label: 'Stone Quantity' },
  { value: 'platingType', label: 'Plating Type' },
  { value: 'platingColor', label: 'Plating Color' },
  { value: 'notes', label: 'Notes' },
  { value: 'images', label: 'Images' },
];

const FILTER_FIELDS = [
  { key: 'material', label: 'Material' },
  { key: 'category', label: 'Category' },
  { key: 'collection', label: 'Collection' },
  { key: 'settingType', label: 'Setting Type' },
  { key: 'enamelType', label: 'Enamel Type' },
  { key: 'shopifyStatus', label: 'Shopify Status' },
  { key: 'activeChannels', label: 'Active Channels' },
];

const PRODUCT_FIELD_OPTIONS = {
  material: ['Silver', 'Gold', 'Brass', 'Copper'],
  category: ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant'],
  collection: ['Classic', 'Modern', 'Vintage', 'Contemporary'],
  settingType: ['wax', 'hand'],
  enamelType: ['yes', 'no'],
  shopifyStatus: ['active', 'draft', 'unlisted'],
  activeChannels: ['Amazon', 'eBay', 'Shopify', 'Etsy', 'Website', 'Wholesale', 'Retail Store'],
};

function formatFinalStockColumn(rows, key) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  return rows
    .map((row) => String(row?.[key] || '').trim())
    .filter(Boolean)
    .join(' | ');
}

function getLiveStockValue(liveStock, stockField, keys) {
  const normalizedField = stockField || 'current';

  // Handle WIP vs Current Stock special case
  if (normalizedField === 'wip-vs-current') {
    let wipValue = '';
    let currentValue = '';

    for (const key of keys) {
      if (!wipValue) wipValue = liveStock?.[key]?.['wip'] || '';
      if (!currentValue) currentValue = liveStock?.[key]?.['current'] || '';
      
      if (wipValue && currentValue) break;
    }

    return {
      isComposite: true,
      wip: wipValue,
      current: currentValue,
    };
  }

  for (const key of keys) {
    const value = liveStock?.[key]?.[normalizedField];
    if (String(value || '').trim() !== '') {
      return value;
    }
  }

  return '';
}

function buildInventoryRow(product, stockField) {
  const liveStock = product?.liveStock || {};
  const finalStock = Array.isArray(product?.finalStock) ? product.finalStock : [];

  return {
    id: product.id,
    sku: product.sku || product.masterSku || '',
    waxPiece: getLiveStockValue(liveStock, stockField, ['rawMaterial', 'waxPiece']),
    waxSetting: getLiveStockValue(liveStock, stockField, ['rawSetting', 'waxSetting']),
    casting: getLiveStockValue(liveStock, stockField, ['wipLiquidCasting', 'casting', 'tyre']),
    finalCasting: getLiveStockValue(liveStock, stockField, ['postCasting', 'finalCasting', 'dustunuing']),
    filling: getLiveStockValue(liveStock, stockField, ['filing', 'filling']),
    prePolish: getLiveStockValue(liveStock, stockField, ['packing', 'prePolish']),
    setting: getLiveStockValue(liveStock, stockField, ['setting']),
    finalPolish: getLiveStockValue(liveStock, stockField, ['finalPolish']),
    readyForPlating: getLiveStockValue(liveStock, stockField, ['readyForPlacing', 'readyForPlating']),
    finalStockSku: formatFinalStockColumn(finalStock, 'sku'),
    finalStockValue: formatFinalStockColumn(finalStock, 'value'),
    finalStockUnit: formatFinalStockColumn(finalStock, 'unit'),
  };
}

function getProductSortValue(product, fieldKey) {
  const value = product?.[fieldKey];
  if (Array.isArray(value)) {
    return value.join(', ').toLowerCase();
  }
  return String(value || '').toLowerCase();
}

function getFilterValue(product, fieldKey) {
  return product?.[fieldKey];
}

export default function MasterInventorySheet() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [stockField, setStockField] = useState('min');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterSelections, setFilterSelections] = useState(() => {
    const initial = {};
    FILTER_FIELDS.forEach((field) => {
      initial[field.key] = new Set();
    });
    return initial;
  });
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
      const matchesFilters = FILTER_FIELDS.every((field) => {
        const selected = filterSelections[field.key];
        if (!selected || selected.size === 0) {
          return true;
        }

        const rawValue = getFilterValue(product, field.key);
        if (!rawValue) {
          return false;
        }

        if (field.key === 'activeChannels') {
          const values = String(rawValue)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
          return values.some((value) => selected.has(value));
        }

        return selected.has(String(rawValue).trim());
      });

      if (!matchesFilters) {
        return false;
      }

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
  }, [effectiveSearch, filterSelections, products, selectedSku]);

  const sortedProducts = useMemo(() => {
    if (!sortField) {
      return filteredProducts;
    }

    const sorted = [...filteredProducts].sort((a, b) => {
      const first = getProductSortValue(a, sortField);
      const second = getProductSortValue(b, sortField);
      if (first < second) return sortDirection === 'asc' ? -1 : 1;
      if (first > second) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredProducts, sortDirection, sortField]);

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

  const filterOptionsByField = useMemo(() => {
    const options = {};
    FILTER_FIELDS.forEach((field) => {
      options[field.key] = new Set(PRODUCT_FIELD_OPTIONS[field.key] || []);
    });

    products.forEach((product) => {
      FILTER_FIELDS.forEach((field) => {
        const rawValue = getFilterValue(product, field.key);
        if (!rawValue) {
          return;
        }

        if (field.key === 'activeChannels') {
          String(rawValue)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .forEach((value) => options[field.key].add(value));
          return;
        }

        options[field.key].add(String(rawValue).trim());
      });
    });

    const sorted = {};
    FILTER_FIELDS.forEach((field) => {
      sorted[field.key] = Array.from(options[field.key]).sort((a, b) =>
        a.localeCompare(b)
      );
    });

    return sorted;
  }, [products]);

  const toggleFilterSelection = (fieldKey, value) => {
    setFilterSelections((prev) => {
      const next = { ...prev };
      const nextSet = new Set(prev[fieldKey] || []);
      if (nextSet.has(value)) {
        nextSet.delete(value);
      } else {
        nextSet.add(value);
      }
      next[fieldKey] = nextSet;
      return next;
    });
  };

  const clearFilterSelection = (fieldKey) => {
    setFilterSelections((prev) => ({ ...prev, [fieldKey]: new Set() }));
  };

  const inventoryRows = useMemo(
    () => sortedProducts.map((product) => buildInventoryRow(product, stockField)),
    [sortedProducts, stockField]
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

      <div className="max-w-[1600px] mx-auto border border-gray-300 bg-white p-4 md:p-6">
        <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MASTER INVENTORY SHEET</h1>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-2">
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
              onClick={() => setIsCreateJobModalOpen(true)}
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
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_FIELDS.map((field) => (
            <DropdownMenu key={field.key}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3 py-1 text-xs border rounded bg-blue-100 text-gray-800 border-blue-300"
                >
                  {field.label}
                  {filterSelections[field.key]?.size > 0
                    ? ` (${filterSelections[field.key].size})`
                    : ''}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">Select {field.label}</span>
                  <button
                    type="button"
                    onClick={() => clearFilterSelection(field.key)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {(filterOptionsByField[field.key] || []).map((option) => (
                  <label key={option} className="flex items-center gap-2 py-1 text-xs">
                    <Checkbox
                      checked={filterSelections[field.key]?.has(option)}
                      onCheckedChange={() => toggleFilterSelection(field.key, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                {filterOptionsByField[field.key]?.length === 0 && (
                  <p className="text-xs text-gray-500">No values</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[85%]">
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
                          ) : row.isEmpty ? (
                            ''
                          ) : (
                            <CompositeStockDisplay value={row[column.key]} />
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

          <div className="xl:w-[15%] self-start">
            <div className="border border-gray-300 bg-white p-0">
              <div className="h-9 border-b border-gray-300 bg-yellow-300 text-xs font-semibold text-slate-900 flex items-center justify-center">
                ORDER PICK LIST
              </div>
              {rowsToRender.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                  No incoming orders yet.
                </div>
              ) : (
                <div className="grid gap-0">
                  {rowsToRender.map((row, index) => {
                    const product = filteredProducts[index];
                    return (
                      <div
                        key={`${row.id}-order`}
                        className="flex items-center border-b border-gray-200 px-2 text-xs text-slate-900 h-9"
                      >
                        {product?.sku || ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        onQuickEnroll={() => {
          console.log('Quick enroll clicked');
        }}
        onJobCreated={(data) => {
          console.log('Job created:', data);
        }}
      />
    </div>
  );
}
