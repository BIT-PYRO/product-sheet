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
import { QuickEnrollModal } from '@/components/quick-enroll-modal';
import { EnrolWorkforceForm } from '@/app/enrol-workforce/page';

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
  
  // Column definitions for workforce
  const columns = [
    { id: 'sNo', label: 'S No' },
    { id: 'department', label: 'Department' },
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'contactNumber', label: 'Contact Number' },
    { id: 'type', label: 'Type' },
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
    sNo: { minWidth: 'min-w-[50px]', headerBg: 'bg-yellow-400' },
    department: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
    firstName: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
    lastName: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
    contactNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-yellow-400' },
    type: { minWidth: 'min-w-[80px]', headerBg: 'bg-yellow-400' },
    aadharCard: { minWidth: 'min-w-[120px]', headerBg: 'bg-yellow-400' },
    paymentType: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
    origin: { minWidth: 'min-w-[80px]', headerBg: 'bg-yellow-400' },
    bankAccount: { minWidth: 'min-w-[120px]', headerBg: 'bg-yellow-400' },
    ifsc: { minWidth: 'min-w-[80px]', headerBg: 'bg-yellow-400' },
    bank: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
    branch: { minWidth: 'min-w-[100px]', headerBg: 'bg-yellow-400' },
  };
  
  // Set default visible columns to prevent horizontal scrolling
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'sNo',
    'department',
    'firstName',
    'lastName',
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

  const [data, setData] = useState(
    Array(15).fill(null).map((_, i) => ({
      id: i,
      sNo: i + 1,
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

  const handleQuickEnrollComplete = (personName) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('enrolledPeople');
      const enrolledPeople = stored ? JSON.parse(stored) : [];
      if (!enrolledPeople.includes(personName)) {
        enrolledPeople.push(personName);
        localStorage.setItem('enrolledPeople', JSON.stringify(enrolledPeople));
      }
    }
    setIsQuickEnrollOpen(false);
  };

  const handleEnrollWorkforce = () => {
    setIsEnrollWorkforceOpen(true);
  };

  const handleEnrollWorkforceComplete = (personName) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('enrolledPeople');
      const enrolledPeople = stored ? JSON.parse(stored) : [];
      if (!enrolledPeople.includes(personName)) {
        enrolledPeople.push(personName);
        localStorage.setItem('enrolledPeople', JSON.stringify(enrolledPeople));
      }
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
    <div className="w-full h-full bg-gray-50 p-4 md:p-6">
      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
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
                <div className="text-xs font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id) ? (
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

      {/* Print Employee Dialog */}
      <Dialog open={isPrintEmployeeOpen} onOpenChange={setIsPrintEmployeeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Employee Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmployeeForPrint && (
            <div className="space-y-6 py-4">
              {/* Employee Header */}
              <div className="border-2 border-gray-900 p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">EMPLOYEE DETAILS</h2>
                
                {/* Top Section */}
                <div className="grid grid-cols-3 gap-4 mb-6 border-b-2 border-gray-900 pb-4">
                  <div className="border-r-2 border-gray-900 pr-4">
                    <p className="text-xs font-bold text-gray-700 mb-1">S NO</p>
                    <p className="text-sm">{selectedEmployeeForPrint.sNo || '—'}</p>
                  </div>
                  <div className="border-r-2 border-gray-900 pr-4">
                    <p className="text-xs font-bold text-gray-700 mb-1">NAME</p>
                    <p className="text-sm">{selectedEmployeeForPrint.firstName || '—'} {selectedEmployeeForPrint.lastName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">DEPARTMENT</p>
                    <p className="text-sm">{selectedEmployeeForPrint.department || '—'}</p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-gray-900 pb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">CONTACT NUMBER</p>
                    <p className="text-sm">{selectedEmployeeForPrint.contactNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">TYPE</p>
                    <p className="text-sm">{selectedEmployeeForPrint.type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">AADHAR CARD</p>
                    <p className="text-sm">{selectedEmployeeForPrint.aadharCard || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">PAYMENT TYPE</p>
                    <p className="text-sm">{selectedEmployeeForPrint.paymentType || '—'}</p>
                  </div>
                </div>

                {/* Bank Information */}
                <div className="mb-6">
                  <table className="w-full border-collapse border-2 border-gray-900">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left">ORIGIN</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left">BANK A/C</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left">IFSC</th>
                        <th className="border-2 border-gray-900 p-2 text-xs font-bold text-left">BANK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-2 border-gray-900 p-2 text-sm">{selectedEmployeeForPrint.origin || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm">{selectedEmployeeForPrint.bankAccount || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm">{selectedEmployeeForPrint.ifsc || '—'}</td>
                        <td className="border-2 border-gray-900 p-2 text-sm">{selectedEmployeeForPrint.bank || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-8">Verified By</p>
                    <div className="border-t-2 border-gray-900 w-24"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-8">Date</p>
                    <p className="text-sm">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">WORK FORCE MASTER SHEET</h2>
              <p className="text-sm text-gray-600">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>

            {/* Sheet Details Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Total Employees</p>
                <p className="text-lg font-bold">{data.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Selected Employees</p>
                <p className="text-lg font-bold">{selectedRows.size}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Full-time</p>
                <p className="text-lg font-bold">{data.filter(row => row.type === 'Full-time').length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1">Active Employees</p>
                <p className="text-lg font-bold">{activeData.length}</p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border-2 border-gray-900 rounded overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="border border-gray-400 p-2 text-left">S No</th>
                    <th className="border border-gray-400 p-2 text-left">Department</th>
                    <th className="border border-gray-400 p-2 text-left">First Name</th>
                    <th className="border border-gray-400 p-2 text-left">Last Name</th>
                    <th className="border border-gray-400 p-2 text-left">Contact Number</th>
                    <th className="border border-gray-400 p-2 text-left">Type</th>
                    <th className="border border-gray-400 p-2 text-left">Aadhar Card</th>
                    <th className="border border-gray-400 p-2 text-left">Payment Type</th>
                    <th className="border border-gray-400 p-2 text-left">Origin</th>
                    <th className="border border-gray-400 p-2 text-left">Bank A/C</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-400 p-2">{row.sNo || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.department || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.firstName || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.lastName || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.contactNumber || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.type || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.aadharCard || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.paymentType || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.origin || '—'}</td>
                      <td className="border border-gray-400 p-2">{row.bankAccount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="border-t-2 border-gray-900 pt-4 mt-6">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Prepared By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Reviewed By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-8">Approved By</p>
                  <div className="border-t-2 border-gray-900 w-32"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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

      {/* Header Section */}
      <div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <MasterNavigationDrawer inHeader />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">WORK FORCE MASTER SHEET</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4">
          <Button 
            onClick={handleQuickEnroll}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
          >
            Quick Enroll
          </Button>
          <Button 
            onClick={handleEnrollWorkforce}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
          >
            Enroll Workforce
          </Button>
          <Button 
            onClick={handleEditRow}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-full px-6"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 rounded-full px-6"
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
              className="border-green-600 text-green-600 hover:bg-green-50 rounded-full px-6"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
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
              <DropdownMenuItem onClick={handlePrintEmployees}>
                Employee Details
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-2 border-gray-400 rounded-lg px-4 py-2 pl-10"
            />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="border border-gray-300 rounded-lg mb-4 bg-blue-50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Department Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">DEPARTMENT</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-xs">
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

          {/* Origin Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">ORIGIN</label>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-semibold text-gray-700 block mb-1">PAYMENT TYPE</label>
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
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
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        {/* Table wrapper with vertical scrolling only */}
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-yellow-400">
              <tr className="text-gray-800 font-bold border-b-2 border-gray-400">
                <th className="border border-gray-400 p-2 w-8 sticky left-0 bg-yellow-400 z-30"></th>
                {columns.map((column) => 
                  visibleColumns.has(column.id) && (
                    <th key={column.id} className={`border border-gray-400 p-2 ${columnConfig[column.id].headerBg} ${columnConfig[column.id].minWidth}`}>
                      {column.label}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {displayedData.map((row, idx) => {
                const isEditing = editingRowIds.has(row.id);
                const isAnyRowEditing = editingRowIds.size > 0;
                const canEdit = !isArchivedView && (!isAnyRowEditing || isEditing);
                
                return (
                  <tr 
                    key={row.id} 
                    className={`border-b border-gray-400 ${
                      isEditing 
                        ? 'bg-blue-50 hover:bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`border border-gray-400 p-2 text-center sticky left-0 z-10 ${
                      isEditing ? 'bg-blue-50' : 'bg-white'
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
                        <td key={column.id} className={`border border-gray-400 p-1 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          <Input
                            type="text"
                            value={row[column.id]}
                            onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                            className="border-0 p-1 text-xs h-8"
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          disabled={editingRowIds.size > 0}
        >
          + Add Row
        </Button>
        
        {editingRowIds.size > 0 && (
          <div className="flex gap-2 ml-4">
            <Button 
              onClick={handleSaveEdit}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Save Changes
            </Button>
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50 px-6"
            >
              Cancel Edit
            </Button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-xs text-gray-600">
        <p>Selected Rows: {selectedRows.size}</p>
        <p>Visible Rows: {displayedData.length}</p>
        <p>Archived Rows: {archivedRows.size}</p>
        <p>View: {isArchivedView ? 'Archived' : 'Active'}</p>
        {editingRowIds.size > 0 && <p className="text-blue-600 font-semibold">Editing {editingRowIds.size} row(s)</p>}
      </div>

      {/* Quick Enroll Modal */}
      <QuickEnrollModal open={isQuickEnrollOpen} onOpenChange={setIsQuickEnrollOpen} onEnroll={handleQuickEnrollComplete} />
      
      {/* Enroll Workforce Modal */}
      <Dialog open={isEnrollWorkforceOpen} onOpenChange={setIsEnrollWorkforceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Workforce</DialogTitle>
          </DialogHeader>
          <EnrolWorkforceForm onEnroll={handleEnrollWorkforceComplete} onClose={() => setIsEnrollWorkforceOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
