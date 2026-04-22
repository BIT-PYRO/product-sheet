'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Eye, FileIcon, ChevronDown } from 'lucide-react';
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
import GlobalSearchBar from '@/components/global-search-bar';
import { CreateJobModal } from '@/components/create-job-modal';
import { SuggestedVouchersModal } from '@/components/suggested-vouchers-modal';
import { NeededVouchersModal } from '@/components/needed-vouchers-modal';
import { ReceiveJobModal } from '@/components/receive-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';
import BulkUploadButton from '@/components/bulk-upload-button';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

export default function MasterJobSheet() {
  const { canView, canEdit, canCreate, canExport, loading: permsLoading } = useSheetPermissions('master-job-sheet');
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
  const [isCreateAllVouchersOpen, setIsCreateAllVouchersOpen] = useState(false);
  const [isSuggestedVouchersOpen, setIsSuggestedVouchersOpen] = useState(false);
  const [isNeededVouchersOpen, setIsNeededVouchersOpen] = useState(false);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('default');
  
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
    { id: 'files', label: 'Attached Files' },
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
    dayCondition: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    issuedQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    issuedWeight: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    receivedQty: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    receivedWeight: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    lossQty: { minWidth: 'min-w-[70px]', headerBg: 'bg-[#dbeafe]' },
    lossWeight: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    reIssueQty: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    reIssueWeight: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    files: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
  };
  
  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('master-job-sheet', columns.map(col => col.id));
  
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
  const [previewingFiles, setPreviewingFiles] = useState([]);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const loadJobs = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const response = await fetch('/api/jobs', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setFetchError(result?.message || 'Failed to load jobs');
        return;
      }

      const jobs = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
      const mappedRows = jobs.map((job) => ({
        id: job.id,
        voucherNo: `JOB-${job.id}`,
        issued: job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN') : '',
        department: job.work_type || '',
        category: job.job_type || job.title || '',
        firstName: job.issued_to || job.assignee_name || '',
        status: job.status || '',
        newReissue: 'New',
        type: job.title || '',
        receiver: job.issued_by || '',
        dayCondition: job.schedule ? new Date(job.schedule).toLocaleDateString('en-IN') : '',
        issuedQty: '',
        issuedWeight: '',
        receivedQty: '',
        receivedWeight: '',
        lossQty: '',
        lossWeight: '',
        reIssueQty: '',
        reIssueWeight: '',
        uploadedFiles: job.uploaded_files || [],
        notes: job.notes || '',
        contact: job.contact || '',
      }));

      setData(mappedRows);
    } catch (err) {
      setFetchError(err.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    if (selectedRows.size === 0) {
      alert('Please select a voucher to print');
      return;
    }
    const voucherId = Array.from(selectedRows)[0];
    const voucher = data.find(row => row.id === voucherId);
    setSelectedVoucherForPrint(voucher);
    setIsPrintVoucherOpen(true);
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
    setCurrentPage(1);
    setSelectedRows(new Set());
    setEditingRowIds(new Set());
  };

  // Get active (non-archived) data
  const activeData = data.filter(row => !archivedRows.has(row.id));
  const archivedData = data.filter(row => archivedRows.has(row.id));
  const isArchivedView = viewMode === 'archived';
  const displayedData = isArchivedView ? archivedData : activeData;

  const sortedDisplayData = sortOrder === 'default' ? displayedData : [...displayedData].sort((a, b) => {
    if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortOrder === 'oldest') return (a.id || 0) - (b.id || 0);
    const av = String(a.voucherNo || '').toLowerCase(), bv = String(b.voucherNo || '').toLowerCase();
    return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const totalPages = Math.max(1, Math.ceil(sortedDisplayData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedDisplayData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

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
            <Button
              onClick={saveColumnView}
              variant="outline"
              className="ml-auto border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10"
            >
              {saveViewStatus === 'saved' ? 'Saved ✓' : 'Save View'}
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

      {/* File Preview Dialog */}
      <Dialog open={isFilePreviewOpen} onOpenChange={setIsFilePreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attached Files</DialogTitle>
          </DialogHeader>
          
          {previewingFiles && previewingFiles.length > 0 && (
            <div className="space-y-4">
              {/* File List */}
              <div className="space-y-2 border rounded p-4 bg-gray-50">
                <h3 className="font-semibold text-sm mb-3">Files ({previewingFiles.length})</h3>
                {previewingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                      <FileIcon className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size} KB · {file.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {file.type}
                    </span>
                  </div>
                ))}
              </div>

              {previewingFiles.length > 0 && (
                <p className="text-xs text-gray-500 text-center">Files are stored in the system database for record-keeping</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setIsFilePreviewOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Sheet Dialog */}
      <Dialog open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Master Job Sheet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sheet Header */}
            <div className="text-center border-b-2 border-midnight-ink pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">MASTER JOB SHEET</h2>
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

      <div className="pt-16 px-3 md:px-4 pb-16">
        {/* Header Section */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER JOB SHEET</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          {/* Search Bar */}
          <div className="relative mr-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-4 h-4" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-soft-border rounded-lg pl-9 pr-4 h-9 w-64 text-sm"
            />
          </div>
          <BulkUploadButton sheetType="jobs" onComplete={loadJobs} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
                {sortOrder === 'default' ? 'Sort ▾' : sortOrder === 'asc' ? 'A → Z ▾' : sortOrder === 'desc' ? 'Z → A ▾' : sortOrder === 'newest' ? 'Newest ▾' : 'Oldest ▾'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortOrder('asc'); setCurrentPage(1); }}>A → Z (Ascending)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortOrder('desc'); setCurrentPage(1); }}>Z → A (Descending)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortOrder('newest'); setCurrentPage(1); }}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortOrder('oldest'); setCurrentPage(1); }}>Oldest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortOrder('default'); setCurrentPage(1); }}>Default Order</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={loadJobs}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 h-8 text-sm"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          {canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-success hover:bg-success/90 text-white rounded-full px-4 h-8 text-sm gap-1">
                  Create a Job
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsCreateJobModalOpen(true)} className="cursor-pointer">Create Job</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateAllVouchersOpen(true)} className="cursor-pointer">Create All Vouchers</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSuggestedVouchersOpen(true)} className="cursor-pointer text-orange-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
                    Create Suggested Vouchers
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsNeededVouchersOpen(true)} className="cursor-pointer text-red-600 font-semibold" disabled>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
                    Create Needed Vouchers
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canEdit && (
            <Button 
              onClick={handleEditRow}
              variant="outline"
              className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 h-8 text-sm"
              disabled={isArchivedView}
            >
              Edit Row
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 h-8 text-sm"
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
          )}
          {isArchivedView && canEdit && (
            <Button
              onClick={handleUnarchiveRows}
              variant="outline"
              className="border-green-600 text-success hover:bg-success/10 rounded-full px-4 h-8 text-sm"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
          <Button 
            onClick={handleManageColumns}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 h-8 text-sm"
          >
            Manage Columns
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 h-8 text-sm"
            disabled={!canExport}
            title={!canExport ? 'You do not have permission to export' : undefined}
          >
            Export
          </Button>
          
          {/* Print Dropdown */}
          {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-midnight-ink text-midnight-ink rounded-full px-4 h-8 text-sm"
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
          )}
        </div>

      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg bg-trust-blue/10 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-2 items-end">
          {/* Status/Pending WIP Completion */}
          <div>
            <label className="text-xs font-semibold text-black block mb-1">STATUS</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
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
            <label className="text-xs font-semibold text-black block mb-1">DATE FROM</label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-1 text-xs focus:outline-none focus:ring-0"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-xs font-semibold text-black block mb-1">DATE TO</label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-1 text-xs focus:outline-none focus:ring-0"
            />
          </div>

          {/* New/Reissue */}
          <div>
            <label className="text-xs font-semibold text-black block mb-1">NEW/RE-ISSUE</label>
            <Select value={newReissueFilter} onValueChange={setNewReissueFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
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
            <label className="text-xs font-semibold text-black block mb-1">NAME</label>
            <Select value={nameFilter} onValueChange={setNameFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
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
            <label className="text-xs font-semibold text-black block mb-1">ISSUER</label>
            <Select value={issuerFilter} onValueChange={setIssuerFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
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
            <label className="text-xs font-semibold text-black block mb-1">DEPARTMENT</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
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
            <label className="text-xs font-semibold text-black block mb-1">TYPE</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
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
            <label className="text-xs font-semibold text-black block mb-1">CATEGORY</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
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
            <label className="text-xs font-semibold text-black block mb-1">RECEIVER</label>
            <Select value={receiverFilter} onValueChange={setReceiverFilter}>
              <SelectTrigger className="text-xs bg-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
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
            <label className="text-xs font-semibold text-black block mb-1">SKU</label>
            <input
              type="text"
              placeholder="Enter SKU"
              value={skuFilter}
              onChange={(e) => setSKUFilter(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Loading / Error Banner */}
      {fetchError && (
        <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {fetchError}
        </div>
      )}

      {/* Table Section */}
      <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with vertical and horizontal scrolling */}
        <div className="overflow-y-auto overflow-x-auto max-h-[500px]">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-40 bg-[#dbeafe]">
              <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-50">
                  <Checkbox
                    checked={paginatedData.length > 0 && paginatedData.every(row => selectedRows.has(row.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(new Set(paginatedData.map(row => row.id)));
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
              {paginatedData.map((row) => {
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
                          {column.id === 'files' ? (
                            <div className="flex items-center gap-2 justify-center">
                              {row.uploadedFiles && row.uploadedFiles.length > 0 ? (
                                <button
                                  onClick={() => {
                                    setPreviewingFiles(row.uploadedFiles);
                                    setSelectedFileIndex(0);
                                    setIsFilePreviewOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                                >
                                  <FileIcon className="h-3 w-3" />
                                  {row.uploadedFiles.length}
                                  <Eye className="h-3 w-3" />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          ) : (
                            <Input
                              type="text"
                              value={row[column.id]}
                              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                              className="border-0 p-1 text-sm h-8"
                              disabled={!canEdit}
                            />
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
        {canCreate && (
          <Button 
            onClick={handleAddRow}
            className="bg-trust-blue hover:bg-deep-blue text-white px-6"
            disabled={editingRowIds.size > 0}
          >
            + Add Row
          </Button>
        )}
        
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
          <span>{displayedData.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, displayedData.length)}`} of {displayedData.length}</span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">‹</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">›</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
          <span>Archived: {archivedRows.size}</span>
          {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} row(s)</span>}
        </div>
      </div>

      {/* Quick Enroll Modal */}
      <QuickEnrollModal 
        open={isQuickEnrollOpen} 
        onOpenChange={setIsQuickEnrollOpen}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        onJobCreated={loadJobs}
      />
      <CreateJobModal open={isCreateAllVouchersOpen} onOpenChange={setIsCreateAllVouchersOpen} mode="all" onJobCreated={loadJobs} />
      <SuggestedVouchersModal open={isSuggestedVouchersOpen} onOpenChange={setIsSuggestedVouchersOpen} suggestedItems={[]} onVouchersCreated={loadJobs} />
      <NeededVouchersModal open={isNeededVouchersOpen} onOpenChange={setIsNeededVouchersOpen} neededItems={[]} onVouchersCreated={loadJobs} />

      {/* Enroll Workforce Modal */}
      <Dialog open={isEnrollWorkforceOpen} onOpenChange={setIsEnrollWorkforceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Workforce</DialogTitle>
          </DialogHeader>
          <EnrolWorkforceForm />
        </DialogContent>
      </Dialog>
      <DeletionHistoryDrawer appLabel="jobs" modelName="job" />
    </div>
  );
}
