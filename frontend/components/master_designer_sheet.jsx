'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
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
import LastUpdatedFooter from '@/components/last-updated-footer';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

// â”€â”€ Column definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each entry: { id, label, group?, groupLabel?, width }
// group columns are displayed as a second header row under the group header.
const COLUMNS = [
  { id: 'rendered_photo',           label: 'Rendered Photo',                    width: 'min-w-[120px]' },
  { id: 'technical_drawing',        label: 'Technical Drawing',                 width: 'min-w-[160px]' },
  { id: 'sku',                      label: 'Designer SKU',                      width: 'min-w-[120px]' },
  { id: 'design_stage',             label: 'Design Stage',                      width: 'min-w-[120px]' },
  { id: 'other_photo',              label: 'Other Photo',                       width: 'min-w-[120px]' },
  // Tracking rows – one column per field
  { id: 'track_tdm',          label: '3DM',         group: 'tracking', readOnly: true, width: 'min-w-[90px]'  },
  { id: 'track_stl',          label: 'STL',         group: 'tracking', readOnly: true, width: 'min-w-[90px]'  },
  { id: 'track_motive_code',  label: 'Motive Code', group: 'tracking', readOnly: true, width: 'min-w-[110px]' },
  { id: 'track_motive_sku',   label: 'Motive SKU',  group: 'tracking', readOnly: true, width: 'min-w-[110px]' },
  { id: 'track_die_code',     label: 'Die Code',    group: 'tracking', readOnly: true, width: 'min-w-[90px]'  },
  { id: 'track_mold_die_qty', label: 'Mold/Die Qty',group: 'tracking', readOnly: true, width: 'min-w-[90px]'  },
  { id: 'track_length',       label: 'Length',      group: 'tracking', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'track_width',        label: 'Width',       group: 'tracking', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'track_height',       label: 'Height',      group: 'tracking', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'total_die_code',         label: 'Total Die Code',         width: 'min-w-[120px]' },
  { id: 'total_mold_qty_per_die', label: 'Total Mold Qty / Die',   width: 'min-w-[130px]' },
  { id: 'total_cpx_dead_weight',  label: 'Total CPX Dead Weight',  width: 'min-w-[140px]' },
  // Total Design Measurements group
  { id: 'tdm_length', label: 'Length', group: 'tdm', width: 'min-w-[90px]' },
  { id: 'tdm_width',  label: 'Width',  group: 'tdm', width: 'min-w-[90px]' },
  { id: 'tdm_height', label: 'Height', group: 'tdm', width: 'min-w-[90px]' },
  { id: 'design_material',          label: 'Design Material',                   width: 'min-w-[130px]' },
  { id: 'setting_type',             label: 'Setting Type',                      width: 'min-w-[120px]' },
  { id: 'enamel',                   label: 'Enamel',                            width: 'min-w-[80px]'  },
  // Stone Information – one column per field
  { id: 'stone_type',     label: 'Type',    group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_species',  label: 'Species', group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_variety',  label: 'Variety', group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_color',    label: 'Color',   group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_cut',      label: 'Cut',     group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_shape',    label: 'Shape',   group: 'stone', readOnly: true, width: 'min-w-[80px]'  },
  { id: 'stone_length',   label: 'Length',  group: 'stone', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'stone_width',    label: 'Width',   group: 'stone', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'stone_height',   label: 'Height',  group: 'stone', readOnly: true, width: 'min-w-[70px]'  },
  { id: 'stone_qty',      label: 'Qty',     group: 'stone', readOnly: true, width: 'min-w-[60px]'  },
  // Mechanism
  { id: 'mechanism',                label: 'Mechanism',                         width: 'min-w-[110px]' },
  // Findings group
  { id: 'findings_code',            label: 'Code',     group: 'findings', width: 'min-w-[90px]' },
  { id: 'findings_quantity',        label: 'Quantity', group: 'findings', width: 'min-w-[90px]' },
  // Plating – one column per field
  { id: 'plating_type',  label: 'Plating Type',  group: 'plating', readOnly: true, width: 'min-w-[100px]' },
  { id: 'plating_color', label: 'Plating Color', group: 'plating', readOnly: true, width: 'min-w-[100px]' },
  { id: 'designer_notes',           label: 'Designer Notes',                    width: 'min-w-[180px]' },
];

// Group meta — defines the spanning header cells
const GROUPS = {
  tracking: { label: 'Tracking Info',              span: 9  },
  tdm:      { label: 'Total Design Measurements',  span: 3  },
  stone:    { label: 'Stone Information',          span: 10 },
  findings: { label: 'Findings',                   span: 2  },
  plating:  { label: 'Plating Info',               span: 2  },
};

// Totals footer — which columns show a numeric sum
const TOTAL_COLS = new Set([
  'total_die_code', 'total_mold_qty_per_die', 'total_cpx_dead_weight',
  'findings_quantity',
]);

// Map a backend row â†’ flat UI row
function mapRow(row) {
  // Findings entries — join all entries for display
  const findings = Array.isArray(row.findings_entries) ? row.findings_entries.filter(f => f.code) : [];
  const tdm = (row.total_design_measurements && typeof row.total_design_measurements === 'object')
    ? row.total_design_measurements : {};
  return {
    id: row.id,
    hasBackendRecord: true,
    is_active: row.is_active,
    sku: row.sku || '',
    rendered_photo: row.rendered_photo || row.image || '',
    technical_drawing: row.technical_drawing || row.designer_image_2 || '',
    other_photo: row.designer_image_3 || '',
    design_stage: row.design_stage || '',
    total_die_code: row.total_die_code != null ? String(row.total_die_code) : '',
    total_mold_qty_per_die: row.total_mold_qty_per_die != null ? String(row.total_mold_qty_per_die) : '',
    total_cpx_dead_weight: row.total_cpx_dead_weight != null ? String(row.total_cpx_dead_weight) : '',
    tdm_length: tdm.length || '',
    tdm_width: tdm.width || '',
    tdm_height: tdm.height || '',
    design_material: row.design_material || '',
    setting_type: row.setting_type || '',
    enamel: row.enamel || '',
    mechanism: row.mechanism || '',
    designer_notes: row.designer_notes || '',
    findings_code: findings.map(f => f.code || '').join(', '),
    findings_quantity: findings.map(f => f.quantity || '').join(', '),
    _stone_entries: Array.isArray(row.stone_entries) ? row.stone_entries : [],
    _findings_entries: Array.isArray(row.findings_entries) ? row.findings_entries : [],
    _plating_entries: Array.isArray(row.plating_entries) ? row.plating_entries : [],
    _tracking_rows: Array.isArray(row.tracking_rows) ? row.tracking_rows : [],
    // Flat display fields for tracking rows (joined with ', ' when multiple)
    ...(() => {
      const tRows = (Array.isArray(row.tracking_rows) ? row.tracking_rows : []).filter((r) =>
        ['tdm','stl','motiveCode','motiveSku','dieCode','moldDieQty'].some((k) => String(r[k] || '').trim()));
      const join = (key) => tRows.map((r) => r[key] || '').filter(Boolean).join(', ');
      return {
        track_tdm: join('tdm'), track_stl: join('stl'),
        track_motive_code: join('motiveCode'), track_motive_sku: join('motiveSku'),
        track_die_code: join('dieCode'), track_mold_die_qty: join('moldDieQty'),
        track_length: join('length'), track_width: join('width'), track_height: join('height'),
      };
    })(),
    // Flat display fields for stone entries
    ...(() => {
      const sRows = (Array.isArray(row.stone_entries) ? row.stone_entries : []).filter((s) =>
        Object.values(s).some((v) => String(v || '').trim()));
      const join = (key) => sRows.map((s) => s[key] || '').filter(Boolean).join(', ');
      return { stone_type: join('type'), stone_species: join('species'), stone_variety: join('variety'), stone_color: join('color'), stone_cut: join('cut'), stone_shape: join('shape'), stone_length: join('length'), stone_width: join('width'), stone_height: join('height'), stone_qty: join('qty') };
    })(),
    // Flat display fields for plating entries
    ...(() => {
      const pRows = (Array.isArray(row.plating_entries) ? row.plating_entries : []).filter((p) =>
        Object.values(p).some((v) => String(v || '').trim()));
      return { plating_type: pRows.map((p) => p.type || '').filter(Boolean).join(', '), plating_color: pRows.map((p) => p.color || '').filter(Boolean).join(', ') };
    })(),
  };
}

// Convert flat UI row back to backend payload
function toPayload(row) {
  const stoneEntries = row._stone_entries || [];

  const findingsEntries = row._findings_entries || [];

  const platingEntries = row._plating_entries || [];
  const trackingRowsPayload = row._tracking_rows || [];

  return {
    sku: row.sku,
    rendered_photo: row.rendered_photo,
    technical_drawing: row.technical_drawing,
    designer_image_3: row.other_photo,
    design_stage: row.design_stage,
    designer_notes: row.designer_notes,
    tracking_rows: trackingRowsPayload,
    total_die_code: row.total_die_code !== '' ? Number(row.total_die_code) : null,
    total_mold_qty_per_die: row.total_mold_qty_per_die !== '' ? Number(row.total_mold_qty_per_die) : null,
    total_cpx_dead_weight: row.total_cpx_dead_weight !== '' ? Number(row.total_cpx_dead_weight) : null,
    total_design_measurements: { length: row.tdm_length || '', width: row.tdm_width || '', height: row.tdm_height || '' },
    design_material: row.design_material,
    setting_type: row.setting_type,
    enamel: row.enamel,
    stone_entries: stoneEntries,
    mechanism: row.mechanism,
    findings_entries: findingsEntries,
    plating_entries: platingEntries,
    is_active: row.is_active,
  };
}

export default function MasterDesignerSheet() {
  const { canView, canEdit, canCreate, canExport, loading: permsLoading } = useSheetPermissions('master-designer-sheet');
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
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
  const [sortOrder, setSortOrder] = useState('default');

  const { visibleColumns, setVisibleColumns, saveView: saveColumnView, saveViewStatus } = useColumnPreferences('master-designer-sheet', COLUMNS.map((c) => c.id));

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
    fetch('/api/auth/session').then(r => r.json()).then(d => { if (d?.user?.username) setCurrentUsername(d.user.username); }).catch(() => {});
  }, []);

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
        setLastUpdated(new Date());
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

  const handleStoneChange = (rowId, idx, field, value) => {
    setData((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const entries = [...(row._stone_entries || [])];
      entries[idx] = { ...entries[idx], [field]: value };
      return { ...row, _stone_entries: entries };
    }));
  };
  const handleAddStoneEntry = (rowId) => {
    setData((prev) => prev.map((row) => row.id !== rowId ? row : {
      ...row, _stone_entries: [...(row._stone_entries || []), { type: '', species: '', variety: '', color: '', cut: '', shape: '', length: '', width: '', height: '', qty: '' }],
    }));
  };
  const handleDeleteStoneEntry = (rowId, idx) => {
    setData((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const entries = [...(row._stone_entries || [])]; entries.splice(idx, 1);
      return { ...row, _stone_entries: entries };
    }));
  };

  const handlePlatingChange = (rowId, idx, field, value) => {
    setData((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const entries = [...(row._plating_entries || [])];
      entries[idx] = { ...entries[idx], [field]: value };
      return { ...row, _plating_entries: entries };
    }));
  };
  const handleAddPlatingEntry = (rowId) => {
    setData((prev) => prev.map((row) => row.id !== rowId ? row : {
      ...row, _plating_entries: [...(row._plating_entries || []), { type: '', color: '' }],
    }));
  };
  const handleDeletePlatingEntry = (rowId, idx) => {
    setData((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const entries = [...(row._plating_entries || [])]; entries.splice(idx, 1);
      return { ...row, _plating_entries: entries };
    }));
  };

  // Fetch product data when Motive SKU is typed and Enter/Tab pressed
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
      sku: '', rendered_photo: '', technical_drawing: '', other_photo: '',
      total_die_code: '', total_mold_qty_per_die: '', total_cpx_dead_weight: '',
      tdm_length: '', tdm_width: '', tdm_height: '',
      design_material: '',
      setting_type: '', enamel: '',
      mechanism: '',
      findings_code: '', findings_quantity: '',
      _stone_entries: [], _findings_entries: [], _plating_entries: [], _tracking_rows: [],
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
    if (selectedRows.size === 0) { alert('Select a row to edit'); return; }
    if (selectedRows.size > 1) { alert('Select only one row to open in Designer Sheet'); return; }
    const rowId = Array.from(selectedRows)[0];
    const row = data.find((r) => r.id === rowId);
    if (!row) return;
    router.push(`/frontend/designer-sheet?id=${row.id}`);
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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const EXPORT_FIELDS = COLUMNS.map((c) => c.id);
  const EXPORT_LABELS = COLUMNS.map((c) => c.label);
  const exportToExcel = () => {
    if (!canExport) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([EXPORT_LABELS, ...sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => r[f] ?? ''))]), 'Designers');
    XLSX.writeFile(wb, 'master_designer_sheet.xlsx');
    setExportMenuOpen(false);
  };
  const exportToPDF = () => {
    if (!canExport) return;
    const rows = sortedDisplayData.map((r) => EXPORT_FIELDS.map((f) => r[f] ?? ''));
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Master Designer Sheet</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>Master Designer Sheet</h2><table><thead><tr>${EXPORT_LABELS.map((l)=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
    setExportMenuOpen(false);
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

  const sortedDisplayData = sortOrder === 'default' ? displayedData : [...displayedData].sort((a, b) => {
    if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortOrder === 'oldest') return (a.id || 0) - (b.id || 0);
    const av = String(a.sku || '').toLowerCase(), bv = String(b.sku || '').toLowerCase();
    return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const totalPages = Math.max(1, Math.ceil(sortedDisplayData.length / rowsPerPage));
  const safePage   = Math.min(currentPage, totalPages);
  const paginatedData = sortedDisplayData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const displayedRowIds = sortedDisplayData.map((r) => r.id);
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
    let sum;
    if (cid === 'findings_quantity') {
      sum = displayedData.reduce((acc, r) => {
        const entries = Array.isArray(r._findings_entries) ? r._findings_entries : [];
        return acc + entries.reduce((s, f) => {
          const n = parseFloat(String(f.quantity || '').replace(',', ''));
          return s + (isNaN(n) ? 0 : n);
        }, 0);
      }, 0);
    } else {
      sum = displayedData.reduce((acc, r) => {
        const n = parseFloat(String(r[cid] || '').replace(',', ''));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
    }
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

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

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
            <Button onClick={saveColumnView} variant="outline" className="ml-auto border-midnight-ink text-midnight-ink hover:bg-midnight-ink/10">{saveViewStatus === 'saved' ? 'Saved ✓' : 'Save View'}</Button>
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
          {canCreate && <BulkUploadButton sheetType="designers" onComplete={() => window.location.reload()} />}
          {canEdit && <Button onClick={handleEditRow} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8" disabled={isArchivedView}>Edit Row</Button>}
          {canEdit && <Button onClick={handleDeleteSelectedRows} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-100 disabled:border-red-500 disabled:text-red-500 rounded-full px-4 text-sm h-8" disabled={selectedRows.size === 0 || editingRowIds.size > 0}>Delete Selected</Button>}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">Archive</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleArchiveRow} disabled={isArchivedView}>Archive Selected Rows</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetViewMode(isArchivedView ? 'active' : 'archived')}>{isArchivedView ? 'Show Active Rows' : 'Show Archived Rows'}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isArchivedView && canEdit && (
            <Button onClick={handleUnarchiveRows} variant="outline" className="border-green-600 text-success hover:bg-success/10 rounded-full px-4 text-sm h-8" disabled={selectedRows.size === 0}>Unarchive Selected</Button>
          )}
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">Manage Columns</Button>
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
                        const isPhoto = col.id === 'rendered_photo' || col.id === 'technical_drawing' || col.id === 'other_photo';
                        const isReadOnly = !!col.readOnly;
                        const val = row[col.id] ?? '';
                        const photoFieldName = col.id === 'other_photo' ? 'designer_image_3' : col.id;
                        const isFindings = col.id === 'findings_code' || col.id === 'findings_quantity';
                        const findingsKey = col.id === 'findings_code' ? 'code' : 'quantity';
                        return (
                          <td key={col.id} className="border border-soft-border p-1" style={isEditing ? { backgroundColor: '#eff6ff' } : {}}>
                            {isFindings ? (
                              <div className="px-1 py-0.5 text-xs flex flex-col gap-0.5">
                                {(row._findings_entries || []).filter(f => f.code).length > 0
                                  ? (row._findings_entries).filter(f => f.code).map((f, i) => (
                                      <span key={i} className="block whitespace-normal break-words leading-tight">{f[findingsKey] || ''}</span>
                                    ))
                                  : <span className="text-cool-gray">—</span>
                                }
                              </div>
                            ) : isReadOnly ? (
                              <span className="px-1 py-0.5 block text-xs">{val}</span>
                            ) : isPhoto ? (
                              <DesignerPhotoCell
                                value={val}
                                rowId={row.id}
                                fieldName={photoFieldName}
                                isNew={!row.hasBackendRecord}
                                isEditing={isEditing}
                                onChange={(newUrl) => handleCellChange(row.id, col.id, newUrl)}
                              />
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
          {canCreate && <Button onClick={handleAddRow} className="bg-trust-blue hover:bg-deep-blue text-white px-6" disabled={editingRowIds.size > 0}>+ Add Row</Button>}
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
              : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, displayedData.length)}`
            } of {displayedData.length}
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
        <DeletionHistoryDrawer appLabel="designers" modelName="designersheet" />
      </div>
    </div>
  );
}

// ── DesignerPhotoCell ──────────────────────────────────────────────────────────
function DesignerPhotoCell({ value, rowId, fieldName, isNew, isEditing, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const backendBase =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://product-sheet.onrender.com';

  const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendBase}${url}`;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isNew) {
      setUploadError('Save the row first, then upload a photo.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/designers/${rowId}/upload-photo?field=${fieldName}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Upload failed');
      onChange(data.data?.url || '');
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1 min-h-8 px-1 py-1 items-center">
      {value ? (
        <img
          src={resolveUrl(value)}
          alt={fieldName}
          className="w-10 h-10 object-cover rounded border border-soft-border"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        !isEditing && <span className="text-cool-gray text-xs">—</span>
      )}
      {isEditing && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-0.5 rounded border border-trust-blue text-trust-blue hover:bg-trust-blue/10 disabled:opacity-50 w-fit"
          >
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          {uploadError && <p className="text-xs text-danger text-center">{uploadError}</p>}
        </>
      )}
    </div>
  );
}

