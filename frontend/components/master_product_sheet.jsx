'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import GlobalSearchBar from '@/components/global-search-bar';
import BulkUploadButton from '@/components/bulk-upload-button';
import LastUpdatedFooter from '@/components/last-updated-footer';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

const FILTER_FIELDS_PS = [
  { key: 'material', label: 'Material' },
  { key: 'category', label: 'Category' },
  { key: 'collection', label: 'Collection' },
  { key: 'settingType', label: 'Setting Type' },
  { key: 'enamelType', label: 'Enamel Type' },
  { key: 'shopifyStatus', label: 'Shopify Status' },
];

export default function MasterProductSheet() {
  const { canView, canEdit, canCreate, canExport, loading: permsLoading } = useSheetPermissions('master-product-sheet');
  const PRODUCT_SHEET_SYNC_KEY = 'product_sheet_updated_at';
  const PRODUCT_SHEET_SYNC_EVENT = 'product_sheet_sync';
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isPrintProductOpen, setIsPrintProductOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('default');
  
  // Column definitions for products — images is first
  const columns = [
    { id: 'images', label: 'Images' },
    { id: 'sku', label: 'Master SKU' },
    { id: 'designerSku', label: 'Designer SKU' },
    { id: 'listingName', label: 'Listing Name' },
    { id: 'material', label: 'Material' },
    { id: 'weight', label: 'Weight' },
    { id: 'category', label: 'Category' },
    { id: 'collection', label: 'Collection' },
    { id: 'settingType', label: 'Setting Type' },
    { id: 'enamelType', label: 'Enamel Type' },
    { id: 'activeChannels', label: 'Active Channels' },
    { id: 'shopifyStatus', label: 'Shopify Status' },
    { id: 'dieNumber', label: 'Die Number' },
    { id: 'dieLocation', label: 'Die Location' },
    { id: 'dieQty', label: 'Die Qty' },
    { id: 'findings', label: 'Findings' },
    { id: 'masterSku', label: 'Master SKU' },
    { id: 'color', label: 'Color' },
    { id: 'enamel', label: 'Enamel' },
    { id: 'stoneType', label: 'Stone Type', readOnly: true },
    { id: 'stoneSpecies', label: 'Stone Species', readOnly: true },
    { id: 'stoneVariety', label: 'Stone Variety', readOnly: true },
    { id: 'stoneColor', label: 'Stone Color', readOnly: true },
    { id: 'stoneCut', label: 'Stone Cut', readOnly: true },
    { id: 'stoneShape', label: 'Stone Shape', readOnly: true },
    { id: 'stoneLength', label: 'Stone Length', readOnly: true },
    { id: 'stoneWidth', label: 'Stone Width', readOnly: true },
    { id: 'stoneHeight', label: 'Stone Height', readOnly: true },
    { id: 'stoneQty', label: 'Stone Qty', readOnly: true },
    { id: 'platingType', label: 'Plating Type' },
    { id: 'platingColor', label: 'Plating Color' },
    { id: 'notes', label: 'Notes' },
    { id: 'invoicePrice', label: 'Invoice Price (₹)' },
  ];
  
  // Column configuration with styling
  const columnConfig = {
    images: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    sku: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    designerSku: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    listingName: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    material: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    weight: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    category: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    collection: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    settingType: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    enamelType: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    activeChannels: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    shopifyStatus: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    dieNumber: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    dieLocation: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    dieQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    findings: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    masterSku: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    color: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    enamel: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    stoneType: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneSpecies: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    stoneVariety: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    stoneColor: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneCut: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    stoneShape: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneLength: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneWidth: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    stoneHeight: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    stoneQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    platingType: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    platingColor: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    notes: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    invoicePrice: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
  };
  
  // Set default visible columns to prevent horizontal scrolling
  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('master-product-sheet', [
    'images',
    'sku',
    'listingName',
    'material',
    'category',
    'settingType',
    'enamelType',
    'shopifyStatus',
    'activeChannels',
  ]);
  
  // Toggle column selection in the manage columns dialog
  const toggleColumnSelection = (columnId) => {
    const newSelected = new Set(selectedColumnsForAction);
    if (newSelected.has(columnId)) {
      newSelected.delete(columnId);
    } else {
      newSelected.add(columnId);
    }
    setSelectedColumnsForAction(newSelected);
  };

  // Toggle select all columns
  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === columns.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(columns.map(col => col.id)));
    }
  };
  
  // Hide selected columns
  const handleHideColumns = () => {
    const newVisible = new Set(visibleColumns);
    selectedColumnsForAction.forEach(col => newVisible.delete(col));
    setVisibleColumns(newVisible);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };
  
  // Show selected columns
  const handleShowColumns = () => {
    const newVisible = new Set(visibleColumns);
    selectedColumnsForAction.forEach(col => newVisible.add(col));
    setVisibleColumns(newVisible);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };
  
  // Get columns that are currently hidden
  const hiddenColumns = columns.filter(col => !visibleColumns.has(col.id));
  
  // Filter states
  const [skuFilter, setSKUFilter] = useState('');
  const [filterSelections, setFilterSelections] = useState(() =>
    Object.fromEntries(FILTER_FIELDS_PS.map((f) => [f.key, new Set()]))
  );
  
  // Sample data for dropdowns
  const [materialOptions, setMaterialOptions] = useState([]);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [addMaterialError, setAddMaterialError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addCategoryError, setAddCategoryError] = useState('');
  const [collectionOptions, setCollectionOptions] = useState([]);
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [addCollectionError, setAddCollectionError] = useState('');
  const settingTypeOptions = ['Wax', 'Hand'];
  const enamelTypeOptions = ['Yes', 'No'];
  const shopifyStatusOptions = ['Active', 'Inactive', 'Draft'];

  const toggleFilterSelection = (fieldKey, value) => {
    setFilterSelections((prev) => {
      const nextSet = new Set(prev[fieldKey] || []);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      return { ...prev, [fieldKey]: nextSet };
    });
  };

  const clearFilterSelection = (fieldKey) => {
    setFilterSelections((prev) => ({ ...prev, [fieldKey]: new Set() }));
  };

  const fetchMaterials = useCallback(() => {
    fetch('/frontend/api/materials', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (data?.data) setMaterialOptions(data.data.map((m) => m.name)); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleAddMaterial = useCallback(async () => {
    const name = newMaterialName.trim();
    if (!name) { setAddMaterialError('Material name cannot be empty.'); return; }
    const res = await fetch('/frontend/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const resData = await res.json();
    if (!res.ok) { setAddMaterialError(resData?.name?.[0] || 'Failed to add material.'); return; }
    setNewMaterialName('');
    setAddMaterialError('');
    setIsAddMaterialOpen(false);
    fetchMaterials();
  }, [newMaterialName, fetchMaterials]);

  const fetchCategories = useCallback(() => {
    fetch('/frontend/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (data?.data) setCategoryOptions(data.data.map((c) => c.name)); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleAddCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) { setAddCategoryError('Category name cannot be empty.'); return; }
    const res = await fetch('/frontend/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const resData = await res.json();
    if (!res.ok) { setAddCategoryError(resData?.name?.[0] || 'Failed to add category.'); return; }
    setNewCategoryName('');
    setAddCategoryError('');
    setIsAddCategoryOpen(false);
    fetchCategories();
  }, [newCategoryName, fetchCategories]);

  const fetchCollections = useCallback(() => {
    fetch('/frontend/api/collections', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (data?.data) setCollectionOptions(data.data.map((c) => c.name)); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleAddCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) { setAddCollectionError('Collection name cannot be empty.'); return; }
    const res = await fetch('/frontend/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const resData = await res.json();
    if (!res.ok) {
      setAddCollectionError(resData?.name?.[0] || 'Failed to add collection.');
      return;
    }
    setNewCollectionName('');
    setAddCollectionError('');
    setIsAddCollectionOpen(false);
    fetchCollections();
  }, [newCollectionName, fetchCollections]);

  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');

    try {
      const response = await fetch('/api/products', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to fetch product data');
      }

      const rows = Array.isArray(result.data)
        ? result.data
        : (Array.isArray(result?.data?.results) ? result.data.results : []);

      const mappedRows = rows.map((product) => ({
        id: product.id,
        sku: product.master_sku || '',
        listingName: (product.name && product.name !== product.master_sku) ? product.name : '',
        material: product.material || '',
        weight: product.weight || '',
        category: product.category || '',
        collection: product.collection || '',
        settingType: product.setting_type || '',
        enamelType: product.enamel_type || '',
        activeChannels: product.active_channels || '',
        shopifyStatus: product.is_active ? 'active' : 'inactive',
        dieNumber: Array.isArray(product.die_numbers) ? product.die_numbers : [],
        findings: Array.isArray(product.findings) && product.findings.length > 0
          ? product.findings.filter(f => f.value).map((f) => { const p = [f.value]; if (f.quantity) p.push(`[${f.quantity}]`); if (f.location) p.push(`[${f.location}]`); return p.join(''); }).filter(Boolean).join(', ')
          : '',
        masterSku: product.master_sku || '',
        designerSku: product.designer_sku || '',
        color: product.color || '',
        enamel: product.enamel || '',
        ...(() => {
          const sRows = Array.isArray(product.stone_entries) ? product.stone_entries : [];
          const j = (key) => sRows.map((r) => String(r[key] || '')).filter(Boolean).join(' / ');
          return {
            stoneType: j('type'),
            stoneSpecies: j('species'),
            stoneVariety: j('variety'),
            stoneColor: j('color'),
            stoneCut: j('cut'),
            stoneShape: j('shape'),
            stoneLength: j('length'),
            stoneWidth: j('width'),
            stoneHeight: j('height'),
            stoneQty: j('qty'),
            stoneEntries: sRows,
          };
        })(),
        platingType: product.plating_type || '',
        platingColor: product.plating_color || '',
        notes: product.notes || '',
        invoicePrice: String(product.invoice_price || '0'),
        images: Array.isArray(product.images) ? product.images : [],
      }));

      setData(mappedRows);
      setLastUpdated(new Date());
    } catch (error) {
      setFetchError(error.message || 'Failed to load products');
      setData([]);
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

    const handleProductSync = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener(PRODUCT_SHEET_SYNC_EVENT, handleProductSync);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener(PRODUCT_SHEET_SYNC_EVENT, handleProductSync);
    };
  }, [loadProducts]);

  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };


  const handleCellChange = (id, field, value) => {
    setData(data.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Fetch designer + product data when Master SKU is typed and Enter/Tab pressed
  const handleMasterSkuLookup = async (rowId, masterSku) => {
    const sku = (masterSku || '').trim();
    if (!sku) return;

    try {
      // Fetch designer data by SKU
      const [designerRes, productRes] = await Promise.all([
        fetch(`/api/designers?sku=${encodeURIComponent(sku)}`, { cache: 'no-store' }),
        fetch(`/api/products?master_sku=${encodeURIComponent(sku)}`, { cache: 'no-store' }),
      ]);

      const designerResult = await designerRes.json().catch(() => null);
      const productResult = await productRes.json().catch(() => null);

      const designerRows = designerRes.ok && designerResult?.success
        ? (Array.isArray(designerResult.data) ? designerResult.data : designerResult.data?.results || [])
        : [];
      const productRows = productRes.ok && productResult?.success
        ? (Array.isArray(productResult.data) ? productResult.data : productResult.data?.results || [])
        : [];

      const designer = designerRows[0] || null;
      const product = productRows[0] || null;

      if (!designer && !product) return;

      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const updates = {};

          // Auto-fill from designer data
          if (designer) {
            if (designer.design_material && !row.material) updates.material = designer.design_material;
            // Stone info — auto-fill only cut/shape/length/width/height/qty from designer; type/species/variety/color stay manual
            if (Array.isArray(designer.stone_entries) && designer.stone_entries.length > 0) {
              const sRows = designer.stone_entries;
              const existingEntries = Array.isArray(row.stoneEntries) ? row.stoneEntries : [];
              const mergedEntries = sRows.map((s, i) => ({
                type: existingEntries[i]?.type || '',
                species: existingEntries[i]?.species || '',
                variety: existingEntries[i]?.variety || '',
                color: existingEntries[i]?.color || '',
                cut: s.cut || '',
                shape: s.shape || '',
                length: s.length || '',
                width: s.width || '',
                height: s.height || '',
                qty: s.qty || '',
              }));
              const j = (key) => mergedEntries.map((r) => String(r[key] || '')).filter(Boolean).join(' / ');
              updates.stoneEntries = mergedEntries;
              updates.stoneCut = j('cut');
              updates.stoneShape = j('shape');
              updates.stoneLength = j('length');
              updates.stoneWidth = j('width');
              updates.stoneHeight = j('height');
              updates.stoneQty = j('qty');
            }
            // Die/Findings from designer
            const dieInfo = designer.total_die_code != null ? String(designer.total_die_code) : '';
            const findingsInfo = Array.isArray(designer.findings_entries) && designer.findings_entries[0];
            if (dieInfo && !(Array.isArray(row.dieNumber) && row.dieNumber.length > 0)) updates.dieNumber = [{ value: dieInfo, quantity: '', location: '' }];
            if (findingsInfo?.code && !row.findings) updates.findings = findingsInfo.code;
          }

          // Auto-fill from product data (if a product with this SKU exists)
          if (product) {
            if (product.name && !row.listingName) updates.listingName = product.name;
            if (product.material && !row.material) updates.material = product.material;
            if (product.weight && !row.weight) updates.weight = product.weight;
            if (product.category && !row.category) updates.category = product.category;
            if (product.collection && !row.collection) updates.collection = product.collection;
            if (product.setting_type && !row.settingType) updates.settingType = product.setting_type;
            if (product.enamel_type && !row.enamelType) updates.enamelType = product.enamel_type;
            if (product.active_channels && !row.activeChannels) updates.activeChannels = product.active_channels;
            if (product.color && !row.color) updates.color = product.color;
            if (product.enamel && !row.enamel) updates.enamel = product.enamel;
            if (Array.isArray(product.stone_entries) && product.stone_entries.length > 0 && (!row.stoneEntries || row.stoneEntries.length === 0)) {
              const sRows = product.stone_entries;
              const j = (key) => sRows.map((r) => String(r[key] || '')).filter(Boolean).join(' / ');
              updates.stoneEntries = sRows;
              updates.stoneType = j('type');
              updates.stoneSpecies = j('species');
              updates.stoneVariety = j('variety');
              updates.stoneColor = j('color');
              updates.stoneCut = j('cut');
              updates.stoneShape = j('shape');
              updates.stoneLength = j('length');
              updates.stoneWidth = j('width');
              updates.stoneHeight = j('height');
              updates.stoneQty = j('qty');
            }
            if (product.plating_type && !row.platingType) updates.platingType = product.plating_type;
            if (product.plating_color && !row.platingColor) updates.platingColor = product.plating_color;
            if (product.notes && !row.notes) updates.notes = product.notes;
          }

          return Object.keys(updates).length > 0 ? { ...row, ...updates } : row;
        })
      );
    } catch {
      // Silently fail — user can still manually fill fields
    }
  };

  const handleFindingCodeLookup = async (rowId, findingCode) => {
    const code = (findingCode || '').trim();
    if (!code) return;
    try {
      const res = await fetch(`/api/findings?finding_code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) return;
      const rows = Array.isArray(json.data) ? json.data : (json.data?.results || []);
      const finding = rows[0] || null;
      if (!finding) return;
      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const updates = {};
          // Auto-fill dieNumber from finding's die_number if currently empty
          if (finding.die_number && !(Array.isArray(row.dieNumber) && row.dieNumber.length > 0)) updates.dieNumber = [{ value: finding.die_number, quantity: '', location: '' }];
          // Auto-fill weight from finding if currently empty
          if (finding.weight && !row.weight) updates.weight = finding.weight;
          return Object.keys(updates).length > 0 ? { ...row, ...updates } : row;
        })
      );
    } catch {
      // Silently fail — user can still manually fill fields
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintProducts = () => {
    if (selectedRows.size === 0) {
      alert('Please select a product to print');
      return;
    }
    const productId = Array.from(selectedRows)[0];
    const product = data.find(row => row.id === productId);
    setSelectedProductForPrint(product);
    setIsPrintProductOpen(true);
  };

  const handlePrintSheet = () => {
    setIsPrintSheetOpen(true);
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const EXPORT_FIELDS = columns.filter((c) => c.id !== 'images').map((c) => c.id);
  const EXPORT_LABELS = columns.filter((c) => c.id !== 'images').map((c) => c.label);
  const formatExportCell = (f, r) => {
    const dies = Array.isArray(r.dieNumber) ? r.dieNumber : [];
    if (f === 'dieNumber') return dies.map((d) => d.value || '').filter(Boolean).join(', ');
    if (f === 'dieLocation') return dies.map((d) => d.location || '').filter(Boolean).join(', ');
    if (f === 'dieQty') return dies.map((d) => d.quantity || '').filter(Boolean).join(', ');
    return r[f] ?? '';
  };
  const exportToExcel = () => {
    if (!canExport) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([EXPORT_LABELS, ...sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => formatExportCell(f, r)))]), 'Products');
    XLSX.writeFile(wb, 'master_product_sheet.xlsx');
    setExportMenuOpen(false);
  };
  const exportToPDF = () => {
    if (!canExport) return;
    const rows = sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => formatExportCell(f, r)));
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Master Product Sheet</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>Master Product Sheet</h2><table><thead><tr>${EXPORT_LABELS.map((l)=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
    setExportMenuOpen(false);
  };

  const handleExport = () => {
    console.log('Export data:', data);
  };

  const handleCreateProduct = () => {
    window.location.assign(`/?new=${Date.now()}`);
  };

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const handleAddRow = () => {
    const tempId = -Date.now(); // negative temp ID to distinguish from real backend IDs
    const newRow = {
      id: tempId,
      _isNew: true,
      sku: '',
      listingName: '',
      material: '',
      weight: '',
      category: '',
      collection: '',
      settingType: '',
      enamelType: '',
      activeChannels: '',
      shopifyStatus: 'active',
      dieNumber: [],
      findings: '',
      masterSku: '',
      designerSku: '',
      color: '',
      enamel: '',
      stoneType: '',
      stoneSpecies: '',
      stoneVariety: '',
      stoneColor: '',
      stoneCut: '',
      stoneShape: '',
      stoneLength: '',
      stoneWidth: '',
      stoneHeight: '',
      stoneQty: '',
      stoneEntries: [],
      platingType: '',
      platingColor: '',
      notes: '',
      invoicePrice: '0',
      images: [],
    };
    setData((prev) => [newRow, ...prev]);
    setEditingRowIds((prev) => new Set([...prev, tempId]));
  };

  const handleEditRow = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to edit');
      return;
    }
    setEditingRowIds(new Set(selectedRows));
  };

  const [saveEditStatus, setSaveEditStatus] = useState(null); // { success, message }
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    const editedRows = data.filter((row) => editingRowIds.has(row.id));
    if (editedRows.length === 0) {
      setEditingRowIds(new Set());
      setSelectedRows(new Set());
      return;
    }
    setIsSavingEdit(true);
    setSaveEditStatus(null);
    const errors = [];
    let updatedData = [...data];

    for (const row of editedRows) {
      try {
        const payload = {
          name: row.listingName || '',
          category: row.category,
          is_active: String(row.shopifyStatus).toLowerCase() !== 'inactive',
          material: row.material,
          weight: row.weight,
          collection: row.collection,
          setting_type: row.settingType,
          enamel_type: row.enamelType,
          active_channels: row.activeChannels,
          master_sku: row.masterSku,
          designer_sku: row.designerSku || '',
          color: row.color,
          enamel: row.enamel,
          stone_entries: Array.isArray(row.stoneEntries) ? row.stoneEntries : [],
          plating_type: row.platingType,
          plating_color: row.platingColor,
          notes: row.notes,
          invoice_price: parseFloat(row.invoicePrice) || 0,
          selling_price: parseFloat(row.invoicePrice) || 0,
          die_numbers: Array.isArray(row.dieNumber) ? row.dieNumber.filter((d) => d.value) : [],
          findings: row.findings
            ? row.findings.split(',').map((v) => ({ value: v.trim(), quantity: '', location: '' })).filter((f) => f.value)
            : [],
        };

        if (row._isNew) {
          if (!row.sku.trim()) {
            errors.push('New row requires a SKU');
            continue;
          }
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, master_sku: row.sku }),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.success) throw new Error(result?.message || 'Failed to create product');
          const savedId = result.data?.id;
          if (savedId) {
            updatedData = updatedData.map((r) =>
              r.id === row.id ? { ...r, id: savedId, _isNew: false } : r
            );
          }
        } else {
          const response = await fetch(`/api/products/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.success) throw new Error(result?.message || `Failed to save ${row.sku || 'row'}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    // Auto-create any new category / material / collection values so they
    // appear in the respective filter dropdowns without a manual "+ Add" step.
    const successfulRows = editedRows.filter(
      (row) => !errors.some((e) => e.includes(row.sku || String(row.id)))
    );
    const ensureOption = async (value, currentList, apiPath) => {
      const trimmed = (value || '').trim();
      if (!trimmed) return;
      const normalised = trimmed.toLowerCase();
      if (currentList.some((o) => o.toLowerCase() === normalised)) return;
      await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      }).catch(() => {});
    };
    for (const row of successfulRows) {
      await ensureOption(row.category,   categoryOptions,   '/api/categories');
      await ensureOption(row.material,   materialOptions,   '/api/materials');
      await ensureOption(row.collection, collectionOptions, '/api/collections');
    }
    // Refresh option lists to reflect any newly created entries
    if (successfulRows.length > 0) {
      fetchCategories();
      fetchMaterials();
      fetchCollections();
    }

    setData(updatedData);
    setIsSavingEdit(false);
    setEditingRowIds(new Set());
    setSelectedRows(new Set());
    if (errors.length > 0) {
      setSaveEditStatus({ success: false, message: errors.join('; ') });
    } else {
      setSaveEditStatus({ success: true, message: `${editedRows.length} row(s) saved` });
      setTimeout(() => setSaveEditStatus(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowIds(new Set());
  };

  const handleDeleteRows = async () => {
    const toDelete = Array.from(selectedRows);
    if (toDelete.length === 0) return;
    setIsDeletingRows(true);
    setDeleteStatus(null);
    const errors = [];
    for (const id of toDelete) {
      const row = data.find((r) => r.id === id);
      if (row?._isNew) {
        // Not yet saved to backend — just remove from local state
        continue;
      }
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || `Failed to delete row ${id}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }
    // Remove successfully deleted rows from local state
    const failedIds = new Set(
      errors.length > 0
        ? toDelete.filter((id) => errors.some((e) => e.includes(String(id))))
        : []
    );
    setData((prev) => prev.filter((r) => !toDelete.includes(r.id) || failedIds.has(r.id)));
    setSelectedRows(new Set());
    setIsDeleteConfirmOpen(false);
    setIsDeletingRows(false);
    if (errors.length > 0) {
      setDeleteStatus({ success: false, message: errors.join('; ') });
    } else {
      setDeleteStatus({ success: true, message: `${toDelete.length} row(s) deleted` });
      setTimeout(() => setDeleteStatus(null), 3000);
    }
  };

  const handleArchiveRow = () => {
    if (viewMode === 'archived') {
      alert('Switch to active rows to archive');
      return;
    }
    if (selectedRows.size === 0) {
      alert('Please select at least one row to archive');
      return;
    }
    const newArchived = new Set(archivedRows);
    selectedRows.forEach(id => newArchived.add(id));
    setArchivedRows(newArchived);
    setSelectedRows(new Set());
  };

  const handleUnarchiveRows = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to unarchive');
      return;
    }
    const newArchived = new Set(archivedRows);
    selectedRows.forEach(id => newArchived.delete(id));
    setArchivedRows(newArchived);
    setSelectedRows(new Set());
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    setCurrentPage(1);
    setSelectedRows(new Set());
    setEditingRowIds(new Set());
  };

  // Get active (non-archived) data
  const activeData = data.filter(row => !archivedRows.has(row.id));
  const archivedData = data.filter(row => archivedRows.has(row.id));
  const isArchivedView = viewMode === 'archived';
  const baseData = isArchivedView ? archivedData : activeData;

  const filterOptionsByField = useMemo(() => {
    const staticOptions = {
      material: materialOptions,
      category: categoryOptions,
      collection: collectionOptions,
      settingType: settingTypeOptions,
      enamelType: enamelTypeOptions,
      shopifyStatus: shopifyStatusOptions,
    };
    const merged = {};
    Object.keys(staticOptions).forEach((key) => {
      // Use a Map keyed by lowercase for case-insensitive dedup.
      // Static options take precedence (title-case is the canonical display value).
      const seen = new Map();
      staticOptions[key].forEach((v) => seen.set(v.toLowerCase(), v));
      baseData.forEach((row) => {
        const val = row[key];
        if (val) {
          const trimmed = String(val).trim();
          const lower = trimmed.toLowerCase();
          if (!seen.has(lower)) seen.set(lower, trimmed);
        }
      });
      merged[key] = Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    });
    return merged;
  }, [materialOptions, categoryOptions, collectionOptions, baseData]);

  const filteredData = useMemo(() => {
    return baseData.filter((row) => {
      const searchLower = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !searchLower ||
        row.sku?.toLowerCase().includes(searchLower) ||
        row.listingName?.toLowerCase().includes(searchLower) ||
        row.material?.toLowerCase().includes(searchLower);

      const matchesSku = !skuFilter || row.sku?.toLowerCase().includes(skuFilter.toLowerCase());
      const matchesFilters = FILTER_FIELDS_PS.every((field) => {
        const selected = filterSelections[field.key];
        if (!selected || selected.size === 0) return true;
        const val = row[field.key];
        if (val == null) return false;
        const valLower = String(val).trim().toLowerCase();
        return Array.from(selected).some((s) => s.toLowerCase() === valLower);
      });

      return matchesSearch && matchesSku && matchesFilters;
    });
  }, [
    baseData,
    searchTerm,
    skuFilter,
    filterSelections,
  ]);

  const displayedData = filteredData;

  const sortedDisplayData = sortOrder === 'default' ? displayedData : [...displayedData].sort((a, b) => {
    if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortOrder === 'oldest') return (a.id || 0) - (b.id || 0);
    const av = String(a.sku || a.listingName || '').toLowerCase(), bv = String(b.sku || b.listingName || '').toLowerCase();
    return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sortedDisplayData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedDisplayData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const selectedProduct = useMemo(() => {
    const selectedId = selectedRows.values().next().value;
    if (selectedId === undefined) {
      return null;
    }
    return data.find((row) => row.id === selectedId) || null;
  }, [data, selectedRows]);

  const allDisplayedRowsSelected = paginatedData.length > 0 && paginatedData.every(row => selectedRows.has(row.id));
  const toggleSelectAllRows = (checked) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      {/* Datalists for edit-mode autocomplete (material / category / collection) */}
      <datalist id="mps-material-opts">
        {materialOptions.map((o) => <option key={o} value={o} />)}
      </datalist>
      <datalist id="mps-category-opts">
        {categoryOptions.map((o) => <option key={o} value={o} />)}
      </datalist>
      <datalist id="mps-collection-opts">
        {collectionOptions.map((o) => <option key={o} value={o} />)}
      </datalist>
      {/* Add Collection Dialog */}
      <Dialog open={isAddCollectionOpen} onOpenChange={setIsAddCollectionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Collection</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            className="border border-soft-border rounded px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:ring-2 focus:ring-trust-blue"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
            placeholder="Collection name"
            autoFocus
          />
          {addCollectionError && <p className="text-red-500 text-xs mb-2">{addCollectionError}</p>}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddCollectionOpen(false)}>Cancel</Button>
            <Button className="bg-trust-blue text-white hover:bg-deep-blue" onClick={handleAddCollection}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            className="border border-soft-border rounded px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:ring-2 focus:ring-trust-blue"
            value={newMaterialName}
            onChange={(e) => setNewMaterialName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
            placeholder="Material name"
            autoFocus
          />
          {addMaterialError && <p className="text-red-500 text-xs mb-2">{addMaterialError}</p>}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Cancel</Button>
            <Button className="bg-trust-blue text-white hover:bg-deep-blue" onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            className="border border-soft-border rounded px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:ring-2 focus:ring-trust-blue"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Category name"
            autoFocus
          />
          {addCategoryError && <p className="text-red-500 text-xs mb-2">{addCategoryError}</p>}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
            <Button className="bg-trust-blue text-white hover:bg-deep-blue" onClick={handleAddCategory}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
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
                  checked={selectedColumnsForAction.size === columns.length && columns.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
            {columns.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={column.id}
                    checked={selectedColumnsForAction.has(column.id)}
                    onCheckedChange={() => toggleColumnSelection(column.id)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={column.id} className="text-sm cursor-pointer">
                    {column.label}
                  </label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id) ? (
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

      {/* Print Product Dialog */}
      <Dialog open={isPrintProductOpen} onOpenChange={setIsPrintProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Product Details</DialogTitle>
          </DialogHeader>
          
          {selectedProductForPrint && (
            <div className="space-y-6 py-4">
              {/* Product Header */}
              <div className="border-2 border-midnight-ink p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">PRODUCT DETAILS</h2>
                
                {/* Top Section */}
                <div className="grid grid-cols-3 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">SKU</p>
                    <p className="text-sm">{selectedProductForPrint.sku || '—'}</p>
                  </div>
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">LISTING NAME</p>
                    <p className="text-sm">{selectedProductForPrint.listingName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">SHOPIFY STATUS</p>
                    <p className="text-sm">{selectedProductForPrint.shopifyStatus || '—'}</p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">MATERIAL</p>
                    <p className="text-sm">{selectedProductForPrint.material || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">WEIGHT</p>
                    <p className="text-sm">{selectedProductForPrint.weight || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">CATEGORY</p>
                    <p className="text-sm">{selectedProductForPrint.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">COLLECTION</p>
                    <p className="text-sm">{selectedProductForPrint.collection || '—'}</p>
                  </div>
                </div>

                {/* Product Information */}
                <div className="mb-6">
                  <table className="w-full border-collapse border-2 border-midnight-ink break-words">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left break-words">SETTING TYPE</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left break-words">ENAMEL TYPE</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left break-words">ACTIVE CHANNELS</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left break-words">MASTER SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-2 border-midnight-ink p-2 text-sm break-words">{selectedProductForPrint.settingType || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm break-words">{selectedProductForPrint.enamelType || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm break-words">{selectedProductForPrint.activeChannels || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm break-words">{selectedProductForPrint.masterSku || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Verified By</p>
                    <div className="border-t-2 border-midnight-ink w-24"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Date</p>
                    <p className="text-sm">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button
                  onClick={() => window.print()}
                  className="bg-trust-blue hover:bg-deep-blue text-white"
                >
                  Print
                </Button>
                <Button
                  onClick={() => setIsPrintProductOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Sheet Dialog */}
      <Dialog open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Master Product Sheet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sheet Header */}
            <div className="text-center border-b-2 border-midnight-ink pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">MASTER PRODUCT SHEET</h2>
              <p className="text-sm text-cool-gray">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>

            {/* Sheet Details Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-cloud-gray rounded-lg border border-soft-border">
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total Products</p>
                <p className="text-lg font-bold">{filteredData.length}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Selected Products</p>
                <p className="text-lg font-bold">{selectedRows.size}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total SKUs</p>
                <p className="text-lg font-bold">{filteredData.filter(row => row.sku).length}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Active Listings</p>
                <p className="text-lg font-bold">{filteredData.filter(row => row.shopifyStatus?.toLowerCase() === 'active').length}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border-2 border-midnight-ink rounded overflow-x-auto">
              <table className="w-full border-collapse text-sm break-words">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="border border-soft-border p-2 text-left break-words">SKU</th>
                    <th className="border border-soft-border p-2 text-left break-words">Listing Name</th>
                    <th className="border border-soft-border p-2 text-left break-words">Material</th>
                    <th className="border border-soft-border p-2 text-left break-words">Category</th>
                    <th className="border border-soft-border p-2 text-left break-words">Collection</th>
                    <th className="border border-soft-border p-2 text-left break-words">Setting Type</th>
                    <th className="border border-soft-border p-2 text-left break-words">Enamel Type</th>
                    <th className="border border-soft-border p-2 text-left break-words">Shopify Status</th>
                    <th className="border border-soft-border p-2 text-left break-words">Active Channels</th>
                    <th className="border border-soft-border p-2 text-left break-words">Master SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-cloud-gray'}>
                      <td className="border border-soft-border p-2 break-words">{row.sku || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.listingName || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.material || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.category || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.collection || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.settingType || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.enamelType || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.shopifyStatus || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.activeChannels || '—'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.masterSku || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="border-t-2 border-midnight-ink pt-4 mt-6">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-sm font-bold text-slate-text mb-8">Prepared By</p>
                  <div className="border-t-2 border-midnight-ink w-32"></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-text mb-8">Reviewed By</p>
                  <div className="border-t-2 border-midnight-ink w-32"></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-text mb-8">Approved By</p>
                  <div className="border-t-2 border-midnight-ink w-32"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                onClick={() => window.print()}
                className="bg-trust-blue hover:bg-deep-blue text-white"
              >
                Print Sheet
              </Button>
              <Button
                onClick={() => setIsPrintSheetOpen(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedRows.size} row(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-cool-gray py-2">
            This will permanently delete the selected row(s) from the database. This action cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => setIsDeleteConfirmOpen(false)}
              variant="outline"
              disabled={isDeletingRows}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRows}
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={isDeletingRows}
            >
              {isDeletingRows ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 pt-16 px-3 md:px-4 pb-16">
        {/* Header Section */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER PRODUCT SHEET</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          {/* Search Bar */}
          <div className="relative mr-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-4 h-4" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-soft-border rounded-lg pl-9 pr-4 h-9 w-64 text-sm"
            />
          </div>
          <Button
            onClick={loadProducts}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          {canCreate && <BulkUploadButton sheetType="products" onComplete={loadProducts} />}
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
          {canCreate && (
            <Button 
              onClick={handleCreateProduct}
              className="bg-success hover:bg-success text-white rounded-full px-4 text-sm h-8"
            >
              Add Product
            </Button>
          )}
          {canEdit && (
            <Button 
              onClick={handleEditRow}
              variant="outline"
              className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
              disabled={isArchivedView}
            >
              Edit Row
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={() => {
                if (selectedRows.size === 0) { alert('Please select at least one row to delete'); return; }
                setIsDeleteConfirmOpen(true);
              }}
              variant="outline"
              className="border-danger text-danger hover:bg-danger/10 rounded-full px-4 text-sm h-8"
              disabled={editingRowIds.size > 0}
            >
              Delete Row
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-warning text-warning hover:bg-warning/10 rounded-full px-4 text-sm h-8"
                >
                  Archive
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleArchiveRow} disabled={isArchivedView}>
                  Archive Selected Rows
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSetViewMode(isArchivedView ? 'active' : 'archived')}
                >
                  {isArchivedView ? 'Show Active Rows' : 'Show Archived Rows'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isArchivedView && canEdit && (
            <Button
              onClick={handleUnarchiveRows}
              variant="outline"
              className="border-green-600 text-success hover:bg-success/10 rounded-full px-4 text-sm h-8"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
          <Button 
            onClick={handleManageColumns}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Manage Columns
          </Button>
          <div className="relative">
            {exportMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />}
            <Button onClick={() => setExportMenuOpen((p) => !p)} variant="outline"
              className="relative z-20 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8 flex items-center gap-1.5"
              disabled={!canExport} title={!canExport ? 'You do not have permission to export' : undefined}>
              <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {exportMenuOpen && canExport && (
              <div className="absolute right-0 top-9 z-30 w-52 rounded-lg bg-white shadow-lg border border-soft-border py-1">
                <button type="button" onClick={exportToExcel} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as Excel (.xlsx)</button>
                <button type="button" onClick={exportToPDF} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as PDF</button>
              </div>
            )}
          </div>
          
          {/* Print Dropdown */}
          {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
              >
                Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handlePrintProducts}>
                Product Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintSheet}>
                Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>

      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* SKU text filter */}
          <Input
            type="text"
            placeholder="Enter SKU"
            value={skuFilter}
            onChange={(e) => setSKUFilter(e.target.value)}
            className="h-8 text-sm w-36 bg-white"
          />

          {/* Multi-select dropdown for each filter field */}
          {FILTER_FIELDS_PS.map((field) => (
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
              <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto p-2" onClick={(e) => e.stopPropagation()}>
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
                  <label key={option} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                    <Checkbox
                      checked={filterSelections[field.key]?.has(option)}
                      onCheckedChange={() => toggleFilterSelection(field.key, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                {field.key === 'material' && (
                  <div
                    className="flex items-center gap-1 px-1 py-1.5 text-sm text-trust-blue cursor-pointer hover:bg-cloud-gray border-t border-soft-border mt-1"
                    onMouseDown={(e) => { e.preventDefault(); setIsAddMaterialOpen(true); setNewMaterialName(''); setAddMaterialError(''); }}
                  >
                    + Add Material
                  </div>
                )}
                {field.key === 'category' && (
                  <div
                    className="flex items-center gap-1 px-1 py-1.5 text-sm text-trust-blue cursor-pointer hover:bg-cloud-gray border-t border-soft-border mt-1"
                    onMouseDown={(e) => { e.preventDefault(); setIsAddCategoryOpen(true); setNewCategoryName(''); setAddCategoryError(''); }}
                  >
                    + Add Category
                  </div>
                )}
                {field.key === 'collection' && (
                  <div
                    className="flex items-center gap-1 px-1 py-1.5 text-sm text-trust-blue cursor-pointer hover:bg-cloud-gray border-t border-soft-border mt-1"
                    onMouseDown={(e) => { e.preventDefault(); setIsAddCollectionOpen(true); setNewCollectionName(''); setAddCollectionError(''); }}
                  >
                    + Add Collection
                  </div>
                )}
                {filterOptionsByField[field.key]?.length === 0 && (
                  <p className="text-sm text-cool-gray">No values</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 rounded-md border border-trust-blue/30 bg-trust-blue/10 px-4 py-2 text-sm text-deep-blue">
          Loading products...
        </div>
      )}

      {!isLoading && fetchError && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger-dark flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <Button onClick={loadProducts} variant="outline" className="h-8 px-3 border-danger/40 text-danger-dark hover:bg-danger/10">
            Retry
          </Button>
        </div>
      )}

      {/* Table Section */}
      <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with scroll */}
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-[#dbeafe]">
              <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                  <Checkbox
                    checked={allDisplayedRowsSelected}
                    onCheckedChange={toggleSelectAllRows}
                    className="cursor-pointer"
                    disabled={displayedData.length === 0 || editingRowIds.size > 0}
                  />
                </th>
                {columns.map((column) => 
                  visibleColumns.has(column.id) && (
                    <th key={column.id} className={`border border-soft-border p-2 ${columnConfig[column.id].headerBg} ${columnConfig[column.id].minWidth}`}>
                      {column.label}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {displayedData.length === 0 && (
                <tr>
                  <td
                    className="border border-soft-border p-4 text-center text-sm text-cool-gray"
                    colSpan={visibleColumns.size + 1}
                  >
                    No products found. Add a product from Product Sheet, then click Refresh.
                  </td>
                </tr>
              )}

              {paginatedData.flatMap((row, idx) => {
                const isEditing = editingRowIds.has(row.id);
                const isAnyRowEditing = editingRowIds.size > 0;
                const canEdit = !isArchivedView && isEditing;
                const dies = Array.isArray(row.dieNumber) && row.dieNumber.length > 0
                  ? row.dieNumber
                  : [{ value: '', quantity: '', location: '' }];
                const dieSpan = dies.length;

                return dies.map((die, dieIdx) => (
                  <tr
                    key={`${row.id}-${dieIdx}`}
                    className={`border-b border-soft-border ${
                      isEditing
                        ? 'bg-trust-blue/10 hover:bg-trust-blue/10'
                        : 'hover:bg-cloud-gray'
                    }`}
                  >
                    {dieIdx === 0 && (
                      <td rowSpan={dieSpan} className={`border border-soft-border p-2 text-center sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${
                        isEditing ? 'bg-[#eff6ff]' : 'bg-white'
                      }`}>
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={() => toggleRowSelection(row.id)}
                          className="cursor-pointer"
                          disabled={isAnyRowEditing}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      if (!visibleColumns.has(column.id)) return null;
                      const isDieCol = column.id === 'dieNumber' || column.id === 'dieLocation' || column.id === 'dieQty';
                      if (isDieCol) {
                        const dieFieldMap = { dieNumber: 'value', dieLocation: 'location', dieQty: 'quantity' };
                        const field = dieFieldMap[column.id];
                        const cellValue = die[field] || '';
                        return (
                          <td key={column.id} className={`border border-soft-border p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                            {canEdit ? (
                              <Input
                                type="text"
                                value={cellValue}
                                onChange={(e) => {
                                  const newDies = (Array.isArray(row.dieNumber) ? row.dieNumber : []).map((d, i) =>
                                    i === dieIdx ? { ...d, [field]: e.target.value } : d
                                  );
                                  handleCellChange(row.id, 'dieNumber', newDies);
                                }}
                                className="border-0 p-1 text-sm h-8"
                              />
                            ) : (
                              <div className="min-h-8 px-1 py-1 text-sm whitespace-pre-wrap break-words leading-4">
                                {cellValue}
                              </div>
                            )}
                          </td>
                        );
                      }
                      if (dieIdx !== 0) return null;
                      return (
                        <td key={column.id} rowSpan={dieSpan} className={`border border-soft-border p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          {column.id === 'images' ? (
                            <ImageCell
                              images={row.images}
                              rowId={row.id}
                              isNew={!!row._isNew}
                              isEditing={canEdit}
                              onImagesChange={(newImages) => handleCellChange(row.id, 'images', newImages)}
                            />
                          ) : canEdit && !column.readOnly ? (
                            <Input
                              type="text"
                              list={
                                column.id === 'material'   ? 'mps-material-opts' :
                                column.id === 'category'   ? 'mps-category-opts' :
                                column.id === 'collection' ? 'mps-collection-opts' :
                                undefined
                              }
                              value={row[column.id]}
                              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                              onKeyDown={column.id === 'masterSku' ? (e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  handleMasterSkuLookup(row.id, row.masterSku);
                                }
                              } : column.id === 'findings' ? (e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  handleFindingCodeLookup(row.id, row.findings);
                                }
                              } : undefined}
                              onBlur={column.id === 'masterSku' ? () => handleMasterSkuLookup(row.id, row.masterSku) : column.id === 'findings' ? () => handleFindingCodeLookup(row.id, row.findings) : undefined}
                              className="border-0 p-1 text-sm h-8"
                            />
                          ) : column.id === 'sku' && row[column.id] ? (
                            <div className="min-h-8 px-1 py-1 text-sm whitespace-pre-wrap break-words leading-4">
                              <Link
                                href={`/frontend?sku=${encodeURIComponent(row[column.id])}`}
                                className="text-deep-blue underline hover:text-deep-blue"
                              >
                                {row[column.id]}
                              </Link>
                            </div>
                          ) : (
                            <div className="min-h-8 px-1 py-1 text-sm whitespace-pre-wrap break-words leading-4">
                              {row[column.id] || ''}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Row and Edit Controls */}
      <div className="mt-4 flex gap-2 items-center flex-wrap">
        {canCreate && (
          <Button 
            onClick={handleAddRow}
            className="bg-trust-blue hover:bg-deep-blue text-white px-6"
            disabled={editingRowIds.size > 0}
          >
            + Add Row
          </Button>
        )}
        
        {editingRowIds.size > 0 && (
          <div className="flex gap-2 ml-4 items-center flex-wrap">
            <Button 
              onClick={handleSaveEdit}
              className="bg-success hover:bg-success/90 text-white px-6"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              className="border-red-600 text-danger hover:bg-danger/10 px-6"
              disabled={isSavingEdit}
            >
              Cancel Edit
            </Button>
            {saveEditStatus && (
              <span className={`text-sm font-semibold ${saveEditStatus.success ? 'text-success' : 'text-danger'}`}>
                {saveEditStatus.message}
              </span>
            )}
          </div>
        )}
        {!editingRowIds.size && saveEditStatus && (
          <span className={`ml-4 text-sm font-semibold ${saveEditStatus.success ? 'text-success' : 'text-danger'}`}>
            {saveEditStatus.message}
          </span>
        )}
        {deleteStatus && (
          <span className={`ml-4 text-sm font-semibold ${deleteStatus.success ? 'text-success' : 'text-danger'}`}>
            {deleteStatus.message}
          </span>
        )}
      </div>

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
          <span>{displayedData.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, displayedData.length)}`} of {displayedData.length}</span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
          <span>Archived: {archivedRows.size}</span>
          {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} row(s)</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
        <DeletionHistoryDrawer appLabel="products" modelName="product" sheet="product" />
      </div>
    </div>
  );
}

function ImageCell({ images, rowId, isNew, isEditing, onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const imageList = Array.isArray(images) ? images : [];

  const backendBase =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://product-sheet.onrender.com';

  const resolveUrl = (url) => {
    if (!url) return '';
    // base64 data URLs and absolute URLs need no prepending
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendBase}${url}`;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isNew) {
      setUploadError('Save the row first, then upload an image.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/products/${rowId}/upload-image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Upload failed');
      onImagesChange(Array.isArray(data.data?.images) ? data.data.images : [...imageList, data.data?.url]);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1 min-h-8 px-1 py-1">
      {imageList.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {imageList.map((url, i) => (
            <img
              key={i}
              src={resolveUrl(url)}
              alt={`product-img-${i + 1}`}
              className="w-10 h-10 object-cover rounded border border-soft-border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ))}
        </div>
      )}
      {isEditing && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-0.5 rounded border border-trust-blue text-trust-blue hover:bg-trust-blue/10 disabled:opacity-50 w-fit"
          >
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          {uploadError && <span className="text-xs text-danger">{uploadError}</span>}
        </>
      )}
      {!isEditing && imageList.length === 0 && (
        <span className="text-xs text-cool-gray">—</span>
      )}
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
      <div className="px-2 py-1 bg-cloud-gray font-semibold text-xs text-slate-text border-b border-soft-border">{label}</div>
      <div className="px-2 py-2 text-sm min-h-[36px] whitespace-pre-wrap break-words">{value || '—'}</div>
    </div>
  );
}
