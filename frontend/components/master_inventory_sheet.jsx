'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
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
import DateTimeStamp from '@/components/date-time-stamp';

// Component to render composite WIP vs Current Stock values
function CompositeStockDisplay({ value }) {
  if (!value?.isComposite) {
    return <span>{value}</span>;
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <span className="text-trust-blue font-medium">{value.wip || '-'}</span>
      <span className="text-cool-gray">/</span>
      <span className="text-success font-medium">{value.current || '-'}</span>
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

function parseNumericValue(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'object') {
    if (value.isComposite) {
      const current = parseNumericValue(value.current);
      if (current > 0) {
        return current;
      }
      return parseNumericValue(value.wip);
    }
    return 0;
  }

  const matches = String(value)
    .match(/-?\d+(?:\.\d+)?/g);

  if (!matches) {
    return 0;
  }

  return matches.reduce((sum, entry) => sum + (Number.parseFloat(entry) || 0), 0);
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
    totalInDemand: product.totalInDemand || 0,
    waxPiece: getLiveStockValue(liveStock, stockField, ['rawMaterial', 'waxPiece']),
    waxSetting: getLiveStockValue(liveStock, stockField, ['rawSetting', 'waxSetting']),
    casting: getLiveStockValue(liveStock, stockField, ['wipLiquidCasting', 'casting', 'tyre', 'postCasting', 'finalCasting', 'dustunuing']),
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

const PSD_PICKLISTS_KEY = 'psd_picklists';

const PICKLIST_SKU_RE = /^(?=.*\d)(?=.*\/)[A-Z][A-Z0-9]{1,24}\/[A-Z0-9]{1,4}$/i;

function isValidPicklistSku(value) {
  return PICKLIST_SKU_RE.test(String(value || '').trim().toUpperCase());
}

function loadPicklistsFromStorage() {
  try {
    const raw = localStorage.getItem(PSD_PICKLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const totalPicklists = parsed.length;
    const sanitized = parsed
      .map((picklist, index) => {
        const normalizedItems = Array.isArray(picklist?.items)
          ? picklist.items.filter((item) => isValidPicklistSku(item?.sku))
          : [];

        return {
          ...picklist,
          number: picklist?.number || (totalPicklists - index),
          uploadedBy: picklist?.uploadedBy || 'Unknown',
          date: picklist?.date || picklist?.createdAt || new Date().toISOString(),
          dateFormatted:
            picklist?.dateFormatted ||
            new Date(picklist?.date || picklist?.createdAt || Date.now()).toLocaleString(),
          items: normalizedItems,
        };
      });

    if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
      localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch {
    return [];
  }
}


export default function MasterInventorySheet() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [picklists, setPicklists] = useState([]);
  const [selectedPicklist, setSelectedPicklist] = useState(null);
  const [isPicklistDropdownOpen, setIsPicklistDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [stockField, setStockField] = useState('min');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [backendMode, setBackendMode] = useState('');
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
      const [inventoryResponse, groupsResponse] = await Promise.all([
        fetch('/api/inventory-summary', {
          method: 'GET',
          cache: 'no-store',
        }),
        fetch('/api/picklist-groups', {
          method: 'GET',
          cache: 'no-store',
        }),
      ]);

      const inventoryResult = await inventoryResponse.json();
      const groupsResult = await groupsResponse.json().catch(() => null);

      if (!inventoryResponse.ok || !inventoryResult.success) {
        throw new Error(inventoryResult.message || 'Failed to fetch inventory data');
      }

      const nextProducts = Array.isArray(inventoryResult.products) ? inventoryResult.products : [];
      setProducts(nextProducts);

      const localPicklists = loadPicklistsFromStorage();
      const backendPicklists = Array.isArray(groupsResult?.picklists) ? groupsResult.picklists : [];

      if (backendPicklists.length === 0) {
        setPicklists(localPicklists);
        return;
      }

      // Merge backend + local, backend takes precedence for same IDs.
      const merged = new Map();
      backendPicklists.forEach((picklist) => {
        merged.set(String(picklist?.id || ''), picklist);
      });
      localPicklists.forEach((picklist) => {
        const id = String(picklist?.id || '');
        if (!merged.has(id)) {
          merged.set(id, picklist);
        }
      });
      setPicklists(Array.from(merged.values()));

    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load inventory data');
      setProducts([]);
      setPicklists([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetch('/api/backend-info', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.backendMode) {
          setBackendMode(String(data.backendMode));
        }
      })
      .catch(() => {});
  }, []);

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
      // Filter by picklist if one is selected
      if (selectedPicklist) {
        const currentPicklist = picklists.find((p) => p.id === selectedPicklist);
        const productSku = String(product.sku || product.masterSku || '').trim().toUpperCase();
        const picklistSkus = new Set(
          (currentPicklist?.items || []).map((item) => String(item.sku || '').trim().toUpperCase())
        );
        if (currentPicklist && picklistSkus.size > 0 && !picklistSkus.has(productSku)) {
          return false;
        }
      }

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
  }, [effectiveSearch, filterSelections, products, selectedSku, selectedPicklist, picklists]);

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

  const selectedPicklistData = useMemo(
    () => picklists.find((picklist) => picklist.id === selectedPicklist) || null,
    [picklists, selectedPicklist]
  );

  // Build a SKU → needed-qty map from the selected picklist (localStorage).
  // When no picklist is selected this map is empty and the DB-derived
  // totalInDemand from each inventory row is used instead.
  const picklistNeededBySku = useMemo(() => {
    const map = new Map();
    if (!selectedPicklist) return map;

    (selectedPicklistData?.items || []).forEach((item) => {
      // Normalize to uppercase so lookup matches regardless of DB casing.
      const sku = String(item.sku || '').trim().toUpperCase();
      if (!sku) {
        return;
      }

      const needed = parseNumericValue(item.needed || 0);
      map.set(sku, (map.get(sku) || 0) + needed);
    });

    return map;
  }, [selectedPicklist, selectedPicklistData]);

  const totalInDemandByRowId = useMemo(() => {
    const map = new Map();

    inventoryRows.forEach((row) => {
      // Normalize to uppercase to match picklistNeededBySku keys.
      const sku = String(row?.sku || '').trim().toUpperCase();
      if (!sku) {
        map.set(row.id, '');
        return;
      }

      // When a picklist is selected → show that picklist's needed qty.
      // Otherwise → show the total demand from the DB (all demand transactions).
      const demandValue = selectedPicklistData
        ? (picklistNeededBySku.get(sku) ?? '')
        : (row.totalInDemand || '');

      map.set(row.id, demandValue);
    });

    return map;
  }, [inventoryRows, picklistNeededBySku, selectedPicklistData]);

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

  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === visibleColumnList.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(visibleColumnList.map(col => col.key)));
    }
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
    <div className="w-full min-h-screen bg-cloud-gray">
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {/* Select All Checkbox */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id="select-all-columns"
                  checked={selectedColumnsForAction.size === visibleColumnList.length && visibleColumnList.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
            {INVENTORY_COLUMNS.filter((column) => column.key !== '__select__').map((column) => (
              <div key={column.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={column.key}
                    checked={selectedColumnsForAction.has(column.key)}
                    onCheckedChange={() => toggleColumnSelection(column.key)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={column.key} className="text-sm cursor-pointer">
                    {column.label}
                  </label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.key) ? (
                    <span className="bg-danger/10 text-danger-dark px-2 py-1 rounded-full text-sm">Hidden</span>
                  ) : (
                    <span className="bg-success/10 text-success-dark px-2 py-1 rounded-full text-sm">Visible</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleHideColumns}
              disabled={selectedColumnsForAction.size === 0}
              variant="outline"
              className="text-danger border-danger/40 hover:bg-danger/10"
            >
              Hide
            </Button>
            <Button
              onClick={handleShowColumns}
              disabled={selectedColumnsForAction.size === 0}
              variant="outline"
              className="text-success border-green-300 hover:bg-success/10"
            >
              Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pt-16 px-3 md:px-4 pb-3 md:pb-4">
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER INVENTORY SHEET</h1>
            </div>
            <GlobalSearchBar />
            <div className="flex items-center gap-2">
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
              <DateTimeStamp />
            </div>
          </div>
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
                  className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-md border border-soft-border bg-white shadow-lg"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {skuSearchOptions.map((option) => {
                    const label = skuLabelBySku.get(option.sku) || option.sku;
                    return (
                      <button
                        key={option.sku}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-cloud-gray"
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
                className="w-full h-10 rounded-md border border-soft-border px-3 text-sm bg-white"
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
              className="bg-success hover:bg-success/90 rounded-full px-6"
              onClick={() => setIsCreateJobModalOpen(true)}
            >
              Create a Job
            </Button>
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6" onClick={() => setIsManageColumnsOpen(true)}>
              Manage Columns
            </Button>
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6" onClick={handleExport}>Export</Button>
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6" onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <div className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_FIELDS.map((field) => (
            <DropdownMenu key={field.key}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded bg-white text-midnight-ink border-trust-blue/40"
                >
                  <span>
                    {field.label}
                    {filterSelections[field.key]?.size > 0
                      ? ` (${filterSelections[field.key].size})`
                      : ''}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Select {field.label}</span>
                  <button
                    type="button"
                    onClick={() => clearFilterSelection(field.key)}
                    className="text-sm text-trust-blue hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {(filterOptionsByField[field.key] || []).map((option) => (
                  <label key={option} className="flex items-center gap-2 py-1 text-sm">
                    <Checkbox
                      checked={filterSelections[field.key]?.has(option)}
                      onCheckedChange={() => toggleFilterSelection(field.key, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                {filterOptionsByField[field.key]?.length === 0 && (
                  <p className="text-sm text-cool-gray">No values</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[75%]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {visibleColumnList.map((column) => (
                      <th
                        key={column.key}
                        className={`border-t border-b border-r border-soft-border px-2 h-10 whitespace-nowrap text-center text-xs font-semibold text-black ${
                          column.key === '__select__' ? 'sticky left-0 z-20 border-l bg-[#dbeafe]' : 'bg-[#dbeafe]'
                        }`}
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
                        <td
                          key={`${row.id}-${column.key}`}
                          className={`border-b border-r border-soft-border px-2 py-2 h-9 text-center ${
                            column.key === '__select__' ? 'sticky left-0 z-10 bg-white border-l shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]' : ''
                          }`}
                        >
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

            {isLoading && <p className="mt-2 text-sm text-cool-gray">Loading live stock data...</p>}
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            {!isLoading && !error && filteredProducts.length === 0 && (
              <p className="mt-2 text-sm text-cool-gray">No inventory data found.</p>
            )}
          </div>

          <div className="xl:w-[10%] self-start relative">
            <div className="border border-soft-border bg-white p-0">
              <div className="h-10 border-b border-soft-border bg-[#dbeafe] text-[11px] font-semibold text-black flex items-center justify-center px-2 tracking-wide text-center whitespace-nowrap">
                TOTAL IN DEMAND
              </div>
              {rowsToRender.length === 0 ? (
                <div className="rounded-md border border-dashed border-soft-border p-3 text-sm text-cool-gray">
                  No demand data.
                </div>
              ) : (
                <div className="grid gap-0">
                  {rowsToRender.map((row) => {
                    const totalDemand = row.isEmpty ? '' : (totalInDemandByRowId.get(row.id) ?? '');
                    return (
                      <div
                        key={`${row.id}-total-demand`}
                        className="flex items-center justify-center border-b border-soft-border px-2 text-sm text-midnight-ink h-9"
                      >
                        {totalDemand}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="xl:w-[15%] self-start relative">
            <div className="border border-soft-border bg-white p-0">
              <div className="h-10 border-b border-soft-border bg-[#dbeafe] text-[11px] font-semibold text-black flex items-center justify-between px-2 relative tracking-wide">
                <div className="flex-1">
                  <div className="relative">
                    <button
                      onClick={() => setIsPicklistDropdownOpen(!isPicklistDropdownOpen)}
                      className="w-full text-left px-2 rounded hover:bg-trust-blue/10 transition-colors whitespace-nowrap leading-tight"
                    >
                      {selectedPicklistData
                        ? `${selectedPicklistData.number ? `#${selectedPicklistData.number} — ` : ''}${selectedPicklistData.name}`
                        : 'ORDER PICK LIST'}
                    </button>
                    {isPicklistDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-0 bg-white border border-soft-border rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedPicklist(null);
                            setIsPicklistDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm border-b border-soft-border hover:bg-trust-blue/10 transition-colors font-semibold ${
                            selectedPicklist === null ? 'bg-trust-blue/10' : ''
                          }`}
                        >
                          <div className="text-deep-blue">ORDER PICK LIST</div>
                          <div className="text-cool-gray text-sm">Show all {products.length} products</div>
                        </button>
                        {picklists.map((picklist) => (
                          <button
                            key={picklist.id}
                            onClick={() => {
                              setSelectedPicklist(picklist.id);
                              setIsPicklistDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm border-b border-soft-border hover:bg-trust-blue/10 transition-colors ${
                              selectedPicklist === picklist.id ? 'bg-trust-blue/10 font-semibold' : ''
                            }`}
                          >
                            <div className="font-medium">
                              {picklist.number ? `#${picklist.number} — ` : ''}{picklist.name}
                            </div>
                            <div className="text-cool-gray text-xs">
                              {picklist.dateFormatted || (picklist.date ? new Date(picklist.date).toLocaleString() : '')}
                              {picklist.uploadedBy ? ` · ${picklist.uploadedBy}` : ''}
                            </div>
                            <div className="text-cool-gray text-xs">
                              {(picklist.items || []).length} parsed item{(picklist.items || []).length !== 1 ? 's' : ''}
                            </div>
                          </button>
                        ))}
                        {picklists.length === 0 && (
                          <div className="px-3 py-2 text-sm text-cool-gray">
                            No uploaded picklists found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {rowsToRender.length === 0 ? (
                <div className="rounded-md border border-dashed border-soft-border p-3 text-sm text-cool-gray">
                  No incoming orders yet.
                </div>
              ) : (
                <div className="grid gap-0">
                  {rowsToRender.map((row, index) => {
                    const product = sortedProducts[index];
                    return (
                      <div
                        key={`${row.id}-order`}
                        className="flex items-center border-b border-soft-border px-2 text-sm text-midnight-ink h-9"
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
