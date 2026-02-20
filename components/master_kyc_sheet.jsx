'use client';

import { useCallback, useEffect, useState } from 'react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
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

const KYC_COLUMNS = [
  { key: '__select__', label: '' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'panNumber', label: 'PAN Number' },
  { key: 'address', label: 'Registered Address' },
  { key: 'authorizedPersonName', label: 'Authorized Person' },
  { key: 'designation', label: 'Designation' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'accountName', label: 'Account Name' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifsc', label: 'IFSC Code' },
  { key: 'gstCertificate', label: 'GST Certificate' },
  { key: 'panCard', label: 'PAN Card' },
  { key: 'idProof', label: 'ID Proof' },
  { key: 'cancelledCheque', label: 'Cancelled Cheque' },
  { key: 'status', label: 'Status' },
];

const columnConfig = {
  companyName: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
  businessType: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  gstNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
  panNumber: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
  address: { minWidth: 'min-w-[150px]', headerBg: 'bg-indigo-200' },
  authorizedPersonName: { minWidth: 'min-w-[130px]', headerBg: 'bg-indigo-200' },
  designation: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  mobile: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
  email: { minWidth: 'min-w-[140px]', headerBg: 'bg-indigo-200' },
  accountName: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
  bankName: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  accountNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
  ifsc: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  gstCertificate: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  panCard: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  idProof: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
  cancelledCheque: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
  status: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
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

  const handleApplyColumns = () => {
    setVisibleColumns(new Set(selectedColumnsForAction));
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

  const handleAddEmptyRow = () => {
    setEmptyRowsData([...emptyRowsData, {}]);
  };

  const handleResetColumns = () => {
    setSelectedColumnsForAction(new Set(KYC_COLUMNS.map((col) => col.key)));
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

  const filteredProducts = products.filter((product) =>
    product.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
        <div className="px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              MASTER KYC SHEET
            </h1>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-full overflow-hidden">
        {/* Search and Controls */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by company name or GST number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
            <Button variant="outline" onClick={() => setIsManageColumnsOpen(true)}>
              Manage Columns
            </Button>
            <Button variant="outline" onClick={handleExport}>
              Export
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="p-2 text-center border border-gray-400 w-12">
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
                      className={`p-3 text-left text-xs font-semibold text-gray-700 ${
                        columnConfig[column.key]?.headerBg || 'bg-gray-100'
                      } ${columnConfig[column.key]?.minWidth} cursor-pointer hover:opacity-80`}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {sortField === column.key && (
                          <span className="text-xs">
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
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-1 text-center border border-gray-400 w-12 bg-gray-50 text-xs font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={(checked) => handleSelectRow(index, checked)}
                          className="rounded"
                        />
                        <span>{index + 1}</span>
                      </div>
                    </td>
                    {KYC_COLUMNS.filter((col) => visibleColumns.has(col.key) && col.key !== '__select__').map(
                      (column) => (
                        <td
                          key={`${index}-${column.key}`}
                          className={`p-3 text-xs text-gray-700 border border-gray-400 ${columnConfig[column.key]?.minWidth}`}
                        >
                          {row[column.key] ? String(row[column.key]).substring(0, 50) : ''}
                        </td>
                      )
                    )}
                  </tr>
                ))
              ) : (
                emptyRowsData.map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-1 text-center border border-gray-400 w-12 bg-gray-50 text-xs font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={(checked) => handleSelectRow(index, checked)}
                          className="rounded"
                        />
                        <span>{index + 1}</span>
                      </div>
                    </td>
                    {KYC_COLUMNS.filter((col) => visibleColumns.has(col.key) && col.key !== '__select__').map(
                      (column) => (
                        <td
                          key={`empty-${index}-${column.key}`}
                          className={`p-1 text-xs border border-gray-400 ${columnConfig[column.key]?.minWidth}`}
                        >
                          <Input
                            type="text"
                            value={emptyRowsData[index]?.[column.key] || ''}
                            onChange={(e) => handleEmptyRowChange(index, column.key, e.target.value)}
                            placeholder=""
                            className="border-0 p-1 h-7 text-xs"
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

        {isLoading && <p className="mt-2 text-xs text-gray-600">Loading KYC data...</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Add Row Button and Stats */}
        <div className="mt-4 flex gap-2 items-center">
          {sortedProducts.length === 0 && (
            <Button
              onClick={handleAddEmptyRow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              + Add Row
            </Button>
          )}
          <div className="flex gap-6 text-xs text-gray-600 ml-2">
            <span>Selected Rows: {selectedRows.size}</span>
            <span>Visible Rows: {sortedProducts.length || emptyRowsData.length}</span>
          </div>
        </div>
      </div>

      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {KYC_COLUMNS.filter((col) => col.key !== '__select__').map((column) => (
              <div key={column.key} className="flex items-center gap-3">
                <Checkbox
                  id={column.key}
                  checked={selectedColumnsForAction.has(column.key)}
                  onCheckedChange={() => toggleColumnSelection(column.key)}
                />
                <label htmlFor={column.key} className="text-sm font-medium cursor-pointer">
                  {column.label}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleResetColumns}
              variant="outline"
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={handleApplyColumns}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
