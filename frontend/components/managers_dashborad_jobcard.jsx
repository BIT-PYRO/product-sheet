'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Pencil, Trash2, FileText, Printer, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import { CreateJobModal } from '@/components/create-job-modal';
import { SuggestedVouchersModal } from '@/components/suggested-vouchers-modal';
import { NeededVouchersModal } from '@/components/needed-vouchers-modal';
import { PendingVouchersModal } from '@/components/pending-vouchers-modal';
import { CompanyKYCForm } from '@/components/company-kyc-form';
import { ReceiveJobModal } from '@/components/receive-job-modal';
import { GenericJobModal } from '@/components/generic-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';
import LastUpdatedFooter from '@/components/last-updated-footer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

export default function ManagersDashboard() {
  const { canView, canEdit, canCreate, canExport, loading: permsLoading } = useSheetPermissions('managers-dashboard');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isReceiveJobOpen, setIsReceiveJobOpen] = useState(false);
  const [selectedVoucherForReceive, setSelectedVoucherForReceive] = useState(null);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [isCreateAllVouchersOpen, setIsCreateAllVouchersOpen] = useState(false);
  const [isSuggestedVouchersOpen, setIsSuggestedVouchersOpen] = useState(false);
  const [isNeededVouchersOpen, setIsNeededVouchersOpen] = useState(false);
  const [isPendingVouchersOpen, setIsPendingVouchersOpen] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState(new Set());
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isGenericJobOpen, setIsGenericJobOpen] = useState(false);
  const [selectedGenericJobData, setSelectedGenericJobData] = useState(null);
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
  const statusOptions = ['Pending', 'WIP', 'Completed'];
  const newReissueOptions = ['New', 'Re-issue'];

  // Process columns — live pipeline stages (matches dept_from keys order)
  const processColumns = [
    'Wax Piece',
    'Wax Setting',
    'Casting',
    'Filling',
    'Pre Polish',
    'Hand Setting',
    'Final Polish',
    'Plating',
    'Final Stock',
    'Others',
  ];

  // Maps voucher dept_to keys → dashboard column names
  const DEPT_TO_COLUMN = {
    'wax-pieces':  'Wax Piece',
    'wax-setting': 'Wax Setting',
    'casting':     'Casting',
    'filing':      'Filling',
    'pre-polish':  'Pre Polish',
    'hand-setting': 'Hand Setting',
    'polishing':   'Final Polish',
    'plating':     'Plating',
    'final-stock': 'Final Stock',
  };

  // Human-readable labels for dept keys used in card display
  const DEPT_LABELS = {
    'wax-pieces':  'Wax Piece',
    'wax-setting': 'Wax Setting',
    'casting':     'Casting',
    'filing':      'Filling',
    'pre-polish':  'Pre Polish',
    'hand-setting': 'Hand Setting',
    'polishing':   'Final Polish',
    'plating':     'Plating',
    'final-stock': 'Final Stock',
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
    'Wax Piece':         { new: [], wip: [], completed: [] },
    'Wax Setting':       { new: [], wip: [], completed: [] },
    'Casting':           { new: [], wip: [], completed: [] },
    'Filling':           { new: [], wip: [], completed: [] },
    'Pre Polish':        { new: [], wip: [], completed: [] },
    'Hand Setting':      { new: [], wip: [], completed: [] },
    'Final Polish':      { new: [], wip: [], completed: [] },
    'Plating':           { new: [], wip: [], completed: [] },
    'Final Stock':       { new: [], wip: [], completed: [] },
    'Others':            { new: [], wip: [], completed: [] },
  };

  const [jobCardsData, setJobCardsData] = useState(emptyJobCardsData);

  const mapBackendStatusToBucket = (status, approvalStatus) => {
    // For voucher workflow: use approval_status if available
    if (approvalStatus === 'completed') return 'completed';
    if (approvalStatus === 'in_process') return 'wip';
    if (approvalStatus === 'partially_complete') return 'wip';
    if (approvalStatus === 'replaced') return 'completed';
    if (approvalStatus === 'awaiting') return 'new';
    if (approvalStatus === 'approved') return 'new';
    // Fallback to job status
    if (status === 'completed') return 'completed';
    if (status === 'in_progress') return 'wip';
    return 'new';
  };

  // Dynamic filter options derived from loaded data
  const filterOptions = useMemo(() => {
    const names = new Set();
    const issuers = new Set();
    const departments = new Set();
    const types = new Set();
    const categories = new Set();
    for (const col of Object.values(jobCardsData)) {
      for (const bucket of ['new', 'wip', 'completed']) {
        for (const card of col[bucket]) {
          if (card.name && card.name !== 'Unassigned') names.add(card.name);
          if (card.issuedBy) issuers.add(card.issuedBy);
          if (card.deptFrom) departments.add(card.deptFrom);
          if (card.workType) types.add(card.workType);
          if (card.category) categories.add(card.category);
        }
      }
    }
    return {
      names: Array.from(names).sort(),
      issuers: Array.from(issuers).sort(),
      departments: Array.from(departments).sort(),
      types: Array.from(types).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [jobCardsData]);

  // Filtered data derived from jobCardsData + all active filters
  const filteredJobCardsData = useMemo(() => {
    const applyFilter = (card, bucket) => {
      if (statusFilter === 'Pending' && bucket !== 'new') return false;
      if (statusFilter === 'WIP' && bucket !== 'wip') return false;
      if (statusFilter === 'Completed' && bucket !== 'completed') return false;
      if (dateFromFilter || dateToFilter) {
        const cardDate = card.createdAt ? card.createdAt.slice(0, 10) : '';
        if (dateFromFilter && cardDate < dateFromFilter) return false;
        if (dateToFilter && cardDate > dateToFilter) return false;
      }
      if (newReissueFilter && card.voucherType?.toLowerCase() !== newReissueFilter.toLowerCase()) return false;
      if (nameFilter && card.name !== nameFilter) return false;
      if (issuerFilter && card.issuedBy !== issuerFilter) return false;
      if (departmentFilter && card.deptFrom !== departmentFilter) return false;
      if (typeFilter && card.workType !== typeFilter) return false;
      if (categoryFilter && card.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = [card.voucherNo, card.name, card.category, card.issuedBy, card.workType].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    };
    const result = {};
    for (const [col, data] of Object.entries(jobCardsData)) {
      result[col] = {
        new: data.new.filter(c => applyFilter(c, 'new')),
        wip: data.wip.filter(c => applyFilter(c, 'wip')),
        completed: data.completed.filter(c => applyFilter(c, 'completed')),
      };
    }
    return result;
  }, [jobCardsData, statusFilter, dateFromFilter, dateToFilter, newReissueFilter, nameFilter, issuerFilter, departmentFilter, typeFilter, categoryFilter, searchTerm]);

  // All card IDs currently visible (after filtering) – used for Select All
  const allFilteredCardIds = useMemo(() => {
    const ids = [];
    for (const col of Object.values(filteredJobCardsData)) {
      for (const bucket of ['new', 'wip', 'completed']) {
        for (const card of col[bucket]) ids.push(card.id);
      }
    }
    return ids;
  }, [filteredJobCardsData]);

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
        'Wax Piece':         { new: [], wip: [], completed: [] },
        'Wax Setting':       { new: [], wip: [], completed: [] },
        'Casting':           { new: [], wip: [], completed: [] },
        'Filling':           { new: [], wip: [], completed: [] },
        'Pre Polish':        { new: [], wip: [], completed: [] },
        'Hand Setting':      { new: [], wip: [], completed: [] },
        'Final Polish':      { new: [], wip: [], completed: [] },
        'Plating':           { new: [], wip: [], completed: [] },
        'Final Stock':       { new: [], wip: [], completed: [] },
        'Others':            { new: [], wip: [], completed: [] },
      };

      jobs.forEach((job) => {
        // Only show approved/in_process/awaiting/completed/partially_complete vouchers (not pending)
        const approvalStatus = job.approval_status || '';
        const showOnDashboard = ['approved', 'in_process', 'awaiting', 'completed', 'partially_complete', 'replaced'].includes(approvalStatus)
          || !job.batch_id; // Non-batch jobs (single vouchers) always show

        if (!showOnDashboard) return;

        const bucket = mapBackendStatusToBucket(job.status, approvalStatus);
        const materialRows = Array.isArray(job.material_rows) ? job.material_rows : []
        const totalQty = materialRows.reduce((sum, r) => sum + (parseFloat(r.issued_qty) || 0), 0)
        const totalWeight = materialRows.reduce((sum, r) => sum + (parseFloat(r.issued_weight) || 0), 0)

        // For partial vouchers, show remaining (issued - already received) on the card
        let displayQty = totalQty
        let displayWeight = totalWeight
        if (approvalStatus === 'partially_complete') {
          const receivedEvents = Array.isArray(job.received_rows) ? job.received_rows : []
          let rxQty = 0, rxWeight = 0
          for (const event of receivedEvents) {
            for (const row of (event.rows || [])) {
              rxQty += parseFloat(row.received_qty) || 0
              rxWeight += parseFloat(row.received_weight) || 0
            }
          }
          displayQty = Math.max(0, totalQty - rxQty)
          displayWeight = Math.max(0, totalWeight - rxWeight)
        }

        // Determine which column this voucher belongs to based on dept_to
        const targetColumn = DEPT_TO_COLUMN[job.dept_to] || 'Others';

        const card = {
          id: job.id,
          voucherNo: job.voucher_no || `JOB-${job.id}`,
          voucherType: job.voucher_type || 'New',
          name: job.issued_to || job.assignee_name || 'Unassigned',
          category: job.title,
          qty: displayQty || job.quantity || '-',
          weight: displayWeight || job.weight || '-',
          status: job.status,
          approvalStatus: approvalStatus,
          deptFrom: job.dept_from || '',
          deptTo: job.dept_to || '',
          issuedBy: job.issued_by || '',
          workType: job.work_type || '',
          contact: job.contact || '',
          createdAt: job.start_date || job.created_at || '',
          picklistName: job.picklist_name || '',
          orderName: job.order_name || '',
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

  const handleCardClick = async (card) => {
    setSelectedVoucher(card);
    const column = DEPT_TO_COLUMN[card.deptTo] || 'Others';
    if (column === 'Others') {
      // Fetch full job details from API to get all stored fields
      let jobData = null;
      try {
        const res = await fetch(`/api/jobs/${card.id}`, { cache: 'no-store' });
        const result = await res.json().catch(() => null);
        if (res.ok && result?.success) {
          jobData = result.data;
        }
      } catch {
        // Fall back to card data below
      }
      setSelectedGenericJobData({
        jobNumber: jobData?.voucher_no || card.voucherNo || '',
        issuedTo: jobData?.issued_to || (card.name !== 'Unassigned' ? card.name : '') || '',
        workType: jobData?.work_type || card.workType || '',
        issuedBy: jobData?.issued_by || card.issuedBy || '',
        workCategory: jobData?.job_type || card.category || '',
        contact: jobData?.contact || '',
        addNote: jobData?.notes || '',
        startDate: jobData?.start_date || '',
        scheduleFuture: jobData?.schedule || '',
      });
      setIsGenericJobOpen(true);
    } else {
      setSelectedVoucherForReceive(card);
      setIsReceiveJobOpen(true);
    }
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

  const handleDeleteVoucher = async () => {
    const idsToDelete = selectedForPrint.size > 0
      ? Array.from(selectedForPrint)
      : selectedVoucher ? [selectedVoucher.id] : [];
    if (idsToDelete.length === 0) return;
    const label = idsToDelete.length > 1
      ? `${idsToDelete.length} selected vouchers`
      : `voucher ${selectedVoucher?.voucherNo || idsToDelete[0]}`;
    const confirmed = window.confirm(`Delete ${label}?`);
    if (!confirmed) return;
    await Promise.all(
      idsToDelete.map(id => fetch(`/api/jobs/${id}`, { method: 'DELETE' }).catch(() => null))
    );
    setJobCardsData(prev => {
      const next = { ...prev };
      for (const col of Object.keys(next)) {
        for (const bucket of ['new', 'wip', 'completed']) {
          next[col] = { ...next[col], [bucket]: next[col][bucket].filter(c => !idsToDelete.includes(c.id)) };
        }
      }
      return next;
    });
    setSelectedForPrint(new Set());
    if (selectedVoucher && idsToDelete.includes(selectedVoucher.id)) setSelectedVoucher(null);
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

  const togglePrintSelect = (e, cardId) => {
    e.stopPropagation();
    setSelectedForPrint(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedForPrint.size === allFilteredCardIds.length && allFilteredCardIds.length > 0) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(allFilteredCardIds));
    }
  };

  function handlePrintSelected() {
    const allCards = [];
    for (const col of Object.values(jobCardsData)) {
      for (const bucket of ['new', 'wip', 'completed']) {
        for (const card of col[bucket]) {
          if (selectedForPrint.has(card.id)) allCards.push(card);
        }
      }
    }
    if (allCards.length === 0) return;

    const deptLabel = (val) => DEPT_LABELS[val] || val || '\u2014';
    const fmtDate = (v) => {
      if (!v) return '\u2014';
      const d = new Date(v);
      if (isNaN(d)) return v;
      return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    };

    const voucherPages = allCards.map((card, pageIdx) => {
      const materialRows = Array.isArray(card.materialRows) ? card.materialRows : [];
      const tableRows = materialRows.length > 0
        ? materialRows.map(row => {
          const iq = row.issued_qty && row.issued_qty !== '0' ? row.issued_qty : '';
          const iw = row.issued_weight && row.issued_weight !== '0' && row.issued_weight !== '0.0' ? row.issued_weight : '';
          return `
          <tr>
            <td class="left">${row.sku || ''}</td>
            <td class="left">${row.category || ''}</td>
            <td class="left">${row.metal || ''}</td>
            <td class="issued">${iq}${iq ? `<span class="unit">${row.unit1 || 'Pcs'}</span>` : ''}</td>
            <td class="issued-wt">${iw}${iw ? `<span class="unit">${row.unit2 || 'Kg'}</span>` : ''}</td>
            <td class="received"></td><td class="received-wt"></td>
            <td class="loss"></td><td class="loss-wt"></td>
            <td class="reissue"></td><td class="reissue-wt"></td>
          </tr>`;
        }).join('')
        : `<tr><td colspan="11" style="text-align:center;padding:6px;color:#aaa;">No material rows</td></tr>`;

      return `<div class="page${pageIdx > 0 ? ' page-break' : ''}">
  <!-- TOP ROW -->
  <div class="top-row">
    <div class="top-field"><label>Issue Date</label><span>${fmtDate(card.createdAt)}</span></div>
    <div class="top-right">
      <div class="top-field"><label>Voucher Type</label><span>${card.voucherType || 'New'}</span></div>
      ${card.picklistName ? `<div class="top-field"><label>Picklist</label><span class="chip">${card.picklistName}</span></div>` : ''}
      ${card.orderName ? `<div class="top-field"><label>Order</label><span class="chip">${card.orderName}</span></div>` : ''}
      <div class="top-field"><label>Voucher No.</label><span style="font-size:12px;font-weight:700;">${card.voucherNo}</span></div>
    </div>
  </div>

  <!-- ISSUED TO + WORK TYPE -->
  <div class="section-box">
    <div class="section-grid grid-3">
      <div><span class="field-label">Issued To</span><span class="field-value">${card.name || '\u2014'}</span></div>
      <div class="dash-center">\u2014</div>
      <div><span class="field-label">Work Type</span><span class="field-value">${card.workType || '\u2014'}</span></div>
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="dept-section">
    <div class="dept-grid">
      <div><span class="dept-label">From</span><span class="dept-value">${deptLabel(card.deptFrom)}</span></div>
      <div class="dept-arrow">&#8594;</div>
      <div><span class="dept-label">To</span><span class="dept-value">${deptLabel(card.deptTo)}</span></div>
    </div>
  </div>

  <!-- ISSUED BY + CONTACT -->
  <div class="section-box">
    <div class="section-grid grid-2">
      <div><span class="field-label">Issued By</span><span class="field-value">${card.issuedBy || '\u2014'}</span></div>
      <div></div>
      <div><span class="field-label">Contact</span><span class="field-value">${card.contact || '\u2014'}</span></div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <colgroup>
      <col style="width:13%"><col style="width:9%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
      <col style="width:6%"><col style="width:8%">
    </colgroup>
    <thead>
      <tr>
        <th class="left" rowspan="2">SKU</th>
        <th class="left" rowspan="2">Category</th>
        <th class="left" rowspan="2">Metal</th>
        <th class="group-issued" colspan="2">ISSUED</th>
        <th class="group-received" colspan="2">Received</th>
        <th class="group-loss" colspan="2">Loss</th>
        <th class="group-reissue" colspan="2">Re-Issue</th>
      </tr>
      <tr>
        <th class="sub-issued">Qty</th><th class="sub-issued">Weight</th>
        <th class="sub-received">Qty</th><th class="sub-received">Weight</th>
        <th class="sub-loss">Qty</th><th class="sub-loss">Weight</th>
        <th class="sub-reissue">Qty</th><th class="sub-reissue">Weight</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer-row">
    <div class="footer-box"><label>Received By</label><span>User Name</span></div>
    <div class="footer-box"><label>Contact</label><span>Contact Number</span></div>
    <div class="footer-box">
      <label>Rate Workmanship</label>
      <div class="rating">${Array.from({ length: 10 }, (_, i) => `<div class="rating-dot inactive">${i + 1}</div>`).join('')}</div>
    </div>
  </div>

  <span class="note-label">Note for Reissue Voucher</span>
  <div class="note-box"></div>

  <div class="sig-row">
    <div class="sig-box">Issued By Signature</div>
    <div class="sig-box">Received By Signature</div>
    <div class="sig-box">Authorised Signature</div>
  </div>
</div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print Vouchers (${allCards.length})</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .page-break { page-break-before: always; }

    .top-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 6px; }
    .top-field { display: flex; flex-direction: column; gap: 1px; }
    .top-field label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .top-field span { font-size: 10px; font-weight: 600; color: #111; }
    .top-right { display: flex; align-items: flex-end; gap: 12px; }
    .chip { display: inline-block; padding: 1px 7px; border-radius: 3px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 10px; font-weight: 600; }

    .section-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 4px 8px; margin-bottom: 5px; }
    .section-grid { display: grid; gap: 0 16px; align-items: end; }
    .grid-3 { grid-template-columns: minmax(160px,220px) 1fr minmax(160px,200px); }
    .grid-2 { grid-template-columns: minmax(200px,280px) 1fr minmax(200px,280px); }
    .field-label { font-size: 7px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 1px; }
    .field-value { font-size: 10px; font-weight: 500; color: #111; }
    .dash-center { text-align: center; font-size: 11px; color: #94a3b8; }

    .dept-section { border: 2px solid #3b82f6; border-radius: 3px; padding: 5px 10px; margin-bottom: 5px; background: #eff6ff; }
    .dept-grid { display: grid; grid-template-columns: 1fr 40px 1fr; align-items: center; }
    .dept-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #1e40af; display: block; margin-bottom: 1px; }
    .dept-value { font-size: 12px; font-weight: 800; color: #1e3a8a; }
    .dept-arrow { text-align: center; font-size: 18px; color: #3b82f6; font-weight: 900; }

    table { border-collapse: collapse; margin-bottom: 6px; font-size: 7.5px; width: 100%; table-layout: fixed; }
    th { background: #1a56db; color: white; font-weight: 500; padding: 2px 4px; text-align: center; border: 1px solid #1e40af; white-space: nowrap; overflow: hidden; word-break: break-all; max-width: 0; }
    th.left { text-align: left; padding-left: 5px; }
    td { padding: 2px 4px; border: 1px solid #d1d5db; text-align: center; white-space: nowrap; overflow: hidden; word-break: break-all; max-width: 0; }
    td.left { text-align: left; padding-left: 5px; }
    tr:nth-child(even) td { background: #f9fafb; }
    th.group-issued  { background: #1e40af; }
    th.group-received{ background: #065f46; }
    th.group-loss    { background: #881337; }
    th.group-reissue { background: #78350f; }
    th.sub-issued  { background: #1d4ed8; font-weight: 400; font-size: 7px; }
    th.sub-received{ background: #047857; font-weight: 400; font-size: 7px; }
    th.sub-loss    { background: #9f1239; font-weight: 400; font-size: 7px; }
    th.sub-reissue { background: #b45309; font-weight: 400; font-size: 7px; }
    td.issued  { background: rgba(59,130,246,0.07); border-left: 2px solid #93c5fd; }
    td.issued-wt { background: rgba(59,130,246,0.07); }
    td.received{ background: rgba(16,185,129,0.07); border-left: 2px solid #6ee7b7; }
    td.received-wt{ background: rgba(16,185,129,0.07); }
    td.loss    { background: rgba(239,68,68,0.07); border-left: 2px solid #fca5a5; }
    td.loss-wt { background: rgba(239,68,68,0.07); }
    td.reissue { background: rgba(245,158,11,0.07); border-left: 2px solid #fcd34d; }
    td.reissue-wt{ background: rgba(245,158,11,0.07); }
    .unit { font-size: 7px; color: #94a3b8; margin-left: 2px; }

    .footer-row { display: grid; grid-template-columns: 1fr 1fr 160px; gap: 6px; margin-bottom: 6px; }
    .footer-box { padding: 4px 7px; border: 1px solid #e2e8f0; border-radius: 3px; overflow: hidden; }
    .footer-box label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
    .footer-box span { font-size: 10px; font-weight: 600; }
    .rating { display: flex; gap: 2px; margin-top: 2px; flex-wrap: nowrap; }
    .rating-dot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid #f59e0b; display: inline-flex; align-items: center; justify-content: center; font-size: 6.5px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; flex-shrink: 0; }
    .rating-dot.active { background: #f59e0b !important; color: white !important; }
    .rating-dot.inactive { color: #f59e0b; background: white !important; }

    .note-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 3px; display: block; }
    .note-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 4px 7px; min-height: 28px; margin-bottom: 8px; font-size: 9.5px; }

    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 16px; }
    .sig-box { border-top: 1px solid #333; padding-top: 3px; text-align: center; font-size: 7px; font-weight: 700; text-transform: uppercase; color: #555; }
  </style>
</head>
<body>${voucherPages}</body>
</html>`;

    const win = window.open('', '_blank', 'width=1000,height=720');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site to print.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.addEventListener('afterprint', () => win.close()); }, 400);
  }

  const handleManageColumns = () => {
    setIsManageColumnsOpen(true);
  };

  const getCardStyle = () => ({
    border: 'border-trust-blue',
    header: 'bg-trust-blue',
    headerText: 'text-white',
    badge: 'bg-blue-200 text-blue-900',
  });

  const VoucherCard = ({ card, bucket }) => {
    const s = getCardStyle();
    const isSelected = selectedVoucher?.id === card.id;
    const isChecked = selectedForPrint.has(card.id);

    // Approval status badge colors
    const approvalLabels = {
      in_process:         { text: 'In Process',        cls: 'bg-orange-500 text-white' },
      awaiting:           { text: 'Awaiting',           cls: 'bg-red-200 text-red-800' },
      completed:          { text: 'Completed',          cls: 'bg-green-500 text-white' },
      partially_complete: { text: 'Partial',            cls: 'bg-yellow-300 text-yellow-900' },
      approved:           { text: 'Approved',           cls: 'bg-blue-200 text-blue-800' },
      replaced:           { text: 'Replaced',           cls: 'bg-gray-400 text-white' },
    };
    const approvalBadge = approvalLabels[card.approvalStatus];

    return (
      <div
        onClick={() => handleCardClick(card)}
        className={`border-2 ${
          isChecked ? 'border-amber-400 ring-2 ring-amber-300/60' :
          isSelected ? 'border-trust-blue ring-2 ring-trust-blue/40' : s.border
        } rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'shadow-md' : ''}`}
      >
        {/* Header row: Voucher No. | print checkbox | status badge | type badge */}
        <div className={`${s.header} flex items-center justify-between px-2 py-1`}>
          <span className={`text-[11px] font-bold ${s.headerText} truncate`}>{card.voucherNo}</span>
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => togglePrintSelect(e, card.id)}
              onClick={(e) => e.stopPropagation()}
              title="Select voucher"
              className="h-3 w-3 cursor-pointer accent-amber-400 shrink-0"
            />
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
            <span className="text-[10px] text-cool-gray">
              {DEPT_LABELS[card.deptFrom] || card.deptFrom} → {DEPT_LABELS[card.deptTo] || card.deptTo}
            </span>
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
        {/* Mark Complete button for in_process or partially_complete vouchers */}
        {(card.approvalStatus === 'in_process' || card.approvalStatus === 'partially_complete') && (
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
        onJobReceived={() => { loadJobs(); }}
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
            {canCreate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-success hover:bg-success/90 text-white rounded-full px-4 text-sm h-8 gap-1">
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
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="border-red-400 text-red-500 hover:bg-red-50 rounded-full px-3 text-sm h-8 gap-1"
            >
              {selectedForPrint.size === allFilteredCardIds.length && allFilteredCardIds.length > 0 ? 'Deselect All' : 'Select All'}
              {selectedForPrint.size > 0 ? ` (${selectedForPrint.size})` : ''}
            </Button>
            {canEdit && <Button 
              onClick={handleOpenEdit}
              disabled={!selectedVoucher}
              className="bg-white border border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-3 text-sm h-8 gap-1 disabled:opacity-100 disabled:border-trust-blue disabled:text-trust-blue"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>}
            {canEdit && <Button 
              onClick={handleDeleteVoucher}
              disabled={selectedForPrint.size === 0 && !selectedVoucher}
              className="bg-white border border-red-500 text-red-500 hover:bg-red-50 rounded-full px-3 text-sm h-8 gap-1 disabled:opacity-40 disabled:border-red-300 disabled:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete{selectedForPrint.size > 0 ? ` (${selectedForPrint.size})` : ''}
            </Button>}
            {canExport && <Button
              onClick={handlePrintSelected}
              disabled={selectedForPrint.size === 0}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-3 text-sm h-8 gap-1 hover:bg-gray-50 disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              Print{selectedForPrint.size > 0 ? ` (${selectedForPrint.size})` : ''}
            </Button>}
            <Button 
              onClick={handleManageColumns}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
            >
              Manage Columns
            </Button>
            {canCreate && <Button
              onClick={() => setIsPendingVouchersOpen(true)}
              variant="outline"
              className="border-trust-blue text-trust-blue rounded-full px-4 text-sm h-8 hover:bg-trust-blue/10 gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              Vouchers
            </Button>}
            {canCreate && <Button 
              onClick={() => setIsKYCModalOpen(true)}
              className="bg-trust-blue hover:bg-deep-blue text-white rounded-full px-4 text-sm h-8"
            >
              Company KYC
            </Button>}
          </div>
        </div>
        {isLoadingJobs && <p className="text-sm text-cool-gray mb-3">Loading live jobs...</p>}
        {jobsError && <p className="text-sm text-danger-dark mb-3">{jobsError}</p>}

        {/* Filter Row */}
        <div className="border border-soft-border rounded-lg mb-6 bg-[#dbeafe] p-4">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => { setStatusFilter(''); setDateFromFilter(''); setDateToFilter(''); setNewReissueFilter(''); setNameFilter(''); setIssuerFilter(''); setDepartmentFilter(''); setTypeFilter(''); setCategoryFilter(''); }}
              className="text-xs text-trust-blue hover:underline font-medium"
            >
              Clear Filters
            </button>
          </div>
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
                  {filterOptions.names.map(name => (
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
                  {filterOptions.issuers.map(issuer => (
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
                  {filterOptions.departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{DEPT_LABELS[dept] || dept}</SelectItem>
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
                  {filterOptions.types.map(option => (
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
                  {filterOptions.categories.map(option => (
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
                    Total: {calculateTotal(filteredJobCardsData[column])}
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
                    {filteredJobCardsData[column].new.map((card, idx) => (
                      <VoucherCard key={`new-${idx}`} card={card} bucket="new" />
                    ))}

                    {/* Work in Progress Cards */}
                    {filteredJobCardsData[column].wip.map((card, idx) => (
                      <VoucherCard key={`wip-${idx}`} card={card} bucket="wip" />
                    ))}

                    {/* Completed Cards */}
                    {filteredJobCardsData[column].completed.map((card, idx) => (
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
          <span>Total Vouchers: {Object.values(filteredJobCardsData).reduce((sum, col) => sum + col.new.length + col.wip.length + col.completed.length, 0)}</span>
          {isLoadingJobs && <span className="text-trust-blue">Loading...</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
      </div>

      <CreateJobModal
        open={isCreateJobModalOpen}
        onOpenChange={setIsCreateJobModalOpen}
        mode="single-pipeline"
        onJobCreated={loadJobs}
      />
      <CreateJobModal open={isCreateAllVouchersOpen} onOpenChange={setIsCreateAllVouchersOpen} mode="all" onJobCreated={loadJobs} />
      <SuggestedVouchersModal open={isSuggestedVouchersOpen} onOpenChange={setIsSuggestedVouchersOpen} suggestedItems={[]} onVouchersCreated={loadJobs} />
      <NeededVouchersModal open={isNeededVouchersOpen} onOpenChange={setIsNeededVouchersOpen} neededItems={[]} onVouchersCreated={loadJobs} />

      <PendingVouchersModal
        open={isPendingVouchersOpen}
        onOpenChange={setIsPendingVouchersOpen}
        onVouchersApproved={loadJobs}
      />

      <GenericJobModal
        open={isGenericJobOpen}
        onOpenChange={setIsGenericJobOpen}
        initialData={selectedGenericJobData}
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
