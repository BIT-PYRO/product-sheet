'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MasterJobSheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
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
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="border-gray-800 text-gray-800 rounded-full px-6"
          >
            Print Vouchers
          </Button>
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="border-gray-800 text-gray-800 rounded-full px-6"
          >
            Print Sheet
          </Button>
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-xs md:text-sm font-semibold text-gray-700 bg-blue-100 p-3 rounded">
        <div>PENDING WIP COMPLETION</div>
        <div>DATE FROM</div>
        <div>DATE TO</div>
        <div>NEW/REISSUE</div>
        <div>NAME</div>
        <div>FOAMP</div>
        <div>DEPARTMENT</div>
        <div>TYPE</div>
        <div>CATEGORY</div>
        <div>RECEIVER</div>
        <div>SKU</div>
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
