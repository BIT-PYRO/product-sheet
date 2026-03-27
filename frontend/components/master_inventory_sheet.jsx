'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
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
import LastUpdatedFooter from '@/components/last-updated-footer';

// Component to render composite WIP/Current Stock values
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

const INVENTORY_SYNC_KEY = 'inventory_sheet_updated_at';
const INVENTORY_SYNC_EVENT = 'inventory_sheet_sync';

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
  { key: 'dieNumbers', label: 'Die Number / Findings' },
  { key: 'dieLocation', label: 'Location' },
];

// Maps frontend row field -> backend stage key stored in InventoryTransaction.stage
const STOCK_STAGE_MAP = {
  waxPiece:       'wax_piece',
  waxSetting:     'wax_setting',
  casting:        'casting',
  filling:        'filling',
  prePolish:      'pre_polish',
  setting:        'setting',
  finalPolish:    'final_polish',
  readyForPlating:'ready_for_plating',
  finalStockValue:'final_stock',
};

// Human-readable label for each stage (used in remark)
const STOCK_FIELDS_MAP = {
  waxPiece:       'Wax Piece',
  waxSetting:     'Wax Setting',
  casting:        'Casting',
  filling:        'Filling',
  prePolish:      'Pre Polish',
  setting:        'Setting',
  finalPolish:    'Final Polish',
  readyForPlating:'Ready for Plating',
  finalStockValue:'Final Stock',
};

const NON_EDITABLE_KEYS = new Set(['__select__', 'sku', 'finalStockSku']);

const STOCK_FILTER_OPTIONS = [
  { value: 'min', label: 'Minimum Suggested' },
  { value: 'current', label: 'Current Stock' },
  { value: 'wip', label: 'WIP' },
  { value: 'location', label: 'Location' },
  { value: 'wip-vs-current', label: 'WIP/Current Stock' },
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

  // Handle WIP/Current Stock special case
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
  const dieNumbersRaw = Array.isArray(product?.dieNumberFindings) ? product.dieNumberFindings : [];

  // Build a compact summary: "D: 1234 | F: clasp" and collect all locations
  const dieParts = dieNumbersRaw
    .filter((item) => String(item?.value || '').trim())
    .map((item) => {
      const prefix = String(item?.type || '') === 'findings' ? 'F' : 'D';
      return `${prefix}: ${item.value}${item.quantity ? ` ×${item.quantity}` : ''}`;
    });

  const locationParts = dieNumbersRaw
    .filter((item) => String(item?.location || '').trim())
    .map((item) => {
      const prefix = String(item?.type || '') === 'findings' ? 'F' : 'D';
      return `${prefix}: ${item.location}`;
    });

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
    dieNumbers: dieParts.join(' | '),
    dieLocation: locationParts.join(' | '),
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
  const picklistFileInputRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploadingPicklist, setIsUploadingPicklist] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [products, setProducts] = useState([]);
  const [picklists, setPicklists] = useState([]);
  const [selectedPicklist, setSelectedPicklist] = useState(null);
  const [isPicklistDropdownOpen, setIsPicklistDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [stockField, setStockField] = useState('current');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [backendMode, setBackendMode] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState(new Map()); // productId -> {field: value}
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [deletingRows, setDeletingRows] = useState(new Set());
  const [isEditFieldTypeDialogOpen, setIsEditFieldTypeDialogOpen] = useState(false);
  const [editFieldType, setEditFieldType] = useState('current');
  const [pendingEditFieldType, setPendingEditFieldType] = useState('current');

  const readJsonSafe = useCallback(async (response) => {
    if (!response) return null;
    if (response.status === 204 || response.status === 205) return null;

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      await response.text().catch(() => '');
      return null;
    }

    return response.json().catch(() => null);
  }, []);

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

      const inventoryResult = await readJsonSafe(inventoryResponse);
      const groupsResult = await readJsonSafe(groupsResponse);

      // Always load picklists regardless of whether inventory-summary succeeds.
      const localPicklists = loadPicklistsFromStorage();
      const backendPicklists = Array.isArray(groupsResult?.picklists)
        ? groupsResult.picklists
        : (Array.isArray(groupsResult?.data) ? groupsResult.data : []);

      if (backendPicklists.length === 0) {
        setPicklists(localPicklists);
      } else {
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
      }

      if (!inventoryResponse.ok || !inventoryResult?.success) {
        const message =
          inventoryResult?.message ||
          inventoryResult?.error?.message ||
          'Failed to fetch inventory data';
        setError(message);
        setProducts([]);
        return;
      }

      const nextProducts = Array.isArray(inventoryResult.products) ? inventoryResult.products : [];
      setProducts(nextProducts);
      setLastUpdated(new Date());

    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load inventory data');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [readJsonSafe]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setCurrentUsername(data.user.id);
        }
      })
      .catch(() => {});
  }, []);

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
      if (event.key === INVENTORY_SYNC_KEY) {
        loadProducts();
      }
    };

    const handleSameTabSync = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener(INVENTORY_SYNC_EVENT, handleSameTabSync);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener(INVENTORY_SYNC_EVENT, handleSameTabSync);
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

    // When a picklist is selected, drive rows from the picklist items themselves.
    // For any item whose SKU matches a product in the DB we use full product data;
    // for items with no matching product we synthesise a minimal row so they still appear.
    if (selectedPicklist) {
      const currentPicklist = picklists.find((p) => p.id === selectedPicklist);
      const items = currentPicklist?.items || [];

      if (items.length > 0) {
        const productBySku = new Map(
          products.map((p) => [String(p.sku || p.masterSku || '').trim().toUpperCase(), p])
        );

        return items.map((item) => {
          const sku = String(item.sku || '').trim().toUpperCase();
          const existing = productBySku.get(sku);
          if (existing) return existing;
          // Picklist item with no matching product in DB — show row with SKU only
          return {
            id: `pl-${sku}`,
            sku,
            masterSku: sku,
            listingName: item.listingName || sku,
            totalInDemand: 0,
            liveStock: {},
            finalStock: [],
            dieNumberFindings: [],
          };
        });
      }
    }

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
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageRows = inventoryRows.slice(start, end);
    const minRows = 16;
    if (pageRows.length >= minRows) return pageRows;
    const emptyRows = Array.from({ length: minRows - pageRows.length }, (_, i) => ({
      id: `empty-${i}`,
      isEmpty: true,
    }));
    return [...pageRows, ...emptyRows];
  }, [inventoryRows, currentPage, rowsPerPage]);

  const totalInventoryPages = Math.max(1, Math.ceil(inventoryRows.length / rowsPerPage));
  const safeInventoryPage = Math.min(currentPage, totalInventoryPages);

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

  const handlePicklistUploadClick = () => {
    picklistFileInputRef.current?.click();
  };

  const handlePicklistFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploadingPicklist(true);
    setError('');

    try {
      const syncTimestamp = Date.now().toString();
      const uploadedAt = new Date();

      let plannedPicklistNumber = 1;
      try {
        const existingPicklists = JSON.parse(localStorage.getItem(PSD_PICKLISTS_KEY) || '[]');
        plannedPicklistNumber =
          existingPicklists.length > 0
            ? Math.max(...existingPicklists.map((picklist) => picklist.number || 0)) + 1
            : 1;
      } catch {
        plannedPicklistNumber = 1;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('picklistGroupId', `picklist-${syncTimestamp}`);
      formData.append('picklistNumber', String(plannedPicklistNumber));
      formData.append('uploadedBy', currentUsername || '');
      formData.append('uploadedAt', uploadedAt.toISOString());
      formData.append('picklistName', file.name);

      const response = await fetch('/api/picklist-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to upload picklist');
      }

      localStorage.setItem(INVENTORY_SYNC_KEY, syncTimestamp);

      try {
        const existingPicklists = JSON.parse(localStorage.getItem(PSD_PICKLISTS_KEY) || '[]');
        const parsedItems = Array.isArray(result.picklistItems) ? result.picklistItems : [];
        const backendGroup = result?.picklistGroup || {};
        const newPicklist = {
          id: backendGroup.id || `picklist-${syncTimestamp}`,
          number: backendGroup.number || plannedPicklistNumber,
          name: backendGroup.name || file.name,
          date: backendGroup.date || uploadedAt.toISOString(),
          dateFormatted: backendGroup.dateFormatted || uploadedAt.toLocaleString(),
          uploadedBy: backendGroup.uploadedBy || currentUsername || 'Unknown',
          items: parsedItems,
        };
        const updated = [newPicklist, ...existingPicklists].slice(0, 20);
        localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage write failures.
      }

      window.dispatchEvent(
        new CustomEvent(INVENTORY_SYNC_EVENT, {
          detail: { updatedAt: syncTimestamp },
        })
      );

      await loadProducts();
    } catch (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
    } finally {
      setIsUploadingPicklist(false);
    }
  };

  const handleEnterEditMode = useCallback((fieldType = 'current') => {
    setEditFieldType(fieldType);
    const draft = new Map();

    if (fieldType === 'wip-vs-current') {
      // Initialize draft with both wip and current values for each stage column
      sortedProducts.forEach((p) => {
        const wipRow = buildInventoryRow(p, 'wip');
        const currRow = buildInventoryRow(p, 'current');
        const entry = {};
        for (const field of Object.keys(STOCK_STAGE_MAP)) {
          entry[`${field}_wip`] = String(parseNumericValue(wipRow[field]) || '');
          entry[`${field}_current`] = String(parseNumericValue(currRow[field]) || '');
        }
        draft.set(p.id, entry);
      });
    } else if (fieldType === 'location') {
      // Only dieLocation is editable; also carry dieNumbers to preserve it on save
      sortedProducts.forEach((p) => {
        const row = buildInventoryRow(p, 'current');
        draft.set(p.id, {
          dieLocation: row.dieLocation || '',
          dieNumbers: row.dieNumbers || '',
        });
      });
    } else {
      // min, current, wip — all stage columns + dieNumbers/dieLocation editable
      const rows = sortedProducts.map((p) => buildInventoryRow(p, fieldType));
      rows.forEach((row) => {
        if (row.isEmpty) return;
        draft.set(row.id, {
          waxPiece: String(parseNumericValue(row.waxPiece) || ''),
          waxSetting: String(parseNumericValue(row.waxSetting) || ''),
          casting: String(parseNumericValue(row.casting) || ''),
          filling: String(parseNumericValue(row.filling) || ''),
          prePolish: String(parseNumericValue(row.prePolish) || ''),
          setting: String(parseNumericValue(row.setting) || ''),
          finalPolish: String(parseNumericValue(row.finalPolish) || ''),
          readyForPlating: String(parseNumericValue(row.readyForPlating) || ''),
          finalStockValue: String(parseNumericValue(row.finalStockValue) || ''),
          dieNumbers: row.dieNumbers || '',
          dieLocation: row.dieLocation || '',
        });
      });
    }

    setEditDraft(draft);
    setIsEditMode(true);
  }, [sortedProducts]);

  const handleCancelEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditDraft(new Map());
  }, []);

  const handleEditFieldChange = useCallback((productId, field, value) => {
    setEditDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) || {};
      next.set(productId, { ...current, [field]: value });
      return next;
    });
  }, []);

  const handleSaveAll = useCallback(async () => {
    setIsSavingAll(true);
    setError('');
    try {
      const allCalls = [];

      if (editFieldType === 'wip-vs-current') {
        // Save both WIP and Current changes simultaneously
        for (const [productId, editData] of editDraft.entries()) {
          const product = sortedProducts.find((p) => p.id === productId);
          if (!product) continue;
          const wipRow = buildInventoryRow(product, 'wip');
          const currRow = buildInventoryRow(product, 'current');

          for (const [field, stageName] of Object.entries(STOCK_FIELDS_MAP)) {
            const wipNew = parseFloat(editData[`${field}_wip`]) || 0;
            const wipOld = parseNumericValue(wipRow[field]);
            const wipDelta = Math.round(wipNew - wipOld);
            if (wipDelta !== 0) {
              allCalls.push(fetch('/api/inventory/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: productId, txn_type: 'adjust', quantity: wipDelta, stage: STOCK_STAGE_MAP[field], stock_type: 'wip', remark: `Stage: ${stageName} (WIP)` }),
              }));
            }
            const currNew = parseFloat(editData[`${field}_current`]) || 0;
            const currOld = parseNumericValue(currRow[field]);
            const currDelta = Math.round(currNew - currOld);
            if (currDelta !== 0) {
              allCalls.push(fetch('/api/inventory/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: productId, txn_type: 'adjust', quantity: currDelta, stage: STOCK_STAGE_MAP[field], stock_type: 'current', remark: `Stage: ${stageName} (Current)` }),
              }));
            }
          }
        }
      } else if (editFieldType === 'location') {
        // Only update die_numbers location field on the product
        const originalRows = sortedProducts.map((p) => buildInventoryRow(p, 'current'));
        for (const [productId, editData] of editDraft.entries()) {
          const originalRow = originalRows.find((r) => r.id === productId);
          if (!originalRow) continue;
          if (editData.dieLocation !== originalRow.dieLocation) {
            const product = sortedProducts.find((p) => p.id === productId);
            const dieNumbersRaw = Array.isArray(product?.dieNumberFindings) ? product.dieNumberFindings : [];
            // Preserve existing die/findings entries, update only location
            const dieEntry = dieNumbersRaw.length > 0
              ? dieNumbersRaw.map((item) => ({ ...item, location: editData.dieLocation.trim() }))
              : (editData.dieNumbers?.trim()
                ? [{ value: editData.dieNumbers.trim(), quantity: '', location: editData.dieLocation.trim() }]
                : []);
            allCalls.push(fetch(`/api/products/${productId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ die_numbers: dieEntry }),
            }));
          }
        }
      } else {
        // min / current / wip — compute deltas against the same field type's saved values
        const baseRows = sortedProducts.map((p) => buildInventoryRow(p, editFieldType));
        for (const [productId, editData] of editDraft.entries()) {
          const originalRow = baseRows.find((r) => r.id === productId);
          if (!originalRow) continue;

          for (const [field, stageName] of Object.entries(STOCK_FIELDS_MAP)) {
            const newVal = parseFloat(editData[field]) || 0;
            const oldVal = parseNumericValue(originalRow[field]);
            const delta = Math.round(newVal - oldVal);
            if (delta !== 0) {
              allCalls.push(fetch('/api/inventory/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  product: productId,
                  txn_type: 'adjust',
                  quantity: delta,
                  stage: STOCK_STAGE_MAP[field],
                  stock_type: editFieldType,
                  remark: `Stage: ${stageName}`,
                }),
              }));
            }
          }

          if (
            editData.dieNumbers !== originalRow.dieNumbers ||
            editData.dieLocation !== originalRow.dieLocation
          ) {
            const dieEntry = editData.dieNumbers.trim()
              ? [{ value: editData.dieNumbers.trim(), quantity: '', location: editData.dieLocation.trim() }]
              : [];
            allCalls.push(fetch(`/api/products/${productId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ die_numbers: dieEntry }),
            }));
          }
        }
      }

      if (allCalls.length > 0) {
        const results = await Promise.all(allCalls);
        const failed = results.find((r) => !r.ok);
        if (failed) {
          const err = await failed.json().catch(() => ({}));
          throw new Error(err?.message || 'Save failed');
        }
      }

      setIsEditMode(false);
      setEditDraft(new Map());
      await loadProducts();
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSavingAll(false);
    }
  }, [editDraft, editFieldType, sortedProducts, loadProducts]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.size === 0) return;
    const count = selectedRows.size;
    if (!window.confirm(`Delete ${count} selected product${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = [...selectedRows];
    ids.forEach((id) => setDeletingRows((prev) => new Set(prev).add(id)));
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/products/${id}/`, { method: 'DELETE' }))
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const err = await failed.json().catch(() => ({}));
        throw new Error(err?.message || 'Delete failed');
      }
      setSelectedRows(new Set());
      await loadProducts();
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingRows(new Set());
    }
  }, [selectedRows, loadProducts]);

  return (
    <div className="w-full min-h-screen bg-cloud-gray">
      {/* ── Edit Field Type Selection Dialog ── */}
      <Dialog open={isEditFieldTypeDialogOpen} onOpenChange={setIsEditFieldTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Field to Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-cool-gray">Choose which stock view you want to edit for all rows:</p>
            {STOCK_FILTER_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-cloud-gray">
                <input
                  type="radio"
                  name="editFieldType"
                  value={option.value}
                  checked={pendingEditFieldType === option.value}
                  onChange={() => setPendingEditFieldType(option.value)}
                  className="accent-trust-blue w-4 h-4"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditFieldTypeDialogOpen(false)} className="rounded-full px-4 text-sm h-8">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsEditFieldTypeDialogOpen(false);
                handleEnterEditMode(pendingEditFieldType);
              }}
              className="bg-trust-blue text-white rounded-full px-4 text-sm h-8 hover:bg-trust-blue/90"
            >
              Start Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="pt-16 px-3 md:px-4 pb-16">
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
              onClick={loadProducts}
              disabled={isEditMode}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8 disabled:opacity-40"
            >
              Refresh
            </Button>
            <Button
              onClick={handlePicklistUploadClick}
              disabled={isUploadingPicklist || isEditMode}
              className="bg-midnight-ink text-white rounded-full px-4 text-sm h-8 hover:bg-midnight-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingPicklist ? 'Uploading...' : 'Bulk Upload'}
            </Button>
            {/* Edit / Save / Cancel */}
            {isEditMode ? (
              <>
                <span className="text-xs text-cool-gray self-center hidden sm:inline">
                  Editing: <strong>{STOCK_FILTER_OPTIONS.find(o => o.value === editFieldType)?.label}</strong>
                </span>
                <Button
                  onClick={handleSaveAll}
                  disabled={isSavingAll}
                  className="bg-success hover:bg-success/90 text-white rounded-full px-4 text-sm h-8 disabled:opacity-50"
                >
                  {isSavingAll ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleCancelEditMode}
                  disabled={isSavingAll}
                  variant="outline"
                  className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => { setPendingEditFieldType('current'); setIsEditFieldTypeDialogOpen(true); }}
                variant="outline"
                className="border-trust-blue text-trust-blue rounded-full px-4 text-sm h-8 hover:bg-trust-blue/10"
              >
                Edit
              </Button>
            )}
            {/* Delete — available whenever rows are selected */}
            {selectedRows.size > 0 && !isEditMode && (
              <Button
                onClick={handleDeleteSelected}
                disabled={deletingRows.size > 0}
                variant="outline"
                className="border-[#f59e0b] text-[#f59e0b] rounded-full px-4 text-sm h-8 hover:bg-amber-50 disabled:opacity-50"
              >
                {deletingRows.size > 0 ? 'Deleting...' : `Delete${selectedRows.size > 1 ? ` (${selectedRows.size})` : ''}`}
              </Button>
            )}
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" onClick={() => setIsManageColumnsOpen(true)}>
              Manage Columns
            </Button>
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" onClick={handleExport}>Export</Button>
            <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" onClick={() => window.print()}>Print</Button>
            <input
              ref={picklistFileInputRef}
              type="file"
              accept="*/*"
              onChange={handlePicklistFileChange}
              className="hidden"
            />
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

        {/* Single unified table — all three sections share the same <tr> so rows are always pixel-perfect aligned.
            Spacer columns (w-3, no border) create the visual gap that makes the sections look separate. */}
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0 text-sm" style={{ minWidth: '1400px' }}>
            <thead>
              <tr>
                {/* ── Main inventory columns ── */}
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

                {/* ── Gap spacer ── */}
                <th className="border-0 p-0" style={{ width: '32px', minWidth: '32px', position: 'sticky', right: '292px', backgroundColor: 'white', zIndex: 22 }} aria-hidden="true" />

                {/* ── TOTAL IN DEMAND ── */}
                <th className="border-t border-b border-l border-r border-soft-border px-2 h-10 whitespace-nowrap text-center text-xs font-semibold text-black bg-[#dbeafe]" style={{ minWidth: '100px', position: 'sticky', right: '192px', zIndex: 22, boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.10)' }}>
                  TOTAL IN DEMAND
                </th>

                {/* ── Gap spacer ── */}
                <th className="border-0 p-0" style={{ width: '32px', minWidth: '32px', position: 'sticky', right: '160px', backgroundColor: 'white', zIndex: 22 }} aria-hidden="true" />

                {/* ── ORDER PICK LIST (with dropdown) ── */}
                <th className="border-t border-b border-l border-r border-soft-border px-2 h-10 text-xs font-semibold text-black bg-[#dbeafe] relative" style={{ minWidth: '160px', position: 'sticky', right: '0', zIndex: 22 }}>
                  <div className="relative">
                    <button
                      onClick={() => setIsPicklistDropdownOpen(!isPicklistDropdownOpen)}
                      className="w-full text-left px-1 rounded hover:bg-trust-blue/10 transition-colors whitespace-nowrap leading-tight text-[11px] tracking-wide"
                    >
                      {selectedPicklistData
                        ? `${selectedPicklistData.number ? `#${selectedPicklistData.number} — ` : ''}${selectedPicklistData.name}`
                        : 'ORDER PICK LIST'}
                    </button>
                    {isPicklistDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-0 bg-white border border-soft-border rounded shadow-lg z-30 max-h-48 overflow-y-auto">
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
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsToRender.map((row, index) => {
                const isRowEditing = isEditMode && !row.isEmpty && editDraft.has(row.id);
                const editData = editDraft.get(row.id);
                const isDeleting = deletingRows.has(row.id);

                return (
                <tr key={row.id} className={isDeleting ? 'opacity-40 pointer-events-none' : ''}>
                  {/* ── Main inventory cells ── */}
                  {visibleColumnList.map((column) => (
                    <td
                      key={`${row.id}-${column.key}`}
                      className={`border-b border-r border-soft-border px-2 h-9 text-center ${
                        column.key === '__select__' ? 'sticky left-0 z-10 bg-white border-l shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]' : ''
                      } ${isEditMode && !row.isEmpty && !NON_EDITABLE_KEYS.has(column.key) && (() => {
                        if (editFieldType === 'location') return column.key === 'dieLocation';
                        if (editFieldType === 'wip-vs-current') return STOCK_STAGE_MAP[column.key] !== undefined;
                        return STOCK_STAGE_MAP[column.key] !== undefined || column.key === 'finalStockValue' || column.key === 'dieNumbers' || column.key === 'dieLocation';
                      })() ? 'bg-blue-50/40' : ''}`}
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
                  ) : isRowEditing ? (
                    (() => {
                      const isStockCol = STOCK_STAGE_MAP[column.key] !== undefined;

                      // Location mode: only dieLocation is editable
                      if (editFieldType === 'location') {
                        if (column.key === 'dieLocation') {
                          return (
                            <input
                              type="text"
                              value={editData?.dieLocation ?? ''}
                              onChange={(e) => handleEditFieldChange(row.id, 'dieLocation', e.target.value)}
                              className="w-full min-w-[80px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                            />
                          );
                        }
                        return <CompositeStockDisplay value={row[column.key]} />;
                      }

                      // WIP vs Current mode: two stacked inputs per stock column
                      if (editFieldType === 'wip-vs-current' && isStockCol) {
                        return (
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="number"
                              value={editData?.[`${column.key}_wip`] ?? ''}
                              min="0"
                              onChange={(e) => handleEditFieldChange(row.id, `${column.key}_wip`, e.target.value)}
                              className="w-full min-w-[56px] border border-trust-blue/50 rounded px-1 py-0.5 text-[11px] text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                              placeholder="WIP"
                            />
                            <input
                              type="number"
                              value={editData?.[`${column.key}_current`] ?? ''}
                              min="0"
                              onChange={(e) => handleEditFieldChange(row.id, `${column.key}_current`, e.target.value)}
                              className="w-full min-w-[56px] border border-success/50 rounded px-1 py-0.5 text-[11px] text-center bg-green-50 focus:outline-none focus:ring-1 focus:ring-success"
                              placeholder="Cur"
                            />
                          </div>
                        );
                      }

                      // min / current / wip: numeric inputs for stock columns
                      if (isStockCol || column.key === 'finalStockValue') {
                        return (
                          <input
                            type="number"
                            value={editData?.[column.key] ?? ''}
                            min="0"
                            onChange={(e) => handleEditFieldChange(row.id, column.key, e.target.value)}
                            className="w-full min-w-[60px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                          />
                        );
                      }

                      // dieNumbers / dieLocation: text input (only in non-location modes)
                      if (column.key === 'dieNumbers' || column.key === 'dieLocation') {
                        return (
                          <input
                            type="text"
                            value={editData?.[column.key] ?? ''}
                            onChange={(e) => handleEditFieldChange(row.id, column.key, e.target.value)}
                            className="w-full min-w-[80px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                          />
                        );
                      }

                      return <CompositeStockDisplay value={row[column.key]} />;
                    })()
                  ) : (
                    <CompositeStockDisplay value={row[column.key]} />
                  )}
                    </td>
                  ))}

                  {/* ── Gap spacer ── */}
                  <td className="border-0 p-0" style={{ width: '32px', minWidth: '32px', position: 'sticky', right: '292px', backgroundColor: 'white', zIndex: 12 }} aria-hidden="true" />

                  {/* ── TOTAL IN DEMAND cell ── */}
                  <td className="border-b border-l border-r border-soft-border px-2 h-9 text-center text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '192px', zIndex: 12, boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.10)' }}>
                    {row.isEmpty ? '' : (totalInDemandByRowId.get(row.id) ?? '')}
                  </td>

                  {/* ── Gap spacer ── */}
                  <td className="border-0 p-0" style={{ width: '32px', minWidth: '32px', position: 'sticky', right: '160px', backgroundColor: 'white', zIndex: 12 }} aria-hidden="true" />

                  {/* ── ORDER PICK LIST cell ── */}
                  <td className="border-b border-l border-r border-soft-border px-2 h-9 text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '0', zIndex: 12 }}>
                    {row.isEmpty ? '' : (sortedProducts[index]?.sku || '')}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && <p className="mt-2 text-sm text-cool-gray">Loading live stock data...</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {!isLoading && !error && filteredProducts.length === 0 && (
          <p className="mt-2 text-sm text-cool-gray">No inventory data found.</p>
        )}

      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-soft-border shadow-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm text-cool-gray">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-soft-border rounded px-2 py-1 text-sm text-midnight-ink bg-white"
          >
            {[25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{inventoryRows.length === 0 ? '0' : `${(safeInventoryPage - 1) * rowsPerPage + 1}-${Math.min(safeInventoryPage * rowsPerPage, inventoryRows.length)}`} of {inventoryRows.length}</span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeInventoryPage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safeInventoryPage} / {totalInventoryPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalInventoryPages, p + 1))} disabled={safeInventoryPage >= totalInventoryPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
      </div>

    </div>
  );
}
