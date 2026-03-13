'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const KYC_COLUMNS = [
  { key: '__select__', label: '' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'panNumber', label: 'PAN Number' },
  { key: 'addressLine1', label: 'Address Line 1' },
  { key: 'addressLine2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pinCode', label: 'PIN Code' },
  { key: 'authorizedPersonName', label: 'Authorized Person' },
  { key: 'designation', label: 'Designation' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'accountName', label: 'Account Name' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifsc', label: 'IFSC Code' },
  { key: 'status', label: 'Status' },
];

const columnConfig = {
  companyName: { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  businessType: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  gstNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  panNumber: { minWidth: 'min-w-[110px]', headerBg: 'bg-trust-blue/20' },
  addressLine1: { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  addressLine2: { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  city: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  state: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  pinCode: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  authorizedPersonName: { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  designation: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  mobile: { minWidth: 'min-w-[110px]', headerBg: 'bg-trust-blue/20' },
  email: { minWidth: 'min-w-[140px]', headerBg: 'bg-trust-blue/20' },
  accountName: { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  bankName: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  accountNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  ifsc: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  gstCertificate: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  panCard: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  idProof: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  cancelledCheque: { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  status: { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
};

export default function MasterKYCSheet() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(KYC_COLUMNS.map((column) => column.key))
  );
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [emptyRowsData, setEmptyRowsData] = useState(
    Array.from({ length: 10 }).map(() => ({}))
  );

  const [archivedRows, setArchivedRows] = useState(new Set());
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [kycTypeFilter, setKycTypeFilter] = useState('All');

  const KYC_TYPE_OPTIONS = ['All', 'Customer', 'Work from Home', 'Vendor', 'Labour', 'Company'];

  const loadKYCData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/save-to-sheets', {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.kycData && Array.isArray(data.kycData)) {
          setProducts(data.kycData);
        }
      }
    } catch (err) {
      console.error('Error loading KYC data:', err);
      setError('Failed to load KYC data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKYCData();
  }, [loadKYCData]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const totalRows = sortedProducts.length > 0 ? sortedProducts.length : emptyRowsData.length;
      setSelectedRows(new Set(Array.from({ length: totalRows }, (_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleColumnSelection = (columnId) => {
    const newSelected = new Set(selectedColumnsForAction);
    if (newSelected.has(columnId)) {
      newSelected.delete(columnId);
    } else {
      newSelected.add(columnId);
    }
    setSelectedColumnsForAction(newSelected);
  };

  const handleSelectAllColumns = (checked) => {
    if (checked) {
      const allColumnIds = KYC_COLUMNS.filter((col) => col.key !== '__select__').map((col) => col.key);
      setSelectedColumnsForAction(new Set(allColumnIds));
    } else {
      setSelectedColumnsForAction(new Set());
    }
  };

  const handleHideColumns = () => {
    const newVisible = new Set(visibleColumns);
    selectedColumnsForAction.forEach(col => newVisible.delete(col));
    setVisibleColumns(newVisible);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const newVisible = new Set(visibleColumns);
    selectedColumnsForAction.forEach(col => newVisible.add(col));
    setVisibleColumns(newVisible);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleEmptyRowChange = (rowIndex, column, value) => {
    const newEmptyRows = [...emptyRowsData];
    newEmptyRows[rowIndex] = {
      ...newEmptyRows[rowIndex],
      [column]: value,
    };
    setEmptyRowsData(newEmptyRows);
  };

  const handleArchiveRow = () => {
    if (selectedRows.size === 0) { alert('Please select at least one row to archive'); return; }
    const newArchived = new Set(archivedRows);
    selectedRows.forEach(id => newArchived.add(id));
    setArchivedRows(newArchived);
    setSelectedRows(new Set());
  };

  const handleAddEmptyRow = () => {
    setEmptyRowsData([...emptyRowsData, {}]);
  };

  const handleExport = () => {
    const headers = KYC_COLUMNS.filter((col) => visibleColumns.has(col.key))
      .map((col) => col.label);
    const csvContent = [
      headers.join(','),
      ...products.map((row) =>
        KYC_COLUMNS.filter((col) => visibleColumns.has(col.key))
          .map((col) => `"${row[col.key] || ''}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kyc_data.csv';
    a.click();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      kycTypeFilter === 'All' ||
      product.kycType?.toLowerCase() === kycTypeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="min-h-screen bg-cloud-gray">
      <div className="pt-16 px-3 md:px-4 pb-3 md:pb-4">
        {/* Header */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">
                MASTER KYC SHEET
              </h1>
            </div>
            <DateTimeStamp />
          </div>
        </div>

        <div className="max-w-full overflow-hidden">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
            <div className="relative mr-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-4 h-4" />
                <Input
                  type="text"
                  placeholder="SEARCH BAR"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-soft-border rounded-lg pl-9 pr-4 h-9 w-64 text-sm"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-midnight-ink text-midnight-ink hover:bg-gray-100 rounded-md px-4 h-9 text-sm"
                  >
                    {kycTypeFilter === 'All' ? 'KYC Type ▾' : `${kycTypeFilter} ▾`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {KYC_TYPE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => setKycTypeFilter(option)}
                      className={kycTypeFilter === option ? 'font-semibold' : ''}
                    >
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button onClick={loadKYCData} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6" disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={handleAddEmptyRow} className="bg-success hover:bg-success text-white rounded-full px-6">
              Add KYC
            </Button>
            <Button variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6">
              Edit Row
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-warning text-warning hover:bg-warning/10 rounded-full px-6">
                  Archive
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleArchiveRow} disabled={isArchivedView}>Archive Selected Rows</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsArchivedView(!isArchivedView)}>
                  {isArchivedView ? 'Show Active Rows' : 'Show Archived Rows'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">
              Manage Columns
            </Button>
            <Button onClick={handleExport} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">
              Export
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">
              Print
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cloud-gray border-b-2 border-soft-border">
                  <th className="sticky left-0 z-20 p-2 text-center border-t border-b border-r border-soft-border w-12 bg-cloud-gray">
                    <Checkbox
                      checked={selectedRows.size === (sortedProducts.length > 0 ? sortedProducts.length : emptyRowsData.length) && selectedRows.size > 0}
                      onCheckedChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  {KYC_COLUMNS.filter((col) => visibleColumns.has(col.key) && col.key !== '__select__').map(
                    (column) => (
                      <th
                        key={column.key}
                        className={`p-3 text-left text-sm font-semibold text-slate-text ${
                          columnConfig[column.key]?.headerBg || 'bg-cloud-gray'
                        } ${columnConfig[column.key]?.minWidth} cursor-pointer hover:opacity-80`}
                        onClick={() => handleSort(column.key)}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {sortField === column.key && (
                            <span className="text-sm">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length > 0 ? (
                  sortedProducts.map((row, index) => (
                    <tr key={index} className="border-b border-soft-border hover:bg-cloud-gray">
                      <td className="sticky left-0 z-10 p-1 text-center border-b border-r border-soft-border w-12 bg-white text-sm font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <Checkbox
                            checked={selectedRows.has(index)}
                            onCheckedChange={(checked) => handleSelectRow(index, checked)}
                            className="rounded"
                          />
                        </div>
                      </td>
                      {KYC_COLUMNS.filter((col) => visibleColumns.has(col.key) && col.key !== '__select__').map(
                        (column) => (
                          <td
                            key={`${index}-${column.key}`}
                            className={`p-3 text-sm text-slate-text border border-soft-border ${columnConfig[column.key]?.minWidth}`}
                          >
                            {row[column.key] ? String(row[column.key]).substring(0, 50) : ''}
                          </td>
                        )
                      )}
                    </tr>
                  ))
                ) : (
                  emptyRowsData.map((_, index) => (
                    <tr key={`empty-${index}`} className="border-b border-soft-border hover:bg-cloud-gray">
                      <td className="sticky left-0 z-10 p-1 text-center border-b border-r border-soft-border w-12 bg-white text-sm font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <Checkbox
                            checked={selectedRows.has(index)}
                            onCheckedChange={(checked) => handleSelectRow(index, checked)}
                            className="rounded"
                          />
                        </div>
                      </td>
                      {KYC_COLUMNS.filter((col) => visibleColumns.has(col.key) && col.key !== '__select__').map(
                        (column) => (
                          <td
                            key={`empty-${index}-${column.key}`}
                            className={`p-1 text-sm border border-soft-border ${columnConfig[column.key]?.minWidth}`}
                          >
                            <Input
                              type="text"
                              value={emptyRowsData[index]?.[column.key] || ''}
                              onChange={(e) => handleEmptyRowChange(index, column.key, e.target.value)}
                              placeholder=""
                              className="border-0 p-1 h-7 text-sm"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isLoading && <p className="mt-2 text-sm text-cool-gray">Loading KYC data...</p>}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}

          {/* Add Row Button and Stats */}
          <div className="mt-4 flex gap-2 items-center">
            {sortedProducts.length === 0 && (
              <Button
                onClick={handleAddEmptyRow}
                className="bg-trust-blue hover:bg-deep-blue text-white px-4 py-2"
              >
                + Add Row
              </Button>
            )}
            <div className="flex gap-6 text-sm text-cool-gray ml-2">
              <span>Selected Rows: {selectedRows.size}</span>
              <span>Visible Rows: {sortedProducts.length || emptyRowsData.length}</span>
            </div>
          </div>
      </div>
      </div>

      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id="select-all-columns"
                  checked={selectedColumnsForAction.size === KYC_COLUMNS.filter((col) => col.key !== '__select__').length && selectedColumnsForAction.size > 0}
                  onCheckedChange={handleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
            {KYC_COLUMNS.filter((col) => col.key !== '__select__').map((column) => (
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
    </div>
  );
}
