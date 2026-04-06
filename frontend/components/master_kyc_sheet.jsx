'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DateTimeStamp from '@/components/date-time-stamp';
import BulkUploadButton from '@/components/bulk-upload-button';
import LastUpdatedFooter from '@/components/last-updated-footer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

const KYC_COLUMNS = [
  { key: '__select__', label: '' },
  // Company Details
  { key: 'companyName', label: 'Company Name' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'panNumber', label: 'PAN Number' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pinCode', label: 'PIN Code' },
  // Authorized Person
  { key: 'authorizedPersonName', label: 'Authorized Person' },
  { key: 'designation', label: 'Designation' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  // Bank Details
  { key: 'accountName', label: 'Account Name' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifsc', label: 'IFSC Code' },
  // Documents
  { key: 'gstCertificate', label: 'GST Certificate' },
  { key: 'panCard', label: 'PAN Card' },
  { key: 'idProof', label: 'ID Proof' },
  { key: 'cancelledCheque', label: 'Cancelled Cheque' },
  // Status & Meta
  { key: 'status', label: 'Status' },
  { key: 'kycType', label: 'KYC Type' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
];

const columnConfig = {
  companyName:          { minWidth: 'min-w-[150px]', headerBg: 'bg-trust-blue/20' },
  businessType:         { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  gstNumber:            { minWidth: 'min-w-[150px]', headerBg: 'bg-trust-blue/20' },
  panNumber:            { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  address:              { minWidth: 'min-w-[220px]', headerBg: 'bg-trust-blue/20' },
  city:                 { minWidth: 'min-w-[110px]', headerBg: 'bg-trust-blue/20' },
  state:                { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  pinCode:              { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  authorizedPersonName: { minWidth: 'min-w-[160px]', headerBg: 'bg-trust-blue/20' },
  designation:          { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  mobile:               { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  email:                { minWidth: 'min-w-[160px]', headerBg: 'bg-trust-blue/20' },
  accountName:          { minWidth: 'min-w-[140px]', headerBg: 'bg-trust-blue/20' },
  bankName:             { minWidth: 'min-w-[130px]', headerBg: 'bg-trust-blue/20' },
  accountNumber:        { minWidth: 'min-w-[150px]', headerBg: 'bg-trust-blue/20' },
  ifsc:                 { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  gstCertificate:       { minWidth: 'min-w-[140px]', headerBg: 'bg-trust-blue/20' },
  panCard:              { minWidth: 'min-w-[110px]', headerBg: 'bg-trust-blue/20' },
  idProof:              { minWidth: 'min-w-[110px]', headerBg: 'bg-trust-blue/20' },
  cancelledCheque:      { minWidth: 'min-w-[150px]', headerBg: 'bg-trust-blue/20' },
  status:               { minWidth: 'min-w-[100px]', headerBg: 'bg-trust-blue/20' },
  kycType:              { minWidth: 'min-w-[120px]', headerBg: 'bg-trust-blue/20' },
  created_at:           { minWidth: 'min-w-[160px]', headerBg: 'bg-trust-blue/20' },
  updated_at:           { minWidth: 'min-w-[160px]', headerBg: 'bg-trust-blue/20' },
};

export default function MasterKYCSheet() {
  const { canEdit, canCreate } = useSheetPermissions('master-kyc-sheet');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
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
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const KYC_TYPE_OPTIONS = ['All', 'Customer', 'Work from Home', 'Vendor', 'Labour', 'Company'];

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  const loadKYCData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/kyc', {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        const rows =
          Array.isArray(data?.data?.results) ? data.data.results :
          Array.isArray(data?.data) ? data.data :
          Array.isArray(data?.results) ? data.results : [];

        setProducts(rows);
        setLastUpdated(new Date());
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
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s || [
      product.companyName, product.businessType, product.gstNumber, product.panNumber,
      product.addressLine1, product.addressLine2, product.city, product.state, product.pinCode,
      product.authorizedPersonName, product.designation, product.mobile, product.email,
      product.accountName, product.bankName, product.accountNumber, product.ifsc,
      product.status, product.kycType,
    ].some((val) => String(val || '').toLowerCase().includes(s));
    const matchesType =
      kycTypeFilter === 'All' ||
      String(product.kycType || '').toLowerCase() === kycTypeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedKycData = sortedProducts.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="min-h-screen bg-cloud-gray">
      <div className="pt-16 px-3 md:px-4 pb-16">
        {/* Header */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">
                MASTER KYC SHEET
              </h1>
            </div>
            <GlobalSearchBar />
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
            <Button onClick={loadKYCData} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            {canCreate && <BulkUploadButton sheetType="kyc" onComplete={loadKYCData} />}
            {canCreate && (
              <Button onClick={handleAddEmptyRow} className="bg-success hover:bg-success text-white rounded-full px-4 text-sm h-8">
                Add KYC
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
                Edit Row
              </Button>
            )}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-warning text-warning hover:bg-warning/10 rounded-full px-4 text-sm h-8">
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
            )}
            <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
              Manage Columns
            </Button>
            <Button onClick={handleExport} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
              Export
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
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
                        className={`p-3 text-left text-sm font-semibold text-midnight-ink ${
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
                {paginatedKycData.length > 0 ? (
                  paginatedKycData.map((row, index) => (
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
                            {column.key === 'address'
                              ? [row.addressLine1, row.addressLine2].filter(Boolean).join(', ')
                              : row[column.key] ? String(row[column.key]).substring(0, 50) : ''}
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

          {/* Add Row Button */}
          <div className="mt-4 flex gap-2 items-center">
            {sortedProducts.length === 0 && (
              <Button
                onClick={handleAddEmptyRow}
                className="bg-trust-blue hover:bg-deep-blue text-white px-4 py-2"
              >
                + Add Row
              </Button>
            )}
          </div>
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
          <span>{sortedProducts.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, sortedProducts.length)}`} of {sortedProducts.length}</span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
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
