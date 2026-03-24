'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
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

export default function MasterProductSheet() {
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
  const [selectedProductForPrint, setSelectedProductForPrint] = useState(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Column definitions for products
  const columns = [
    { id: 'sku', label: 'SKU' },
    { id: 'listingName', label: 'Listing Name' },
    { id: 'material', label: 'Material' },
    { id: 'weight', label: 'Weight' },
    { id: 'category', label: 'Category' },
    { id: 'collection', label: 'Collection' },
    { id: 'settingType', label: 'Setting Type' },
    { id: 'enamelType', label: 'Enamel Type' },
    { id: 'activeChannels', label: 'Active Channels' },
    { id: 'shopifyStatus', label: 'Shopify Status' },
    { id: 'dieNumberFindings', label: 'Die Number/Findings' },
    { id: 'masterSku', label: 'Master SKU' },
    { id: 'color', label: 'Color' },
    { id: 'enamel', label: 'Enamel' },
    { id: 'stoneName', label: 'Stone Name' },
    { id: 'stoneCut', label: 'Stone Cut' },
    { id: 'stoneColor', label: 'Stone Color' },
    { id: 'stoneSize', label: 'Stone Size' },
    { id: 'stoneQuantity', label: 'Stone Quantity' },
    { id: 'platingType', label: 'Plating Type' },
    { id: 'platingColor', label: 'Plating Color' },
    { id: 'notes', label: 'Notes' },
    { id: 'images', label: 'Images' },
  ];
  
  // Column configuration with styling
  const columnConfig = {
    sku: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    listingName: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    material: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    weight: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    category: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    collection: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    settingType: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    enamelType: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    activeChannels: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    shopifyStatus: { minWidth: 'min-w-[90px]', headerBg: 'bg-[#dbeafe]' },
    dieNumberFindings: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    masterSku: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    color: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    enamel: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    stoneName: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneCut: { minWidth: 'min-w-[75px]', headerBg: 'bg-[#dbeafe]' },
    stoneColor: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    stoneSize: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    stoneQuantity: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    platingType: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    platingColor: { minWidth: 'min-w-[85px]', headerBg: 'bg-[#dbeafe]' },
    notes: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    images: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
  };
  
  // Set default visible columns to prevent horizontal scrolling
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'sku',
    'listingName',
    'material',
    'category',
    'settingType',
    'enamelType',
    'shopifyStatus',
    'activeChannels',
  ]));
  
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
  const [materialFilter, setMaterialFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [settingTypeFilter, setSettingTypeFilter] = useState('');
  const [enamelTypeFilter, setEnamelTypeFilter] = useState('');
  const [shopifyStatusFilter, setShopifyStatusFilter] = useState('');
  
  // Sample data for dropdowns
  const materialOptions = ['Gold', 'Silver', 'Brass', 'Copper', 'Mixed Metal'];
  const categoryOptions = ['Earrings', 'Rings', 'Pendants', 'Bracelets', 'Necklaces'];
  const collectionOptions = ['Collection 1', 'Collection 2', 'Collection 3', 'Collection 4'];
  const settingTypeOptions = ['Wax', 'Hand'];
  const enamelTypeOptions = ['Yes', 'No'];
  const shopifyStatusOptions = ['Active', 'Inactive', 'Draft'];

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
        sku: product.sku || '',
        listingName: product.name || '',
        material: product.material || '',
        weight: product.weight || '',
        category: product.category || '',
        collection: product.collection || '',
        settingType: product.setting_type || '',
        enamelType: product.enamel_type || '',
        activeChannels: product.active_channels || '',
        shopifyStatus: product.is_active ? 'active' : 'inactive',
        dieNumberFindings: '',
        masterSku: product.master_sku || product.sku || '',
        color: product.color || '',
        enamel: product.enamel || '',
        stoneName: product.stone_name || '',
        stoneCut: product.stone_cut || '',
        stoneColor: product.stone_color || '',
        stoneSize: product.stone_size || '',
        stoneQuantity: product.stone_quantity || '',
        platingType: product.plating_type || '',
        platingColor: product.plating_color || '',
        notes: product.notes || '',
        images: product.images || '',
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
        fetch(`/api/products?sku=${encodeURIComponent(sku)}`, { cache: 'no-store' }),
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
            // Stone info from first stone entry
            const s = Array.isArray(designer.stone_entries) && designer.stone_entries[0];
            if (s) {
              if (s.name && !row.stoneName) updates.stoneName = s.name;
              if (s.cut && !row.stoneCut) updates.stoneCut = s.cut;
              if (s.color && !row.stoneColor) updates.stoneColor = s.color;
              if (s.size && !row.stoneSize) updates.stoneSize = s.size;
              if (s.quantity && !row.stoneQuantity) updates.stoneQuantity = s.quantity;
            }
            // Die/Findings from designer
            const dieInfo = designer.die_code || '';
            const findingsInfo = Array.isArray(designer.findings_entries) && designer.findings_entries[0];
            if ((dieInfo || findingsInfo) && !row.dieNumberFindings) {
              const parts = [];
              if (dieInfo) parts.push(`Die: ${dieInfo}`);
              if (findingsInfo?.code) parts.push(`Findings: ${findingsInfo.code}`);
              updates.dieNumberFindings = parts.join(', ');
            }
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
            if (product.stone_name && !row.stoneName) updates.stoneName = product.stone_name;
            if (product.stone_cut && !row.stoneCut) updates.stoneCut = product.stone_cut;
            if (product.stone_color && !row.stoneColor) updates.stoneColor = product.stone_color;
            if (product.stone_size && !row.stoneSize) updates.stoneSize = product.stone_size;
            if (product.stone_quantity && !row.stoneQuantity) updates.stoneQuantity = product.stone_quantity;
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
          // Enrich dieNumberFindings with die number info from the finding
          if (finding.die_number && !row.dieNumberFindings.includes('Die:')) {
            updates.dieNumberFindings = `${code} | Die: ${finding.die_number}`;
          }
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

  const handleExport = () => {
    // Export functionality
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
      dieNumberFindings: '',
      masterSku: '',
      color: '',
      enamel: '',
      stoneName: '',
      stoneCut: '',
      stoneColor: '',
      stoneSize: '',
      stoneQuantity: '',
      platingType: '',
      platingColor: '',
      notes: '',
      images: '',
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
          name: row.listingName || row.sku,
          category: row.category,
          is_active: String(row.shopifyStatus).toLowerCase() !== 'inactive',
          material: row.material,
          weight: row.weight,
          collection: row.collection,
          setting_type: row.settingType,
          enamel_type: row.enamelType,
          active_channels: row.activeChannels,
          master_sku: row.masterSku,
          color: row.color,
          enamel: row.enamel,
          stone_name: row.stoneName,
          stone_cut: row.stoneCut,
          stone_color: row.stoneColor,
          stone_size: row.stoneSize,
          stone_quantity: row.stoneQuantity,
          plating_type: row.platingType,
          plating_color: row.platingColor,
          notes: row.notes,
          images: row.images,
        };

        if (row._isNew) {
          if (!row.sku.trim()) {
            errors.push('New row requires a SKU');
            continue;
          }
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, sku: row.sku }),
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

  const filteredData = useMemo(() => {
    return baseData.filter((row) => {
      const searchLower = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !searchLower ||
        row.sku?.toLowerCase().includes(searchLower) ||
        row.listingName?.toLowerCase().includes(searchLower) ||
        row.material?.toLowerCase().includes(searchLower);

      const matchesSku = !skuFilter || row.sku?.toLowerCase().includes(skuFilter.toLowerCase());
      const matchesMaterial = !materialFilter || row.material === materialFilter;
      const matchesCategory = !categoryFilter || row.category === categoryFilter;
      const matchesCollection = !collectionFilter || row.collection === collectionFilter;
      const matchesSettingType = !settingTypeFilter || row.settingType === settingTypeFilter;
      const matchesEnamelType = !enamelTypeFilter || row.enamelType === enamelTypeFilter;
      const matchesShopifyStatus = !shopifyStatusFilter || row.shopifyStatus === shopifyStatusFilter;

      return (
        matchesSearch &&
        matchesSku &&
        matchesMaterial &&
        matchesCategory &&
        matchesCollection &&
        matchesSettingType &&
        matchesEnamelType &&
        matchesShopifyStatus
      );
    });
  }, [
    baseData,
    searchTerm,
    skuFilter,
    materialFilter,
    categoryFilter,
    collectionFilter,
    settingTypeFilter,
    enamelTypeFilter,
    shopifyStatusFilter,
  ]);

  const displayedData = filteredData;

  const totalPages = Math.max(1, Math.ceil(displayedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = displayedData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

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

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
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
          <BulkUploadButton sheetType="products" onComplete={loadProducts} />
          <Button 
            onClick={handleCreateProduct}
            className="bg-success hover:bg-success text-white rounded-full px-4 text-sm h-8"
          >
            Add Product
          </Button>
          <Button 
            onClick={handleEditRow}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
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
          {isArchivedView && (
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
          <Button 
            onClick={handleExport}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Export
          </Button>
          
          {/* Print Dropdown */}
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
        </div>

        <div className="mb-4 border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
            PRODUCT DETAILS
          </div>
          <div className="p-3">
            {!selectedProduct ? (
              <div className="text-sm text-cool-gray">Select a row to see product details.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <DetailCard label="SKU" value={selectedProduct.sku} />
                <DetailCard label="LISTING NAME" value={selectedProduct.listingName} />
                <DetailCard label="MATERIAL" value={selectedProduct.material} />
                <DetailCard label="CATEGORY" value={selectedProduct.category} />
                <DetailCard label="COLLECTION" value={selectedProduct.collection} />
                <DetailCard label="DIE NUMBER/FINDINGS" value={selectedProduct.dieNumberFindings} />
                <DetailCard label="MASTER SKU" value={selectedProduct.masterSku} />
                <DetailCard label="COLOR" value={selectedProduct.color} />
                <DetailCard label="IMAGES" value={selectedProduct.images} />
              </div>
            )}
          </div>
        </div>


      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg mb-4 bg-trust-blue/10 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-2">
          {/* SKU Search */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">SKU</label>
            <Input
              type="text"
              placeholder="Enter SKU"
              value={skuFilter}
              onChange={(e) => setSKUFilter(e.target.value)}
              className="h-8 text-sm p-1"
            />
          </div>

          {/* Material Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">MATERIAL</label>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Material" />
              </SelectTrigger>
              <SelectContent>
                {materialOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">CATEGORY</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collection Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">COLLECTION</label>
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Collection" />
              </SelectTrigger>
              <SelectContent>
                {collectionOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Setting Type Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">SETTING TYPE</label>
            <Select value={settingTypeFilter} onValueChange={setSettingTypeFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Setting" />
              </SelectTrigger>
              <SelectContent>
                {settingTypeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enamel Type Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">ENAMEL TYPE</label>
            <Select value={enamelTypeFilter} onValueChange={setEnamelTypeFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Enamel" />
              </SelectTrigger>
              <SelectContent>
                {enamelTypeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shopify Status Filter */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">SHOPIFY STATUS</label>
            <Select value={shopifyStatusFilter} onValueChange={setShopifyStatusFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {shopifyStatusOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

              {paginatedData.map((row, idx) => {
                const isEditing = editingRowIds.has(row.id);
                const isAnyRowEditing = editingRowIds.size > 0;
                const canEdit = !isArchivedView && isEditing;
                
                return (
                  <tr 
                    key={row.id} 
                    className={`border-b border-soft-border ${
                      isEditing 
                        ? 'bg-trust-blue/10 hover:bg-trust-blue/10' 
                        : 'hover:bg-cloud-gray'
                    }`}
                  >
                    <td className={`border border-soft-border p-2 text-center sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${
                      isEditing ? 'bg-[#eff6ff]' : 'bg-white'
                    }`}>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={() => toggleRowSelection(row.id)}
                        className="cursor-pointer"
                        disabled={isAnyRowEditing}
                      />
                    </td>
                    {columns.map((column) =>
                      visibleColumns.has(column.id) && (
                        <td key={column.id} className={`border border-soft-border p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          {canEdit ? (
                            <Input
                              type="text"
                              value={row[column.id]}
                              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                              onKeyDown={column.id === 'masterSku' ? (e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  handleMasterSkuLookup(row.id, row.masterSku);
                                }
                              } : column.id === 'dieNumberFindings' ? (e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  handleFindingCodeLookup(row.id, row.dieNumberFindings);
                                }
                              } : undefined}
                              onBlur={column.id === 'masterSku' ? () => handleMasterSkuLookup(row.id, row.masterSku) : column.id === 'dieNumberFindings' ? () => handleFindingCodeLookup(row.id, row.dieNumberFindings) : undefined}
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
                      )
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Row and Edit Controls */}
      <div className="mt-4 flex gap-2 items-center flex-wrap">
        <Button 
          onClick={handleAddRow}
          className="bg-trust-blue hover:bg-deep-blue text-white px-6"
          disabled={editingRowIds.size > 0}
        >
          + Add Row
        </Button>
        
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
      </div>
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
