'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
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
import DateTimeStamp from '@/components/date-time-stamp';
import BulkUploadButton from '@/components/bulk-upload-button';

export default function MasterDesignerSheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Column definitions for designer
  const columns = [
    { id: 'sku', label: 'SKU' },
    { id: 'image', label: 'Image' },
    { id: 'tdmFile', label: '3DM File' },
    { id: 'stlFile', label: 'STL File' },
    { id: 'tdmStatus', label: '3DM Status' },
    { id: 'stlStatus', label: 'STL Status' },
    { id: 'renderStatus', label: 'RENDER Status' },
    { id: 'print3dStatus', label: '3D PRINT Status' },
    { id: 'dieEntries', label: 'DIE' },
  ];

  // Column configuration with styling
  const columnConfig = {
    sku: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    image: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    tdmFile: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    stlFile: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
    tdmStatus: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    stlStatus: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    renderStatus: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    print3dStatus: { minWidth: 'min-w-[100px]', headerBg: 'bg-[#dbeafe]' },
    dieEntries: { minWidth: 'min-w-[140px]', headerBg: 'bg-[#dbeafe]' },
  };

  // Set default visible columns
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'sku', 'image', 'tdmFile', 'stlFile', 'tdmStatus', 'stlStatus', 'renderStatus', 'print3dStatus', 'dieEntries',
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

  const [data, setData] = useState([]);

  useEffect(() => {
    const loadDesignerSheets = async () => {
      try {
        const response = await fetch('/api/designers', { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          return;
        }

        const rows = Array.isArray(result?.data) ? result.data : (result?.data?.results || []);
        const mapped = rows.map((row) => ({
          id: row.id,
          hasBackendRecord: true,
          sku: row.sku || '',
          image: row.image || '',
          tdmFile: row.tdm_file || '',
          stlFile: row.stl_file || '',
          tdmStatus: row.tdm_status || '',
          stlStatus: row.stl_status || '',
          renderStatus: row.render_status || '',
          print3dStatus: row.print_3d_status || '',
          dieEntries: Array.isArray(row.die_entries) ? row.die_entries.map((v) => (typeof v === 'string' ? v : v?.value || '')).join(', ') : '',
          is_active: row.is_active,
        }));
        setData(mapped);
      } catch {
        // Keep table editable with local rows when backend load fails.
      }
    };

    loadDesignerSheets();
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

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const handleAddRow = () => {
    const newId = Math.max(...data.map(row => row.id), -1) + 1;
    const newRow = {
      id: newId,
      hasBackendRecord: false,
      sku: '',
      image: '',
      tdmFile: '',
      stlFile: '',
      tdmStatus: '',
      stlStatus: '',
      renderStatus: '',
      print3dStatus: '',
      dieEntries: '',
    };
    setData([...data, newRow]);
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to delete');
      return;
    }

    const confirmed = window.confirm('Delete selected designer row(s)? This action cannot be undone.');
    if (!confirmed) return;

    const selectedRowIds = Array.from(selectedRows);
    const rowsToDelete = data.filter((row) => selectedRows.has(row.id));
    const backendRows = rowsToDelete.filter((row) => row.hasBackendRecord);

    if (backendRows.length > 0) {
      const deleteResults = await Promise.all(
        backendRows.map(async (row) => {
          try {
            const response = await fetch(`/api/designers/${row.id}`, { method: 'DELETE' });
            if (!response.ok) return false;
            const result = await response.json().catch(() => null);
            return result == null || result.success !== false;
          } catch {
            return false;
          }
        })
      );

      if (deleteResults.some((ok) => !ok)) {
        alert('One or more selected rows could not be deleted. Please retry.');
        return;
      }
    }

    const remainingRows = data.filter((row) => !selectedRows.has(row.id));
    setData(remainingRows);

    const nextArchived = new Set(archivedRows);
    selectedRowIds.forEach((id) => nextArchived.delete(id));
    setArchivedRows(nextArchived);

    const nextEditing = new Set(editingRowIds);
    selectedRowIds.forEach((id) => nextEditing.delete(id));
    setEditingRowIds(nextEditing);

    setSelectedRows(new Set());
    alert('Selected designer row(s) deleted successfully.');
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

  const handleExport = () => {
    console.log('Export data:', data);
  };

  // Get active (non-archived) data
  const activeData = data.filter(row => !archivedRows.has(row.id));
  const archivedData = data.filter(row => archivedRows.has(row.id));
  const isArchivedView = viewMode === 'archived';
  const displayedData = isArchivedView ? archivedData : activeData;
  const totalPages = Math.max(1, Math.ceil(displayedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = displayedData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const displayedRowIds = displayedData.map((row) => row.id);
  const allDisplayedRowsSelected =
    displayedRowIds.length > 0 && displayedRowIds.every((id) => selectedRows.has(id));

  const handleToggleSelectAllRows = () => {
    if (editingRowIds.size > 0) return;
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

      <div className="pt-16 px-3 md:px-4 pb-16">
        {/* Header Section */}
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER DESIGNER SHEET</h1>
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
          <BulkUploadButton sheetType="designers" onComplete={() => window.location.reload()} />
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
                      {columns.map((column) =>
                        visibleColumns.has(column.id) && (
                          <td key={column.id} className="border border-soft-border p-1" style={isEditing ? {backgroundColor: '#eff6ff'} : {}}>
                            {column.id === 'image' ? (
                              row.image ? (
                                <img src={row.image} alt="Designer" className="w-10 h-10 object-cover rounded border border-soft-border mx-auto" />
                              ) : (
                                <span className="text-cool-gray text-xs">—</span>
                              )
                            ) : (
                              <Input
                                type="text"
                                value={row[column.id] ?? ''}
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
    </div>
  );
}
