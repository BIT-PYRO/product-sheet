'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export default function MasterJobSheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [newReissueFilter, setNewReissueFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [issuerFilter, setIssuerFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');
  const [skuFilter, setSKUFilter] = useState('');
  
  // Sample data for dropdowns
  const statusOptions = ['Pending', 'WIP', 'Completed'];
  const newReissueOptions = ['New', 'Re-issue'];
  const nameOptions = ['Name 1', 'Name 2', 'Name 3', 'Name 4'];
  const issuerOptions = ['Issuer 1', 'Issuer 2', 'Issuer 3'];
  const departmentOptions = ['D1', 'D2', 'D3', 'D4'];
  const typeOptions = ['T1', 'T2', 'T3', 'T4'];
  const categoryOptions = ['C1', 'C2', 'C3', 'C4'];
  const receiverOptions = ['Receiver 1', 'Receiver 2', 'Receiver 3'];

  const [data, setData] = useState(
    Array(15).fill(null).map((_, i) => ({
      id: i,
      voucherNo: '',
      issued: '',
      department: '',
      category: '',
      firstName: '',
      status: '',
      newReissue: '',
      type: '',
      receiver: '',
      dayCondition: '',
      issuedQty: '',
      issuedUnit: '',
      issuedWeight: '',
      issuedWeightUnit: '',
      receivedQty: '',
      receivedUnit: '',
      receivedWeight: '',
      receivedWeightUnit: '',
      lossQty: '',
      lossUnit: '',
      lossWeight: '',
      lossWeightUnit: '',
      reIssueQty: '',
      reIssueUnit: '',
      reIssueWeight: '',
      reIssueWeightUnit: '',
    }))
  );

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

  const handlePrintVouchers = () => {
    console.log('Printing vouchers...');
    window.print();
  };

  const handlePrintSheet = () => {
    console.log('Printing sheet...');
    window.print();
  };

  const handleExport = () => {
    // Export functionality
    console.log('Export data:', data);
  };

  const handleCreateJob = () => {
    // Create job functionality
    console.log('Create new job');
  };

  const handleManageColumns = () => {
    // Manage columns functionality
    console.log('Manage columns');
  };

  const handleAddRow = () => {
    const newId = Math.max(...data.map(row => row.id), -1) + 1;
    const newRow = {
      id: newId,
      voucherNo: '',
      issued: '',
      department: '',
      category: '',
      firstName: '',
      status: '',
      newReissue: '',
      type: '',
      receiver: '',
      dayCondition: '',
      issuedQty: '',
      issuedUnit: '',
      issuedWeight: '',
      issuedWeightUnit: '',
      receivedQty: '',
      receivedUnit: '',
      receivedWeight: '',
      receivedWeightUnit: '',
      lossQty: '',
      lossUnit: '',
      lossWeight: '',
      lossWeightUnit: '',
      reIssueQty: '',
      reIssueUnit: '',
      reIssueWeight: '',
      reIssueWeightUnit: '',
    };
    setData([...data, newRow]);
  };

  return (
    <div className="w-full h-full bg-gray-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-6">
          MASTER WIP/JOB SHEET
        </h1>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-6">
          <Button 
            onClick={handleCreateJob}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6"
          >
            Create a Job
          </Button>
          <Button 
            onClick={() => window.location.href = '/enrol-workforce'}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
          >
            Quick Enroll Workforce
          </Button>
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
              <DropdownMenuItem onClick={handlePrintVouchers}>
                Voucher
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintSheet}>
                Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6 max-w-md mx-auto md:mx-0">
          <Input
            type="text"
            placeholder="SEARCH BAR"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-2 border-gray-400 rounded-md px-4 py-2"
          />
        </div>
      </div>

      {/* Filter Row */}
      <div className="border border-gray-300 rounded-lg mb-4 bg-blue-50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {/* Status/Pending WIP Completion */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">STATUS</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">DATE FROM</label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="h-8 text-xs p-1"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">DATE TO</label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="h-8 text-xs p-1"
            />
          </div>

          {/* New/Reissue */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">NEW/RE-ISSUE</label>
            <Select value={newReissueFilter} onValueChange={setNewReissueFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {newReissueOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">NAME</label>
            <Select value={nameFilter} onValueChange={setNameFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Name" />
              </SelectTrigger>
              <SelectContent>
                {nameOptions.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issuer */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">ISSUER</label>
            <Select value={issuerFilter} onValueChange={setIssuerFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Issuer" />
              </SelectTrigger>
              <SelectContent>
                {issuerOptions.map(issuer => (
                  <SelectItem key={issuer} value={issuer}>{issuer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">DEPARTMENT</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Dept" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">TYPE</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
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

          {/* Receiver */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">RECEIVER</label>
            <Select value={receiverFilter} onValueChange={setReceiverFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Receiver" />
              </SelectTrigger>
              <SelectContent>
                {receiverOptions.map(receiver => (
                  <SelectItem key={receiver} value={receiver}>{receiver}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
        </div>
      </div>

      {/* Table Section */}
      <ScrollArea className="w-full border border-gray-300 rounded-lg bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-yellow-300 text-gray-800 font-bold border-b-2 border-gray-400">
              <th className="border border-gray-400 p-2 w-8">
                <Checkbox
                  checked={selectedRows.size === data.length && data.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRows(new Set(data.map(row => row.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="cursor-pointer"
                />
              </th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[100px]">Voucher No.</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[80px]">Issued</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[100px]">Department</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[80px]">Category</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[100px]">First Name</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[80px]">Status</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[100px]">New/Re-issue</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[70px]">Type</th>
              <th className="border border-gray-400 p-2 bg-yellow-300 min-w-[80px]">Receiver</th>
              <th className="border border-gray-400 p-2 bg-orange-200 min-w-[100px]">Day & Condition</th>
              <th className="border border-gray-400 p-2 text-gray-700 min-w-[70px]">Issued Qty</th>
              <th className="border border-gray-400 p-2 text-gray-700 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 text-gray-700 min-w-[80px]">Issued Weight</th>
              <th className="border border-gray-400 p-2 text-gray-700 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-green-100 min-w-[80px]">Received Qty</th>
              <th className="border border-gray-400 p-2 bg-green-100 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-green-100 min-w-[100px]">Received Weight</th>
              <th className="border border-gray-400 p-2 bg-green-100 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-red-100 min-w-[70px]">Loss Qty</th>
              <th className="border border-gray-400 p-2 bg-red-100 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-red-100 min-w-[80px]">Loss Weight</th>
              <th className="border border-gray-400 p-2 bg-red-100 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-orange-100 min-w-[80px]">Re-Issue Qty</th>
              <th className="border border-gray-400 p-2 bg-orange-100 min-w-[60px]">Unit</th>
              <th className="border border-gray-400 p-2 bg-orange-100 min-w-[100px]">Re-Issue Weight</th>
              <th className="border border-gray-400 p-2 bg-orange-100 min-w-[60px]">Unit</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-400">
                <td className="border border-gray-400 p-2 text-center">
                  <Checkbox
                    checked={selectedRows.has(row.id)}
                    onCheckedChange={() => toggleRowSelection(row.id)}
                    className="cursor-pointer"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.voucherNo}
                    onChange={(e) => handleCellChange(row.id, 'voucherNo', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.issued}
                    onChange={(e) => handleCellChange(row.id, 'issued', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.department}
                    onChange={(e) => handleCellChange(row.id, 'department', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.category}
                    onChange={(e) => handleCellChange(row.id, 'category', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.firstName}
                    onChange={(e) => handleCellChange(row.id, 'firstName', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.status}
                    onChange={(e) => handleCellChange(row.id, 'status', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.newReissue}
                    onChange={(e) => handleCellChange(row.id, 'newReissue', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.type}
                    onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.receiver}
                    onChange={(e) => handleCellChange(row.id, 'receiver', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-orange-50">
                  <Input
                    type="text"
                    value={row.dayCondition}
                    onChange={(e) => handleCellChange(row.id, 'dayCondition', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.issuedQty}
                    onChange={(e) => handleCellChange(row.id, 'issuedQty', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.issuedUnit}
                    onChange={(e) => handleCellChange(row.id, 'issuedUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.issuedWeight}
                    onChange={(e) => handleCellChange(row.id, 'issuedWeight', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1">
                  <Input
                    type="text"
                    value={row.issuedWeightUnit}
                    onChange={(e) => handleCellChange(row.id, 'issuedWeightUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-green-50">
                  <Input
                    type="text"
                    value={row.receivedQty}
                    onChange={(e) => handleCellChange(row.id, 'receivedQty', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-green-50">
                  <Input
                    type="text"
                    value={row.receivedUnit}
                    onChange={(e) => handleCellChange(row.id, 'receivedUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-green-50">
                  <Input
                    type="text"
                    value={row.receivedWeight}
                    onChange={(e) => handleCellChange(row.id, 'receivedWeight', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-green-50">
                  <Input
                    type="text"
                    value={row.receivedWeightUnit}
                    onChange={(e) => handleCellChange(row.id, 'receivedWeightUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-red-50">
                  <Input
                    type="text"
                    value={row.lossQty}
                    onChange={(e) => handleCellChange(row.id, 'lossQty', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-red-50">
                  <Input
                    type="text"
                    value={row.lossUnit}
                    onChange={(e) => handleCellChange(row.id, 'lossUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-red-50">
                  <Input
                    type="text"
                    value={row.lossWeight}
                    onChange={(e) => handleCellChange(row.id, 'lossWeight', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-red-50">
                  <Input
                    type="text"
                    value={row.lossWeightUnit}
                    onChange={(e) => handleCellChange(row.id, 'lossWeightUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-orange-50">
                  <Input
                    type="text"
                    value={row.reIssueQty}
                    onChange={(e) => handleCellChange(row.id, 'reIssueQty', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-orange-50">
                  <Input
                    type="text"
                    value={row.reIssueUnit}
                    onChange={(e) => handleCellChange(row.id, 'reIssueUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-orange-50">
                  <Input
                    type="text"
                    value={row.reIssueWeight}
                    onChange={(e) => handleCellChange(row.id, 'reIssueWeight', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
                <td className="border border-gray-400 p-1 bg-orange-50">
                  <Input
                    type="text"
                    value={row.reIssueWeightUnit}
                    onChange={(e) => handleCellChange(row.id, 'reIssueWeightUnit', e.target.value)}
                    className="border-0 p-1 text-xs h-8"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* Add Row Button */}
      <div className="mt-4 flex gap-2">
        <Button 
          onClick={handleAddRow}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          + Add Row
        </Button>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-xs text-gray-600">
        <p>Selected Rows: {selectedRows.size}</p>
        <p>Total Rows: {data.length}</p>
      </div>
    </div>
  );
}
