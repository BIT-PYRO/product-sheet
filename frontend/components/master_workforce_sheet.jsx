'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
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
import LastUpdatedFooter from '@/components/last-updated-footer';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

export default function MasterWorkforceSheet() {
  const { canView, canEdit, canCreate, canExport, loading: permsLoading } = useSheetPermissions('master-workforce-sheet');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
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
  const [sortOrder, setSortOrder] = useState('default');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingWorkforceId, setEditingWorkforceId] = useState(null);

  // Column definitions — mirrors all Enroll Workforce fields
  const columns = [
    { id: 'profilePhoto',       label: 'Photo' },
    { id: 'fullName',           label: 'Full Name' },
    { id: 'department',         label: 'Department' },
    { id: 'category',           label: 'Category' },
    { id: 'designation',        label: 'Role / Designation' },
    { id: 'workingStyle',       label: 'Working Style' },
    { id: 'status',             label: 'Status' },
    { id: 'gender',             label: 'Gender' },
    { id: 'phone',              label: 'Phone' },
    { id: 'whatsapp',           label: 'WhatsApp' },
    { id: 'email',              label: 'Email' },
    { id: 'dob',                label: 'Date of Birth' },
    { id: 'firstLanguage',      label: 'First Language' },
    { id: 'secondLanguage',     label: 'Second Language' },
    { id: 'currentLocation',    label: 'Current Location' },
    { id: 'currAddrLine1',      label: 'Curr. Address Line 1' },
    { id: 'currAddrLine2',      label: 'Curr. Address Line 2' },
    { id: 'currAddrCountry',    label: 'Curr. Country' },
    { id: 'currAddrState',      label: 'Curr. State' },
    { id: 'currAddrCity',       label: 'Curr. City' },
    { id: 'currAddrPincode',    label: 'Curr. Pincode' },
    { id: 'permAddrLine1',      label: 'Perm. Address Line 1' },
    { id: 'permAddrLine2',      label: 'Perm. Address Line 2' },
    { id: 'permAddrCountry',    label: 'Perm. Country' },
    { id: 'permAddrState',      label: 'Perm. State' },
    { id: 'permAddrCity',       label: 'Perm. City' },
    { id: 'permAddrPincode',    label: 'Perm. Pincode' },
    { id: 'accountName',        label: 'Account Name' },
    { id: 'bankName',           label: 'Bank Name' },
    { id: 'accountNumber',      label: 'Account Number' },
    { id: 'ifsc',               label: 'IFSC' },
    { id: 'notes',              label: 'Notes' },
    { id: 'aadhaarDoc',         label: 'Aadhaar Doc' },
    { id: 'panDoc',             label: 'PAN Doc' },
    { id: 'barcodeNumber',      label: 'Barcode / ID' },
    { id: 'dateOfJoining',      label: 'Date of Joining' },
  ];

  const ADDRESS_COLUMN_IDS = new Set([
    'currAddrLine1','currAddrLine2','currAddrCountry','currAddrState','currAddrCity','currAddrPincode',
    'permAddrLine1','permAddrLine2','permAddrCountry','permAddrState','permAddrCity','permAddrPincode',
  ]);

  const columnConfig = Object.fromEntries(
    columns.map(c => [c.id, {
      minWidth: ADDRESS_COLUMN_IDS.has(c.id) ? 'min-w-[160px]' : 'min-w-[120px]',
      headerBg: ADDRESS_COLUMN_IDS.has(c.id) ? 'bg-[#e0f2fe]' : 'bg-[#dbeafe]',
    }])
  );

  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('master-workforce-sheet-v3', [
    'profilePhoto', 'fullName', 'department', 'category', 'designation', 'workingStyle', 'status', 'phone', 'email', 'currentLocation', 'aadhaarDoc', 'panDoc', 'barcodeNumber', 'dateOfJoining',
  ]);
  
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
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [workingStyleFilter, setWorkingStyleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const STATIC_DEPARTMENTS = [
    'Marketing','Customer Relation Management','Operations','Design','Logistics',
    'Purchase','Sales / Business Development','Finance','Information Technology',
    'Human Resource','Production','Services','House Keeping',
  ];
  const WORKING_STYLES = ['On-site','Remote','Hybrid','Field Work','Part-time','Contractual'];

  // Dynamic departments and roles derived from loaded + meta data
  const [dynamicDepartments, setDynamicDepartments] = useState(STATIC_DEPARTMENTS);
  const [dynamicRoles, setDynamicRoles] = useState([]);

  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadWorkforce = async () => {
      try {
        const [response, metaResponse] = await Promise.all([
          fetch('/api/workforce', { cache: 'no-store' }),
          fetch('/api/workforce/meta', { cache: 'no-store' }),
        ]);
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) return;

        const rows = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
        const mappedRows = rows.map((row, index) => ({
          id: row.id,
          hasBackendRecord: true,
          sNo: index + 1,
          fullName:           row.full_name || '',
          department:         row.department || '',
          category:           row.category || '',
          designation:        row.designation || '',
          workingStyle:       row.working_style || '',
          status:             row.active ? 'Active' : 'Revoked',
          gender:             row.gender || '',
          phone:              row.phone || '',
          whatsapp:           row.whatsapp || '',
          email:              row.email || '',
          dob:                row.dob || '',
          firstLanguage:      row.first_language || '',
          secondLanguage:     row.second_language || '',
          currentLocation:    row.current_location || '',
          currAddrLine1:      row.current_address?.line1 || '',
          currAddrLine2:      row.current_address?.line2 || '',
          currAddrCountry:    row.current_address?.country || '',
          currAddrState:      row.current_address?.state || '',
          currAddrCity:       row.current_address?.city || '',
          currAddrPincode:    row.current_address?.pincode || '',
          permAddrLine1:      row.permanent_address?.line1 || '',
          permAddrLine2:      row.permanent_address?.line2 || '',
          permAddrCountry:    row.permanent_address?.country || '',
          permAddrState:      row.permanent_address?.state || '',
          permAddrCity:       row.permanent_address?.city || '',
          permAddrPincode:    row.permanent_address?.pincode || '',
          accountName:        row.account_name || '',
          bankName:           row.bank_name || '',
          accountNumber:      row.account_number || '',
          ifsc:               row.ifsc || '',
          notes:              row.notes || '',
          profilePhoto:       row.profile_photo_url || '',
          aadhaarDoc:         row.aadhaar_url || '',
          panDoc:             row.pan_url || '',
          barcodeNumber:      row.barcode_number || `WF-${String(row.id||'').padStart(4,'0')}`,
          dateOfJoining:      row.date_of_joining || (row.created_at ? row.created_at.split('T')[0] : ''),
        }));

        setData(mappedRows);
        setLastUpdated(new Date());

        // Derive unique departments and roles from real data + meta
        const rowDepts = [...new Set(mappedRows.map(r => r.department).filter(Boolean))];
        const rowRoles = [...new Set(mappedRows.map(r => r.designation).filter(Boolean))];

        // Case-insensitive dedup: keep first-seen canonical casing per lowercase key
        const ciDedup = (arr) => {
          const seen = new Map();
          arr.forEach(v => { if (v) seen.set(v.toLowerCase(), seen.has(v.toLowerCase()) ? seen.get(v.toLowerCase()) : v); });
          return [...seen.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        };

        if (metaResponse.ok) {
          const meta = await metaResponse.json().catch(() => null);
          if (meta?.success) {
            const metaDepts = meta.data?.departments || [];
            const metaRoles = meta.data?.designations || [];
            setDynamicDepartments(ciDedup([...STATIC_DEPARTMENTS, ...metaDepts, ...rowDepts]));
            setDynamicRoles(ciDedup([...metaRoles, ...rowRoles]));
          } else {
            setDynamicDepartments(ciDedup([...STATIC_DEPARTMENTS, ...rowDepts]));
            setDynamicRoles(ciDedup(rowRoles));
          }
        } else {
          setDynamicDepartments(ciDedup([...STATIC_DEPARTMENTS, ...rowDepts]));
          setDynamicRoles(ciDedup(rowRoles));
        }
      } catch {
        // keep table editable with local rows when backend fails
      }
    };
    loadWorkforce();
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('workforce-updated', handler);
    return () => window.removeEventListener('workforce-updated', handler);
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

  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [idCardData, setIdCardData] = useState([]);
  const [docPreview, setDocPreview] = useState(null); // { url, title, sourceUrl, isImage }
  const isPdfUrl = (url = '') => /\.pdf($|\?)/i.test(String(url || ''));
  const buildDocProxyUrl = (url = '', mode = 'preview') => {
    const clean = String(url || '').trim();
    if (!clean) return '';
    return `/api/workforce/document-file?mode=${encodeURIComponent(mode)}&url=${encodeURIComponent(clean)}`;
  };
  const openDocPreview = (url, title, opts = {}) => {
    const source = String(url || '').trim();
    if (!source) return;
    const isImage = Boolean(opts.isImage);
    setDocPreview({
      url: buildDocProxyUrl(source, 'preview'),
      sourceUrl: source,
      title,
      isImage,
      isPdf: isPdfUrl(source),
    });
  };
  const buildDownloadUrl = (url = '') => buildDocProxyUrl(url, 'download');

  const handleGenerateIdCards = () => {
    const ids = selectedRows.size > 0 ? Array.from(selectedRows) : paginatedData.map(r => r.id);
    const members = data.filter(r => ids.includes(r.id));
    if (!members.length) { alert('No members to generate ID cards for.'); return; }
    setIdCardData(members);
    setIsIdCardOpen(true);
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const EXPORT_FIELDS = columns.map((c) => c.id);
  const EXPORT_LABELS = columns.map((c) => c.label);
  const exportToExcel = () => {
    if (!canExport) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([EXPORT_LABELS, ...sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => r[f] ?? ''))]), 'Workforce');
    XLSX.writeFile(wb, 'master_workforce_sheet.xlsx');
    setExportMenuOpen(false);
  };
  const exportToPDF = () => {
    if (!canExport) return;
    const rows = sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => r[f] ?? ''));
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Master Workforce Sheet</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>Master Workforce Sheet</h2><table><thead><tr>${EXPORT_LABELS.map((l)=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
    setExportMenuOpen(false);
  };

  const handleQuickEnrollOpen2 = () => {
    setIsQuickEnrollOpen(true);
  };

  const handleEnrollWorkforce = () => {
    setIsEnrollWorkforceOpen(true);
  };

  const handleEnrollWorkforceComplete = () => {
    // Form already POSTed/PATCHed to backend — just close and refresh the table
    setIsEnrollWorkforceOpen(false);
    setEditingWorkforceId(null);
    setRefreshKey(k => k + 1);
  };

  const handleQuickEnrollComplete = async (personName) => {
    try {
      await fetch('/api/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: String(personName || '').trim(), phone: '', active: true }),
      });
    } catch { /* non-blocking */ }
    setIsQuickEnrollOpen(false);
    setRefreshKey(k => k + 1);
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
      fullName: '', department: '', category: '', designation: '', workingStyle: '',
      status: '', gender: '', phone: '', whatsapp: '', email: '', dob: '',
      firstLanguage: '', secondLanguage: '', currentLocation: '',
      accountName: '', bankName: '', accountNumber: '', ifsc: '', notes: '',
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

  // Apply filters + search
  const displayedData = (isArchivedView ? archivedData : activeData).filter(row => {
    const q = searchTerm.toLowerCase();
    if (q && ![
      row.fullName, row.department, row.category, row.designation,
      row.phone, row.email, row.workingStyle,
    ].some(v => (v || '').toLowerCase().includes(q))) return false;
    if (departmentFilter !== 'all' && row.department !== departmentFilter) return false;
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
    if (roleFilter !== 'all' && row.designation !== roleFilter) return false;
    if (workingStyleFilter !== 'all' && row.workingStyle !== workingStyleFilter) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (genderFilter !== 'all' && row.gender !== genderFilter) return false;
    return true;
  });

  const sortedDisplayData = sortOrder === 'default' ? displayedData : [...displayedData].sort((a, b) => {
    if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortOrder === 'oldest') return (a.id || 0) - (b.id || 0);
    const av = String(a.fullName || '').toLowerCase(), bv = String(b.fullName || '').toLowerCase();
    return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const totalPages = Math.max(1, Math.ceil(sortedDisplayData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedDisplayData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

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

      {/* Document Preview Modal */}
      {docPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDocPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-soft-border">
              <span className="text-sm font-bold text-midnight-ink">{docPreview.title}</span>
              <div className="flex items-center gap-2">
                <a href={docPreview.url} target="_blank" rel="noopener noreferrer" className="text-xs text-trust-blue underline px-2 py-1 rounded hover:bg-cloud-gray">Open in new tab</a>
                <button onClick={() => setDocPreview(null)} className="p-1.5 rounded hover:bg-cloud-gray"><svg className="w-4 h-4 text-cool-gray" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 p-4">
              {docPreview.isImage
                ? <img src={docPreview.url} alt={docPreview.title} className="max-w-full max-h-[70vh] object-contain rounded shadow" />
                : <iframe src={docPreview.url} className="w-full" style={{height:'70vh'}} title={docPreview.title} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ID Card Dialog */}
      <Dialog open={isIdCardOpen} onOpenChange={setIsIdCardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>ID Cards — {idCardData.length} Employee{idCardData.length !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs text-cool-gray mb-4">Print and cut along the borders. Each card is portrait format.</p>
            <div className="flex flex-wrap gap-5 justify-start" id="id-cards-print-area">
              {idCardData.map(emp => (
                <div key={emp.id} className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white shadow-md flex flex-col" style={{width:220, fontFamily:'sans-serif', minHeight:380}}>
                  {/* Header band */}
                  <div className="bg-[#1d4ed8] px-3 py-2 flex items-center justify-between">
                    <span className="text-white text-[9px] font-bold tracking-widest uppercase">Employee ID Card</span>
                    <span className="text-white/70 text-[9px] font-mono">{emp.barcodeNumber}</span>
                  </div>
                  {/* Photo centered */}
                  <div className="flex justify-center pt-4 pb-2">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#1d4ed8]/30 bg-gray-100 flex items-center justify-center shadow">
                      {emp.profilePhoto
                        ? <img src={emp.profilePhoto} alt={emp.fullName} className="w-full h-full object-cover" />
                        : <span className="text-3xl font-bold text-gray-400">{(emp.fullName||'?').charAt(0).toUpperCase()}</span>
                      }
                    </div>
                  </div>
                  {/* Name + Role */}
                  <div className="text-center px-3 pb-2">
                    <div className="font-bold text-[13px] text-gray-900 leading-tight">{emp.fullName || '—'}</div>
                    <div className="text-[11px] text-[#1d4ed8] font-semibold mt-0.5">{emp.designation || '—'}</div>
                    <div className="text-[10px] text-gray-500">{emp.department || '—'}</div>
                  </div>
                  {/* Divider */}
                  <div className="mx-3 border-t border-gray-200 mb-2" />
                  {/* Info rows */}
                  <div className="px-3 flex flex-col gap-1 flex-1">
                    {emp.phone && (
                      <div className="flex items-start gap-1.5 text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-500 w-[68px] shrink-0">Phone No.</span>
                        <span className="font-medium">{emp.phone}</span>
                      </div>
                    )}
                    {emp.dob && (
                      <div className="flex items-start gap-1.5 text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-500 w-[68px] shrink-0">DOB</span>
                        <span>{emp.dob}</span>
                      </div>
                    )}
                    {emp.workingStyle && (
                      <div className="flex items-start gap-1.5 text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-500 w-[68px] shrink-0">Work Style</span>
                        <span>{emp.workingStyle}</span>
                      </div>
                    )}
                    {emp.dateOfJoining && (
                      <div className="flex items-start gap-1.5 text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-500 w-[68px] shrink-0">Joined</span>
                        <span>{emp.dateOfJoining}</span>
                      </div>
                    )}
                  </div>
                  {/* Barcode strip */}
                  <div className="px-3 pt-2 pb-1 mt-2">
                    <div className="flex items-end justify-center gap-px mb-1" style={{height:30}}>
                      {(emp.barcodeNumber||'').split('').map((ch,i) => {
                        const code = ch.charCodeAt(0);
                        return [
                          <div key={`b${i}a`} className="bg-gray-900" style={{width:1+(code%3),height:26+(i%2)*4}} />,
                          <div key={`b${i}b`} style={{width:1+(i%2),height:0}} />,
                          <div key={`b${i}c`} className="bg-gray-900" style={{width:1,height:18+(code%8)}} />,
                          <div key={`b${i}d`} style={{width:1,height:0}} />,
                        ];
                      })}
                    </div>
                    <div className="text-center font-mono text-[9px] text-gray-700 tracking-[0.2em] font-bold">{emp.barcodeNumber}</div>
                  </div>
                  {/* Footer */}
                  <div className="bg-[#1d4ed8] px-3 py-1 flex items-center justify-between mt-1">
                    <span className="text-white/70 text-[9px]">ID: {String(emp.id||'').padStart(4,'0')}</span>
                    <span className="text-white/70 text-[9px]">Status: {emp.status || 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2 border-t">
            <Button onClick={() => window.print()} className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white">Print ID Cards</Button>
            <Button onClick={() => setIsIdCardOpen(false)} variant="outline">Close</Button>
          </DialogFooter>
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
          {canCreate && <BulkUploadButton sheetType="workforce" onComplete={() => window.location.reload()} />}
          <Button onClick={handleGenerateIdCards} variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-full px-4 text-sm h-8">
            {selectedRows.size > 0 ? `ID Cards (${selectedRows.size})` : 'Generate ID Cards'}
          </Button>
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
          {canCreate && (
            <Button 
              onClick={handleQuickEnrollOpen2}
              className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-4 text-sm h-8"
            >
              Quick Enroll
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={handleEnrollWorkforce}
              className="bg-trust-blue hover:bg-trust-blue text-white rounded-full px-4 text-sm h-8"
            >
              Enroll Workforce
            </Button>
          )}
          {canEdit && (
            <Button 
              onClick={handleEditRow}
              variant="outline"
              className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
              disabled={isArchivedView}
            >
              Edit Row
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={handleDeleteSelectedRows}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-100 disabled:border-red-500 disabled:text-red-500 rounded-full px-4 text-sm h-8"
              disabled={selectedRows.size === 0 || editingRowIds.size > 0}
            >
              Delete Selected
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
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
              className="border-green-600 text-success hover:bg-success/10 rounded-full px-4 text-sm h-8"
              disabled={selectedRows.size === 0}
            >
              Unarchive Selected
            </Button>
          )}
          <Button 
            onClick={handleManageColumns}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Manage Columns
          </Button>
          <div className="relative">
            {exportMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />}
            <Button onClick={() => setExportMenuOpen((p) => !p)} variant="outline"
              className="relative z-20 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8 flex items-center gap-1.5"
              disabled={!canExport} title={!canExport ? 'You do not have permission to export' : undefined}>
              <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {exportMenuOpen && canExport && (
              <div className="absolute right-0 top-9 z-30 w-52 rounded-lg bg-white shadow-lg border border-soft-border py-1">
                <button type="button" onClick={exportToExcel} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as Excel (.xlsx)</button>
                <button type="button" onClick={exportToPDF} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as PDF</button>
              </div>
            )}
          </div>
          
          {/* Print Dropdown */}
          {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
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
          )}
        </div>

      {/* Filter Row */}
      <div className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Department */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">DEPARTMENT</label>
            <Select value={departmentFilter} onValueChange={v => { setDepartmentFilter(v); setCategoryFilter('all'); setRoleFilter('all'); }}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {dynamicDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Designation / Role */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">DESIGNATION</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {dynamicRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Working Style */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">WORKING STYLE</label>
            <Select value={workingStyleFilter} onValueChange={setWorkingStyleFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {WORKING_STYLES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Status */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">STATUS</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Gender */}
          <div>
            <label className="text-sm font-semibold text-black block mb-1">GENDER</label>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="h-8 text-sm focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Clear filters */}
          <div className="flex items-end">
            <button
              onClick={() => { setDepartmentFilter('all'); setCategoryFilter('all'); setRoleFilter('all'); setWorkingStyleFilter('all'); setStatusFilter('all'); setGenderFilter('all'); }}
              className="text-xs text-trust-blue underline hover:text-deep-blue transition"
            >
              Clear Filters
            </button>
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
                        <td key={column.id} className={`border border-soft-border p-2 ${columnConfig[column.id].cellBg || ''}`} style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                          {column.id === 'fullName' && !isEditing ? (
                            <div className="flex items-center justify-between gap-1 group">
                              <button
                                type="button"
                                onClick={() => {
                                  if (row.hasBackendRecord) {
                                    setEditingWorkforceId(row.id);
                                    setIsEnrollWorkforceOpen(true);
                                  }
                                }}
                                className="flex-1 text-left px-1 py-1 text-sm text-trust-blue hover:underline font-medium whitespace-normal break-words leading-snug"
                              >
                                {row.fullName || '—'}
                              </button>
                              <button
                                type="button"
                                title="Generate ID Card"
                                onClick={() => { setIdCardData([row]); setIsIdCardOpen(true); }}
                                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-indigo-50 text-indigo-500 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                              </button>
                            </div>
                          ) : isEditing && column.id === 'dateOfJoining' ? (
                            <Input
                              type="date"
                              value={row.dateOfJoining || ''}
                              onChange={(e) => handleCellChange(row.id, 'dateOfJoining', e.target.value)}
                              className="border-0 p-1 text-xs h-8"
                              disabled={!canEdit}
                            />
                          ) : isEditing ? (
                            <Input
                              type="text"
                              value={row[column.id]}
                              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                              className="border-0 p-1 text-sm h-8"
                              disabled={!canEdit}
                            />
                          ) : column.id === 'profilePhoto' ? (
                            <div className="px-1 py-0.5">
                              {row.profilePhoto
                                ? (
                                  <div className="flex flex-col items-start gap-1">
                                    <img
                                      src={row.profilePhoto}
                                      alt={row.fullName}
                                      className="w-9 h-9 rounded object-cover border border-soft-border cursor-pointer hover:opacity-80"
                                      onClick={() => openDocPreview(row.profilePhoto, `${row.fullName} — Photo`, { isImage: true })}
                                    />
                                    <div className="flex items-center gap-2 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => openDocPreview(row.profilePhoto, `${row.fullName} — Photo`, { isImage: true })}
                                        className="text-trust-blue underline hover:text-deep-blue"
                                      >
                                        View
                                      </button>
                                      <a
                                        href={buildDownloadUrl(row.profilePhoto)}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-trust-blue underline hover:text-deep-blue"
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                )
                                : <span className="inline-flex w-9 h-9 rounded bg-cloud-gray items-center justify-center text-cool-gray text-xs font-bold border border-soft-border">{(row.fullName||'?').charAt(0).toUpperCase()}</span>
                              }
                            </div>
                          ) : column.id === 'aadhaarDoc' ? (
                            <div className="px-1 py-0.5">
                              {row.aadhaarDoc
                                ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => openDocPreview(row.aadhaarDoc, `${row.fullName} — Aadhaar`)}
                                      className="text-trust-blue underline hover:text-deep-blue"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={buildDownloadUrl(row.aadhaarDoc)}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-trust-blue underline hover:text-deep-blue"
                                    >
                                      Download
                                    </a>
                                  </div>
                                )
                                : <span className="text-xs text-cool-gray">—</span>
                              }
                            </div>
                          ) : column.id === 'panDoc' ? (
                            <div className="px-1 py-0.5">
                              {row.panDoc
                                ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => openDocPreview(row.panDoc, `${row.fullName} — PAN`)}
                                      className="text-trust-blue underline hover:text-deep-blue"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={buildDownloadUrl(row.panDoc)}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-trust-blue underline hover:text-deep-blue"
                                    >
                                      Download
                                    </a>
                                  </div>
                                )
                                : <span className="text-xs text-cool-gray">—</span>
                              }
                            </div>
                          ) : column.id === 'barcodeNumber' ? (
                            <div className="px-1 py-0.5 font-mono text-xs">{row.barcodeNumber || '—'}</div>
                          ) : column.id === 'dateOfJoining' ? (
                            <div className="px-1 py-0.5 text-xs">{row.dateOfJoining || '—'}</div>
                          ) : column.id === 'status' ? (
                            <div className="px-1 py-0.5">
                              {row.status === 'Revoked' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                  Revoked
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  Active
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-midnight-ink whitespace-normal break-words leading-snug px-1 py-0.5">
                              {row[column.id] || '—'}
                            </div>
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
          <span>{displayedData.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, displayedData.length)}`} of {displayedData.length}</span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
          <span>Archived: {archivedRows.size}</span>
          {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} row(s)</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
        <DeletionHistoryDrawer appLabel="workforce" modelName="workforcemember" />
      </div>

      {/* Quick Enroll Modal */}
      <QuickEnrollModal open={isQuickEnrollOpen} onOpenChange={setIsQuickEnrollOpen} onEnroll={handleQuickEnrollComplete} />
      
      {/* Enroll Workforce Modal */}
      <Dialog open={isEnrollWorkforceOpen} onOpenChange={setIsEnrollWorkforceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Workforce</DialogTitle>
          </DialogHeader>
          <EnrolWorkforceForm onEnroll={handleEnrollWorkforceComplete} onClose={() => { setIsEnrollWorkforceOpen(false); setEditingWorkforceId(null); }} editingId={editingWorkforceId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
