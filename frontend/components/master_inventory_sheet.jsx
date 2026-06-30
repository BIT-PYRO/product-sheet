'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Upload, FileText, Info, Wrench } from 'lucide-react';
import * as XLSX from 'xlsx';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DateTimeStamp from '@/components/date-time-stamp';
import LastUpdatedFooter from '@/components/last-updated-footer';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { CreateJobModal } from '@/components/create-job-modal';
import { PendingVouchersModal } from '@/components/pending-vouchers-modal';
import { SuggestedVouchersModal } from '@/components/suggested-vouchers-modal';
import { NeededVouchersModal } from '@/components/needed-vouchers-modal';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

// Stage keys in liveStock object mapped to their display labels (for alert messages)
const LIVE_STOCK_STAGE_LABELS = [
  ['rawMaterial',      'Wax Piece'],
  ['rawSetting',       'Wax Setting'],
  ['wipLiquidCasting', 'Casting'],
  ['filing',           'Filling'],
  ['packing',          'Pre Polish'],
  ['setting',          'Hand Setting'],
  ['finalPolish',      'Final Polish'],
  ['readyForPlacing',  'Plating'],
];

// Alert badge shown next to Final Stock SKU
function AlertBadge({ alertData, show = 'both' }) {
  if (!alertData) return null;
  const hasRed = alertData.shortage > 0;
  const hasOrange = alertData.lowStages.length > 0;
  // Respect `show` filter: 'orange', 'red', or 'both'
  const showOrange = hasOrange && (show === 'both' || show === 'orange');
  const showRed = hasRed && (show === 'both' || show === 'red');
  if (!showOrange && !showRed) return null;
  const type = showRed ? 'red' : 'orange';

  return (
    <span className="relative group inline-flex items-center ml-1 align-middle">
      <span
        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold cursor-help select-none ${
          type === 'red' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
        }`}
      >
        !
      </span>
      {/* Tooltip — anchored left so it never overflows the left viewport edge */}
      <div
        className="pointer-events-none absolute z-[200] top-full left-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-gray-900 text-white text-[11px] rounded-lg p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal text-left leading-relaxed"
      >
        {showRed && (
          <div className={showOrange ? 'mb-2 pb-2 border-b border-gray-700' : ''}>
            <div className="font-semibold text-red-300 mb-1">Demand Exceeds Final Stock</div>
            <div>Total demand: <span className="font-bold">{alertData.demand}</span> pcs</div>
            <div>Final stock available: <span className="font-bold">{alertData.totalFinalStock}</span> pcs</div>
            <div>Shortage: <span className="font-bold text-red-300">{alertData.shortage}</span> pcs</div>
            <div className="mt-1.5 text-gray-300 text-[10px]">
              <span className="font-bold">Solution:</span> Approve pending or suggested vouchers from the
              Vouchers tab to fast-track manufacturing, or increase the production speed of active batches.
            </div>
          </div>
        )}
        {showOrange && (
          <div>
            <div className="font-semibold text-orange-300 mb-1">Stage Stock Below Minimum</div>
            {alertData.lowStages.map(({ label, current, min }) => (
              <div key={label}>
                {label}: <span className="font-bold">{current}</span> pcs
                &nbsp;(min: <span className="font-bold">{min}</span> pcs,
                short by <span className="font-bold text-orange-300">{min - current}</span>)
              </div>
            ))}
            <div className="mt-1.5 text-gray-300 text-[10px]">
              <span className="font-bold">Solution:</span> Approve suggested vouchers from the Vouchers
              tab to replenish these stages, or speed up active production batches.
            </div>
          </div>
        )}
        {/* Caret arrow — aligned to left edge to match tooltip anchor */}
        <div className="absolute bottom-full left-2 border-4 border-transparent border-b-gray-900" />
      </div>
    </span>
  );
}

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

const INVENTORY_COLUMNS_STATIC_PREFIX = [
  { key: '__select__', label: '' },
  { key: 'sku', label: 'Master SKU' },
];
const INVENTORY_COLUMNS_STATIC_SUFFIX = [
  { key: 'finalStockSku',   label: 'Final Stock SKU' },
  { key: 'finalStockValue', label: 'Final Stock Value' },
  { key: 'finalStockUnit',  label: 'Final Stock Unit' },
  { key: 'dieLocation',     label: 'Stock Location' },
];
const DEFAULT_LIVE_STOCK_COLS = [
  { key: 'waxPiece', label: 'Wax Piece' },
  { key: 'waxSetting', label: 'Wax Setting' },
  { key: 'casting', label: 'Casting' },
  { key: 'filling', label: 'Filling' },
  { key: 'prePolish', label: 'Pre Polish' },
  { key: 'setting', label: 'Hand Setting' },
  { key: 'finalPolish', label: 'Final Polish' },
  { key: 'readyForPlating', label: 'Plating' },
];
// Convert backend key to camelCase frontend key.
// Handles both snake_case stage keys AND liveStock route-level keys stored in TableColumnConfig.
const BACKEND_KEY_TO_FRONTEND = {
  // snake_case stage keys (legacy / direct stage references)
  wax_piece: 'waxPiece', wax_setting: 'waxSetting', casting: 'casting',
  filling: 'filling', pre_polish: 'prePolish', setting: 'setting',
  final_polish: 'finalPolish', ready_for_plating: 'readyForPlating',
  // liveStock route-level keys stored in TableColumnConfig
  rawMaterial: 'waxPiece',
  rawSetting: 'waxSetting',
  wipLiquidCasting: 'casting',
  filing: 'filling',
  packing: 'prePolish',
  readyForPlacing: 'readyForPlating',
};
// Build full INVENTORY_COLUMNS from live_stock dynamic cols
function buildInventoryColumns(lsCols) {
  return [
    ...INVENTORY_COLUMNS_STATIC_PREFIX,
    ...lsCols,
    ...INVENTORY_COLUMNS_STATIC_SUFFIX,
  ];
}
// Legacy static for initial render
const INVENTORY_COLUMNS = buildInventoryColumns(DEFAULT_LIVE_STOCK_COLS);

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
  setting:        'Hand Setting',
  finalPolish:    'Final Polish',
  readyForPlating:'Plating',
  finalStockValue:'Final Stock',
};

const NON_EDITABLE_KEYS = new Set(['__select__', 'sku', 'finalStockSku']);

// Columns that render once per variation row (not spanning)
const VARIATION_COLUMN_KEYS = new Set(['finalStockSku', 'finalStockValue', 'finalStockUnit', 'dieLocation']);

const STOCK_FILTER_OPTIONS = [
  { value: 'min', label: 'Minimum Suggested' },
  { value: 'current', label: 'Current Stock' },
  { value: 'wip', label: 'WIP' },
  { value: 'location', label: 'Location' },
  { value: 'wip-vs-current', label: 'WIP/Current Stock' },
  { value: 'final-stock', label: 'Final Stock Value' },
  { value: 'final-stock-location', label: 'Final SKU Location' },
];

const BULK_UPLOAD_OPTIONS = [
  ...STOCK_FILTER_OPTIONS,
  { value: 'picklist', label: 'Customer Picklist File' },
];

const HEADER_TO_FIELD = {
  waxpiece: 'waxPiece',
  waxsetting: 'waxSetting',
  casting: 'casting',
  filling: 'filling',
  prepolish: 'prePolish',
  setting: 'setting',
  handsetting: 'setting',
  finalpolish: 'finalPolish',
  readyforplating: 'readyForPlating',
  plating: 'readyForPlating',
  dielocation: 'dieLocation',
  dienumbers: 'dieNumbers',
  dienumber: 'dieNumbers',
};


const PRODUCT_SORT_FIELDS = [
  { value: 'sku', label: 'Master SKU' },
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
  collection: [],
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

/** Split legacy combined die values like "bhang bhosda[5][chehere pr]" into separate fields. */
function parseDieLegacyValue(item) {
  if (!item || typeof item !== 'object') return item;
  if (String(item.quantity || '').trim() || String(item.location || '').trim()) return item;
  const value = String(item.value || '').trim();
  const m3 = value.match(/^(.+?)\[([^\]]+)\]\[([^\]]*)\]$/);
  if (m3) return { ...item, value: m3[1].trim(), quantity: m3[2].trim(), location: m3[3].trim() };
  const m2 = value.match(/^(.+?)\[([^\]]+)\]$/);
  if (m2) return { ...item, value: m2[1].trim(), quantity: m2[2].trim() };
  return item;
}

function buildInventoryRow(product, stockField) {
  const liveStock = product?.liveStock || {};
  const finalStock = Array.isArray(product?.finalStock) ? product.finalStock : [];
  const dieNumbersRaw = (Array.isArray(product?.dieNumberFindings) ? product.dieNumberFindings : []).map(parseDieLegacyValue);

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
    dieRefs: dieNumbersRaw.filter((item) => String(item?.type || '') !== 'findings' && String(item?.value || '').trim()),
    allDieEntries: dieNumbersRaw.filter((item) => String(item?.value || '').trim()),
    finalStockVariations: finalStock.length > 0
      ? finalStock.map((item) => ({
          sku: String(item?.sku || '').trim(),
          value: String(item?.value || '').trim(),
          unit: String(item?.unit || '').trim(),
          location: String(item?.location || '').trim(),
        }))
      : [{ sku: '', value: '', unit: '', location: '' }],
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

const PICKLIST_SKU_RE = /^[A-Z][A-Z0-9]{1,24}(\/[A-Z0-9]{1,6})*$/i;

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
  const { canView, canEdit, canCreate, canExport, canAmount, loading: permsLoading } = useSheetPermissions('master-inventory-sheet');
  const picklistFileInputRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploadingPicklist, setIsUploadingPicklist] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [products, setProducts] = useState([]);
  const [collectionOptions, setCollectionOptions] = useState([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [pendingExportFieldType, setPendingExportFieldType] = useState('current');
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [pendingBulkUploadFieldType, setPendingBulkUploadFieldType] = useState('current');
  const bulkUploadFileInputRef = useRef(null);
  const [picklists, setPicklists] = useState([]);
  const [selectedPicklists, setSelectedPicklists] = useState([]);
  const [isPicklistDropdownOpen, setIsPicklistDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [stockField, setStockField] = useState('current');
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [isCreateAllVouchersOpen, setIsCreateAllVouchersOpen] = useState(false);
  const [isPendingVouchersOpen, setIsPendingVouchersOpen] = useState(false);
  const [isSuggestedVouchersOpen, setIsSuggestedVouchersOpen] = useState(false);
  const [isNeededVouchersOpen, setIsNeededVouchersOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortOrder, setSortOrder] = useState('default');
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
  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('master-inventory-sheet', INVENTORY_COLUMNS.map((column) => column.key));
  const [inventoryColumns, setInventoryColumns] = useState(INVENTORY_COLUMNS);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState(new Map()); // productId -> {field: value}
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [deletingRows, setDeletingRows] = useState(new Set());
  const [isEditFieldTypeDialogOpen, setIsEditFieldTypeDialogOpen] = useState(false);
  const [editFieldType, setEditFieldType] = useState('current');
  const [pendingEditFieldType, setPendingEditFieldType] = useState('current');
  const [isStockSheetPreviewOpen, setIsStockSheetPreviewOpen] = useState(false);
  const [stockSheetPreviewData, setStockSheetPreviewData] = useState({ headers: [], rows: [], stageCols: [] });

  // Die breakdown popup state
  const [diePopup, setDiePopup] = useState(null);
  // { rowId, sku, stage, stageName, dieItems: DieInventoryItem[], loading: bool }

  const DIE_STAGE_FIELDS = {
    waxPiece: { cur: 'wax_piece_qty', min: 'wax_piece_min', wip: 'wax_piece_wip', loc: 'wax_piece_location' },
    waxSetting: { cur: 'wax_setting_qty', min: 'wax_setting_min', wip: 'wax_setting_wip', loc: 'wax_setting_location' },
    casting: { cur: 'casting_qty', min: 'casting_min', wip: 'casting_wip', loc: 'casting_location' },
  };

  const openDiePopup = useCallback(async (row, stage, stageName) => {
    const dieCodes = (row.dieRefs || []).map((d) => d.value).filter(Boolean);
    if (!dieCodes.length) return;
    const STAGE_TO_DEPT = { waxPiece: 'wax-pieces', waxSetting: 'wax-setting', casting: 'casting' };
    const deptKey = STAGE_TO_DEPT[stage];

    setDiePopup({ rowId: row.id, sku: row.sku, stage, stageName, totalInDemand: row.totalInDemand || 0, dieRefs: row.dieRefs || [], dieItems: [], wipByCode: {}, loading: true });
    try {
      const [dieRes, jobsRes] = await Promise.all([
        fetch(`/api/die-inventory/by-codes/?codes=${dieCodes.join(',')}`),
        fetch(`/api/jobs/?product=${row.id}&approval_status=in_process&page_size=200`),
      ]);
      const dieJson = await dieRes.json().catch(() => []);
      const jobsJson = await jobsRes.json().catch(() => ({}));
      const items = Array.isArray(dieJson) ? dieJson : (dieJson?.results ?? dieJson?.data ?? []);
      const jobs = Array.isArray(jobsJson?.data)
        ? jobsJson.data
        : (jobsJson?.data?.results ?? []);

      const wipByCode = {};
      for (const job of jobs) {
        if (job.dept_to !== deptKey) continue;
        for (const dr of (job.die_rows || [])) {
          const code = String(dr.die_code || '').trim();
          if (!code) continue;
          wipByCode[code] = (wipByCode[code] || 0) + (parseInt(dr.issued_qty) || 0);
        }
      }

      setDiePopup((prev) => prev ? { ...prev, dieItems: items, wipByCode, loading: false } : null);
    } catch {
      setDiePopup((prev) => prev ? { ...prev, dieItems: [], wipByCode: {}, loading: false } : null);
    }
  }, []);

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

  // Sync live_stock columns from backend
  useEffect(() => {
    fetch('/frontend/api/table-columns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.data) return;
        const ls = data.data
          .filter((c) => c.table_type === 'live_stock')
          .sort((a, b) => a.order - b.order);
        if (!ls.length) return;
        const lsCols = ls.map((c) => ({
          key: BACKEND_KEY_TO_FRONTEND[c.key] || c.key,
          label: c.label,
        }));
        const newCols = buildInventoryColumns(lsCols);
        setInventoryColumns(newCols);
        setVisibleColumns(new Set(newCols.map((c) => c.key)));
      })
      .catch(() => {});
  }, []);

  // Fetch collections list dynamically on mount
  useEffect(() => {
    fetch('/frontend/api/collections', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setCollectionOptions(data.data.map((c) => c.name));
        }
      })
      .catch((err) => console.error('Error fetching collections:', err));
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

      // Use backend as the authoritative source for picklists.
      // Only fall back to localStorage if the backend request itself failed.
      if (groupsResponse.ok) {
        const backendPicklists = Array.isArray(groupsResult?.data)
          ? groupsResult.data
          : Array.isArray(groupsResult?.picklists)
            ? groupsResult.picklists
            : [];
        // Backend is authoritative — if it returned 0 groups, picklists are empty.
        // Clear stale localStorage so deleted picklists don't resurface.
        try {
          localStorage.setItem('psd_picklists', JSON.stringify(backendPicklists));
        } catch { /* ignore */ }
        setPicklists(backendPicklists);
      } else {
        // Backend unreachable — use localStorage as offline fallback only.
        setPicklists(loadPicklistsFromStorage());
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

  // Auto-refresh inventory every 30 s so alert badges disappear when stock meets minimum
  // and quantities stay current as vouchers are received/completed elsewhere.
  useEffect(() => {
    const POLL_MS = 30_000;
    const id = setInterval(() => {
      loadProducts();
    }, POLL_MS);

    // Also reload immediately whenever the browser tab regains focus / becomes visible.
    const handleVisible = () => {
      if (document.visibilityState === 'visible') loadProducts();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisible);
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

    // When one or more picklists are selected, drive rows from their items combined.
    // Picklist items use Final Stock SKUs (e.g. AJE55/G), so we match against
    // product.finalStock[].sku rather than the master SKU.
    if (selectedPicklists && selectedPicklists.length > 0) {
      const selectedPicklistObjs = picklists.filter((p) => selectedPicklists.includes(p.id));
      const items = selectedPicklistObjs.flatMap((p) => p.items || []);

      if (items.length > 0) {
        // Build a map: Final Stock SKU (uppercase) → product
        const productByFinalStockSku = new Map();
        products.forEach((p) => {
          const finalStock = Array.isArray(p.finalStock) ? p.finalStock : [];
          finalStock.forEach((fs) => {
            const fsSku = String(fs.sku || '').trim().toUpperCase();
            if (fsSku && !productByFinalStockSku.has(fsSku)) {
              productByFinalStockSku.set(fsSku, p);
            }
          });
        });

        // Return unique products whose Final Stock SKU appears in any of the selected picklists,
        // preserving picklist order. Dedup by product.id.
        const seen = new Set();
        return items.reduce((acc, item) => {
          const sku = String(item.sku || '').trim().toUpperCase();
          const product = productByFinalStockSku.get(sku);
          if (product) {
            if (!seen.has(product.id)) {
              seen.add(product.id);
              acc.push(product);
            }
          } else {
            // Picklist item has no matching product in DB — synthesise a minimal row
            if (!seen.has(sku)) {
              seen.add(sku);
              const masterBase = sku.includes('/') ? sku.substring(0, sku.lastIndexOf('/')) : sku;
              acc.push({
                id: `pl-${sku}`,
                sku: masterBase,
                masterSku: masterBase,
                listingName: item.listingName || sku,
                totalInDemand: 0,
                liveStock: {},
                finalStock: [{ sku, value: '', unit: 'pcs', location: '' }],
                dieNumberFindings: [],
              });
            }
          }
          return acc;
        }, []);
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

        if (field.key === 'activeChannels' || field.key === 'settingType') {
          const values = String(rawValue)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
          return values.some((value) =>
            Array.from(selected).some((s) => s.toLowerCase() === value.toLowerCase())
          );
        }

        const rawLower = String(rawValue).trim().toLowerCase();
        return Array.from(selected).some((s) => s.toLowerCase() === rawLower);
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
  }, [effectiveSearch, filterSelections, products, selectedSku, selectedPicklists, picklists]);

  const sortedProducts = useMemo(() => {
    if (sortOrder !== 'default') {
      return [...filteredProducts].sort((a, b) => {
        if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortOrder === 'oldest') return (a.id || 0) - (b.id || 0);
        const av = String(a.sku || '').toLowerCase(), bv = String(b.sku || '').toLowerCase();
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
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
  }, [filteredProducts, sortDirection, sortField, sortOrder]);

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
    // Use a Map(lowercase -> display) per field so dedup is case-insensitive.
    // Static options register first (title-case wins); product DB values that
    // collide only in case are skipped.
    const optionMaps = {};
    FILTER_FIELDS.forEach((field) => {
      optionMaps[field.key] = new Map();
      const staticOptions = field.key === 'collection' ? collectionOptions : (PRODUCT_FIELD_OPTIONS[field.key] || []);
      staticOptions.forEach((v) =>
        optionMaps[field.key].set(v.toLowerCase(), v)
      );
    });

    products.forEach((product) => {
      FILTER_FIELDS.forEach((field) => {
        const rawValue = getFilterValue(product, field.key);
        if (!rawValue) return;

        if (field.key === 'activeChannels' || field.key === 'settingType') {
          String(rawValue)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .forEach((v) => {
              if (!optionMaps[field.key].has(v.toLowerCase()))
                optionMaps[field.key].set(v.toLowerCase(), v);
            });
          return;
        }

        const trimmed = String(rawValue).trim();
        if (!optionMaps[field.key].has(trimmed.toLowerCase()))
          optionMaps[field.key].set(trimmed.toLowerCase(), trimmed);
      });
    });

    const sorted = {};
    FILTER_FIELDS.forEach((field) => {
      sorted[field.key] = Array.from(optionMaps[field.key].values()).sort((a, b) =>
        a.localeCompare(b)
      );
    });

    return sorted;
  }, [products, collectionOptions]);

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

  const selectedPicklistsData = useMemo(
    () => picklists.filter((picklist) => selectedPicklists.includes(picklist.id)),
    [picklists, selectedPicklists]
  );

  // Build a SKU → needed-qty map from the selected picklists.
  // When no picklist is selected this map is empty and the DB-derived
  // totalInDemand from each inventory row is used instead.
  const picklistNeededBySku = useMemo(() => {
    const map = new Map();
    if (!selectedPicklists || selectedPicklists.length === 0) return map;

    selectedPicklistsData.forEach((picklist) => {
      (picklist?.items || []).forEach((item) => {
        // Normalize to uppercase so lookup matches regardless of DB casing.
        const sku = String(item.sku || '').trim().toUpperCase();
        if (!sku) {
          return;
        }

        const needed = parseNumericValue(item.needed || item.quantity || 0);
        map.set(sku, (map.get(sku) || 0) + needed);
      });
    });

    return map;
  }, [selectedPicklists, selectedPicklistsData]);

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
      const demandValue = (selectedPicklists && selectedPicklists.length > 0)
        ? (picklistNeededBySku.get(sku) ?? '')
        : (row.totalInDemand || '');

      map.set(row.id, demandValue);
    });

    return map;
  }, [inventoryRows, picklistNeededBySku, selectedPicklists.length]);

  // Per-product alert data: orange = any stage below min, red = demand > final stock
  const alertByProductId = useMemo(() => {
    const map = new Map();
    sortedProducts.forEach((product) => {
      const liveStock = product.liveStock || {};

      // Orange: any stage's current stock < its minimum suggested (min > 0)
      const lowStages = [];
      for (const [lsKey, label] of LIVE_STOCK_STAGE_LABELS) {
        const stage = liveStock[lsKey] || {};
        const min = parseFloat(stage.min || '') || 0;
        const current = parseFloat(stage.current || '') || 0;
        if (min > 0 && current < min) {
          // NOTE: lsKey is included here so SuggestedVouchersModal can look up dept routing
          lowStages.push({ lsKey, label, current, min });
        }
      }

      // Red: total demand > total final stock
      // When a picklist is active, totalInDemandByRowId looks up by master SKU which
      // never matches the final-stock-SKU keys in picklistNeededBySku — so we must
      // sum demands for each of this product's final stock variation SKUs directly.
      const finalStockArr = Array.isArray(product.finalStock) ? product.finalStock : [];
      let demand = 0;
      if (selectedPicklists && selectedPicklists.length > 0) {
        demand = finalStockArr.reduce((sum, v) => {
          const varSku = String(v.sku || '').trim().toUpperCase();
          return sum + (parseFloat(picklistNeededBySku.get(varSku) || 0) || 0);
        }, 0);
      } else {
        demand = parseFloat(totalInDemandByRowId.get(product.id) || '') || 0;
      }
      const totalFinalStock = finalStockArr.reduce(
        (sum, v) => sum + (parseFloat(v.value || '') || 0),
        0
      );
      const shortage = demand > 0 && demand > totalFinalStock ? demand - totalFinalStock : 0;

      if (lowStages.length > 0 || shortage > 0) {
        map.set(product.id, { lowStages, shortage, demand, totalFinalStock });
      }
    });
    return map;
  }, [sortedProducts, totalInDemandByRowId, selectedPicklists.length, picklistNeededBySku]);

  // Items to pass to NeededVouchersModal — products where demand > finalStock (red !)
  const neededItems = useMemo(() => {
    const items = [];
    sortedProducts.forEach((product) => {
      const alert = alertByProductId.get(product.id);
      if (!alert || alert.shortage <= 0) return;
      items.push({
        productId:   product.id,
        sku:         product.sku || product.masterSku || '',
        category:    product.category || '',
        material:    product.material || '',
        settingType: product.settingType || product.setting_type || '',
        shortage:    alert.shortage,
        demand:      alert.demand,
        totalFinalStock: alert.totalFinalStock,
      });
    });
    return items;
  }, [sortedProducts, alertByProductId]);

  // Items to pass to SuggestedVouchersModal — products with orange ! only
  const suggestedItems = useMemo(() => {
    const items = [];
    sortedProducts.forEach((product) => {
      const alert = alertByProductId.get(product.id);
      if (!alert || alert.lowStages.length === 0) return;
      items.push({
        productId: product.id,
        sku: product.sku || product.masterSku || '',
        listingName: product.listingName || '',
        material: product.material || '',
        category: product.category || '',
        stages: alert.lowStages.map(s => ({
          lsKey: s.lsKey,
          label: s.label,
          current: s.current,
          min: s.min,
          neededQty: Math.max(0, s.min - s.current),
        })),
      });
    });
    return items;
  }, [sortedProducts, alertByProductId]);

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
    const AMOUNT_COLUMN_KEYS = new Set(['finalStockValue']);
    const columns = inventoryColumns.filter((column) => {
      if (!visibleColumns.has(column.key)) return false;
      if (!canAmount && AMOUNT_COLUMN_KEYS.has(column.key)) return false;
      return true;
    });
    if (!columns.some((column) => column.key === '__select__')) {
      return [{ key: '__select__', label: '' }, ...columns];
    }
    return columns;
  }, [visibleColumns, canAmount]);

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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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

  // Build rows for a specific stockField view, using all sortedProducts
  const buildExportSheet = (stockField) => {
    const exportColumns = visibleColumnList.filter((col) => col.key !== '__select__');
    const headers = exportColumns.map((col) => col.label);
    const rows = sortedProducts.map((product) => {
      const row = buildInventoryRow(product, stockField);
      return exportColumns.map((col) => {
        // For the Location column aggregate die/findings locations + per-variation
        // Final Stock locations into a single readable cell (e.g. "AJE23/P: abcd | AJE23/B: gand")
        if (col.key === 'dieLocation') {
          const parts = [];
          if (row.dieLocation) parts.push(row.dieLocation);
          const varLocs = (row.finalStockVariations || [])
            .filter((v) => v.location)
            .map((v) => (v.sku ? `${v.sku}: ${v.location}` : v.location));
          parts.push(...varLocs);
          return parts.join(' | ');
        }
        const v = row[col.key];
        if (v && typeof v === 'object' && v.isComposite) return `${v.wip ?? ''} / ${v.current ?? ''}`;
        return v ?? '';
      });
    });
    return XLSX.utils.aoa_to_sheet([headers, ...rows]);
  };

  // Build a location-specific export sheet that expands per-variation rows and shows
  // stage locations in stage columns, per-variation Final Stock location in the
  // "Final Stock Value" column (relabelled "Final Stock Location"), and die/findings
  // location in the "Location" column (first variation row only).
  const buildLocationExportSheet = (stockField) => {
    const exportColumns = visibleColumnList.filter((col) => col.key !== '__select__');
    const headers = exportColumns.map((col) => {
      if (col.key === 'finalStockValue') return stockField === 'final-stock-location' ? 'Final SKU Location' : 'Final Stock Location';
      return col.label;
    });
    const allRows = [];
    for (const product of sortedProducts) {
      const row = buildInventoryRow(product, stockField);
      const variations = row.finalStockVariations;
      variations.forEach((variation, varIdx) => {
        const isFirst = varIdx === 0;
        allRows.push(exportColumns.map((col) => {
          if (VARIATION_COLUMN_KEYS.has(col.key)) {
            if (col.key === 'finalStockSku') return variation.sku ?? '';
            if (col.key === 'finalStockValue') return variation.location ?? ''; // per-variation Final Stock location
            if (col.key === 'finalStockUnit') return variation.unit ?? '';
            if (col.key === 'dieLocation') return isFirst ? (row.dieLocation ?? '') : '';
            return '';
          }
          // Stage location columns — only on first variation row
          if (!isFirst) return '';
          const v = row[col.key];
          if (v && typeof v === 'object' && v.isComposite) return `${v.wip ?? ''} / ${v.current ?? ''}`;
          return v ?? '';
        }));
      });
    }
    return XLSX.utils.aoa_to_sheet([headers, ...allRows]);
  };

  const exportToExcel = (stockField) => {
    if (!canExport) return;
    const label = STOCK_FILTER_OPTIONS.find(o => o.value === stockField)?.label || 'Inventory';
    const sheetName = label.length > 30 ? label.slice(0, 30) : label; // excel limit sheet name to 30 chars
    const wb = XLSX.utils.book_new();
    
    let sheet;
    if (stockField === 'location' || stockField === 'final-stock-location') {
      sheet = buildLocationExportSheet(stockField);
    } else {
      sheet = buildExportSheet(stockField);
    }
    
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    const fileName = `master_inventory_${stockField}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setExportMenuOpen(false);
  };

  // ─── Stock Sheet Preview & Export ────────────────────────────────────────────
  // Stage definitions: each has a liveStock key and display label.
  // "Location / Current Stock" are combined into a single column per stage.
  const STOCK_SHEET_STAGE_COLS = [
    { lsKey: 'rawMaterial',      label: 'Wax Piece' },
    { lsKey: 'rawSetting',       label: 'Wax Setting' },
    { lsKey: 'wipLiquidCasting', label: 'Casting' },
    { lsKey: 'filing',           label: 'Filling' },
    { lsKey: 'packing',          label: 'Pre Polish' },
    { lsKey: 'setting',          label: 'Hand Setting' },
    { lsKey: 'finalPolish',      label: 'Final Polish' },
    { lsKey: 'readyForPlacing',  label: 'Plating' },
  ];

  // Build the structured data used for both preview and export
  const buildStockSheetData = () => {
    const stageCols = STOCK_SHEET_STAGE_COLS;
    const headers = [
      'Master SKU',
      'Final Stock SKU',
      'Die / Stock Location',
      ...stageCols.map(c => c.label + '\nLoc / Stock'),
      'Final Stock',
      'Unit',
      'Image URL(s)',
    ];

    const allRows = [];
    for (const product of sortedProducts) {
      const row = buildInventoryRow(product, 'current');
      const liveStock = product.liveStock || {};
      const images = Array.isArray(product.images) ? product.images : [];
      const imageStr = images.join(' | ');

      // Die/stock location from die numbers + per-variation final stock locations
      const locParts = [];
      if (row.dieLocation) locParts.push(row.dieLocation);
      (row.finalStockVariations || []).forEach(v => {
        if (v.location) locParts.push(v.sku ? `${v.sku}: ${v.location}` : v.location);
      });
      const dieLocStr = locParts.join(' | ');

      // Stage cells: "Location / Current" combined
      const stageCells = stageCols.map(({ lsKey }) => {
        const stage = liveStock[lsKey] || {};
        const loc = String(stage.location || '').trim();
        const cur = String(stage.current || '').trim();
        if (!loc && !cur) return '';
        if (!loc) return cur;
        if (!cur) return loc;
        return `${loc} / ${cur}`;
      });

      const variations = row.finalStockVariations || [{ sku: row.sku, value: '', unit: 'pcs', location: '' }];
      variations.forEach((variation, varIdx) => {
        const isFirst = varIdx === 0;
        allRows.push([
          isFirst ? row.sku : '',
          variation.sku ?? '',
          isFirst ? dieLocStr : (variation.location ?? ''),
          ...stageCells.map(v => isFirst ? v : ''),
          variation.value ?? '',
          variation.unit ?? 'pcs',
          isFirst ? imageStr : '',
        ]);
      });
    }
    return { headers, rows: allRows, stageCols };
  };

  // Open preview modal (uses currently-filtered sortedProducts — respects Collection filter)
  const handlePrintStockSheet = () => {
    if (!canExport) return;
    const data = buildStockSheetData();
    setStockSheetPreviewData(data);
    setIsStockSheetPreviewOpen(true);
  };

  // Download as Excel
  const exportStockSheetExcel = () => {
    const { headers, rows } = stockSheetPreviewData;
    // Strip \n from header labels (newline was used for display only)
    const cleanHeaders = headers.map(h => h.replace('\n', ' '));
    const ws = XLSX.utils.aoa_to_sheet([cleanHeaders, ...rows]);
    ws['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 24 },
      ...STOCK_SHEET_STAGE_COLS.map(() => ({ wch: 18 })),
      { wch: 14 }, { wch: 8 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Sheet');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inventory-stock-sheet-${dateStr}.xlsx`);
  };

  // Print as PDF via browser print dialog
  const exportStockSheetPDF = () => {
    const { headers, rows, stageCols } = stockSheetPreviewData;
    const cleanHeaders = headers.map(h => h.replace('\n', '<br/>'));
    const colGroup = [
      '<col style="width:90px">',
      '<col style="width:100px">',
      '<col style="width:130px">',
      ...stageCols.map(() => '<col style="width:100px">'),
      '<col style="width:80px">',
      '<col style="width:50px">',
      '<col style="width:200px">',
    ].join('');
    const theadHtml = `<tr>${cleanHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const tbodyHtml = rows.map((r, rIdx) =>
      `<tr class="${rIdx % 2 === 0 ? '' : 'alt'}">${r.map(c => `<td>${c !== '' ? c : '&nbsp;'}</td>`).join('')}</tr>`
    ).join('');

    const collectionLabel = (() => {
      const sel = filterSelections?.collection;
      if (!sel || sel.size === 0) return 'All Collections';
      return Array.from(sel).join(', ');
    })();

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Stock Sheet – ${collectionLabel}</title>
<style>
  @page { size: A3 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8px; color: #1e293b;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 13px; font-weight: 800; color: #92400e; margin-bottom: 2px; }
  .sub { font-size: 7px; color: #64748b; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  colgroup col { }
  thead tr th { background: #92400e; color: #fff; font-weight: 700;
    padding: 4px 4px; border: 1px solid #78350f; text-align: center;
    vertical-align: bottom; font-size: 7.5px; }
  td { padding: 3px 4px; border: 1px solid #e2e8f0; vertical-align: middle; font-size: 7.5px; }
  tr.alt td { background: #f8fafc; }
  td:first-child { font-weight: 700; color: #92400e; }
</style>
</head><body>
<h1>Inventory Stock Sheet</h1>
<div class="sub">${collectionLabel} &nbsp;·&nbsp; ${sortedProducts.length} products &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}</div>
<table><colgroup>${colGroup}</colgroup>
<thead>${theadHtml}</thead>
<tbody>${tbodyHtml}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) { alert('Pop-up blocked. Allow pop-ups to print.'); return; }
    win.document.write(html);
    win.document.close();
  };

  const openInventoryPDF = (stockField, title) => {
    const exportColumns = visibleColumnList.filter((col) => col.key !== '__select__');
    const headers = exportColumns.map((col) => col.label);
    const rows = sortedProducts.map((product) => {
      const row = buildInventoryRow(product, stockField);
      return exportColumns.map((col) => {
        const v = row[col.key];
        if (v && typeof v === 'object' && v.isComposite) return `${v.wip ?? ''} / ${v.current ?? ''}`;
        return v ?? '';
      });
    });
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map((h)=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const openLocationPDF = (stockField, title) => {
    const exportColumns = visibleColumnList.filter((col) => col.key !== '__select__');
    const headers = exportColumns.map((col) => {
      if (col.key === 'finalStockValue') return stockField === 'final-stock-location' ? 'Final SKU Location' : 'Final Stock Location';
      return col.label;
    });
    const allRows = [];
    for (const product of sortedProducts) {
      const row = buildInventoryRow(product, stockField);
      const variations = row.finalStockVariations;
      variations.forEach((variation, varIdx) => {
        const isFirst = varIdx === 0;
        allRows.push(exportColumns.map((col) => {
          if (VARIATION_COLUMN_KEYS.has(col.key)) {
            if (col.key === 'finalStockSku') return variation.sku ?? '';
            if (col.key === 'finalStockValue') return variation.location ?? '';
            if (col.key === 'finalStockUnit') return variation.unit ?? '';
            if (col.key === 'dieLocation') return isFirst ? (row.dieLocation ?? '') : '';
            return '';
          }
          if (!isFirst) return '';
          const v = row[col.key];
          if (v && typeof v === 'object' && v.isComposite) return `${v.wip ?? ''} / ${v.current ?? ''}`;
          return v ?? '';
        }));
      });
    }
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map((h)=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${allRows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const exportToPDF = (stockField) => {
    if (!canExport) return;
    const label = STOCK_FILTER_OPTIONS.find(o => o.value === stockField)?.label || 'Inventory';
    if (stockField === 'location' || stockField === 'final-stock-location') {
      openLocationPDF(stockField, label);
    } else {
      openInventoryPDF(stockField, label);
    }
    setExportMenuOpen(false);
  };

  const handleBulkUploadFileChange = async (event, uploadFieldType) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (uploadFieldType === 'picklist') {
      return handlePicklistFileChange(event);
    }

    setIsUploadingPicklist(true);
    setError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rows.length < 2) {
        throw new Error('The uploaded sheet is empty or contains no headers.');
      }

      const headers = rows[0].map((h) => String(h || '').trim());
      const dataRows = rows.slice(1);

      const normHeaders = headers.map((h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      let skuColIdx = normHeaders.findIndex((h) => ['finalstocksku', 'sku', 'mastersku', 'productsku'].includes(h));
      if (skuColIdx === -1) {
        skuColIdx = 0;
      }

      const columnIndices = {};
      normHeaders.forEach((normH, idx) => {
        const matchedField = Object.keys(HEADER_TO_FIELD).find((key) => normH === key || normH.includes(key));
        if (matchedField) {
          const fieldKey = HEADER_TO_FIELD[matchedField];
          if (uploadFieldType === 'wip-vs-current') {
            if (normH.endsWith('wip')) {
              columnIndices[`${fieldKey}_wip`] = idx;
            } else if (normH.endsWith('current') || normH.endsWith('cur')) {
              columnIndices[`${fieldKey}_current`] = idx;
            } else {
              columnIndices[`${fieldKey}_current`] = idx;
            }
          } else {
            columnIndices[fieldKey] = idx;
          }
        }
      });

      const dieLocationIdx = normHeaders.findIndex((h) => ['dielocation', 'location', 'loc'].includes(h));
      const dieNumbersIdx = normHeaders.findIndex((h) => ['dienumbers', 'dienumber', 'diecode', 'diecodes'].includes(h));
      const finalStockValueIdx = normHeaders.findIndex((h) => ['finalstockvalue', 'finalstocklocation', 'value', 'location', 'loc', 'quantity', 'qty'].includes(h));

      const bulkDraft = new Map();
      let matchCount = 0;

      dataRows.forEach((row, rowIdx) => {
        const rowSku = String(row[skuColIdx] || '').trim().toUpperCase();
        if (!rowSku) return;

        const product = products.find((p) => {
          const master = String(p.sku || p.masterSku || '').trim().toUpperCase();
          if (master === rowSku) return true;
          const variations = Array.isArray(p.finalStock) ? p.finalStock : [];
          return variations.some((v) => String(v.sku || '').trim().toUpperCase() === rowSku);
        });

        if (!product) return;
        matchCount++;

        const entry = {};

        if (uploadFieldType === 'wip-vs-current') {
          Object.entries(columnIndices).forEach(([key, idx]) => {
            const cellVal = parseFloat(row[idx]);
            if (!isNaN(cellVal)) {
              entry[key] = cellVal;
            }
          });
        } else if (uploadFieldType === 'location') {
          Object.entries(columnIndices).forEach(([key, idx]) => {
            if (key === 'finalStockValue') return;
            const cellVal = String(row[idx] || '').trim();
            if (cellVal) {
              entry[key] = cellVal;
            }
          });
          if (dieLocationIdx !== -1) {
            const cellVal = String(row[dieLocationIdx] || '').trim();
            if (cellVal) entry.dieLocation = cellVal;
          }
          if (dieNumbersIdx !== -1) {
            const cellVal = String(row[dieNumbersIdx] || '').trim();
            if (cellVal) entry.dieNumbers = cellVal;
          }
        } else if (uploadFieldType === 'final-stock') {
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];
          if (variations.length > 0) {
            const matchedVar = variations.find((v) => String(v.sku || '').trim().toUpperCase() === rowSku);
            if (matchedVar) {
              if (finalStockValueIdx !== -1) {
                const cellVal = parseFloat(row[finalStockValueIdx]);
                if (!isNaN(cellVal)) {
                  entry[matchedVar.sku] = cellVal;
                }
              }
            } else {
              variations.forEach((v) => {
                const varHeaderIdx = normHeaders.findIndex((h) => h === v.sku.toLowerCase().replace(/[^a-z0-9]/g, ''));
                if (varHeaderIdx !== -1) {
                  const cellVal = parseFloat(row[varHeaderIdx]);
                  if (!isNaN(cellVal)) entry[v.sku] = cellVal;
                }
              });
            }
          }
        } else if (uploadFieldType === 'final-stock-location') {
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];
          if (variations.length > 0) {
            const matchedVar = variations.find((v) => String(v.sku || '').trim().toUpperCase() === rowSku);
            if (matchedVar) {
              if (finalStockValueIdx !== -1) {
                const cellVal = String(row[finalStockValueIdx] || '').trim();
                if (cellVal) {
                  entry[`loc__${matchedVar.sku}`] = cellVal;
                }
              }
            } else {
              variations.forEach((v) => {
                const varHeaderIdx = normHeaders.findIndex((h) => h === v.sku.toLowerCase().replace(/[^a-z0-9]/g, ''));
                if (varHeaderIdx !== -1) {
                  const cellVal = String(row[varHeaderIdx] || '').trim();
                  if (cellVal) entry[`loc__${v.sku}`] = cellVal;
                }
              });
            }
          }
        } else {
          Object.entries(columnIndices).forEach(([key, idx]) => {
            const cellVal = parseFloat(row[idx]);
            if (!isNaN(cellVal)) {
              entry[key] = cellVal;
            }
          });
          if (dieLocationIdx !== -1) {
            const cellVal = String(row[dieLocationIdx] || '').trim();
            if (cellVal) entry.dieLocation = cellVal;
          }
          if (dieNumbersIdx !== -1) {
            const cellVal = String(row[dieNumbersIdx] || '').trim();
            if (cellVal) entry.dieNumbers = cellVal;
          }
        }

        if (Object.keys(entry).length > 0) {
          bulkDraft.set(product.id, entry);
        }
      });

      if (bulkDraft.size === 0) {
        throw new Error(`Matched ${matchCount} products, but found no columns in the sheet matching the selected upload type.`);
      }

      const allCalls = [];

      if (uploadFieldType === 'wip-vs-current') {
        for (const [productId, editData] of bulkDraft.entries()) {
          const product = products.find((p) => p.id === productId);
          if (!product) continue;
          const wipRow = buildInventoryRow(product, 'wip');
          const currRow = buildInventoryRow(product, 'current');

          for (const [field, stageName] of Object.entries(STOCK_FIELDS_MAP)) {
            if (editData[`${field}_wip`] !== undefined) {
              const wipNew = parseFloat(editData[`${field}_wip`]) || 0;
              const wipOld = parseNumericValue(wipRow[field]);
              const wipDelta = Math.round(wipNew - wipOld);
              if (wipDelta !== 0) {
                allCalls.push(fetch('/api/inventory/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ product: productId, txn_type: 'adjust', quantity: wipDelta, stage: STOCK_STAGE_MAP[field], stock_type: 'wip', remark: `Bulk Upload: ${stageName} (WIP)` }),
                }));
              }
            }
            if (editData[`${field}_current`] !== undefined) {
              const currNew = parseFloat(editData[`${field}_current`]) || 0;
              const currOld = parseNumericValue(currRow[field]);
              const currDelta = Math.round(currNew - currOld);
              if (currDelta !== 0) {
                allCalls.push(fetch('/api/inventory/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ product: productId, txn_type: 'adjust', quantity: currDelta, stage: STOCK_STAGE_MAP[field], stock_type: 'current', remark: `Bulk Upload: ${stageName} (Current)` }),
                }));
              }
            }
          }
        }
      } else if (uploadFieldType === 'location') {
        const originalRows = products.map((p) => buildInventoryRow(p, 'location'));
        for (const [productId, editData] of bulkDraft.entries()) {
          const originalRow = originalRows.find((r) => r.id === productId);
          if (!originalRow) continue;

          for (const [field, stageKey] of Object.entries(STOCK_STAGE_MAP)) {
            if (field === 'finalStockValue') continue;
            if (editData[field] === undefined) continue;
            const newLoc = String(editData[field] || '').trim();
            const oldLoc = String(originalRow[field] || '').trim();
            if (newLoc === oldLoc) continue;
            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: 0,
                stage: stageKey,
                stock_type: 'current',
                location: newLoc,
                remark: `Bulk update location — ${STOCK_FIELDS_MAP[field]}`,
              }),
            }));
          }

          if (editData.dieLocation !== undefined && editData.dieLocation !== originalRow.dieLocation) {
            const product = products.find((p) => p.id === productId);
            const dieNumbersRaw = Array.isArray(product?.dieNumberFindings) ? product.dieNumberFindings : [];
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
      } else if (uploadFieldType === 'final-stock') {
        for (const [productId, editData] of bulkDraft.entries()) {
          const product = products.find((p) => p.id === productId);
          if (!product) continue;
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];

          for (const [varSku, newValStr] of Object.entries(editData)) {
            const originalVariation = variations.find((v) => v.sku === varSku);
            const oldVal = parseNumericValue(originalVariation?.value) || 0;
            const newVal = parseFloat(newValStr) || 0;
            const delta = Math.round(newVal - oldVal);
            if (delta === 0) continue;

            const isSingleSku = variations.length === 1 && varSku === product.masterSku;
            const stageKey = isSingleSku ? 'final_stock' : `final_stock__${varSku.toLowerCase()}`;

            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: delta,
                stage: stageKey,
                stock_type: 'current',
                remark: `Bulk Final Stock Value — ${varSku}`,
              }),
            }));
          }
        }
      } else if (uploadFieldType === 'final-stock-location') {
        for (const [productId, editData] of bulkDraft.entries()) {
          const product = products.find((p) => p.id === productId);
          if (!product) continue;
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];

          for (const [key, newLoc] of Object.entries(editData)) {
            if (!key.startsWith('loc__')) continue;
            const varSku = key.slice(5);
            const originalVariation = variations.find((v) => v.sku === varSku);
            const oldLoc = String(originalVariation?.location || '').trim();
            const newLocTrimmed = String(newLoc || '').trim();
            if (newLocTrimmed === oldLoc) continue;

            const isSingleSku = variations.length === 1 && varSku === product.masterSku;
            const stageKey = isSingleSku ? 'final_stock' : `final_stock__${varSku.toLowerCase()}`;

            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: 0,
                stage: stageKey,
                stock_type: 'current',
                location: newLocTrimmed,
                remark: `Bulk Final Stock Location — ${varSku}`,
              }),
            }));
          }
        }
      } else {
        const baseRows = products.map((p) => buildInventoryRow(p, uploadFieldType));
        for (const [productId, editData] of bulkDraft.entries()) {
          const originalRow = baseRows.find((r) => r.id === productId);
          if (!originalRow) continue;

          for (const [field, stageName] of Object.entries(STOCK_FIELDS_MAP)) {
            if (editData[field] === undefined) continue;
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
                  stock_type: uploadFieldType,
                  remark: `Bulk Stage: ${stageName}`,
                }),
              }));
            }
          }

          if (editData.dieLocation !== undefined && editData.dieLocation !== originalRow.dieLocation) {
            const dieEntry = editData.dieNumbers !== undefined && editData.dieNumbers.trim()
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

      if (allCalls.length === 0) {
        alert('No changes were detected from the uploaded file.');
        return;
      }

      await Promise.all(allCalls);
      alert(`Bulk upload completed! Successfully updated ${bulkDraft.size} product(s).`);
      await loadProducts();
    } catch (err) {
      alert(`Bulk upload failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploadingPicklist(false);
    }
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

      // Write the fresh backend list to localStorage — no stale merge.
      try {
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
        const freshRes = await fetch('/api/picklist-groups', { cache: 'no-store' }).catch(() => null);
        const freshData = freshRes?.ok ? await freshRes.json().catch(() => null) : null;
        const freshList = Array.isArray(freshData?.data) ? freshData.data : [newPicklist];
        localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(freshList));
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
      // Initialize stage location values + dieLocation
      sortedProducts.forEach((p) => {
        const row = buildInventoryRow(p, 'location');
        draft.set(p.id, {
          waxPiece:        String(row.waxPiece || ''),
          waxSetting:      String(row.waxSetting || ''),
          casting:         String(row.casting || ''),
          filling:         String(row.filling || ''),
          prePolish:       String(row.prePolish || ''),
          setting:         String(row.setting || ''),
          finalPolish:     String(row.finalPolish || ''),
          readyForPlating: String(row.readyForPlating || ''),
          dieLocation:     row.dieLocation || '',
          dieNumbers:      row.dieNumbers || '',
        });
      });
    } else if (fieldType === 'final-stock') {
      // Initialize per-variation final stock values keyed by variation SKU
      sortedProducts.forEach((p) => {
        const variations = Array.isArray(p.finalStock) ? p.finalStock : [];
        const entry = {};
        variations.forEach((v) => {
          entry[v.sku] = String(parseNumericValue(v.value) || '');
        });
        draft.set(p.id, entry);
      });
    } else if (fieldType === 'final-stock-location') {
      // Initialize per-variation final stock location keyed as `loc__${v.sku}`
      sortedProducts.forEach((p) => {
        const variations = Array.isArray(p.finalStock) ? p.finalStock : [];
        const entry = {};
        variations.forEach((v) => {
          if (v.sku) entry[`loc__${v.sku}`] = String(v.location || '');
        });
        draft.set(p.id, entry);
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
        // Save per-stage location values as inventory transactions (qty=0, location=text)
        // and die_numbers location on the product
        const originalRows = sortedProducts.map((p) => buildInventoryRow(p, 'location'));
        for (const [productId, editData] of editDraft.entries()) {
          const originalRow = originalRows.find((r) => r.id === productId);
          if (!originalRow) continue;

          // Sync per-stage location
          for (const [field, stageKey] of Object.entries(STOCK_STAGE_MAP)) {
            if (field === 'finalStockValue') continue; // no location concept for final stock
            const newLoc = String(editData[field] || '').trim();
            const oldLoc = String(originalRow[field] || '').trim();
            if (newLoc === oldLoc) continue;
            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: 0,
                stage: stageKey,
                stock_type: 'current',
                location: newLoc,
                remark: `Stage location update — ${STOCK_FIELDS_MAP[field]}`,
              }),
            }));
          }

          // Also update die location on the product if changed
          if (editData.dieLocation !== originalRow.dieLocation) {
            const product = sortedProducts.find((p) => p.id === productId);
            const dieNumbersRaw = Array.isArray(product?.dieNumberFindings) ? product.dieNumberFindings : [];
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
      } else if (editFieldType === 'final-stock') {
        // Save per-variation final stock value changes as adjustment transactions
        for (const [productId, editData] of editDraft.entries()) {
          const product = sortedProducts.find((p) => p.id === productId);
          if (!product) continue;
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];

          for (const [varSku, newValStr] of Object.entries(editData)) {
            const originalVariation = variations.find((v) => v.sku === varSku);
            const oldVal = parseNumericValue(originalVariation?.value) || 0;
            const newVal = parseFloat(newValStr) || 0;
            const delta = Math.round(newVal - oldVal);
            if (delta === 0) continue;

            // Match the stage key format used in inventory-summary/route.js:
            // Single-SKU products use 'final_stock'; variation products use 'final_stock__<sku_lower>'
            const isSingleSku = variations.length === 1 && varSku === product.masterSku;
            const stageKey = isSingleSku ? 'final_stock' : `final_stock__${varSku.toLowerCase()}`;

            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: delta,
                stage: stageKey,
                stock_type: 'current',
                remark: `Final Stock Value — ${varSku}`,
              }),
            }));
          }
        }
      } else if (editFieldType === 'final-stock-location') {
        // Save per-variation final stock location changes as qty=0 adjustment transactions
        for (const [productId, editData] of editDraft.entries()) {
          const product = sortedProducts.find((p) => p.id === productId);
          if (!product) continue;
          const variations = Array.isArray(product.finalStock) ? product.finalStock : [];

          for (const [key, newLoc] of Object.entries(editData)) {
            if (!key.startsWith('loc__')) continue;
            const varSku = key.slice(5); // strip 'loc__'
            const originalVariation = variations.find((v) => v.sku === varSku);
            const oldLoc = String(originalVariation?.location || '').trim();
            const newLocTrimmed = String(newLoc || '').trim();
            if (newLocTrimmed === oldLoc) continue;

            const isSingleSku = variations.length === 1 && varSku === product.masterSku;
            const stageKey = isSingleSku ? 'final_stock' : `final_stock__${varSku.toLowerCase()}`;

            allCalls.push(fetch('/api/inventory/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: productId,
                txn_type: 'adjust',
                quantity: 0,
                stage: stageKey,
                stock_type: 'current',
                location: newLocTrimmed,
                remark: `Final Stock Location — ${varSku}`,
              }),
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

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

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

      {/* ── Export Field Type Selection Dialog ── */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Field to Export</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-cool-gray">Choose which stock view you want to export:</p>
            {STOCK_FILTER_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-cloud-gray">
                <input
                  type="radio"
                  name="exportFieldType"
                  value={option.value}
                  checked={pendingExportFieldType === option.value}
                  onChange={() => setPendingExportFieldType(option.value)}
                  className="accent-trust-blue w-4 h-4"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="rounded-full px-4 text-sm h-8">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsExportDialogOpen(false);
                exportToExcel(pendingExportFieldType);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 text-sm h-8"
            >
              Export Excel
            </Button>
            <Button
              onClick={() => {
                setIsExportDialogOpen(false);
                exportToPDF(pendingExportFieldType);
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 text-sm h-8"
            >
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload Field Type Selection Dialog ── */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Field to Bulk Upload</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-cool-gray">Choose which field/value you want to upload & change:</p>
            {BULK_UPLOAD_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-cloud-gray">
                <input
                  type="radio"
                  name="bulkUploadFieldType"
                  value={option.value}
                  checked={pendingBulkUploadFieldType === option.value}
                  onChange={() => setPendingBulkUploadFieldType(option.value)}
                  className="accent-trust-blue w-4 h-4"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(false)} className="rounded-full px-4 text-sm h-8">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsBulkUploadDialogOpen(false);
                bulkUploadFileInputRef.current?.click();
              }}
              className="bg-trust-blue text-white rounded-full px-4 text-sm h-8 hover:bg-trust-blue/90"
            >
              Choose File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Die Breakdown Dialog ── */}
      <Dialog open={!!diePopup} onOpenChange={(open) => { if (!open) setDiePopup(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-midnight-ink">
              {diePopup?.stageName} — Die Breakdown
              <span className="ml-2 text-trust-blue font-bold">· {diePopup?.sku}</span>
            </DialogTitle>
          </DialogHeader>

          {diePopup?.loading ? (
            <div className="py-8 text-center text-sm text-cool-gray">Loading die data…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    {['DIE CODE', 'MAIN LOC', 'QTY/UNIT', 'MIN', 'CURRENT', 'WIP', 'STAGE LOC'].map((h) => (
                      <th
                        key={h}
                        className="border border-soft-border bg-[#dbeafe] px-3 py-2 text-center font-semibold text-midnight-ink whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(diePopup?.dieRefs ?? []).map((ref) => {
                    const fields = DIE_STAGE_FIELDS[diePopup?.stage] ?? {};
                    const item = diePopup?.dieItems?.find(
                      (d) => String(d.die_code || '').toLowerCase() === String(ref.value || '').toLowerCase()
                    );
                    return (
                      <tr key={ref.value} className="hover:bg-blue-50/30">
                        <td className="border border-soft-border px-3 py-1.5 text-center font-medium text-midnight-ink">{ref.value}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-cool-gray">{item?.location || ref.location || '—'}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-midnight-ink">{ref.quantity || '—'}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-cool-gray">{item?.[fields.min] || '—'}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-midnight-ink font-medium">{((parseFloat(ref.quantity) || 0) * (diePopup?.totalInDemand || 0)) || '—'}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-trust-blue font-medium">{diePopup?.wipByCode?.[ref.value] || '—'}</td>
                        <td className="border border-soft-border px-3 py-1.5 text-center text-cool-gray">{item?.[fields.loc] || '—'}</td>
                      </tr>
                    );
                  })}
                  {(diePopup?.dieRefs ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="border border-soft-border px-3 py-4 text-center text-cool-gray">
                        No die codes linked to this SKU.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
            {inventoryColumns.filter((column) => column.key !== '__select__').map((column) => (
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
            <Button
              onClick={saveColumnView}
              variant="outline"
              className="ml-auto border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10"
            >
              {saveViewStatus === 'saved' ? 'Saved ✓' : 'Save View'}
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
            {canEdit && (
              <Button
                onClick={() => { setPendingBulkUploadFieldType('current'); setIsBulkUploadDialogOpen(true); }}
                disabled={isUploadingPicklist || isEditMode}
                variant="outline"
                className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8 hover:bg-cloud-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingPicklist ? 'Uploading...' : 'Bulk Upload'}
              </Button>
            )}
            {/* Edit / Save / Cancel */}
            {canEdit && isEditMode ? (
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
            ) : canEdit ? (
              <Button
                onClick={() => { setPendingEditFieldType('current'); setIsEditFieldTypeDialogOpen(true); }}
                variant="outline"
                className="border-trust-blue text-trust-blue rounded-full px-4 text-sm h-8 hover:bg-trust-blue/10"
              >
                Edit
              </Button>
            ) : null}
            {/* Delete — available whenever rows are selected */}
            {selectedRows.size > 0 && !isEditMode && canEdit && (
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
                  {sortOrder === 'default' ? 'Sort ▾' : sortOrder === 'asc' ? 'A → Z ▾' : sortOrder === 'desc' ? 'Z → A ▾' : sortOrder === 'newest' ? 'Newest ▾' : 'Oldest ▾'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortOrder('asc'); setCurrentPage(1); }}>A → Z (Ascending)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortOrder('desc'); setCurrentPage(1); }}>Z → A (Descending)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortOrder('newest'); setCurrentPage(1); }}>Newest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortOrder('oldest'); setCurrentPage(1); }}>Oldest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortOrder('default'); setCurrentPage(1); }}>Default Order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => { setPendingExportFieldType(stockField || 'current'); setIsExportDialogOpen(true); }} variant="outline"
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8 flex items-center gap-1.5"
              disabled={!canExport} title={!canExport ? 'You do not have permission to export' : undefined}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            {canExport && <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" onClick={() => window.print()}>Print</Button>}
            {canExport && <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 rounded-full px-4 text-sm h-8 flex items-center gap-1.5" onClick={handlePrintStockSheet} title="Download stock sheet with all stages and images as Excel">
              <FileText className="w-3.5 h-3.5" /> Stock Sheet
            </Button>}
            <Button
              onClick={() => window.location.href = '/inventory/repair-queue'}
              variant="outline"
              className="border-amber-500 text-amber-600 rounded-full px-4 text-sm h-8 hover:bg-amber-50 gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5" />
              Repair Queue
            </Button>
            <Button
              onClick={() => setIsPendingVouchersOpen(true)}
              variant="outline"
              className="border-trust-blue text-trust-blue rounded-full px-4 text-sm h-8 hover:bg-trust-blue/10 gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              Vouchers
            </Button>
            {canCreate && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-success text-white rounded-full px-4 text-sm h-8 hover:bg-success/90 gap-1"
                >
                  Create Job
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsCreateJobModalOpen(true)} className="cursor-pointer">
                  Create Job
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateAllVouchersOpen(true)} className="cursor-pointer">
                  Create All Vouchers
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsSuggestedVouchersOpen(true)}
                  className="cursor-pointer text-orange-600 font-semibold"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
                    Create Suggested Vouchers
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsNeededVouchersOpen(true)}
                  className="cursor-pointer text-red-600 font-semibold"
                  disabled={neededItems.length === 0}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
                    Create Needed Vouchers
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
            <input
              ref={picklistFileInputRef}
              type="file"
              accept="*/*"
              onChange={handlePicklistFileChange}
              className="hidden"
            />
            <input
              ref={bulkUploadFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleBulkUploadFileChange(e, pendingBulkUploadFieldType)}
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
        <div className="overflow-auto max-h-[calc(100vh-270px)]">
          <table className="border-separate border-spacing-0 text-sm" style={{ minWidth: '1400px' }}>
            <thead>
              <tr>
                {/* ── Main inventory columns ── */}
                {visibleColumnList.map((column) => (
                  <th
                    key={column.key}
                    className={`border-t border-b border-r border-soft-border px-2 h-10 whitespace-nowrap text-center text-xs font-semibold text-black ${
                      column.key === '__select__' ? 'sticky left-0 top-0 z-20 border-l bg-[#dbeafe]' : 'sticky top-0 z-[15] bg-[#dbeafe]'
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

                {/* ── TOTAL IN DEMAND ── */}
                <th className="border-t border-b border-l border-r border-soft-border px-2 h-10 whitespace-nowrap text-center text-xs font-semibold text-black bg-[#dbeafe]" style={{ minWidth: '100px', position: 'sticky', right: '160px', top: '0', zIndex: 22, boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.10)' }}>
                  TOTAL IN DEMAND
                </th>

                {/* ── ORDER PICK LIST (with dropdown) ── */}
                <th className="border-t border-b border-l border-r border-soft-border px-2 h-10 text-xs font-semibold text-black bg-[#dbeafe] relative" style={{ minWidth: '160px', position: 'sticky', right: '0', top: '0', zIndex: 22 }}>
                  <div className="relative">
                    <Popover open={isPicklistDropdownOpen} onOpenChange={setIsPicklistDropdownOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full text-left px-1 rounded hover:bg-trust-blue/10 transition-colors leading-tight text-[11px] tracking-wide block overflow-hidden text-ellipsis whitespace-nowrap font-bold text-trust-blue flex items-center justify-between"
                        >
                          <span className="truncate">
                            {selectedPicklists.length === 0
                              ? 'ORDER PICK LIST'
                              : selectedPicklists.length === 1
                              ? `#${picklists.find(p => p.id === selectedPicklists[0])?.number ?? ''}`
                              : `${selectedPicklists.length} PICKLISTS`}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2 z-[110] max-h-80 overflow-y-auto bg-white font-normal text-left animate-none" align="end" style={{ pointerEvents: 'auto' }}>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-soft-border">
                          <span className="text-sm font-semibold">Select Picklists</span>
                          {selectedPicklists.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedPicklists([])}
                              className="text-xs text-trust-blue hover:underline font-medium"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {picklists.map((picklist) => {
                            const isSelected = selectedPicklists.includes(picklist.id);
                            const itemCount = (picklist.items || []).length;
                            return (
                              <button
                                key={picklist.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPicklists((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== picklist.id)
                                      : [...prev, picklist.id]
                                  );
                                }}
                                className={`w-full text-left px-2.5 py-2 text-xs rounded hover:bg-trust-blue/5 transition-colors border-b border-soft-border/30 last:border-0 flex items-start gap-2.5 ${
                                  isSelected ? 'bg-blue-50/70 border-blue-100 font-semibold' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by click
                                  className="h-3.5 w-3.5 rounded mt-0.5 border-soft-border accent-trust-blue cursor-pointer shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-midnight-ink flex items-center justify-between gap-1">
                                    <span className="truncate">
                                      {picklist.number ? `#${picklist.number} — ` : ''}{picklist.name}
                                    </span>
                                    <span className="text-[10px] bg-blue-100 text-trust-blue px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-cool-gray mt-0.5 flex items-center justify-between font-normal">
                                    <span>{picklist.dateFormatted || (picklist.date ? new Date(picklist.date).toLocaleDateString() : '')}</span>
                                    {picklist.uploadedBy && <span className="truncate max-w-[100px]">by {picklist.uploadedBy}</span>}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {picklists.length === 0 && (
                            <p className="text-xs text-cool-gray p-2 text-center">No picklists found.</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsToRender.flatMap((row) => {
                const isDeleting = deletingRows.has(row.id);

                // ── Empty padding rows ──
                if (row.isEmpty) {
                  return [(
                    <tr key={row.id}>
                      {visibleColumnList.map((column) => (
                        <td
                          key={`${row.id}-${column.key}`}
                          className={`border-b border-r border-soft-border px-2 h-9 text-center ${
                            column.key === '__select__' ? 'sticky left-0 z-10 bg-white border-l shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]' : ''
                          }`}
                        />
                      ))}
                      <td className="border-b border-l border-r border-soft-border px-2 h-9 text-center text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '160px', zIndex: 12, boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.10)' }} />
                      <td className="border-b border-l border-r border-soft-border px-2 h-9 text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '0', zIndex: 12 }} />
                    </tr>
                  )];
                }

                const isRowEditing = isEditMode && editDraft.has(row.id);
                const editData = editDraft.get(row.id);
                const variations = row.finalStockVariations || [{ sku: '', value: '', unit: '', location: '' }];
                const variationCount = variations.length;
                const spanningCols = visibleColumnList.filter((col) => !VARIATION_COLUMN_KEYS.has(col.key));
                const variationCols = visibleColumnList.filter((col) => VARIATION_COLUMN_KEYS.has(col.key));

                return variations.map((variation, varIdx) => {
                  const isFirst = varIdx === 0;

                  return (
                    <tr key={`${row.id}-v${varIdx}`} className={isDeleting ? 'opacity-40 pointer-events-none' : ''}>

                      {/* ── Spanning cells — Master SKU through Plating (first variation only) ── */}
                      {isFirst && spanningCols.map((column) => (
                        <td
                          key={`${row.id}-${column.key}`}
                          rowSpan={variationCount > 1 ? variationCount : undefined}
                          className={`border-b border-r border-soft-border ${
                            ['dieCode', 'dieQty', 'dieLoc'].includes(column.key) ? 'p-0' : 'px-2 h-9 text-center'
                          } ${
                            column.key === '__select__' ? 'sticky left-0 z-10 bg-white border-l shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]' : ''
                          } ${isEditMode && !NON_EDITABLE_KEYS.has(column.key) && STOCK_STAGE_MAP[column.key] !== undefined && editFieldType !== 'wip-vs-current' && editFieldType !== 'final-stock' && editFieldType !== 'final-stock-location' ? 'bg-blue-50/40' : ''}`}
                        >
                          {column.key === '__select__' ? (
                            <Checkbox
                              checked={selectedRows.has(row.id)}
                              onCheckedChange={() => toggleRowSelection(row.id)}
                            />
                          ) : isRowEditing ? (
                            (() => {
                              const isStockCol = STOCK_STAGE_MAP[column.key] !== undefined;

                              if (editFieldType === 'final-stock') {
                                return <CompositeStockDisplay value={row[column.key]} />;
                              }

                              if (editFieldType === 'final-stock-location') {
                                return <CompositeStockDisplay value={row[column.key]} />;
                              }

                              if (editFieldType === 'location') {
                                if (!isStockCol) return <CompositeStockDisplay value={row[column.key]} />;
                                return (
                                  <input
                                    type="text"
                                    value={editData?.[column.key] ?? ''}
                                    onChange={(e) => handleEditFieldChange(row.id, column.key, e.target.value)}
                                    className="w-full min-w-[70px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                                    placeholder="Location"
                                  />
                                );
                              }

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

                              if (isStockCol) {
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

                              return <CompositeStockDisplay value={row[column.key]} />;
                            })()
                          ) : column.key === 'sku' ? (
                            <span className="inline-flex items-center gap-0.5">
                              <CompositeStockDisplay value={row[column.key]} />
                              <AlertBadge alertData={alertByProductId.get(row.id)} show="orange" />
                            </span>
                          ) : (column.key === 'waxPiece' || column.key === 'waxSetting' || column.key === 'casting') && (row.dieRefs?.length > 0) ? (
                            <span className="inline-flex items-center justify-center gap-1">
                              <CompositeStockDisplay value={row[column.key]} />
                              <button
                                type="button"
                                onClick={() => openDiePopup(row, column.key, column.label)}
                                className="text-trust-blue/60 hover:text-trust-blue transition-colors flex-shrink-0"
                                title={`View die breakdown for ${column.label}`}
                              >
                                <Info size={12} />
                              </button>
                            </span>
                          ) : column.key === 'dieCode' || column.key === 'dieQty' || column.key === 'dieLoc' ? (
                            <div className="flex flex-col divide-y divide-soft-border">
                              {(row.allDieEntries || []).length === 0 ? (
                                <div className="py-1.5 px-2 text-center text-xs text-cool-gray">—</div>
                              ) : (row.allDieEntries || []).map((ref, i) => (
                                <div key={i} className="py-1.5 px-2 text-center text-xs flex items-center justify-center gap-0.5">
                                  {column.key === 'dieCode' ? (
                                    <>
                                      <span className="font-medium text-midnight-ink">{ref.value || '—'}</span>
                                      {String(ref.type || '') === 'findings' && <span className="text-[9px] text-cool-gray">&nbsp;(F)</span>}
                                    </>
                                  ) : column.key === 'dieQty' ? (
                                    <span className="text-midnight-ink">{ref.quantity || '—'}</span>
                                  ) : (
                                    <span className="text-cool-gray">{ref.location || '—'}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <CompositeStockDisplay value={row[column.key]} />
                          )}
                        </td>
                      ))}

                      {/* ── Per-variation cells — Final Stock SKU, Value, Unit, Location ── */}
                      {variationCols.map((column) => {
                        let displayValue = '';
                        if (column.key === 'finalStockSku') displayValue = variation.sku;
                        else if (column.key === 'finalStockValue') displayValue = variation.value;
                        else if (column.key === 'finalStockUnit') displayValue = variation.unit;
                        else if (column.key === 'dieLocation') displayValue = variation.location || '';

                        const isVariationEditable = isRowEditing && !NON_EDITABLE_KEYS.has(column.key) && (() => {
                          if (editFieldType === 'final-stock') return column.key === 'finalStockValue';
                          if (editFieldType === 'location') return isFirst && column.key === 'dieLocation';
                          if (editFieldType === 'final-stock-location') return column.key === 'dieLocation';
                          return isFirst && (column.key === 'finalStockValue' || column.key === 'dieLocation');
                        })();

                        const isVariationHighlighted = isEditMode && !NON_EDITABLE_KEYS.has(column.key) && (() => {
                          if (editFieldType === 'final-stock') return column.key === 'finalStockValue';
                          if (editFieldType === 'location') return isFirst && column.key === 'dieLocation';
                          if (editFieldType === 'final-stock-location') return column.key === 'dieLocation';
                          if (editFieldType === 'wip-vs-current') return false;
                          return isFirst && (column.key === 'finalStockValue' || column.key === 'dieLocation');
                        })();

                        return (
                          <td
                            key={`${row.id}-${column.key}-v${varIdx}`}
                            className={`border-b border-r border-soft-border px-2 h-9 text-center ${isVariationHighlighted ? 'bg-blue-50/40' : ''}`}
                          >
                            {isVariationEditable ? (
                              column.key === 'finalStockValue' ? (
                                <input
                                  type="number"
                                  value={editFieldType === 'final-stock' ? (editData?.[variation.sku] ?? '') : (editData?.finalStockValue ?? '')}
                                  min="0"
                                  onChange={(e) => handleEditFieldChange(row.id, editFieldType === 'final-stock' ? variation.sku : 'finalStockValue', e.target.value)}
                                  className="w-full min-w-[60px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={editFieldType === 'final-stock-location' ? (editData?.[`loc__${variation.sku}`] ?? '') : (editData?.dieLocation ?? '')}
                                  onChange={(e) => handleEditFieldChange(row.id, editFieldType === 'final-stock-location' ? `loc__${variation.sku}` : 'dieLocation', e.target.value)}
                                  className="w-full min-w-[80px] border border-trust-blue/50 rounded px-1 py-0.5 text-xs text-center bg-blue-50 focus:outline-none focus:ring-1 focus:ring-trust-blue"
                                  placeholder="Location"
                                />
                              )
                            ) : column.key === 'finalStockSku' ? (
                              <span className="inline-flex items-center gap-0.5">
                                <span>{displayValue}</span>
                                <AlertBadge alertData={alertByProductId.get(row.id)} show="red" />
                              </span>
                            ) : (
                              <span>{displayValue}</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="border-b border-l border-r border-soft-border px-2 h-9 text-center text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '160px', zIndex: 12, boxShadow: '-4px 0 6px -2px rgba(0,0,0,0.10)' }}>
                        {(() => {
                          const varSkuUpper = String(variation.sku || '').trim().toUpperCase();
                          if (selectedPicklists && selectedPicklists.length > 0) {
                            return varSkuUpper ? (picklistNeededBySku.get(varSkuUpper) ?? '') : '';
                          }
                          // No picklist — show product-level demand on every variation row
                          return row.totalInDemand || '';
                        })()}
                      </td>
                      {/* ORDER PICK LIST: shows this variation's Final Stock SKU */}
                      <td className="border-b border-l border-r border-soft-border px-2 h-9 text-sm text-midnight-ink bg-white" style={{ position: 'sticky', right: '0', zIndex: 12 }}>
                        {variation.sku || ''}
                      </td>
                    </tr>
                  );
                });
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
        <DeletionHistoryDrawer appLabel="inventory" modelName="inventorytransaction" sheet="inventory" />
      </div>

      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        mode="single-pipeline"
        picklistGroupNumber={selectedPicklistsData[0]?.number ?? null}
        onJobCreated={() => {
          loadProducts();
        }}
      />

      <CreateJobModal
        open={isCreateAllVouchersOpen}
        onOpenChange={setIsCreateAllVouchersOpen}
        mode="all"
        onJobCreated={() => {
          loadProducts();
        }}
      />

      <PendingVouchersModal
        open={isPendingVouchersOpen}
        onOpenChange={setIsPendingVouchersOpen}
        onVouchersApproved={() => {
          loadProducts();
        }}
      />

      <SuggestedVouchersModal
        open={isSuggestedVouchersOpen}
        onOpenChange={setIsSuggestedVouchersOpen}
        suggestedItems={suggestedItems}
        onVouchersCreated={() => {
          loadProducts();
        }}
      />

      <NeededVouchersModal
        open={isNeededVouchersOpen}
        onOpenChange={setIsNeededVouchersOpen}
        neededItems={neededItems}
        onVouchersCreated={() => {
          loadProducts();
        }}
      />

      {/* ── Stock Sheet Preview Modal ──────────────────────────────────────── */}
      {isStockSheetPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsStockSheetPreviewOpen(false)}
          />
          {/* Panel */}
          <div className="relative z-10 bg-background border border-border rounded-xl shadow-2xl flex flex-col"
            style={{ width: '96vw', maxWidth: 1400, height: '88vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-bold text-foreground">📋 Stock Sheet Preview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(() => {
                    const sel = filterSelections?.collection;
                    const label = (!sel || sel.size === 0) ? 'All Collections' : Array.from(sel).join(', ');
                    return `${label} · ${sortedProducts.length} product(s)`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportStockSheetExcel}
                  className="flex items-center gap-1.5 px-4 h-8 rounded-full border border-emerald-500 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download Excel
                </button>
                <button
                  onClick={exportStockSheetPDF}
                  className="flex items-center gap-1.5 px-4 h-8 rounded-full border border-blue-500 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" /> Print / PDF
                </button>
                <button
                  onClick={() => setIsStockSheetPreviewOpen(false)}
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <span className="text-lg">✕</span>
                </button>
              </div>
            </div>

            {/* Scrollable table */}
            <div className="flex-1 overflow-auto px-2 py-2">
              <table className="border-collapse text-xs" style={{ minWidth: '100%' }}>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {stockSheetPreviewData.headers.map((h, i) => (
                      <th
                        key={i}
                        className="bg-amber-800 text-white font-bold px-2 py-1.5 border border-amber-700 text-center whitespace-pre-line align-bottom"
                        style={{ minWidth: i < 3 ? 100 : 90 }}
                      >
                        {h.replace('\n', '\n')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockSheetPreviewData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-2 py-1 border border-border/40 align-middle ${
                            cIdx === 0 ? 'font-bold text-amber-700 whitespace-nowrap' :
                            cIdx === 1 ? 'font-mono text-xs' : ''
                          }`}
                        >
                          {/* Last col is image URLs — render as small thumbnails */}
                          {cIdx === stockSheetPreviewData.headers.length - 1 && cell ? (
                            <div className="flex flex-wrap gap-1">
                              {cell.split(' | ').filter(Boolean).map((url, idx) => (
                                <img key={idx} src={url} alt="" className="h-10 w-10 object-contain rounded border border-border" />
                              ))}
                            </div>
                          ) : (
                            cell || <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
              {stockSheetPreviewData.rows.length} row(s) · Stage columns show <strong>Location / Current Stock</strong> · Only selected collection(s) shown
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
