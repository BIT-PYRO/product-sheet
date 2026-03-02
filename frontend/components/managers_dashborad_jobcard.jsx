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
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { CreateJobModal } from '@/components/create-job-modal';
import { CompanyKYCForm } from '@/components/company-kyc-form';
import { ReceiveJobModal } from '@/components/receive-job-modal';

export default function ManagersDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isReceiveJobOpen, setIsReceiveJobOpen] = useState(false);
  const [selectedVoucherForReceive, setSelectedVoucherForReceive] = useState(null);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  
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

  // Toggle select all columns
  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === columns.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(columns.map(col => col.name)));
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
    setSelectedVoucherForReceive(card);
    setIsReceiveJobOpen(true);
  };

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-warning-soft border-warning';
      case 'Work in Progress':
        return 'bg-warning/20 border-warning';
      case 'Completed':
        return 'bg-success/20 border-success';
      default:
        return 'bg-cloud-gray border-soft-border';
    }
  };

  const calculateTotal = (processData) => {
    return processData.new.length + processData.wip.length + processData.completed.length;
  };

  return (
    <div className="w-full min-h-screen bg-cloud-gray p-4 md:p-6">
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
                  checked={selectedColumnsForAction.size === processColumns.length && processColumns.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
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
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column) ? (
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
              className="text-success border-success/40 hover:bg-success/10"
            >
              Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Job Modal */}
      <ReceiveJobModal
        open={isReceiveJobOpen}
        onOpenChange={setIsReceiveJobOpen}
        onJobReceived={() => {}}
        voucherData={selectedVoucherForReceive}
      />

      <div className="max-w-[1600px] mx-auto border border-soft-border bg-white p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MANAGERS DASHBOARD FOR VOUCHERS/JOB CARDS</h1>
          </div>
        </div>

        {/* Search Bar and Buttons */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="relative max-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-soft-border rounded-lg px-4 py-2 pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateJob}
              className="bg-success hover:bg-success text-white rounded-full px-6"
            >
              Create a Job
            </Button>
            <Button 
              onClick={handleManageColumns}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-6"
            >
              Manage Columns
            </Button>
            <Button 
              onClick={() => setIsKYCModalOpen(true)}
              className="bg-trust-blue hover:bg-deep-blue text-white rounded-full px-6"
            >
              Company KYC
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="border-2 border-trust-blue rounded-lg mb-6 bg-trust-blue/10 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-3">
            {/* Status */}
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">STATUS</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">DATE FROM</label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="h-9 text-sm p-2 bg-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">DATE TO</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="h-9 text-sm p-2 bg-white"
              />
            </div>

            {/* New/Reissue */}
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">NEW/REISSUE</label>
              <Select value={newReissueFilter} onValueChange={setNewReissueFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">NAME</label>
              <Select value={nameFilter} onValueChange={setNameFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">ISSUER</label>
              <Select value={issuerFilter} onValueChange={setIssuerFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">DEPARTMENT</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">TYPE</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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
              <label className="text-sm font-semibold text-slate-text block mb-1">CATEGORY</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm bg-white">
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

        {/* Dashboard Table */}
        <div className="border-2 border-soft-border rounded-lg bg-white overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-cloud-gray border-b-2 border-soft-border">
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <th key={column} className="border-2 border-soft-border p-3 text-center font-bold text-sm min-w-[200px]">
                    {column}
                  </th>
                )
              )}
            </tr>
            <tr className="bg-cloud-gray border-b-2 border-soft-border">
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <th key={column} className="border-2 border-soft-border p-2 text-center font-bold text-sm">
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
                  <td key={column} className="border-2 border-soft-border p-3 align-top min-h-[400px]">
                  <div className="space-y-3">
                    {/* New Cards */}
                    {jobCardsData[column].new.map((card, idx) => (
                      <div
                        key={`new-${idx}`}
                        onClick={() => handleCardClick(card)}
                        className="bg-warning-soft border-2 border-warning rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Total Qty & Weight</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Work in Progress Cards */}
                    {jobCardsData[column].wip.map((card, idx) => (
                      <div
                        key={`wip-${idx}`}
                        onClick={() => handleCardClick(card)}
                        className="bg-warning/20 border-2 border-warning rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Total Qty & Weight</span>
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
                            <span className="text-sm font-bold text-slate-text">Voucher No.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Name</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Category</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-text">Total Qty & Weight</span>
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
      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
      />

      {/* Company KYC Modal */}
      <Dialog open={isKYCModalOpen} onOpenChange={setIsKYCModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <CompanyKYCForm onClose={() => setIsKYCModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
