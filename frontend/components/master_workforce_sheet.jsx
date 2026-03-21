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
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import { QuickEnrollModal } from '@/components/quick-enroll-modal';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import DateTimeStamp from '@/components/date-time-stamp';
import BulkUploadButton from '@/components/bulk-upload-button';

export default function MasterWorkforceSheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isPrintEmployeeOpen, setIsPrintEmployeeOpen] = useState(false);
  const [selectedEmployeeForPrint, setSelectedEmployeeForPrint] = useState(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [isQuickEnrollOpen, setIsQuickEnrollOpen] = useState(false);
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false);
  const [viewMode, setViewMode] = useState('active');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Column definitions for workforce
  const columns = [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'department', label: 'Department' },
    { id: 'contactNumber', label: 'Contact Number' },
    { id: 'type', label: 'Status' },
    { id: 'aadharCard', label: 'Aadhar Card' },
    { id: 'paymentType', label: 'Payment Type' },
    { id: 'origin', label: 'Origin' },
    { id: 'bankAccount', label: 'Bank A/C' },
    { id: 'ifsc', label: 'IFSC' },
    { id: 'bank', label: 'Bank' },
    { id: 'branch', label: 'Branch' },
  ];
  
  // Column configuration with styling
  const columnConfig = {
    department: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    firstName: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    lastName: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    contactNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    type: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    aadharCard: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    paymentType: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    origin: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    bankAccount: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    ifsc: { minWidth: 'min-w-[80px]', headerBg: 'bg-[#dbeafe]' },
    bank: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    branch: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
  };
  
  // Set default visible columns to prevent horizontal scrolling
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'firstName',
    'lastName',
    'department',
    'contactNumber',
    'type',
    'paymentType',
  ]));
  
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
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  
  // Sample data for dropdowns
  const departmentOptions = ['HR', 'Operations', 'Sales', 'Finance', 'IT', 'Manufacturing'];
  const typeOptions = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const originOptions = ['Local', 'Permanent', 'Temporary'];
  const paymentTypeOptions = ['Salary', 'Hourly', 'Contract', 'Commission'];

  const [data, setData] = useState([]);

  useEffect(() => {
    const loadWorkforce = async () => {
      try {
        const response = await fetch('/api/workforce', { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          return;
        }

        const workforceRows = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
        const mappedRows = workforceRows.map((row, index) => {
          const parts = String(row.full_name || '').trim().split(/\s+/);
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ');

          return {
            id: row.id,
            hasBackendRecord: true,
            sNo: index + 1,
            department: '',
            firstName,
            lastName,
            contactNumber: row.phone || '',
            type: row.active ? 'Active' : 'Inactive',
            aadharCard: '',
            paymentType: '',
            origin: '',
            bankAccount: '',
            ifsc: '',
            bank: '',
            branch: '',
          };
        });

        setData(mappedRows);
      } catch {
        // Keep table editable with local rows when backend load fails.
      }
    };

    loadWorkforce();
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

  const handlePrintEmployees = () => {
    if (selectedRows.size === 0) {
      alert('Please select an employee to print');
      return;
    }
    const employeeId = Array.from(selectedRows)[0];
    const employee = data.find(row => row.id === employeeId);
    setSelectedEmployeeForPrint(employee);
    setIsPrintEmployeeOpen(true);
  };

  const handlePrintSheet = () => {
    setIsPrintSheetOpen(true);
  };

  const handleExport = () => {
    console.log('Export data:', data);
  };

  const handleQuickEnroll = () => {
    setIsQuickEnrollOpen(true);
  };

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

  const handleEnrollWorkforceComplete = async (personName) => {
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
      hasBackendRecord: false,
      sNo: data.length + 1,
      department: '',
      firstName: '',
      lastName: '',
      contactNumber: '',
      type: '',
      aadharCard: '',
      paymentType: '',
      origin: '',
      bankAccount: '',
      ifsc: '',
      bank: '',
      branch: '',
    };
    setData([...data, newRow]);
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to delete');
      return;
    }

    const confirmed = window.confirm('Delete selected worker row(s)? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    const selectedRowIds = Array.from(selectedRows);
    const rowsToDelete = data.filter((row) => selectedRows.has(row.id));
    const backendRows = rowsToDelete.filter((row) => row.hasBackendRecord);

    if (backendRows.length > 0) {
      const deleteResults = await Promise.all(
        backendRows.map(async (row) => {
          try {
            const response = await fetch(`/api/workforce/${row.id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              return false;
            }

            const result = await response.json().catch(() => null);
            return result == null || result.success !== false;
          } catch {
            return false;
          }
        })
      );

      if (deleteResults.some((ok) => !ok)) {
        alert('One or more selected workers could not be deleted. Please retry.');
        return;
      }
    }

    const remainingRows = data.filter((row) => !selectedRows.has(row.id));
    const normalizedRows = remainingRows.map((row, index) => ({
      ...row,
      sNo: index + 1,
    }));

    setData(normalizedRows);

    const nextArchived = new Set(archivedRows);
    selectedRowIds.forEach((id) => nextArchived.delete(id));
    setArchivedRows(nextArchived);

    const nextEditing = new Set(editingRowIds);
    selectedRowIds.forEach((id) => nextEditing.delete(id));
    setEditingRowIds(nextEditing);

    setSelectedRows(new Set());
    alert('Selected worker row(s) deleted successfully.');
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

  const totalPages = Math.max(1, Math.ceil(displayedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = displayedData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const displayedRowIds = paginatedData.map((row) => row.id);
  const allDisplayedRowsSelected =
    displayedRowIds.length > 0 && displayedRowIds.every((id) => selectedRows.has(id));

  const handleToggleSelectAllRows = () => {
    if (editingRowIds.size > 0) {
      return;
    }

    if (allDisplayedRowsSelected) {
      setSelectedRows(new Set());
      return;
    }

    setSelectedRows(new Set(displayedRowIds));
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

      {/* Print Employee Dialog */}
      <Dialog open={isPrintEmployeeOpen} onOpenChange={setIsPrintEmployeeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Employee Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmployeeForPrint && (
            <div className="space-y-6 py-4">
              {/* Employee Header */}
              <div className="border-2 border-midnight-ink p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">EMPLOYEE DETAILS</h2>
                
                {/* Top Section */}
                <div className="grid grid-cols-3 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">S NO</p>
                    <p className="text-sm">{selectedEmployeeForPrint.sNo || '—'}</p>
                  </div>
                  <div className="border-r-2 border-midnight-ink pr-4">
                    <p className="text-sm font-bold text-slate-text mb-1">NAME</p>
                    <p className="text-sm">{selectedEmployeeForPrint.firstName || '—'} {selectedEmployeeForPrint.lastName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">DEPARTMENT</p>
                    <p className="text-sm">{selectedEmployeeForPrint.department || '—'}</p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-midnight-ink pb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">CONTACT NUMBER</p>
                    <p className="text-sm">{selectedEmployeeForPrint.contactNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">TYPE</p>
                    <p className="text-sm">{selectedEmployeeForPrint.type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">AADHAR CARD</p>
                    <p className="text-sm">{selectedEmployeeForPrint.aadharCard || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-1">PAYMENT TYPE</p>
                    <p className="text-sm">{selectedEmployeeForPrint.paymentType || '—'}</p>
                  </div>
                </div>

                {/* Bank Information */}
                <div className="mb-6">
                  <table className="w-full border-collapse border-2 border-midnight-ink">
                    <thead>
                      <tr className="bg-midnight-ink text-white">
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">ORIGIN</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">BANK A/C</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">IFSC</th>
                        <th className="border-2 border-midnight-ink p-2 text-sm font-bold text-left">BANK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedEmployeeForPrint.origin || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedEmployeeForPrint.bankAccount || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedEmployeeForPrint.ifsc || '—'}</td>
                        <td className="border-2 border-midnight-ink p-2 text-sm">{selectedEmployeeForPrint.bank || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Verified By</p>
                    <div className="border-t-2 border-midnight-ink w-24"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-text mb-8">Date</p>
                    <p className="text-sm">{new Date().toISOString().split('T')[0]}</p>
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
                  onClick={() => setIsPrintEmployeeOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Sheet Dialog */}
      <Dialog open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Work Force Master Sheet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sheet Header */}
            <div className="text-center border-b-2 border-midnight-ink pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">WORK FORCE MASTER SHEET</h2>
              <p className="text-sm text-cool-gray">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>

            {/* Sheet Details Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-cloud-gray rounded-lg border border-soft-border">
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Total Employees</p>
                <p className="text-lg font-bold">{data.length}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Selected Employees</p>
                <p className="text-lg font-bold">{selectedRows.size}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Full-time</p>
                <p className="text-lg font-bold">{data.filter(row => row.type === 'Full-time').length}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-text mb-1">Active Employees</p>
                <p className="text-lg font-bold">{activeData.length}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border-2 border-midnight-ink rounded overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="border border-soft-border p-2 text-left">Department</th>
                    <th className="border border-soft-border p-2 text-left">First Name</th>
                    <th className="border border-soft-border p-2 text-left">Last Name</th>
                    <th className="border border-soft-border p-2 text-left">Contact Number</th>
                    <th className="border border-soft-border p-2 text-left">Type</th>
                    <th className="border border-soft-border p-2 text-left">Aadhar Card</th>
                    <th className="border border-soft-border p-2 text-left">Payment Type</th>
                    <th className="border border-soft-border p-2 text-left">Origin</th>
                    <th className="border border-soft-border p-2 text-left">Bank A/C</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-cloud-gray'}>
                      <td className="border border-soft-border p-2">{row.department || '—'}</td>
                      <td className="border border-soft-border p-2">{row.firstName || '—'}</td>
                      <td className="border border-soft-border p-2">{row.lastName || '—'}</td>
                      <td className="border border-soft-border p-2">{row.contactNumber || '—'}</td>
                      <td className="border border-soft-border p-2">{row.type || '—'}</td>
                      <td className="border border-soft-border p-2">{row.aadharCard || '—'}</td>
                      <td className="border border-soft-border p-2">{row.paymentType || '—'}</td>
                      <td className="border border-soft-border p-2">{row.origin || '—'}</td>
                      <td className="border border-soft-border p-2">{row.bankAccount || '—'}</td>
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
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER WORKFORCE SHEET</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          {/* Search Bar */}
          <div className="mr-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-soft-border rounded-lg px-4 py-2 pl-10 w-64"
            />
          </div>
          <BulkUploadButton sheetType="workforce" onComplete={() => window.location.reload()} />
          <Button 
            onClick={handleQuickEnroll}
            className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-6"
          >
            Quick Enroll
          </Button>
          <Button 
            onClick={handleEnrollWorkforce}
            className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-6"
          >
            Enroll Workforce
          </Button>
          <Button 
            onClick={handleEditRow}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
          <Button
            onClick={handleDeleteSelectedRows}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-100 disabled:border-red-500 disabled:text-red-500 rounded-full px-6"
            disabled={selectedRows.size === 0 || editingRowIds.size > 0}
          >
            Delete Selected
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
              <DropdownMenuItem onClick={handlePrintEmployees}>
                Employee Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintSheet}>
                Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Department Filter */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">DEPARTMENT</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">TYPE</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin Filter */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">ORIGIN</label>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Origin" />
              </SelectTrigger>
              <SelectContent>
                {originOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Type Filter */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">PAYMENT TYPE</label>
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Payment Type" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with vertical scrolling only */}
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-40 bg-[#dbeafe]">
              <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-50">
                  <Checkbox
                    checked={allDisplayedRowsSelected}
                    onCheckedChange={handleToggleSelectAllRows}
                    className="cursor-pointer"
                    disabled={displayedRowIds.length === 0 || editingRowIds.size > 0}
                  />
                </th>
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
              {paginatedData.map((row, idx) => {
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
      <QuickEnrollModal open={isQuickEnrollOpen} onOpenChange={setIsQuickEnrollOpen} />
      
      {/* Enroll Workforce Modal */}
      <Dialog open={isEnrollWorkforceOpen} onOpenChange={setIsEnrollWorkforceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Workforce</DialogTitle>
          </DialogHeader>
          <EnrolWorkforceForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
