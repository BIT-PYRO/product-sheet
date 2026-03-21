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

// â”€â”€ Column definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each entry: { id, label, group?, groupLabel?, width }
// group columns are displayed as a second header row under the group header.
const COLUMNS = [
  { id: 'sku',                      label: 'Master SKU',                        width: 'min-w-[120px]' },
  { id: 'rendered_photo',           label: 'Rendered Photo',                    width: 'min-w-[120px]' },
  { id: 'technical_drawing',        label: 'Technical Drawing',                 width: 'min-w-[160px]' },
  { id: 'design_code',              label: 'Design Code',                       width: 'min-w-[120px]' },
  { id: 'master_number',            label: 'Master Number',                     width: 'min-w-[120px]' },
  { id: 'die_code',                 label: 'Die Code',                          width: 'min-w-[100px]' },
  { id: 'mold_qty_per_die',         label: 'Mold Qty / Die',                    width: 'min-w-[110px]' },
  { id: 'cpx_dead_weight',          label: 'CPX Dead Weight',                   width: 'min-w-[120px]' },
  { id: 'design_motive_size',       label: 'Size of Design Motive',             width: 'min-w-[140px]' },
  { id: 'total_design_measurements',label: 'Total Design Measurements (Approx)',width: 'min-w-[200px]' },
  { id: 'design_material',          label: 'Design Material',                   width: 'min-w-[130px]' },
  // Stone Information group
  { id: 'stone_name',               label: 'Name',      group: 'stone', width: 'min-w-[100px]' },
  { id: 'stone_material',           label: 'Stone Material', group: 'stone', width: 'min-w-[120px]' },
  { id: 'stone_color',              label: 'Color',     group: 'stone', width: 'min-w-[90px]' },
  { id: 'stone_cut',                label: 'Cut',       group: 'stone', width: 'min-w-[90px]' },
  { id: 'stone_size',               label: 'Size',      group: 'stone', width: 'min-w-[90px]' },
  { id: 'stone_quantity',           label: 'Quantity',  group: 'stone', width: 'min-w-[90px]' },
  { id: 'stone_weight',             label: 'Stone Weight', group: 'stone', width: 'min-w-[110px]' },
  // Mechanism
  { id: 'mechanism',                label: 'Mechanism',                         width: 'min-w-[110px]' },
  // Findings group
  { id: 'findings_code',            label: 'Code',     group: 'findings', width: 'min-w-[90px]' },
  { id: 'findings_die',             label: 'Die',      group: 'findings', width: 'min-w-[90px]' },
  { id: 'findings_size',            label: 'Size',     group: 'findings', width: 'min-w-[90px]' },
  { id: 'findings_quantity',        label: 'Quantity', group: 'findings', width: 'min-w-[90px]' },
  { id: 'findings_weight',          label: 'Weight',   group: 'findings', width: 'min-w-[90px]' },
];

// Group meta â€“ defines the spanning header cells
const GROUPS = {
  stone:    { label: 'Stone Information', span: 7 },
  findings: { label: 'Findings',          span: 5 },
};

// Totals footer â€” which columns show a numeric sum
const TOTAL_COLS = new Set([
  'die_code', 'mold_qty_per_die', 'cpx_dead_weight',
  'stone_quantity', 'stone_weight',
  'findings_quantity', 'findings_weight',
]);

// Map a backend row â†’ flat UI row
function mapRow(row) {
  // Stone entries â€” flatten first entry; store all for tooltip/expansion
  const s = (Array.isArray(row.stone_entries) && row.stone_entries[0]) || {};
  // Findings entries â€” flatten first entry
  const f = (Array.isArray(row.findings_entries) && row.findings_entries[0]) || {};

  return {
    id: row.id,
    hasBackendRecord: true,
    is_active: row.is_active,
    sku: row.sku || '',
    rendered_photo: row.rendered_photo || row.image || '',
    technical_drawing: row.technical_drawing || '',
    design_code: row.design_code || '',
    master_number: row.master_number || '',
    die_code: row.die_code || '',
    mold_qty_per_die: row.mold_qty_per_die || '',
    cpx_dead_weight: row.cpx_dead_weight || '',
    design_motive_size: row.design_motive_size || '',
    total_design_measurements: row.total_design_measurements || '',
    design_material: row.design_material || '',
    stone_name: s.name || '',
    stone_material: s.material || '',
    stone_color: s.color || '',
    stone_cut: s.cut || '',
    stone_size: s.size || '',
    stone_quantity: s.quantity || '',
    stone_weight: s.weight || '',
    mechanism: row.mechanism || '',
    findings_code: f.code || '',
    findings_die: f.die || '',
    findings_size: f.size || '',
    findings_quantity: f.quantity || '',
    findings_weight: f.weight || '',
    // keep full arrays for save
    _stone_entries: Array.isArray(row.stone_entries) ? row.stone_entries : [],
    _findings_entries: Array.isArray(row.findings_entries) ? row.findings_entries : [],
  };
}

// Convert flat UI row back to backend payload
function toPayload(row) {
  const stoneEntries = row._stone_entries.length > 0
    ? [{ ...row._stone_entries[0],
        name: row.stone_name, material: row.stone_material,
        color: row.stone_color, cut: row.stone_cut, size: row.stone_size,
        quantity: row.stone_quantity, weight: row.stone_weight,
      }, ...row._stone_entries.slice(1)]
    : (row.stone_name ? [{ name: row.stone_name, material: row.stone_material,
        color: row.stone_color, cut: row.stone_cut, size: row.stone_size,
        quantity: row.stone_quantity, weight: row.stone_weight }] : []);

  const findingsEntries = row._findings_entries.length > 0
    ? [{ ...row._findings_entries[0],
        code: row.findings_code, die: row.findings_die, size: row.findings_size,
        quantity: row.findings_quantity, weight: row.findings_weight,
      }, ...row._findings_entries.slice(1)]
    : (row.findings_code ? [{ code: row.findings_code, die: row.findings_die,
        size: row.findings_size, quantity: row.findings_quantity, weight: row.findings_weight }] : []);

  return {
    sku: row.sku,
    rendered_photo: row.rendered_photo,
    technical_drawing: row.technical_drawing,
    design_code: row.design_code,
    master_number: row.master_number,
    die_code: row.die_code,
    mold_qty_per_die: row.mold_qty_per_die,
    cpx_dead_weight: row.cpx_dead_weight,
    design_motive_size: row.design_motive_size,
    total_design_measurements: row.total_design_measurements,
    design_material: row.design_material,
    stone_entries: stoneEntries,
    mechanism: row.mechanism,
    findings_entries: findingsEntries,
    is_active: row.is_active,
  };
}

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
  const [data, setData] = useState([]);

  const [visibleColumns, setVisibleColumns] = useState(
    new Set(COLUMNS.map((c) => c.id))
  );

  const toggleColumnSelection = (columnId) => {
    const next = new Set(selectedColumnsForAction);
    next.has(columnId) ? next.delete(columnId) : next.add(columnId);
    setSelectedColumnsForAction(next);
  };

  const toggleSelectAllColumns = () => {
    setSelectedColumnsForAction(
      selectedColumnsForAction.size === COLUMNS.length
        ? new Set()
        : new Set(COLUMNS.map((c) => c.id))
    );
  };

  const handleHideColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((c) => next.delete(c));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((c) => next.add(c));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/designers', { cache: 'no-store' });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) return;
        const rows = Array.isArray(result?.data)
          ? result.data
          : (result?.data?.results || []);
        setData(rows.map(mapRow));
      } catch { /* keep editable with empty state */ }
    })();
  }, []);

  const toggleRowSelection = (id) => {
    const next = new Set(selectedRows);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedRows(next);
  };

  const handleCellChange = (id, field, value) => {
    setData(data.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  // Fetch product data when Master SKU is typed and Enter/Tab pressed
  const handleSkuLookup = async (rowId, sku) => {
    const s = (sku || '').trim();
    if (!s) return;

    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(s)}`, { cache: 'no-store' });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) return;

      const rows = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      const product = rows[0];
      if (!product) return;

      setData((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const updates = {};
          if (product.material && !row.design_material) updates.design_material = product.material;
          if (product.stone_name && !row.stone_name) updates.stone_name = product.stone_name;
          if (product.stone_cut && !row.stone_cut) updates.stone_cut = product.stone_cut;
          if (product.stone_color && !row.stone_color) updates.stone_color = product.stone_color;
          if (product.stone_size && !row.stone_size) updates.stone_size = product.stone_size;
          if (product.stone_quantity && !row.stone_quantity) updates.stone_quantity = product.stone_quantity;
          return Object.keys(updates).length > 0 ? { ...row, ...updates } : row;
        })
      );
    } catch {
      // Silently fail
    }
  };

  const handleAddRow = () => {
    const newId = Math.max(...data.map((r) => r.id), -1) + 1;
    setData([...data, {
      id: newId, hasBackendRecord: false, is_active: true,
      sku: '', rendered_photo: '', technical_drawing: '',
      design_code: '', master_number: '', die_code: '',
      mold_qty_per_die: '', cpx_dead_weight: '',
      design_motive_size: '', total_design_measurements: '',
      design_material: '',
      stone_name: '', stone_material: '', stone_color: '',
      stone_cut: '', stone_size: '', stone_quantity: '', stone_weight: '',
      mechanism: '',
      findings_code: '', findings_die: '', findings_size: '',
      findings_quantity: '', findings_weight: '',
      _stone_entries: [], _findings_entries: [],
    }]);
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRows.size === 0) { alert('Select at least one row to delete'); return; }
    if (!window.confirm('Delete selected row(s)? This cannot be undone.')) return;

    const rows = data.filter((r) => selectedRows.has(r.id)).filter((r) => r.hasBackendRecord);
    const results = await Promise.all(rows.map(async (r) => {
      try {
        const res = await fetch(`/api/designers/${r.id}`, { method: 'DELETE' });
        if (!res.ok) return false;
        const j = await res.json().catch(() => null);
        return j == null || j.success !== false;
      } catch { return false; }
    }));
    if (results.some((ok) => !ok)) { alert('Some rows could not be deleted.'); return; }

    const ids = Array.from(selectedRows);
    setData(data.filter((r) => !selectedRows.has(r.id)));
    const na = new Set(archivedRows); ids.forEach((id) => na.delete(id)); setArchivedRows(na);
    const ne = new Set(editingRowIds); ids.forEach((id) => ne.delete(id)); setEditingRowIds(ne);
    setSelectedRows(new Set());
    alert('Deleted successfully.');
  };

  const handleEditRow = () => {
    if (selectedRows.size === 0) { alert('Select at least one row to edit'); return; }
    setEditingRowIds(new Set(selectedRows));
  };

  const handleSaveEdit = async () => {
    const editingRows = data.filter((r) => editingRowIds.has(r.id));
    const saves = await Promise.all(editingRows.map(async (row) => {
      const payload = toPayload(row);
      const url = row.hasBackendRecord ? `/api/designers/${row.id}` : `/api/designers`;
      const method = row.hasBackendRecord ? 'PATCH' : 'POST';
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.success !== false) {
          return j?.data ?? { ...row, hasBackendRecord: true };
        }
        return null;
      } catch { return null; }
    }));

    if (saves.some((s) => s === null)) { alert('Some rows could not be saved.'); return; }

    setData(data.map((row) => {
      if (!editingRowIds.has(row.id)) return row;
      const saved = saves.find((s) => s?.id === row.id) || saves.find((s) => s != null);
      return saved ? mapRow(saved) : row;
    }));
    setEditingRowIds(new Set());
    setSelectedRows(new Set());
  };

  const handleCancelEdit = () => setEditingRowIds(new Set());

  const handleArchiveRow = () => {
    if (viewMode === 'archived') { alert('Switch to active rows to archive'); return; }
    if (selectedRows.size === 0) { alert('Select at least one row to archive'); return; }
    const next = new Set(archivedRows);
    selectedRows.forEach((id) => next.add(id));
    setArchivedRows(next);
    setSelectedRows(new Set());
  };

  const handleUnarchiveRows = () => {
    if (selectedRows.size === 0) { alert('Select at least one row to unarchive'); return; }
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

  const handleExport = () => console.log('Export data:', data);

  const activeData   = data.filter((r) => !archivedRows.has(r.id));
  const archivedData = data.filter((r) => archivedRows.has(r.id));
  const isArchivedView = viewMode === 'archived';
  const rawDisplayed = isArchivedView ? archivedData : activeData;
  const displayedData = searchTerm
    ? rawDisplayed.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : rawDisplayed;

  const totalPages = Math.max(1, Math.ceil(displayedData.length / rowsPerPage));
  const safePage   = Math.min(currentPage, totalPages);
  const paginatedData = displayedData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const displayedRowIds = displayedData.map((r) => r.id);
  const allDisplayedRowsSelected =
    displayedRowIds.length > 0 && displayedRowIds.every((id) => selectedRows.has(id));

  const handleToggleSelectAllRows = () => {
    if (editingRowIds.size > 0) return;
    setSelectedRows(allDisplayedRowsSelected ? new Set() : new Set(displayedRowIds));
  };

  // â”€â”€ Build visible columns list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const visibleCols = COLUMNS.filter((c) => visibleColumns.has(c.id));

  // â”€â”€ Column totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const colTotals = {};
  TOTAL_COLS.forEach((cid) => {
    const sum = displayedData.reduce((acc, r) => {
      const n = parseFloat(String(r[cid] || '').replace(',', ''));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
    colTotals[cid] = sum % 1 === 0 ? sum : sum.toFixed(2);
  });

  // â”€â”€ Grouped header spans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Build a list of top-header cells: {label, colSpan, rowSpan}
  const buildTopHeader = () => {
    const cells = [];
    let i = 0;
    while (i < visibleCols.length) {
      const col = visibleCols[i];
      if (col.group) {
        const gMeta = GROUPS[col.group];
        // count consecutive cols in same group
        let span = 0;
        while (i + span < visibleCols.length && visibleCols[i + span].group === col.group) span++;
        cells.push({ key: col.group, label: gMeta.label, colSpan: span, rowSpan: 1, isGroup: true });
        i += span;
      } else {
        cells.push({ key: col.id, label: col.label, colSpan: 1, rowSpan: 2, isGroup: false });
        i++;
      }
    }
    return cells;
  };

  const topHeader = buildTopHeader();

  const thBase = 'border border-soft-border p-2 bg-[#dbeafe] text-midnight-ink font-bold text-center whitespace-nowrap';
  const thGroup = 'border border-soft-border p-2 bg-[#bfdbfe] text-midnight-ink font-bold text-center whitespace-nowrap';

  return (
    <div className="w-full min-h-screen bg-cloud-gray">
      {/* â”€â”€ Manage Columns Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Columns</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id="select-all-columns"
                  checked={selectedColumnsForAction.size === COLUMNS.length && COLUMNS.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={col.id}
                    checked={selectedColumnsForAction.has(col.id)}
                    onCheckedChange={() => toggleColumnSelection(col.id)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={col.id} className="text-sm cursor-pointer">
                    {col.group ? `${GROUPS[col.group].label} â†’ ${col.label}` : col.label}
                  </label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(col.id)
                    ? <span className="bg-danger/10 text-danger-dark px-2 py-1 rounded-full text-sm">Hidden</span>
                    : <span className="bg-success/10 text-success-dark px-2 py-1 rounded-full text-sm">Visible</span>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-danger border-danger/40 hover:bg-danger/10">Hide</Button>
            <Button onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-success border-green-300 hover:bg-success/10">Show</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pt-16 px-3 md:px-4 pb-16">
        {/* â”€â”€ Top Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {/* â”€â”€ Action Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-wrap gap-2 md:gap-4 justify-end mb-4 items-center">
          <div className="mr-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray w-5 h-5" />
            <Input
              type="text"
              placeholder="SEARCH BAR"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="border-2 border-soft-border rounded-lg px-4 py-2 pl-10 w-64"
            />
          </div>
          <BulkUploadButton sheetType="designers" onComplete={() => window.location.reload()} />
          <Button onClick={handleEditRow} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6" disabled={isArchivedView}>Edit Row</Button>
          <Button onClick={handleDeleteSelectedRows} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-100 disabled:border-red-500 disabled:text-red-500 rounded-full px-6" disabled={selectedRows.size === 0 || editingRowIds.size > 0}>Delete Selected</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-6">Archive</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleArchiveRow} disabled={isArchivedView}>Archive Selected Rows</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetViewMode(isArchivedView ? 'active' : 'archived')}>{isArchivedView ? 'Show Active Rows' : 'Show Archived Rows'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isArchivedView && (
            <Button onClick={handleUnarchiveRows} variant="outline" className="border-green-600 text-success hover:bg-success/10 rounded-full px-6" disabled={selectedRows.size === 0}>Unarchive Selected</Button>
          )}
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">Manage Columns</Button>
          <Button onClick={handleExport} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-6">Export</Button>
        </div>

        {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-40">
                {/* Row 1 â€” group headers + standalone column headers */}
                <tr>
                  <th rowSpan={2} className={`${thBase} w-8 sticky left-0 z-50`}>
                    <Checkbox
                      checked={allDisplayedRowsSelected}
                      onCheckedChange={handleToggleSelectAllRows}
                      className="cursor-pointer"
                      disabled={displayedRowIds.length === 0 || editingRowIds.size > 0}
                    />
                  </th>
                  {topHeader.map((cell) =>
                    cell.isGroup ? (
                      <th key={cell.key} colSpan={cell.colSpan} className={thGroup}>{cell.label}</th>
                    ) : (
                      <th key={cell.key} rowSpan={cell.rowSpan} className={`${thBase} ${visibleCols.find((c) => c.id === cell.key)?.width || ''}`}>{cell.label}</th>
                    )
                  )}
                </tr>
                {/* Row 2 â€” sub-headers for grouped columns only */}
                <tr>
                  {visibleCols.filter((c) => c.group).map((col) => (
                    <th key={col.id} className={`${thGroup} ${col.width}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((row) => {
                  const isEditing = editingRowIds.has(row.id);
                  const canEdit = !isArchivedView && (!editingRowIds.size || isEditing);
                  const rowBg = isEditing ? 'bg-trust-blue/10' : 'bg-white';

                  return (
                    <tr key={row.id} className={`border-b border-soft-border ${isEditing ? 'hover:bg-trust-blue/10' : 'hover:bg-cloud-gray'}`}>
                      <td className={`border border-soft-border p-2 text-center sticky left-0 z-20 ${rowBg}`}>
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={() => toggleRowSelection(row.id)}
                          className="cursor-pointer"
                          disabled={editingRowIds.size > 0}
                        />
                      </td>
                      {visibleCols.map((col) => {
                        const isPhoto = col.id === 'rendered_photo' || col.id === 'technical_drawing';
                        const val = row[col.id] ?? '';
                        return (
                          <td key={col.id} className="border border-soft-border p-1" style={isEditing ? { backgroundColor: '#eff6ff' } : {}}>
                            {isPhoto && val ? (
                              <img src={val} alt={col.label} className="w-10 h-10 object-cover rounded border border-soft-border mx-auto" />
                            ) : (
                              <Input
                                type="text"
                                value={val}
                                onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                                onKeyDown={col.id === 'sku' ? (e) => {
                                  if (e.key === 'Enter' || e.key === 'Tab') {
                                    handleSkuLookup(row.id, row.sku);
                                  }
                                } : undefined}
                                onBlur={col.id === 'sku' ? () => handleSkuLookup(row.id, row.sku) : undefined}
                                className="border-0 p-1 text-sm h-8 min-w-0"
                                disabled={!canEdit || !isEditing}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* â”€â”€ Totals row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {displayedData.length > 0 && (
                  <tr className="bg-[#dbeafe] font-bold border-t-2 border-soft-border">
                    <td className="border border-soft-border p-2 text-center text-xs text-cool-gray">Total</td>
                    {visibleCols.map((col) => (
                      <td key={col.id} className="border border-soft-border p-2 text-center text-xs">
                        {TOTAL_COLS.has(col.id) ? colTotals[col.id] : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* â”€â”€ Add Row / Edit Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mt-4 flex gap-2 items-center">
          <Button onClick={handleAddRow} className="bg-trust-blue hover:bg-deep-blue text-white px-6" disabled={editingRowIds.size > 0}>+ Add Row</Button>
          {editingRowIds.size > 0 && (
            <div className="flex gap-2 ml-4">
              <Button onClick={handleSaveEdit} className="bg-success hover:bg-success/90 text-white px-6">Save Changes</Button>
              <Button onClick={handleCancelEdit} variant="outline" className="border-red-600 text-danger hover:bg-danger/10 px-6">Cancel Edit</Button>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Fixed Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            {displayedData.length === 0
              ? '0'
              : `${(safePage - 1) * rowsPerPage + 1}â€“${Math.min(safePage * rowsPerPage, displayedData.length)}`
            } of {displayedData.length}
          </span>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">â€¹</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">â€º</button>
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

