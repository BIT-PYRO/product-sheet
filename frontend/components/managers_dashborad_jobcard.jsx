'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Pencil, Trash2 } from 'lucide-react';
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
import GlobalSearchBar from '@/components/global-search-bar';
import { CreateJobModal } from '@/components/create-job-modal';
import { CompanyKYCForm } from '@/components/company-kyc-form';
import { ReceiveJobModal } from '@/components/receive-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';
import LastUpdatedFooter from '@/components/last-updated-footer';

export default function ManagersDashboard() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isReceiveJobOpen, setIsReceiveJobOpen] = useState(false);
  const [selectedVoucherForReceive, setSelectedVoucherForReceive] = useState(null);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState('');
  
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

  // Process columns — map to department keys used in vouchers
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

  // Maps voucher dept_from / dept_to keys to dashboard column names
  const DEPT_TO_COLUMN = {
    'wax-pieces': 'WAX',
    'wax-setting': 'SETTING',
    'casting': 'CASTING',
    'filing': 'FILING',
    'pre-polish': 'PRE POLISH',
    'hand-setting': 'HAND SETTING',
    'polishing': 'FINAL POLISH',
    'plating': 'PLATING',
    '3d-print': '3D Print',
    'mold-die': 'DIE',
    'design': '3D Print',
  };

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
    if (selectedColumnsForAction.size === processColumns.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(processColumns));
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

  const emptyJobCardsData = {
    '3D Print': {
      new: [],
      wip: [],
      completed: []
    },
    'DIE': { new: [], wip: [], completed: [] },
    'WAX': {
      new: [],
      wip: [],
      completed: []
    },
    'SETTING': { new: [], wip: [], completed: [] },
    'CASTING': { new: [], wip: [], completed: [] },
    'FILING': { new: [], wip: [], completed: [] },
    'PRE POLISH': { new: [], wip: [], completed: [] },
    'HAND SETTING': { new: [], wip: [], completed: [] },
    'FINAL POLISH': { new: [], wip: [], completed: [] },
    'PLATING': { new: [], wip: [], completed: [] },
    'Others': { new: [], wip: [], completed: [] },
  };

  const [jobCardsData, setJobCardsData] = useState(emptyJobCardsData);

  const mapBackendStatusToBucket = (status, approvalStatus) => {
    // For voucher workflow: use approval_status if available
    if (approvalStatus === 'completed') return 'completed';
    if (approvalStatus === 'in_process') return 'wip';
    if (approvalStatus === 'awaiting') return 'new';
    if (approvalStatus === 'approved') return 'new';
    // Fallback to job status
    if (status === 'completed') return 'completed';
    if (status === 'in_progress') return 'wip';
    return 'new';
  };

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError('');

    try {
      const response = await fetch('/api/jobs', { cache: 'no-store' });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setJobsError(result?.error?.message || result?.message || 'Failed to load jobs.');
        setJobCardsData(emptyJobCardsData);
        return;
      }

      const jobs = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
      const nextData = {
        ...emptyJobCardsData,
        '3D Print': { new: [], wip: [], completed: [] },
      };

      jobs.forEach((job) => {
        // Only show approved/in_process/awaiting/completed vouchers (not pending)
        const approvalStatus = job.approval_status || '';
        const showOnDashboard = ['approved', 'in_process', 'awaiting', 'completed'].includes(approvalStatus)
          || !job.batch_id; // Non-batch jobs (single vouchers) always show

        if (!showOnDashboard) return;

        const bucket = mapBackendStatusToBucket(job.status, approvalStatus);
        const materialRows = Array.isArray(job.material_rows) ? job.material_rows : []
        const totalQty = materialRows.reduce((sum, r) => sum + (parseFloat(r.issued_qty) || 0), 0)
        const totalWeight = materialRows.reduce((sum, r) => sum + (parseFloat(r.issued_weight) || 0), 0)

        // Determine which column this voucher belongs to based on dept_from
        const targetColumn = DEPT_TO_COLUMN[job.dept_from] || 'Others';

        const card = {
          id: job.id,
          voucherNo: job.voucher_no || `JOB-${job.id}`,
          voucherType: job.voucher_type || 'New',
          name: job.issued_to || job.assignee_name || 'Unassigned',
          category: job.title,
          qty: totalQty || job.quantity || '-',
          weight: totalWeight || job.weight || '-',
          status: job.status,
          approvalStatus: approvalStatus,
          deptFrom: job.dept_from || '',
          deptTo: job.dept_to || '',
          issuedBy: job.issued_by || '',
          workType: job.work_type || '',
          batchId: job.batch_id || '',
          departmentOrder: job.department_order || 0,
          stoneRows: Array.isArray(job.stone_rows) ? job.stone_rows : [],
          materialRows,
        };

        if (nextData[targetColumn]) {
          nextData[targetColumn][bucket].push(card);
        } else {
          nextData['Others'][bucket].push(card);
        }
      });

      setJobCardsData(nextData);
      setLastUpdated(new Date());
    } catch {
      setJobsError('Failed to load jobs.');
      setJobCardsData(emptyJobCardsData);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleCardClick = (card) => {
    // Single click: select the voucher and open receive job modal
    setSelectedVoucher(card);
    setSelectedVoucherForReceive(card);
    setIsReceiveJobOpen(true);
  };

  const handleMarkVoucherComplete = async (card) => {
    if (!card?.id) return;
    const confirmed = window.confirm(
      `Mark voucher ${card.voucherNo} as completed?\nThis will activate the next step in the pipeline.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/jobs/${card.id}/mark-voucher-complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        alert(result?.error?.message || 'Failed to mark voucher as complete.');
        return;
      }
      await loadJobs();
    } catch {
      alert('Failed to mark voucher as complete.');
    }
  };

  const handleDeleteVoucher = () => {
    if (!selectedVoucher) return;
    const confirmed = window.confirm(`Delete voucher ${selectedVoucher.voucherNo}?`);
    if (!confirmed) return;
    setJobCardsData(prev => {
      const next = { ...prev };
      for (const col of Object.keys(next)) {
        for (const bucket of ['new', 'wip', 'completed']) {
          next[col] = {
            ...next[col],
            [bucket]: next[col][bucket].filter(c => c.id !== selectedVoucher.id),
          };
        }
      }
      return next;
    });
    setSelectedVoucher(null);
  };

  const handleOpenEdit = () => {
    if (!selectedVoucher) return;
    setEditForm({
      voucherNo: selectedVoucher.voucherNo,
      name: selectedVoucher.name,
      category: selectedVoucher.category,
      qty: selectedVoucher.qty,
      weight: selectedVoucher.weight,
      status: selectedVoucher.status,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    setJobCardsData(prev => {
      const next = { ...prev };
      for (const col of Object.keys(next)) {
        for (const bucket of ['new', 'wip', 'completed']) {
          next[col] = {
            ...next[col],
            [bucket]: next[col][bucket].map(c =>
              c.id === selectedVoucher.id
                ? { ...c, name: editForm.name, category: editForm.category, qty: editForm.qty, weight: editForm.weight }
                : c
            ),
          };
        }
      }
      return next;
    });
    setSelectedVoucher(prev => prev ? { ...prev, ...editForm } : null);
    setIsEditOpen(false);
  };

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const getCardStyle = (bucket) => {
    switch (bucket) {
      case 'new':
        return {
          border: 'border-yellow-400',
          header: 'bg-yellow-400',
          headerText: 'text-yellow-900',
          badge: 'bg-yellow-200 text-yellow-800',
          label: 'New',
        };
      case 'wip':
        return {
          border: 'border-orange-500',
          header: 'bg-orange-500',
          headerText: 'text-white',
          badge: 'bg-orange-200 text-orange-900',
          label: 'WIP',
        };
      case 'completed':
        return {
          border: 'border-green-500',
          header: 'bg-green-500',
          headerText: 'text-white',
          badge: 'bg-green-200 text-green-900',
          label: 'Done',
        };
      default:
        return {
          border: 'border-soft-border',
          header: 'bg-cloud-gray',
          headerText: 'text-midnight-ink',
          badge: 'bg-cloud-gray text-slate-text',
          label: '',
        };
    }
  };

  const VoucherCard = ({ card, bucket }) => {
    const s = getCardStyle(bucket);
    const isSelected = selectedVoucher?.id === card.id;

    // Determine approval badge
    const approvalLabels = {
      in_process: { text: 'In Process', cls: 'bg-orange-200 text-orange-900' },
      awaiting: { text: 'Awaiting', cls: 'bg-gray-200 text-gray-700' },
      completed: { text: 'Completed', cls: 'bg-green-200 text-green-900' },
      approved: { text: 'Approved', cls: 'bg-blue-200 text-blue-800' },
    };
    const approvalBadge = approvalLabels[card.approvalStatus];

    return (
      <div
        onClick={() => handleCardClick(card)}
        className={`border-2 ${isSelected ? 'border-trust-blue ring-2 ring-trust-blue/40' : s.border} rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'shadow-md' : ''}`}
      >
        {/* Header row: Voucher No. | NEW/Re-issue badge */}
        <div className={`${s.header} flex items-center justify-between px-2 py-1`}>
          <span className={`text-[11px] font-bold ${s.headerText} truncate`}>{card.voucherNo}</span>
          <div className="flex items-center gap-1">
            {approvalBadge && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${approvalBadge.cls} whitespace-nowrap`}>
                {approvalBadge.text}
              </span>
            )}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge} whitespace-nowrap`}>{card.voucherType || s.label}</span>
          </div>
        </div>
        {/* Name */}
        <div className="bg-white border-t border-gray-200 px-2 py-1 text-center">
          <span className="text-xs font-semibold text-midnight-ink truncate block">{card.name}</span>
        </div>
        {/* Department flow */}
        {card.deptFrom && card.deptTo && (
          <div className="bg-white border-t border-gray-200 px-2 py-0.5 text-center">
            <span className="text-[10px] text-cool-gray">{card.deptFrom} → {card.deptTo}</span>
          </div>
        )}
        {/* Category */}
        <div className="bg-white border-t border-gray-200 px-2 py-1 text-center">
          <span className="text-xs text-slate-text truncate block">{card.category}</span>
        </div>
        {/* QTY | WT */}
        <div className="bg-white border-t border-gray-200 flex divide-x divide-gray-200">
          <div className="flex-1 px-2 py-1 text-center">
            <span className="text-[10px] text-cool-gray block leading-tight">QTY</span>
            <span className="text-xs font-semibold text-midnight-ink">{card.qty ?? '-'}</span>
          </div>
          <div className="flex-1 px-2 py-1 text-center">
            <span className="text-[10px] text-cool-gray block leading-tight">WT</span>
            <span className="text-xs font-semibold text-midnight-ink">{card.weight ?? '-'}</span>
          </div>
        </div>
        {/* Mark Complete button for in_process vouchers */}
        {card.approvalStatus === 'in_process' && (
          <div className="bg-white border-t border-gray-200 p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkVoucherComplete(card);
              }}
              className="w-full text-xs font-semibold text-white bg-success hover:bg-success/90 rounded py-1 transition-colors"
            >
              Mark Complete
            </button>
          </div>
        )}
      </div>
    );
  };

  const calculateTotal = (processData) => {
    return processData.new.length + processData.wip.length + processData.completed.length;
  };

  return (
    <div className="w-full min-h-screen bg-cloud-gray">
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

      <div className="pt-16 px-3 md:px-4 pb-16">
        {/* Header Section */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MANAGERS DASHBOARD FOR VOUCHERS/JOB CARDS</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
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
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleCreateJob}
              className="bg-success hover:bg-success text-white rounded-full px-4 text-sm h-8"
            >
              Create a Job
            </Button>
            <Button 
              onClick={handleOpenEdit}
              disabled={!selectedVoucher}
              className="bg-white border border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-3 text-sm h-8 gap-1 disabled:opacity-100 disabled:border-trust-blue disabled:text-trust-blue"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <Button 
              onClick={handleDeleteVoucher}
              disabled={!selectedVoucher}
              className="bg-white border border-red-500 text-red-500 hover:bg-red-50 rounded-full px-3 text-sm h-8 gap-1 disabled:opacity-100 disabled:border-red-500 disabled:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <Button 
              onClick={handleManageColumns}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
            >
              Manage Columns
            </Button>
            <Button 
              onClick={() => setIsKYCModalOpen(true)}
              className="bg-trust-blue hover:bg-deep-blue text-white rounded-full px-4 text-sm h-8"
            >
              Company KYC
            </Button>
          </div>
        </div>
        {isLoadingJobs && <p className="text-sm text-cool-gray mb-3">Loading live jobs...</p>}
        {jobsError && <p className="text-sm text-danger-dark mb-3">{jobsError}</p>}

        {/* Filter Row */}
        <div className="border border-soft-border rounded-lg mb-6 bg-[#dbeafe] p-4">
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
            <tr className="bg-[#dbeafe] border-b-2 border-soft-border">
              {processColumns.map((column) => 
                visibleColumns.has(column) && (
                  <th key={column} className="border-2 border-soft-border p-3 text-center font-bold text-sm min-w-[200px]">
                    {column}
                  </th>
                )
              )}
            </tr>
            <tr className="bg-[#dbeafe] border-b-2 border-soft-border">
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
                  <div className="space-y-2.5">
                    {/* New Cards */}
                    {jobCardsData[column].new.map((card, idx) => (
                      <VoucherCard key={`new-${idx}`} card={card} bucket="new" />
                    ))}

                    {/* Work in Progress Cards */}
                    {jobCardsData[column].wip.map((card, idx) => (
                      <VoucherCard key={`wip-${idx}`} card={card} bucket="wip" />
                    ))}

                    {/* Completed Cards */}
                    {jobCardsData[column].completed.map((card, idx) => (
                      <VoucherCard key={`completed-${idx}`} card={card} bucket="completed" />
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

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-soft-border shadow-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm text-cool-gray">
        <div className="flex gap-4">
          <span>Total Vouchers: {Object.values(jobCardsData).reduce((sum, col) => sum + col.new.length + col.wip.length + col.completed.length, 0)}</span>
          {isLoadingJobs && <span className="text-trust-blue">Loading...</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
      </div>

      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        onJobCreated={loadJobs}
      />

      {/* Edit Voucher Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Voucher — {editForm.voucherNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">Name</label>
              <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">Category / Title</label>
              <Input value={editForm.category || ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-semibold text-slate-text block mb-1">QTY</label>
                <Input value={editForm.qty || ''} onChange={e => setEditForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-slate-text block mb-1">Weight</label>
                <Input value={editForm.weight || ''} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-trust-blue hover:bg-deep-blue text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company KYC Modal */}
      <Dialog open={isKYCModalOpen} onOpenChange={setIsKYCModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Company KYC Form</DialogTitle>
          </DialogHeader>
          <CompanyKYCForm onClose={() => setIsKYCModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
