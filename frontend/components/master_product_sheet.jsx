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

export default function MasterProductSheet() {
  const PRODUCT_SHEET_SYNC_KEY = 'product_sheet_updated_at';
  const PRODUCT_SHEET_SYNC_EVENT = 'product_sheet_sync';
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
    sku: { minWidth: 'min-w-[80px]', headerBg: 'bg-indigo-300' },
    listingName: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-300' },
    material: { minWidth: 'min-w-[80px]', headerBg: 'bg-indigo-300' },
    weight: { minWidth: 'min-w-[70px]', headerBg: 'bg-indigo-300' },
    category: { minWidth: 'min-w-[80px]', headerBg: 'bg-indigo-300' },
    collection: { minWidth: 'min-w-[90px]', headerBg: 'bg-indigo-300' },
    settingType: { minWidth: 'min-w-[80px]', headerBg: 'bg-sky-200', cellBg: 'bg-sky-50' },
    enamelType: { minWidth: 'min-w-[75px]', headerBg: 'bg-sky-200', cellBg: 'bg-sky-50' },
    activeChannels: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-300' },
    shopifyStatus: { minWidth: 'min-w-[90px]', headerBg: 'bg-indigo-300' },
    dieNumberFindings: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-300' },
    masterSku: { minWidth: 'min-w-[85px]', headerBg: 'bg-indigo-300' },
    color: { minWidth: 'min-w-[70px]', headerBg: 'bg-purple-200', cellBg: 'bg-purple-50' },
    enamel: { minWidth: 'min-w-[70px]', headerBg: 'bg-purple-200', cellBg: 'bg-purple-50' },
    stoneName: { minWidth: 'min-w-[80px]', headerBg: 'bg-pink-200', cellBg: 'bg-pink-50' },
    stoneCut: { minWidth: 'min-w-[75px]', headerBg: 'bg-pink-200', cellBg: 'bg-pink-50' },
    stoneColor: { minWidth: 'min-w-[80px]', headerBg: 'bg-pink-200', cellBg: 'bg-pink-50' },
    stoneSize: { minWidth: 'min-w-[70px]', headerBg: 'bg-pink-200', cellBg: 'bg-pink-50' },
    stoneQuantity: { minWidth: 'min-w-[80px]', headerBg: 'bg-pink-200', cellBg: 'bg-pink-50' },
    platingType: { minWidth: 'min-w-[85px]', headerBg: 'bg-amber-200', cellBg: 'bg-amber-50' },
    platingColor: { minWidth: 'min-w-[85px]', headerBg: 'bg-amber-200', cellBg: 'bg-amber-50' },
    notes: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-300' },
    images: { minWidth: 'min-w-[80px]', headerBg: 'bg-indigo-300' },
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

  const loadProducts = useCallback(async () => {
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

      setData(Array.isArray(result.products) ? result.products : []);
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
    const newId = Math.max(...data.map(row => row.id), -1) + 1;
    const newRow = {
      id: newId,
      sku: '',
      listingName: '',
      material: '',
      weight: '',
      category: '',
      collection: '',
      settingType: '',
      enamelType: '',
      activeChannels: '',
      shopifyStatus: '',
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
    setData([...data, newRow]);
  };

  const handleEditRow = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to edit');
      return;
    }
    setEditingRowIds(new Set(selectedRows));
  };

  const handleSaveEdit = () => {
    setEditingRowIds(new Set());
    setSelectedRows(new Set());
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

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {/* Select All Checkbox */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200 mb-3">
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
                <div className="text-xs font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id) ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">Hidden</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Visible</span>
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
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Hide
            </Button>
            <Button
              onClick={handleShowColumns}
              disabled={selectedColumnsForAction.size === 0}
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
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
              <div className="border-2 border-gray-900 p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">PRODUCT DETAILS</h2>
                
                {/* Top Section */}
                <div className="grid grid-cols-3 gap-4 mb-6 border-b-2 border-gray-900 pb-4">
                  <div className="border-r-2 border-gray-900 pr-4">
                    <p className="text-xs font-bold text-gray-700 mb-1">SKU</p>
                    <p className="text-sm">{selectedProductForPrint.sku || '—'}</p>
                  </div>
                  <div className="border-r-2 border-gray-900 pr-4">
                    <p className="text-xs font-bold text-gray-700 mb-1">LISTING NAME</p>
                    <p className="text-sm">{selectedProductForPrint.listingName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">SHOPIFY STATUS</p>
                    <p className="text-sm">{selectedProductForPrint.shopifyStatus || '—'}</p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-gray-900 pb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">MATERIAL</p>
                    <p className="text-sm">{selectedProductForPrint.material || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">WEIGHT</p>
                    <p className="text-sm">{selectedProductForPrint.weight || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">CATEGORY</p>
                    <p className="text-sm">{selectedProductForPrint.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">COLLECTION</p>
                    <p className="text-sm">{selectedProductForPrint.collection || '—'}</p>
                  </div>
                </div>

                {/* Product Information */}
                <div className="mb-6">
                  <table className="w-full border-collapse border-2 border-gray-900 break-words">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left break-words">SETTING TYPE</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left break-words">ENAMEL TYPE</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left break-words">ACTIVE CHANNELS</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left break-words">MASTER SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-2 border-gray-900 p-2 text-sm break-words">{selectedProductForPrint.settingType || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm break-words">{selectedProductForPrint.enamelType || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm break-words">{selectedProductForPrint.activeChannels || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm break-words">{selectedProductForPrint.masterSku || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-8">Verified By</p>
                    <div className="border-t-2 border-gray-900 w-24"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-8">Date</p>
                    <p className="text-sm">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">MASTER PRODUCT SHEET</h2>
              <p className="text-sm text-gray-600">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>

            {/* Sheet Details Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Total Products</p>
                <p className="text-lg font-bold">{filteredData.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Selected Products</p>
                <p className="text-lg font-bold">{selectedRows.size}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Total SKUs</p>
                <p className="text-lg font-bold">{filteredData.filter(row => row.sku).length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Active Listings</p>
                <p className="text-lg font-bold">{filteredData.filter(row => row.shopifyStatus?.toLowerCase() === 'active').length}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border-2 border-gray-900 rounded overflow-x-auto">
              <table className="w-full border-collapse text-xs break-words">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="border border-gray-400 p-2 text-left break-words">SKU</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Listing Name</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Material</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Category</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Collection</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Setting Type</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Enamel Type</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Shopify Status</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Active Channels</th>
                    <th className="border border-gray-400 p-2 text-left break-words">Master SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-400 p-2 break-words">{row.sku || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.listingName || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.material || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.category || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.collection || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.settingType || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.enamelType || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.shopifyStatus || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.activeChannels || '—'}</td>
                      <td className="border border-gray-400 p-2 break-words">{row.masterSku || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="border-t-2 border-gray-900 pt-4 mt-6">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Prepared By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Reviewed By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Approved By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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

      <div className="max-w-[1600px] mx-auto border border-gray-300 bg-white p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MASTER PRODUCT SHEET</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4">
          <Button
            onClick={loadProducts}
            variant="outline"
            className="border-gray-800 text-gray-800 rounded-full px-6"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={handleCreateProduct}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6"
          >
            Add Product
          </Button>
          <Button 
            onClick={handleEditRow}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-full px-6"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 rounded-full px-6"
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
              className="border-green-600 text-green-600 hover:bg-green-50 rounded-full px-6"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
          <Button 
            onClick={handleManageColumns}
            variant="outline"
            className="border-gray-800 text-gray-800 rounded-full px-6"
          >
            Manage Columns
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="border-gray-800 text-gray-800 rounded-full px-6"
          >
            Export
          </Button>
          
          {/* Print Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-gray-800 text-gray-800 rounded-full px-6"
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

        {/* Search Bar */}
        <div className="flex gap-2 mb-2 max-w-md mx-auto md:mx-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-2 border-gray-400 rounded-lg px-4 py-2 pl-10"
            />
          </div>
        </div>

      {/* Filter Row */}
      <div className="border border-gray-300 rounded-lg mb-4 bg-blue-50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-2">
          {/* SKU Search */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">SKU</label>
            <Input
              type="text"
              placeholder="Enter SKU"
              value={skuFilter}
              onChange={(e) => setSKUFilter(e.target.value)}
              className="h-8 text-xs p-1"
            />
          </div>

          {/* Material Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">MATERIAL</label>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">CATEGORY</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">COLLECTION</label>
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">SETTING TYPE</label>
            <Select value={settingTypeFilter} onValueChange={setSettingTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">ENAMEL TYPE</label>
            <Select value={enamelTypeFilter} onValueChange={setEnamelTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">SHOPIFY STATUS</label>
            <Select value={shopifyStatusFilter} onValueChange={setShopifyStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
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
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Loading products from Google Sheets...
        </div>
      )}

      {!isLoading && fetchError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <Button onClick={loadProducts} variant="outline" className="h-8 px-3 border-red-300 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      {/* Table Section */}
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with vertical scrolling only */}
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-indigo-300">
              <tr className="text-gray-800 font-bold border-b-2 border-gray-400">
                <th className="border border-gray-400 p-2 w-8 sticky left-0 bg-indigo-300 z-30"></th>
                {columns.map((column) => 
                  visibleColumns.has(column.id) && (
                    <th key={column.id} className={`border border-gray-400 p-2 ${columnConfig[column.id].headerBg} ${columnConfig[column.id].minWidth}`}>
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
                    className="border border-gray-400 p-4 text-center text-sm text-gray-500"
                    colSpan={visibleColumns.size + 1}
                  >
                    No products found. Add a product from Product Sheet, then click Refresh.
                  </td>
                </tr>
              )}

              {displayedData.map((row, idx) => {
                const isEditing = editingRowIds.has(row.id);
                const isAnyRowEditing = editingRowIds.size > 0;
                const canEdit = !isArchivedView && isEditing;
                
                return (
                  <tr 
                    key={row.id} 
                    className={`border-b border-gray-400 ${
                      isEditing 
                        ? 'bg-blue-50 hover:bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`border border-gray-400 p-2 text-center sticky left-0 z-10 ${
                      isEditing ? 'bg-blue-50' : 'bg-white'
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
                        <td key={column.id} className={`border border-gray-400 p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          {canEdit ? (
                            <Input
                              type="text"
                              value={row[column.id]}
                              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                              className="border-0 p-1 text-xs h-8"
                            />
                          ) : column.id === 'sku' && row[column.id] ? (
                            <div className="min-h-8 px-1 py-1 text-xs whitespace-pre-wrap break-words leading-4">
                              <Link
                                href={`/master-product-sheet/product?sku=${encodeURIComponent(row[column.id])}`}
                                className="text-blue-700 underline hover:text-blue-900"
                              >
                                {row[column.id]}
                              </Link>
                            </div>
                          ) : (
                            <div className="min-h-8 px-1 py-1 text-xs whitespace-pre-wrap break-words leading-4">
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
      <div className="mt-4 flex gap-2 items-center">
        <Button 
          onClick={handleAddRow}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          disabled={editingRowIds.size > 0}
        >
          + Add Row
        </Button>
        
        {editingRowIds.size > 0 && (
          <div className="flex gap-2 ml-4">
            <Button 
              onClick={handleSaveEdit}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Save Changes
            </Button>
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50 px-6"
            >
              Cancel Edit
            </Button>
          </div>
        )}
      </div>

        {/* Footer Info */}
        <div className="mt-4 text-xs text-gray-600">
          <p>Selected Rows: {selectedRows.size}</p>
          <p>Visible Rows: {displayedData.length}</p>
          <p>Archived Rows: {archivedRows.size}</p>
          <p>View: {isArchivedView ? 'Archived' : 'Active'}</p>
          {editingRowIds.size > 0 && <p className="text-blue-600 font-semibold">Editing {editingRowIds.size} row(s)</p>}
        </div>
      </div>
    </div>
  );
}
