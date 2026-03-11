'use client';

import { useEffect, useState } from 'react';
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
import { QuickEnrollModal } from '@/components/quick-enroll-modal';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { CreateJobModal } from '@/components/create-job-modal';
import { ReceiveJobModal } from '@/components/receive-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';

export default function MasterJobSheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isPrintVoucherOpen, setIsPrintVoucherOpen] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [isReceiveJobOpen, setIsReceiveJobOpen] = useState(false);
  const [selectedVoucherForReceive, setSelectedVoucherForReceive] = useState(null);
  const [shouldPrintReceiveJob, setShouldPrintReceiveJob] = useState(false);
  const [isQuickEnrollOpen, setIsQuickEnrollOpen] = useState(false);
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');
  
  // Column definitions
  const columns = [
    { id: 'issued', label: 'Issued' },
    { id: 'department', label: 'Department' },
    { id: 'category', label: 'Category' },
    { id: 'firstName', label: 'First Name' },
    { id: 'status', label: 'Status' },
    { id: 'newReissue', label: 'New/Re-issue' },
    { id: 'type', label: 'Type' },
    { id: 'receiver', label: 'Receiver' },
    { id: 'dayCondition', label: 'Day & Condition' },
    { id: 'issuedQty', label: 'Issued Qty' },
    { id: 'issuedWeight', label: 'Issued Weight' },
    { id: 'receivedQty', label: 'Received Qty' },
    { id: 'receivedWeight', label: 'Received Weight' },
    { id: 'lossQty', label: 'Loss Qty' },
    { id: 'lossWeight', label: 'Loss Weight' },
    { id: 'reIssueQty', label: 'Re-Issue Qty' },
    { id: 'reIssueWeight', label: 'Re-Issue Weight' },
  ];
  
  // Column configuration with styling
  const columnConfig = {
    issued: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    department: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    category: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    firstName: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    status: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    newReissue: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    type: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    receiver: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    dayCondition: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]', cellBg: 'bg-trust-blue/10' },
    issuedQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    issuedWeight: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    receivedQty: { minWidth: 'min-w-[80px]', headerBg: 'bg-success/10', cellBg: 'bg-success/10' },
    receivedWeight: { minWidth: 'min-w-[100px]', headerBg: 'bg-success/10', cellBg: 'bg-success/10' },
    lossQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-danger/10', cellBg: 'bg-danger/10' },
    lossWeight: { minWidth: 'min-w-[80px]', headerBg: 'bg-danger/10', cellBg: 'bg-danger/10' },
    reIssueQty: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]', cellBg: 'bg-trust-blue/10' },
    reIssueWeight: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]', cellBg: 'bg-trust-blue/10' },
  };
  
  const [visibleColumns, setVisibleColumns] = useState(new Set(columns.map(col => col.id)));
  
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

  const [data, setData] = useState([]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch('/api/jobs', { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          return;
        }

        const jobs = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
        const mappedRows = jobs.map((job) => ({
          id: job.id,
          voucherNo: `JOB-${job.id}`,
          issued: job.created_at ? new Date(job.created_at).toLocaleDateString() : '',
          department: '',
          category: job.title || '',
          firstName: job.assignee || '',
          status: job.status || '',
          newReissue: 'New',
          type: '',
          receiver: '',
          dayCondition: '',
          issuedQty: '',
          issuedWeight: '',
          receivedQty: '',
          receivedWeight: '',
          lossQty: '',
          lossWeight: '',
          reIssueQty: '',
          reIssueWeight: '',
        }));

        setData(mappedRows);
      } catch {
        // Keep editable local table if backend load fails.
      }
    };

    loadJobs();
  }, []);

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
    setIsReceiveJobOpen(true);
    setShouldPrintReceiveJob(true);
  };

  const handlePrintSheet = () => {
    setIsPrintSheetOpen(true);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Export data:', data);
  };

  const handleCreateJob = () => {
    setIsCreateJobModalOpen(true);
  };

  const handleQuickEnroll = () => {
    setIsQuickEnrollOpen(true);
  };

  useEffect(() => {
    if (!isReceiveJobOpen || !shouldPrintReceiveJob) {
      return;
    }

    const timeoutId = setTimeout(() => {
      window.print();
      setShouldPrintReceiveJob(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isReceiveJobOpen, shouldPrintReceiveJob]);

  const handleQuickEnrollComplete = async (personName) => {
    try {
      await fetch('/api/workforce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: String(personName || '').trim(),
          phone: '',
          active: true,
        }),
      });
    } catch {
      // Non-blocking: close modal even if API call fails.
    }
    setIsQuickEnrollOpen(false);
  };

  const handleEnrollWorkforce = () => {
    setIsEnrollWorkforceOpen(true);
  };

  const handleWorkforceEnrolled = async (personName) => {
    try {
      await fetch('/api/workforce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: String(personName || '').trim(),
          phone: '',
          active: true,
        }),
      });
    } catch {
      // Non-blocking: close modal even if API call fails.
    }
    setIsEnrollWorkforceOpen(false);
  };

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
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
      issuedWeight: '',
      receivedQty: '',
      receivedWeight: '',
      lossQty: '',
      lossWeight: '',
      reIssueQty: '',
      reIssueWeight: '',
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
  const displayedData = isArchivedView ? archivedData : activeData;

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

      {/* Print Voucher Dialog */}
      <Dialog open={isPrintVoucherOpen} onOpenChange={setIsPrintVoucherOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Voucher</DialogTitle>
          </DialogHeader>
          
          {selectedVoucherForPrint && (
            <div className="space-y-6 py-4">
              {/* Voucher Header */}
              <div className="border-2 border-midnight-ink p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">VOUCHER</h2>
                
                {/* Top Section */}
                <div className="grid grid-cols-4 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">DATE</p>
                    <p className="text-sm">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">SCHEDULE FOR FUTURE</p>
                    <p className="text-sm">—</p>
                  </div>
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">VOUCHER TYPE</p>
                    <p className="text-sm">{selectedVoucherForPrint.newReissue || 'New'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">VOUCHER NO.</p>
                    <p className="text-sm font-bold">{selectedVoucherForPrint.voucherNo || '—'}</p>
                  </div>
                </div>

                {/* Issued To Section */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">ISSUED TO</p>
                    <p className="text-sm">{selectedVoucherForPrint.firstName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">DEPARTMENT</p>
                    <p className="text-sm">{selectedVoucherForPrint.department || '—'}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full border-collapse border-2 border-midnight-ink">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">ISSUED QTY</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">ISSUED WEIGHT</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">RECEIVED QTY</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">RECEIVED WEIGHT</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedVoucherForPrint.issuedQty || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedVoucherForPrint.issuedWeight || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedVoucherForPrint.receivedQty || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedVoucherForPrint.receivedWeight || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedVoucherForPrint.status || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Issued By</p>
                    <div className="border-t-2 border-midnight-ink w-24"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Received By</p>
                    <div className="border-t-2 border-midnight-ink w-24"></div>
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
                  onClick={() => setIsPrintVoucherOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReceiveJobModal
        open={isReceiveJobOpen}
        onOpenChange={setIsReceiveJobOpen}
        onJobReceived={() => {}}
        voucherData={selectedVoucherForReceive}
      />

      {/* Print Sheet Dialog */}
      <Dialog open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Master WIP/JOB Sheet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sheet Header */}
            <div className="text-center border-b-2 border-midnight-ink pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">MASTER WIP/JOB SHEET</h2>
              <p className="text-sm text-cool-gray">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>

            {/* Sheet Details Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-cloud-gray rounded-lg border border-soft-border">
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total Vouchers</p>
                <p className="text-lg font-bold">{data.length}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Selected Rows</p>
                <p className="text-lg font-bold">{selectedRows.size}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total Issued Qty</p>
                <p className="text-lg font-bold">{data.reduce((sum, row) => sum + (parseInt(row.issuedQty) || 0), 0)}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total Received Qty</p>
                <p className="text-lg font-bold">{data.reduce((sum, row) => sum + (parseInt(row.receivedQty) || 0), 0)}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border-2 border-midnight-ink rounded overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="border border-soft-border p-2 text-left">Voucher No.</th>
                    <th className="border border-soft-border p-2 text-left">Issued</th>
                    <th className="border border-soft-border p-2 text-left">Department</th>
                    <th className="border border-soft-border p-2 text-left">Category</th>
                    <th className="border border-soft-border p-2 text-left">First Name</th>
                    <th className="border border-soft-border p-2 text-left">Status</th>
                    <th className="border border-soft-border p-2 text-left">Issued Qty</th>
                    <th className="border border-soft-border p-2 text-left">Issued Weight</th>
                    <th className="border border-soft-border p-2 text-left">Received Qty</th>
                    <th className="border border-soft-border p-2 text-left">Received Weight</th>
                    <th className="border border-soft-border p-2 text-left">Loss Qty</th>
                    <th className="border border-soft-border p-2 text-left">Loss Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-cloud-gray'}>
                      <td className="border border-soft-border p-2">{row.voucherNo || '—'}</td>
                      <td className="border border-soft-border p-2">{row.issued || '—'}</td>
                      <td className="border border-soft-border p-2">{row.department || '—'}</td>
                      <td className="border border-soft-border p-2">{row.category || '—'}</td>
                      <td className="border border-soft-border p-2">{row.firstName || '—'}</td>
                      <td className="border border-soft-border p-2">{row.status || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.issuedQty || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.issuedWeight || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.receivedQty || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.receivedWeight || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.lossQty || '—'}</td>
                      <td className="border border-soft-border p-2 text-center">{row.lossWeight || '—'}</td>
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

      <div className="pt-16 px-3 md:px-4 pb-3 md:pb-4">
        {/* Header Section */}
        <div className="sheet-fixed-header fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER WIP/JOB SHEET</h1>
            </div>
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          <Button 
            onClick={handleCreateJob}
            className="bg-success hover:bg-success text-white rounded-full px-6"
          >
            Create a Job
          </Button>
          <Button 
            onClick={handleEnrollWorkforce}
            className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-6"
          >
            Enroll Workforce
          </Button>
          <Button 
            onClick={handleQuickEnroll}
            className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-6"
          >
            Quick Enroll
          </Button>
          <Button 
            onClick={handleEditRow}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6"
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
              className="border-green-600 text-success hover:bg-success/10 rounded-full px-6"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
          <Button 
            onClick={handleManageColumns}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-6"
          >
            Manage Columns
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-6"
          >
            Export
          </Button>
          
          {/* Print Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-midnight-ink text-midnight-ink rounded-full px-6"
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
        <div className="flex gap-2 mb-2 max-w-md mx-auto md:mx-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-2 border-soft-border rounded-lg px-4 py-2 pl-10"
            />
          </div>
        </div>

      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg mb-4 bg-trust-blue/10 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {/* Status/Pending WIP Completion */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">STATUS</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm">
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
            <label className="text-sm font-semibold text-slate-text block mb-1">DATE FROM</label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="h-8 text-sm p-1"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">DATE TO</label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="h-8 text-sm p-1"
            />
          </div>

          {/* New/Reissue */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">NEW/RE-ISSUE</label>
            <Select value={newReissueFilter} onValueChange={setNewReissueFilter}>
              <SelectTrigger className="h-8 text-sm">
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
              <SelectTrigger className="h-8 text-sm">
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
              <SelectTrigger className="h-8 text-sm">
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
              <SelectTrigger className="h-8 text-sm">
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
              <SelectTrigger className="h-8 text-sm">
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

          {/* Receiver */}
          <div>
            <label className="text-sm font-semibold text-slate-text block mb-1">RECEIVER</label>
            <Select value={receiverFilter} onValueChange={setReceiverFilter}>
              <SelectTrigger className="h-8 text-sm">
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
            <label className="text-sm font-semibold text-slate-text block mb-1">SKU</label>
            <Input
              type="text"
              placeholder="Enter SKU"
              value={skuFilter}
              onChange={(e) => setSKUFilter(e.target.value)}
              className="h-8 text-sm p-1"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with vertical and horizontal scrolling */}
        <div className="overflow-y-auto overflow-x-auto max-h-[500px]">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-40 bg-[#dbeafe]">
              <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-50">
                  <Checkbox
                    checked={selectedRows.size === displayedData.length && displayedData.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(new Set(displayedData.map(row => row.id)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    className="cursor-pointer"
                    disabled={editingRowIds.size > 0}
                  />
                </th>
                <th className="border border-soft-border p-2 bg-[#dbeafe] min-w-[100px] sticky left-8 z-50 border-r-2 border-r-soft-border" style={{boxShadow: 'inset -2px 0 0 0 rgb(229, 231, 235)'}}>Voucher No.</th>
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
              {displayedData.map((row) => {
                const isEditing = editingRowIds.has(row.id);
                const isAnyRowEditing = editingRowIds.size > 0;
                const canEdit = !isArchivedView && (!isAnyRowEditing || isEditing);
                
                return (
                  <tr 
                    key={row.id} 
                    className={`border-b border-soft-border ${
                      isEditing 
                        ? 'bg-trust-blue/10 hover:bg-trust-blue/10' 
                        : 'hover:bg-cloud-gray'
                    }`}
                  >
                    <td className={`border border-soft-border p-2 text-center sticky left-0 z-20 ${
                      isEditing ? 'bg-trust-blue/10' : 'bg-white'
                    }`}>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={() => toggleRowSelection(row.id)}
                        className="cursor-pointer"
                        disabled={isAnyRowEditing}
                      />
                    </td>
                    <td className={`border border-soft-border p-1 sticky left-8 z-20 border-r-2 border-r-gray-400`} style={{boxShadow: 'inset -2px 0 0 0 rgb(209, 213, 219)', backgroundColor: isEditing ? '#eff6ff' : 'white'}}>
                      {isEditing ? (
                        <Input
                          type="text"
                          value={row.voucherNo}
                          onChange={(e) => handleCellChange(row.id, 'voucherNo', e.target.value)}
                          className="border-0 p-1 text-sm h-8"
                          disabled={!canEdit}
                        />
                      ) : (
                        <div 
                          onClick={() => {
                            setSelectedVoucherForReceive(row);
                            setIsReceiveJobOpen(true);
                          }}
                          className="cursor-pointer p-1 text-sm font-medium text-trust-blue hover:text-deep-blue hover:underline"
                        >
                          {row.voucherNo || '—'}
                        </div>
                      )}
                    </td>
                    {columns.map((column) =>
                      visibleColumns.has(column.id) && (
                        <td key={column.id} className={`border border-soft-border p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          <Input
                            type="text"
                            value={row[column.id]}
                            onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                            className="border-0 p-1 text-sm h-8"
                            disabled={!canEdit}
                          />
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
          className="bg-trust-blue hover:bg-deep-blue text-white px-6"
          disabled={editingRowIds.size > 0}
        >
          + Add Row
        </Button>
        
        {editingRowIds.size > 0 && (
          <div className="flex gap-2 ml-4">
            <Button 
              onClick={handleSaveEdit}
              className="bg-success hover:bg-success/90 text-white px-6"
            >
              Save Changes
            </Button>
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              className="border-red-600 text-danger hover:bg-danger/10 px-6"
            >
              Cancel Edit
            </Button>
          </div>
        )}
      </div>

        {/* Footer Info */}
        <div className="mt-4 text-sm text-cool-gray">
          <p>Selected Rows: {selectedRows.size}</p>
          <p>Visible Rows: {displayedData.length}</p>
          <p>Archived Rows: {archivedRows.size}</p>
          <p>View: {isArchivedView ? 'Archived' : 'Active'}</p>
          {editingRowIds.size > 0 && <p className="text-trust-blue font-semibold">Editing {editingRowIds.size} row(s)</p>}
        </div>
      </div>

      {/* Quick Enroll Modal */}
      <QuickEnrollModal 
        open={isQuickEnrollOpen} 
        onOpenChange={setIsQuickEnrollOpen}
        onEnroll={handleQuickEnrollComplete}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
      />

      {/* Enroll Workforce Modal */}
      <Dialog open={isEnrollWorkforceOpen} onOpenChange={setIsEnrollWorkforceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Workforce</DialogTitle>
          </DialogHeader>
          <EnrolWorkforceForm onEnroll={handleWorkforceEnrolled} onClose={() => setIsEnrollWorkforceOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
