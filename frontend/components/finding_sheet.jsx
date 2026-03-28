'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import GlobalSearchBar from '@/components/global-search-bar';
import BulkUploadButton from '@/components/bulk-upload-button';
import LastUpdatedFooter from '@/components/last-updated-footer';

const FINDING_COLUMNS = [
  { id: 'findingCode', label: 'FINDING CODE' },
  { id: 'dieNumber', label: 'DIE NUMBER' },
  { id: 'size', label: 'SIZE' },
  { id: 'quantity', label: 'QUANTITY' },
  { id: 'weight', label: 'WEIGHT' },
  { id: 'material', label: 'MATERIAL' },
  { id: 'findingStage', label: 'FINDING STAGE' },
  { id: 'polish', label: 'POLISH' },
  { id: 'mechanism', label: 'MECHANISM' },
  { id: 'designMaterial', label: 'DESIGN MATERIAL' },
  { id: 'moldQtyPerDie', label: 'MOLD QTY/DIE' },
  { id: 'deadWeight', label: 'DEAD WEIGHT' },
  { id: 'totalMeasurements', label: 'TOTAL MEASUREMENTS' },
  { id: 'notes', label: 'NOTES' },
];

const columnConfig = {
  findingCode: { minWidth: 'min-w-[180px]', headerBg: 'bg-[#dbeafe]' },
  dieNumber: { minWidth: 'min-w-[150px]', headerBg: 'bg-[#dbeafe]' },
  size: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
  quantity: { minWidth: 'min-w-[140px]', headerBg: 'bg-[#dbeafe]' },
  weight: { minWidth: 'min-w-[140px]', headerBg: 'bg-[#dbeafe]' },
  material: { minWidth: 'min-w-[130px]', headerBg: 'bg-[#dbeafe]' },
  findingStage: { minWidth: 'min-w-[140px]', headerBg: 'bg-[#dbeafe]' },
  polish: { minWidth: 'min-w-[120px]', headerBg: 'bg-[#dbeafe]' },
  mechanism: { minWidth: 'min-w-[140px]', headerBg: 'bg-[#dbeafe]' },
  designMaterial: { minWidth: 'min-w-[150px]', headerBg: 'bg-[#dbeafe]' },
  moldQtyPerDie: { minWidth: 'min-w-[130px]', headerBg: 'bg-[#dbeafe]' },
  deadWeight: { minWidth: 'min-w-[130px]', headerBg: 'bg-[#dbeafe]' },
  totalMeasurements: { minWidth: 'min-w-[170px]', headerBg: 'bg-[#dbeafe]' },
  notes: { minWidth: 'min-w-[200px]', headerBg: 'bg-[#dbeafe]' },
};

const EMPTY_FINDING_ROW = {
  findingCode: '',
  dieNumber: '',
  size: '',
  quantity: '',
  weight: '',
  material: '',
  findingStage: '',
  polish: '',
  mechanism: '',
  designMaterial: '',
  moldQtyPerDie: '',
  deadWeight: '',
  totalMeasurements: '',
  notes: '',
};

export default function FindingSheet() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [archivedRows, setArchivedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('active');

  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(FINDING_COLUMNS.map((col) => col.id)));

  const [isPrintItemOpen, setIsPrintItemOpen] = useState(false);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [selectedFindingForPrint, setSelectedFindingForPrint] = useState(null);
  const [saveEditStatus, setSaveEditStatus] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [findingCodeFilter, setFindingCodeFilter] = useState('');
  const [dieNumberFilter, setDieNumberFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [quantityFilter, setQuantityFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [findingStageFilter, setFindingStageFilter] = useState('');
  const [mechanismFilter, setMechanismFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

  const loadFindings = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/findings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || 'Failed to load findings');
      const rows = (json?.data?.results ?? json?.data ?? []).map((r) => ({
        id: r.id,
        findingCode: r.finding_code ?? '',
        dieNumber: r.die_number ?? '',
        size: r.size ?? '',
        quantity: r.quantity ?? '',
        weight: r.weight ?? '',
        material: r.material ?? '',
        findingStage: r.finding_stage ?? '',
        polish: r.polish ?? '',
        mechanism: r.mechanism ?? '',
        designMaterial: r.design_material ?? '',
        moldQtyPerDie: r.mold_qty_per_die ?? '',
        deadWeight: r.dead_weight ?? '',
        totalMeasurements: r.total_measurements ?? '',
        notes: r.notes ?? '',
      }));
      setData(rows);
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError(err.message || 'Failed to load findings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  const activeData = data.filter((row) => !archivedRows.has(row.id));
  const archivedData = data.filter((row) => archivedRows.has(row.id));
  const isArchivedView = viewMode === 'archived';
  const baseData = isArchivedView ? archivedData : activeData;

  const filteredRows = useMemo(() => {
    return baseData.filter((row) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        row.findingCode.toLowerCase().includes(term) ||
        row.dieNumber.toLowerCase().includes(term) ||
        row.size.toLowerCase().includes(term) ||
        row.quantity.toLowerCase().includes(term) ||
        row.weight.toLowerCase().includes(term) ||
        row.material.toLowerCase().includes(term) ||
        row.mechanism.toLowerCase().includes(term);

      const matchesFindingCode = !findingCodeFilter || row.findingCode.toLowerCase().includes(findingCodeFilter.toLowerCase());
      const matchesDieNumber = !dieNumberFilter || row.dieNumber.toLowerCase().includes(dieNumberFilter.toLowerCase());
      const matchesSize = !sizeFilter || row.size.toLowerCase().includes(sizeFilter.toLowerCase());
      const matchesQuantity = !quantityFilter || row.quantity.toLowerCase().includes(quantityFilter.toLowerCase());
      const matchesWeight = !weightFilter || row.weight.toLowerCase().includes(weightFilter.toLowerCase());
      const matchesMaterial = !materialFilter || row.material.toLowerCase().includes(materialFilter.toLowerCase());
      const matchesFindingStage = !findingStageFilter || row.findingStage.toLowerCase().includes(findingStageFilter.toLowerCase());
      const matchesMechanism = !mechanismFilter || row.mechanism.toLowerCase().includes(mechanismFilter.toLowerCase());

      return matchesSearch && matchesFindingCode && matchesDieNumber && matchesSize && matchesQuantity && matchesWeight && matchesMaterial && matchesFindingStage && matchesMechanism;
    });
  }, [baseData, searchTerm, findingCodeFilter, dieNumberFilter, sizeFilter, quantityFilter, weightFilter, materialFilter, findingStageFilter, mechanismFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const allDisplayedRowsSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRows.has(row.id));

  const toggleSelectAllRows = (checked) => {
    if (checked) {
      setSelectedRows(new Set(filteredRows.map((row) => row.id)));
      return;
    }
    setSelectedRows(new Set());
  };

  const toggleRowSelection = (id) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleCellChange = (id, field, value) => {
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const tempId = -Date.now();
    const newRow = { id: tempId, _isNew: true, ...EMPTY_FINDING_ROW };
    setData((prev) => [newRow, ...prev]);
    setEditingRowIds((prev) => new Set([...prev, tempId]));
  };

  const handleEditRow = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to edit');
      return;
    }
    setEditingRowIds(new Set(selectedRows));
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    const rowsToSave = data.filter((r) => editingRowIds.has(r.id));
    try {
      for (const row of rowsToSave) {
        const payload = {
          finding_code: row.findingCode,
          die_number: row.dieNumber,
          size: row.size,
          quantity: row.quantity,
          weight: row.weight,
          material: row.material,
          finding_stage: row.findingStage,
          polish: row.polish,
          mechanism: row.mechanism,
          design_material: row.designMaterial,
          mold_qty_per_die: row.moldQtyPerDie,
          dead_weight: row.deadWeight,
          total_measurements: row.totalMeasurements,
          notes: row.notes,
        };
        if (row._isNew) {
          const res = await fetch('/api/findings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.detail || 'Save failed');
          const saved = json?.data ?? json;
          setData((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    id: saved.id,
                    findingCode: saved.finding_code ?? '',
                    dieNumber: saved.die_number ?? '',
                    size: saved.size ?? '',
                    quantity: saved.quantity ?? '',
                    weight: saved.weight ?? '',
                    material: saved.material ?? '',
                    findingStage: saved.finding_stage ?? '',
                    polish: saved.polish ?? '',
                    mechanism: saved.mechanism ?? '',
                    designMaterial: saved.design_material ?? '',
                    moldQtyPerDie: saved.mold_qty_per_die ?? '',
                    deadWeight: saved.dead_weight ?? '',
                    totalMeasurements: saved.total_measurements ?? '',
                    notes: saved.notes ?? '',
                  }
                : r
            )
          );
        } else {
          const res = await fetch(`/api/findings/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.detail || 'Save failed');
        }
      }
      setEditingRowIds(new Set());
      setSelectedRows(new Set());
      setSaveEditStatus({ success: true, message: 'Rows saved' });
    } catch (err) {
      setSaveEditStatus({ success: false, message: err.message || 'Save failed' });
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setSaveEditStatus(null), 3000);
    }
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to delete');
      return;
    }
    if (!confirm(`Delete ${selectedRows.size} row(s)? This cannot be undone.`)) return;
    const ids = Array.from(selectedRows);
    try {
      for (const id of ids) {
        const row = data.find((r) => r.id === id);
        if (row?._isNew) {
          setData((prev) => prev.filter((r) => r.id !== id));
          continue;
        }
        const res = await fetch(`/api/findings/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.detail || 'Delete failed');
        }
        setData((prev) => prev.filter((r) => r.id !== id));
      }
      setSelectedRows(new Set());
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
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
    const next = new Set(archivedRows);
    selectedRows.forEach((id) => next.add(id));
    setArchivedRows(next);
    setSelectedRows(new Set());
  };

  const handleUnarchiveRows = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to unarchive');
      return;
    }
    const next = new Set(archivedRows);
    selectedRows.forEach((id) => next.delete(id));
    setArchivedRows(next);
    setSelectedRows(new Set());
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    setSelectedRows(new Set());
    setEditingRowIds(new Set());
  };

  const toggleColumnSelection = (columnId) => {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  };

  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === FINDING_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(FINDING_COLUMNS.map((col) => col.id)));
    }
  };

  const handleHideColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((col) => next.delete(col));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((col) => next.add(col));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleExport = () => {
    console.log('Export data:', filteredRows);
  };

  const handlePrintItems = () => {
    if (selectedRows.size === 0) {
      alert('Please select a row to print');
      return;
    }
    const findingId = Array.from(selectedRows)[0];
    const finding = data.find((row) => row.id === findingId);
    setSelectedFindingForPrint(finding || null);
    setIsPrintItemOpen(true);
  };

  const handlePrintSheet = () => {
    setIsPrintSheetOpen(true);
  };

  const selectedFinding = useMemo(() => {
    const selectedId = selectedRows.values().next().value;
    if (selectedId === undefined) return null;
    return data.find((row) => row.id === selectedId) || null;
  }, [data, selectedRows]);

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id="select-all-finding-columns"
                  checked={selectedColumnsForAction.size === FINDING_COLUMNS.length && FINDING_COLUMNS.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-finding-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
            {FINDING_COLUMNS.map((column) => (
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

      <Dialog open={isPrintItemOpen} onOpenChange={setIsPrintItemOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Print Finding Details</DialogTitle>
          </DialogHeader>
          {selectedFindingForPrint && (
            <div className="space-y-4">
              <div className="border border-soft-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
                  FINDING DETAILS
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailCard label="FINDING CODE" value={selectedFindingForPrint.findingCode} />
                  <DetailCard label="DIE NUMBER" value={selectedFindingForPrint.dieNumber} />
                  <DetailCard label="SIZE" value={selectedFindingForPrint.size} />
                  <DetailCard label="QUANTITY" value={selectedFindingForPrint.quantity} />
                  <DetailCard label="WEIGHT" value={selectedFindingForPrint.weight} />
                  <DetailCard label="MATERIAL" value={selectedFindingForPrint.material} />
                  <DetailCard label="FINDING STAGE" value={selectedFindingForPrint.findingStage} />
                  <DetailCard label="POLISH" value={selectedFindingForPrint.polish} />
                  <DetailCard label="MECHANISM" value={selectedFindingForPrint.mechanism} />
                  <DetailCard label="DESIGN MATERIAL" value={selectedFindingForPrint.designMaterial} />
                  <DetailCard label="MOLD QTY/DIE" value={selectedFindingForPrint.moldQtyPerDie} />
                  <DetailCard label="DEAD WEIGHT" value={selectedFindingForPrint.deadWeight} />
                  <DetailCard label="TOTAL MEASUREMENTS" value={selectedFindingForPrint.totalMeasurements} />
                  <DetailCard label="NOTES" value={selectedFindingForPrint.notes} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => window.print()} className="bg-trust-blue hover:bg-deep-blue text-white">
                  Print
                </Button>
                <Button onClick={() => setIsPrintItemOpen(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintSheetOpen} onOpenChange={setIsPrintSheetOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Print Master Finding Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center border-b-2 border-midnight-ink pb-4 mb-6">
              <h2 className="text-2xl font-bold mb-2">MASTER FINDING SHEET</h2>
              <p className="text-sm text-cool-gray">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>
            <div className="border-2 border-midnight-ink rounded overflow-x-auto">
              <table className="w-full border-collapse text-sm break-words">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {FINDING_COLUMNS.map((column) => (
                      <th key={column.id} className="border border-soft-border p-2 text-left break-words">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-cloud-gray'}>
                      <td className="border border-soft-border p-2 break-words">{row.findingCode || 'ΓÇö'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.dieNumber || 'ΓÇö'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.size || 'ΓÇö'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.quantity || 'ΓÇö'}</td>
                      <td className="border border-soft-border p-2 break-words">{row.weight || 'ΓÇö'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button onClick={() => window.print()} className="bg-trust-blue hover:bg-deep-blue text-white">
                Print Sheet
              </Button>
              <Button onClick={() => setIsPrintSheetOpen(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 pt-16 px-3 md:px-4 pb-3 md:pb-4">
        <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">MASTER FINDING SHEET</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          <div className="relative mr-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-4 h-4" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="border border-soft-border rounded-lg pl-9 pr-4 h-9 w-64 text-sm"
            />
          </div>

          <Button
            onClick={loadFindings}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <BulkUploadButton sheetType="findings" onComplete={loadFindings} />
          <Button
            onClick={handleEditRow}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
            disabled={isArchivedView}
          >
            Edit Row
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-warning text-warning hover:bg-warning/10 rounded-full px-4 text-sm h-8"
              >
                Archive
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleArchiveRow} disabled={isArchivedView}>
                Archive Selected Rows
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetViewMode(isArchivedView ? 'active' : 'archived')}>
                {isArchivedView ? 'Show Active Rows' : 'Show Archived Rows'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isArchivedView && (
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
            onClick={() => setIsManageColumnsOpen(true)}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Manage Columns
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
          >
            Export
          </Button>
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
              <DropdownMenuItem onClick={handlePrintItems}>Product Details</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintSheet}>Sheet</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4 border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 bg-trust-blue/40 font-bold text-sm text-midnight-ink border-b border-soft-border">
            FINDING DETAILS
          </div>
          <div className="p-3">
            {!selectedFinding ? (
              <div className="text-sm text-cool-gray">Select a row to see finding details.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <DetailCard label="FINDING CODE" value={selectedFinding.findingCode} />
                <DetailCard label="DIE NUMBER" value={selectedFinding.dieNumber} />
                <DetailCard label="SIZE" value={selectedFinding.size} />
                <DetailCard label="QUANTITY" value={selectedFinding.quantity} />
                <DetailCard label="WEIGHT" value={selectedFinding.weight} />
                <DetailCard label="MATERIAL" value={selectedFinding.material} />
                <DetailCard label="FINDING STAGE" value={selectedFinding.findingStage} />
                <DetailCard label="POLISH" value={selectedFinding.polish} />
                <DetailCard label="MECHANISM" value={selectedFinding.mechanism} />
                <DetailCard label="DESIGN MATERIAL" value={selectedFinding.designMaterial} />
                <DetailCard label="MOLD QTY/DIE" value={selectedFinding.moldQtyPerDie} />
                <DetailCard label="DEAD WEIGHT" value={selectedFinding.deadWeight} />
                <DetailCard label="TOTAL MEASUREMENTS" value={selectedFinding.totalMeasurements} />
                <DetailCard label="NOTES" value={selectedFinding.notes} />
              </div>
            )}
          </div>
        </div>

        <div className="border border-soft-border rounded-lg mb-4 bg-trust-blue/10 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">FINDING CODE</label>
              <Input type="text" placeholder="Enter code" value={findingCodeFilter} onChange={(e) => setFindingCodeFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">DIE NUMBER</label>
              <Input type="text" placeholder="Enter die" value={dieNumberFilter} onChange={(e) => setDieNumberFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">SIZE</label>
              <Input type="text" placeholder="Enter size" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">QUANTITY</label>
              <Input type="text" placeholder="Enter quantity" value={quantityFilter} onChange={(e) => setQuantityFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">WEIGHT</label>
              <Input type="text" placeholder="Enter weight" value={weightFilter} onChange={(e) => setWeightFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">MATERIAL</label>
              <Input type="text" placeholder="Enter material" value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">FINDING STAGE</label>
              <Input type="text" placeholder="Enter stage" value={findingStageFilter} onChange={(e) => setFindingStageFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-text block mb-1">MECHANISM</label>
              <Input type="text" placeholder="Enter mechanism" value={mechanismFilter} onChange={(e) => setMechanismFilter(e.target.value)} className="h-8 text-sm p-1" />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mb-4 rounded-md border border-trust-blue/30 bg-trust-blue/10 px-4 py-2 text-sm text-deep-blue">
            Loading findings...
          </div>
        )}

        {!isLoading && fetchError && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger-dark flex items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button onClick={loadFindings} variant="outline" className="h-8 px-3 border-danger/40 text-danger-dark hover:bg-danger/10">
              Retry
            </Button>
          </div>
        )}

        <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-[#dbeafe]">
                <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                  <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                    <Checkbox
                      checked={allDisplayedRowsSelected}
                      onCheckedChange={toggleSelectAllRows}
                      className="cursor-pointer"
                      disabled={filteredRows.length === 0 || editingRowIds.size > 0}
                    />
                  </th>
                  {FINDING_COLUMNS.map(
                    (column) =>
                      visibleColumns.has(column.id) && (
                        <th
                          key={column.id}
                          className={`border border-soft-border p-2 ${columnConfig[column.id].headerBg} ${columnConfig[column.id].minWidth}`}
                        >
                          {column.label}
                        </th>
                      )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td className="border border-soft-border p-4 text-center text-sm text-cool-gray" colSpan={visibleColumns.size + 1}>
                      No findings found.
                    </td>
                  </tr>
                )}

                {paginatedRows.map((row) => {
                  const isEditing = editingRowIds.has(row.id);
                  const isAnyRowEditing = editingRowIds.size > 0;
                  const canEdit = !isArchivedView && isEditing;

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-soft-border ${
                        isEditing ? 'bg-trust-blue/10 hover:bg-trust-blue/10' : 'hover:bg-cloud-gray'
                      }`}
                    >
                      <td
                        className={`border border-soft-border p-2 text-center sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${
                          isEditing ? 'bg-[#eff6ff]' : 'bg-white'
                        }`}
                      >
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={() => toggleRowSelection(row.id)}
                          className="cursor-pointer"
                          disabled={isAnyRowEditing}
                        />
                      </td>
                      {FINDING_COLUMNS.map(
                        (column) =>
                          visibleColumns.has(column.id) && (
                            <td key={column.id} className="border border-soft-border p-1" style={isEditing ? { backgroundColor: '#eff6ff' } : {}}>
                              {canEdit ? (
                                <Input
                                  type="text"
                                  value={row[column.id]}
                                  onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
                                  className="border-0 p-1 text-sm h-8"
                                />
                              ) : (
                                <div className="min-h-8 px-1 py-1 text-sm whitespace-pre-wrap break-words leading-4">{row[column.id] || ''}</div>
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

        <div className="mt-4 flex gap-2 items-center flex-wrap">
          <Button
            onClick={handleAddRow}
            className="bg-trust-blue hover:bg-deep-blue text-white px-6"
            disabled={editingRowIds.size > 0}
          >
            + Add Row
          </Button>
          <Button onClick={handleSaveEdit} className="bg-success hover:bg-success/90 text-white px-6" disabled={editingRowIds.size === 0 || isSavingEdit}>
            {isSavingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={handleDeleteSelectedRows}
            variant="outline"
            className="border-danger text-danger hover:bg-danger/10 rounded-full px-4 text-sm h-8"
            disabled={selectedRows.size === 0 || editingRowIds.size > 0}
          >
            Delete Selected
          </Button>
          {saveEditStatus && (
            <span className={`ml-2 text-sm font-semibold ${saveEditStatus.success ? 'text-success' : 'text-danger'}`}>
              {saveEditStatus.message}
            </span>
          )}
        </div>

        {/* Fixed Pagination Footer */}
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
            <span>
              {filteredRows.length === 0
                ? '0'
                : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, filteredRows.length)}`
              } of {filteredRows.length}
            </span>
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
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
      <div className="px-2 py-1 bg-cloud-gray font-semibold text-xs text-slate-text border-b border-soft-border">{label}</div>
      <div className="px-2 py-2 text-sm min-h-[36px] whitespace-pre-wrap break-words">{value || 'ΓÇö'}</div>
    </div>
  );
}