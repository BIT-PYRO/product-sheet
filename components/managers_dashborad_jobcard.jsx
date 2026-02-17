'use client';

import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ManagersDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  
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

  // Sample data for filters
  const statusOptions = ['Pending', 'WIP', 'Completed'];
  const newReissueOptions = ['New', 'Re-issue'];
  const nameOptions = ['Name 1', 'Name 2', 'Name 3', 'Name 4'];
  const issuerOptions = ['Issuer 1', 'Issuer 2', 'Issuer 3'];
  const departmentOptions = ['D1', 'D2', 'D3', 'D4'];
  const typeOptions = ['T1', 'T2', 'T3', 'T4'];
  const categoryOptions = ['C1', 'C2', 'C3', 'C4'];

  // Process columns
  const processColumns = [
    '3D Print',
    'DIE',
    'WAX',
    'SETTING',
    'CASTING',
    'FILING',
    'PRE POLISH',
    'HAND SETTING',
    'FINAL POLISH',
    'PLATING',
    'Others'
  ];

  const [visibleColumns, setVisibleColumns] = useState(new Set(processColumns));

  // Toggle column selection in the manage columns dialog
  const toggleColumnSelection = (columnName) => {
    const newSelected = new Set(selectedColumnsForAction);
    if (newSelected.has(columnName)) {
      newSelected.delete(columnName);
    } else {
      newSelected.add(columnName);
    }
    setSelectedColumnsForAction(newSelected);
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

  // Sample job cards data
  const [jobCardsData] = useState({
    '3D Print': {
      new: [
        { voucherNo: 'V001', name: 'John Doe', category: 'Gold Ring', qty: 5, weight: '15g', status: 'New' },
        { voucherNo: 'V002', name: 'Jane Smith', category: 'Silver Bracelet', qty: 3, weight: '12g', status: 'New' }
      ],
      wip: [
        { voucherNo: 'V003', name: 'Bob Johnson', category: 'Diamond Ring', qty: 2, weight: '8g', status: 'Work in Progress' }
      ],
      completed: [
        { voucherNo: 'V004', name: 'Alice Brown', category: 'Gold Necklace', qty: 1, weight: '20g', status: 'Completed' }
      ]
    },
    'DIE': {
      new: [
        { voucherNo: 'V005', name: 'Charlie Davis', category: 'Platinum Ring', qty: 4, weight: '10g', status: 'New' }
      ],
      wip: [
        { voucherNo: 'V006', name: 'Diana Evans', category: 'Silver Earrings', qty: 6, weight: '5g', status: 'Work in Progress' }
      ],
      completed: []
    },
    'WAX': {
      new: [],
      wip: [
        { voucherNo: 'V007', name: 'Frank Green', category: 'Gold Pendant', qty: 3, weight: '7g', status: 'Work in Progress' }
      ],
      completed: [
        { voucherNo: 'V008', name: 'Grace Hill', category: 'Diamond Bracelet', qty: 2, weight: '18g', status: 'Completed' }
      ]
    },
    'SETTING': {
      new: [],
      wip: [],
      completed: []
    },
    'CASTING': {
      new: [],
      wip: [],
      completed: []
    },
    'FILING': {
      new: [],
      wip: [],
      completed: []
    },
    'PRE POLISH': {
      new: [],
      wip: [],
      completed: []
    },
    'HAND SETTING': {
      new: [],
      wip: [],
      completed: []
    },
    'FINAL POLISH': {
      new: [],
      wip: [],
      completed: []
    },
    'PLATING': {
      new: [],
      wip: [],
      completed: []
    },
    'Others': {
      new: [],
      wip: [],
      completed: []
    }
  });

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };

  const handleCreateJob = () => {
    console.log('Create new job');
  };

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-yellow-200 border-yellow-400';
      case 'Work in Progress':
        return 'bg-orange-200 border-orange-400';
      case 'Completed':
        return 'bg-green-200 border-green-400';
      default:
        return 'bg-gray-200 border-gray-400';
    }
  };

  const calculateTotal = (processData) => {
    return processData.new.length + processData.wip.length + processData.completed.length;
  };

  return (
    <div className="w-full h-full bg-gray-50 p-4 md:p-6">
      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {processColumns.map((column) => (
              <div key={column} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={column}
                    checked={selectedColumnsForAction.has(column)}
                    onCheckedChange={() => toggleColumnSelection(column)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={column} className="text-sm cursor-pointer">
                    {column}
                  </label>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column) ? (
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

      {/* Card Detail Modal */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voucher Details</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(selectedCard.status)}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Voucher No.</span>
                  <span className="text-sm font-semibold">{selectedCard.voucherNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Name</span>
                  <span className="text-sm">{selectedCard.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Category</span>
                  <span className="text-sm">{selectedCard.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">QTY</span>
                  <span className="text-sm">{selectedCard.qty}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">WT</span>
                  <span className="text-sm">{selectedCard.weight}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Status</span>
                  <span className="text-sm font-semibold">{selectedCard.status}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsCardModalOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6 bg-yellow-200 py-3 rounded">
          MANAGERS DASHBOARD FOR VOUCHERS/JOB CARDS
        </h1>

        {/* Search Bar and Buttons */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="relative max-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-gray-400 rounded-lg px-4 py-2 pl-10"
            />
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* Filter Row */}
        <div className="border-2 border-blue-400 rounded-lg mb-6 bg-blue-50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-3">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">STATUS</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Select" />
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
                className="h-9 text-xs p-2 bg-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">DATE TO</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="h-9 text-xs p-2 bg-white"
              />
            </div>

            {/* New/Reissue */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">NEW/REISSUE</label>
              <Select value={newReissueFilter} onValueChange={setNewReissueFilter}>
                <SelectTrigger className="h-9 text-xs bg-white">
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
                <SelectTrigger className="h-9 text-xs bg-white">
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
                <SelectTrigger className="h-9 text-xs bg-white">
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
                <SelectTrigger className="h-9 text-xs bg-white">
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
                <SelectTrigger className="h-9 text-xs bg-white">
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
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Table */}
      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-300 border-b-2 border-gray-400">
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <th key={column} className="border-2 border-gray-400 p-3 text-center font-bold text-sm min-w-[200px]">
                    {column}
                  </th>
                )
              )}
            </tr>
            <tr className="bg-gray-200 border-b-2 border-gray-400">
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <th key={column} className="border-2 border-gray-400 p-2 text-center font-bold text-xs">
                    Total: {calculateTotal(jobCardsData[column])}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <td key={column} className="border-2 border-gray-400 p-3 align-top min-h-[400px]">
                  <div className="space-y-3">
                    {/* New Cards */}
                    {jobCardsData[column].new.map((card, idx) => (
                      <div
                        key={`new-${idx}`}
                        onClick={() => handleCardClick(card)}
                        className="bg-yellow-200 border-2 border-yellow-400 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Total Qty & Weight</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Work in Progress Cards */}
                    {jobCardsData[column].wip.map((card, idx) => (
                      <div
                        key={`wip-${idx}`}
                        onClick={() => handleCardClick(card)}
                        className="bg-orange-200 border-2 border-orange-400 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Total Qty & Weight</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Completed Cards */}
                    {jobCardsData[column].completed.map((card, idx) => (
                      <div
                        key={`completed-${idx}`}
                        onClick={() => handleCardClick(card)}
                        className="bg-green-200 border-2 border-green-400 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">Total Qty & Weight</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                )
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
