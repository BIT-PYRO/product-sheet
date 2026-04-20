'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Search, Upload, Trash2, Pencil, Download, RefreshCw, Printer, X } from 'lucide-react';
import SortPopover from '@/components/sort-popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';
import GlobalSearchBar from '@/components/global-search-bar';
import LastUpdatedFooter from '@/components/last-updated-footer';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';

const UNIT_OPTIONS = ['PCS', 'GM', 'KG', 'CT'];
// ISSUE_REQUESTS_KEY removed — now using API
const PRODUCT_COLUMNS = [
  { id: 'image', label: 'Image' },
  { id: 'masterSku', label: 'Master SKU' },
  { id: 'designerSku', label: 'Designer SKU' },
  { id: 'finalSku', label: 'Final Stock SKU' },
  { id: 'value', label: 'Value' },
  { id: 'unit', label: 'Unit' },
  { id: 'location', label: 'Location' },
  { id: 'wip', label: 'WIP' },
  { id: 'totalInDemand', label: 'Total In Demand' },
];

export default function ProductInventoryPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState([]);
  const [filterLocation, setFilterLocation] = useState([]);
  const [filterStockState, setFilterStockState] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const handleSort = (field) => { setSortField((prev) => { if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return field; }); };
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [bulkUploadStatus, setBulkUploadStatus] = useState(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(PRODUCT_COLUMNS.map((column) => column.id)));
  const bulkFileRef = useRef(null);

  // Receive Product workflow
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ productId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });

  // Issue Product workflow
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ productId: '', quantity: '', issuedTo: '', issuedBy: '', reason: '' });

  // Workforce
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsernameRaw, setCurrentUsernameRaw] = useState('');

  // Issue Requests
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [issueRequests, setIssueRequests] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
        setCurrentUsername(fullName);
        setCurrentUserEmail(u.email || '');
        setCurrentUsernameRaw(u.username || '');
      })
      .catch(() => {});
  }, []);

  // Load workforce
  useEffect(() => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.data?.results) ? d.data.results : Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const refreshWorkforce = () => {
    fetch('/api/workforce?page_size=200')
      .then((r) => r.json())
      .then((d) => setWorkforceMembers(Array.isArray(d?.data?.results) ? d.data.results : Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const loadIssueRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/issue-requests?inventory_type=product&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.data ?? data?.results ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch {}
  }, []);

  useEffect(() => { loadIssueRequests(); }, [loadIssueRequests]);

  // Computed request values
  const pendingIssueRequests = useMemo(() => issueRequests.filter((r) => r.status === 'pending'), [issueRequests]);
  const sortedIssueRequests = useMemo(() => [...issueRequests].sort((a, b) => new Date(b.requested_at || b.requestedAt) - new Date(a.requested_at || a.requestedAt)), [issueRequests]);
  const activeRequest = useMemo(() => issueRequests.find((r) => r.id === activeRequestId) || null, [issueRequests, activeRequestId]);

  const backendBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://product-sheet.onrender.com';

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendBase}${url}`;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const [summaryRes, manualRes] = await Promise.all([
        fetch('/api/inventory-summary', { cache: 'no-store' }),
        fetch('/api/product-inventory', { cache: 'no-store' }),
      ]);

      const summaryPayload = await summaryRes.json().catch(() => null);
      const manualPayload = await manualRes.json().catch(() => null);

      if (!summaryRes.ok || !summaryPayload?.success) {
        throw new Error(summaryPayload?.message || 'Failed to fetch inventory data');
      }

      const products = Array.isArray(summaryPayload.products) ? summaryPayload.products : [];

      // Build manual overlay map: (productId__finalSku) → ProductInventoryItem (for total_in_demand overrides)
      const manualItems = manualRes.ok && manualPayload?.success
        ? (Array.isArray(manualPayload.data) ? manualPayload.data
          : Array.isArray(manualPayload.data?.results) ? manualPayload.data.results : [])
        : [];
      const manualMap = new Map();
      manualItems.forEach(item => {
        const key = `${item.product}__${String(item.final_sku || '').toLowerCase()}`;
        manualMap.set(key, item);
      });

      // Build consolidated location string from die numbers / findings
      const getLocation = (dieNumberFindings) => {
        if (!Array.isArray(dieNumberFindings)) return '';
        return dieNumberFindings
          .filter(d => String(d.location || '').trim())
          .map(d => d.location)
          .join(' | ');
      };

      // Sum WIP across all live-stock stages from inventory-summary
      const getWip = (liveStock) => {
        if (!liveStock) return 0;
        return Object.values(liveStock).reduce((sum, stage) => sum + (Number(stage?.wip) || 0), 0);
      };

      const rows = products.map(product => {
        const finalStockList = Array.isArray(product.finalStock) ? product.finalStock : [];
        const location = getLocation(product.dieNumberFindings);
        const wip = getWip(product.liveStock);

        const subRows = finalStockList.map((fs, idx) => {
          const fsKey = `${product.id}__${String(fs.sku || '').toLowerCase()}`;
          const manual = manualMap.get(fsKey);
          return {
            id: manual?.id ?? `_${product.id}_${idx}`,  // synthetic id for rows without manual entry
            productId: product.id,
            finalSku: fs.sku || '',
            value: fs.value || '0',
            unit: (fs.unit || 'PCS').toUpperCase(),
            location: fs.location || location || '',
            totalInDemand: manual?.total_in_demand || '0',
            updatedAt: manual?.updated_at,
          };
        });

        if (subRows.length === 0) {
          subRows.push({
            id: `_${product.id}_0`,
            productId: product.id,
            finalSku: product.masterSku || product.sku || '',
            value: '0',
            unit: 'PCS',
            location,
            totalInDemand: '0',
          });
        }

        return {
          productId: product.id,
          masterSku: product.masterSku || product.sku || '',
          designerSku: product.designerSku || '',
          productName: product.listingName || '',
          images: Array.isArray(product.images) ? product.images : [],
          wip,
          subRows,
        };
      });

      setData(rows);
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError(err.message || 'Failed to load');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Search filter
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const unitFilters = Array.isArray(filterUnit) ? filterUnit : [];
    const locationFilters = Array.isArray(filterLocation) ? filterLocation : [];
    const stockStateFilters = (Array.isArray(filterStockState) ? filterStockState : []).map((v) => String(v || '').toLowerCase());
    const base = data.filter(row => {
      const searchMatch = !q ||
        row.masterSku.toLowerCase().includes(q) ||
        row.designerSku.toLowerCase().includes(q) ||
        row.subRows.some(s => s.finalSku.toLowerCase().includes(q)) ||
        row.subRows.some(s => s.location.toLowerCase().includes(q));

      const unitMatch =
        unitFilters.length === 0 ||
        row.subRows.some((sub) =>
          unitFilters.some((unit) => String(sub.unit || '').toLowerCase().includes(String(unit || '').toLowerCase()))
        );
      const locationMatch =
        locationFilters.length === 0 ||
        row.subRows.some((sub) =>
          locationFilters.some((location) => String(sub.location || '').toLowerCase().includes(String(location || '').toLowerCase()))
        );

      const hasInStock = row.subRows.some((sub) => Number(sub.value || 0) > 0);
      const hasOutOfStock = row.subRows.every((sub) => Number(sub.value || 0) <= 0);
      const hasWip = Number(row.wip || 0) > 0;
      const stockStateLabels = [
        hasInStock ? 'in stock' : '',
        hasOutOfStock ? 'out of stock' : '',
        hasWip ? 'wip' : '',
      ].filter(Boolean);

      const stockStateMatch =
        stockStateFilters.length === 0 ||
        stockStateFilters.some((state) => {
          if (state.includes('in stock') || state === 'in') return hasInStock;
          if (state.includes('out of stock') || state === 'out') return hasOutOfStock;
          if (state.includes('wip')) return hasWip;
          return stockStateLabels.some((label) => label.includes(state));
        });

      return searchMatch && unitMatch && locationMatch && stockStateMatch;
    });
    if (!sortField) return base;
    return [...base].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
      const cmp = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    data,
    searchTerm,
    filterUnit,
    filterLocation,
    filterStockState,
    sortField,
    sortDir,
  ]);

  const locationOptions = useMemo(() => {
    return Array.from(
      new Set(
        data
          .flatMap((row) => row.subRows.map((sub) => String(sub.location || '').trim()))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // Selection
  const allPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.productId));

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(r => r.productId)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const toggleRowSelection = (productId) => {
    const next = new Set(selectedRows);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedRows(next);
  };

  // Receive
  const openReceivePopup = () => {
    setReceiveForm({ productId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new' });
    setReceiveOpen(true);
  };

  const createReceiveRequest = () => {
    const productId = receiveForm.productId;
    const quantityNum = Number(receiveForm.quantity);
    const employeeVendorName = receiveForm.employeeVendorName.trim();
    const referenceId = receiveForm.referenceId.trim();
    const price = receiveForm.price.trim();
    if (!productId) { alert('Please select a product.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { alert('Please enter a valid quantity greater than 0.'); return; }
    if (!employeeVendorName) { alert('Please enter employee/vendor name.'); return; }
    if (!referenceId) { alert('Please enter a reference ID.'); return; }
    if (!price) { alert('Please enter a price.'); return; }
    const row = data.find((r) => r.productId === productId);
    setReceiveOpen(false);
    setSaveStatus({ success: true, message: `Received ${quantityNum} of ${row?.masterSku || 'Product'} from ${employeeVendorName}.` });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Issue
  const openIssuePopup = () => {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUsername.toLowerCase();
    const lUser = currentUsernameRaw.toLowerCase();
    const matchedMember = workforceMembers.find((w) => lEmail && w.email && w.email.toLowerCase() === lEmail)
      || workforceMembers.find((w) => lName && w.full_name && w.full_name.toLowerCase() === lName)
      || workforceMembers.find((w) => lUser && w.full_name && w.full_name.toLowerCase().startsWith(lUser));
    const issuedBy = matchedMember?.full_name || currentUsername;
    setIssueForm({ productId: '', quantity: '', issuedTo: '', issuedBy, reason: '' });
    setIssueOpen(true);
  };

  const createIssueRequest = async () => {
    const productId = issueForm.productId;
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();
    if (!productId) { alert('Please select a product.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { alert('Please enter a valid quantity greater than 0.'); return; }
    if (!issuedTo) { alert('Please enter who the product is issued to.'); return; }
    if (!issuedBy) { alert('Please enter who issued the product.'); return; }
    if (!reason) { alert('Please enter a reason for issue.'); return; }
    const row = data.find((r) => r.productId === productId);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_type: 'product',
          item_id: Number(productId),
          item_name: row?.masterSku || row?.designerSku || `Product #${productId}`,
          quantity: quantityNum,
          issued_to: issuedTo,
          issued_by: issuedBy,
          reason,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.message || `Error ${res.status}`); return; }
      await loadIssueRequests();
      setIssueOpen(false);
      setSaveStatus({ success: true, message: `Issue request created for ${quantityNum} of ${row?.masterSku || 'product'} to ${issuedTo}.` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) { alert(err.message || 'Failed to create request'); }
  };

  // Request helpers
  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  }

  function openRequestDetails(requestId) {
    setActiveRequestId(requestId);
    setRequestDetailsOpen(true);
  }

  function reviewIssueRequest(nextStatus) {
    // kept as stub; async version used in dialog
  }

  async function reviewIssueRequestAsync(nextStatus) {
    if (!activeRequest) return;
    setReviewError('');
    try {
      const res = await fetch(`/api/issue-requests/${activeRequest.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReviewError(data?.message || `Error ${res.status}`); return; }
      setReviewError('');
      setRequestDetailsOpen(false);
      await loadIssueRequests();
      setSaveStatus({ success: true, message: `Request ${nextStatus}.` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) { setReviewError(err.message || 'Review failed'); }
  }

  // Edit
  const handleEditRows = () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to edit.');
      return;
    }
    const buffer = {};
    data.forEach(row => {
      if (selectedRows.has(row.productId)) {
        row.subRows.forEach(sub => {
          buffer[sub.id] = { ...sub };
        });
      }
    });
    setEditBuffer(buffer);
    setEditingRowIds(new Set(Object.keys(buffer)));
  };

  const updateEditBuffer = (subId, field, value) => {
    setEditBuffer(prev => ({
      ...prev,
      [subId]: { ...prev[subId], [field]: value },
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    const errors = [];
    const ids = Array.from(editingRowIds);

    for (const id of ids) {
      const buf = editBuffer[id];
      if (!buf) continue;
      try {
        const isNew = String(id).startsWith('_');
        const res = isNew
          ? await fetch('/api/product-inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product: buf.productId,
                final_sku: buf.finalSku,
                value: buf.value,
                unit: buf.unit,
                location: buf.location,
                total_in_demand: buf.totalInDemand,
              }),
            })
          : await fetch(`/api/product-inventory/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                final_sku: buf.finalSku,
                value: buf.value,
                unit: buf.unit,
                location: buf.location,
                total_in_demand: buf.totalInDemand,
              }),
            });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) throw new Error(result?.message || `Failed to save row`);
      } catch (err) {
        errors.push(err.message);
      }
    }

    setIsSaving(false);
    setEditingRowIds(new Set());
    setEditBuffer({});
    setSelectedRows(new Set());

    if (errors.length > 0) {
      setSaveStatus({ success: false, message: errors.join('; ') });
    } else {
      setSaveStatus({ success: true, message: `${ids.length} row(s) saved` });
      loadData();
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowIds(new Set());
    setEditBuffer({});
  };

  // Delete
  const handleDeleteRows = async () => {
    const toDelete = [];
    data.forEach(row => {
      if (selectedRows.has(row.productId)) {
        // Only delete rows that have a real DB id (skip inventory-summary derived rows)
        row.subRows.forEach(sub => {
          if (!String(sub.id).startsWith('_')) toDelete.push(sub.id);
        });
      }
    });
    if (toDelete.length === 0) {
      setIsDeleteConfirmOpen(false);
      setSelectedRows(new Set());
      setDeleteStatus({ success: false, message: 'Nothing to delete — these rows come from the inventory sheet automatically.' });
      setTimeout(() => setDeleteStatus(null), 4000);
      return;
    }

    setIsDeletingRows(true);
    setDeleteStatus(null);
    const errors = [];

    for (const id of toDelete) {
      try {
        const res = await fetch(`/api/product-inventory/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || `Failed to delete ${id}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    setSelectedRows(new Set());
    setIsDeleteConfirmOpen(false);
    setIsDeletingRows(false);

    if (errors.length > 0) {
      setDeleteStatus({ success: false, message: errors.join('; ') });
    } else {
      setDeleteStatus({ success: true, message: `${toDelete.length} item(s) deleted` });
      loadData();
      setTimeout(() => setDeleteStatus(null), 3000);
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Image', 'Master SKU', 'Designer SKU', 'Final Stock SKU', 'Value', 'Unit', 'Location', 'WIP', 'Total In Demand'];
    const csvRows = [headers.join(',')];

    filteredData.forEach(row => {
      row.subRows.forEach((sub, idx) => {
        csvRows.push([
          idx === 0 ? (row.images[0] || '') : '',
          idx === 0 ? `"${row.masterSku}"` : '',
          idx === 0 ? `"${row.designerSku}"` : '',
          `"${sub.finalSku}"`,
          sub.value,
          sub.unit,
          `"${sub.location}"`,
          idx === 0 ? row.wip : '',
          sub.totalInDemand,
        ].join(','));
      });
      if (row.subRows.length === 0) {
        csvRows.push([
          row.images[0] || '',
          `"${row.masterSku}"`,
          `"${row.designerSku}"`,
          '', '', '', '',
          row.wip,
          '',
        ].join(','));
      }
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintTable = () => {
    window.print();
  };

  const toggleColumnSelection = (columnId) => {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) {
      next.delete(columnId);
    } else {
      next.add(columnId);
    }
    setSelectedColumnsForAction(next);
  };

  const toggleSelectAllColumns = () => {
    if (selectedColumnsForAction.size === PRODUCT_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(PRODUCT_COLUMNS.map((column) => column.id)));
    }
  };

  const handleHideColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.delete(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const handleShowColumns = () => {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.add(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  };

  const visibleTableColumnCount = 1 + PRODUCT_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  // Bulk upload
  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsBulkUploading(true);
    setBulkUploadStatus(null);

    try {
      const text = await file.text();
      let items;

      if (file.name.endsWith('.json')) {
        items = JSON.parse(text);
      } else {
        // CSV parsing
        const lines = text.trim().split('\n');
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        items = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
      }

      const res = await fetch('/api/product-inventory/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) throw new Error(result?.message || 'Bulk upload failed');

      setBulkUploadStatus({ success: true, message: result.message || 'Upload successful' });
      loadData();
    } catch (err) {
      setBulkUploadStatus({ success: false, message: err.message });
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-cloud-gray flex flex-col text-midnight-ink overflow-x-hidden">
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedRows.size} product(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-cool-gray py-2">
            This will permanently delete all inventory entries for the selected product(s). This action cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsDeleteConfirmOpen(false)} variant="outline" disabled={isDeletingRows}>Cancel</Button>
            <Button onClick={handleDeleteRows} className="bg-danger hover:bg-danger/90 text-white" disabled={isDeletingRows}>
              {isDeletingRows ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id="select-all-product-inventory-columns"
                  checked={selectedColumnsForAction.size === PRODUCT_COLUMNS.length && PRODUCT_COLUMNS.length > 0}
                  onCheckedChange={toggleSelectAllColumns}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-product-inventory-columns" className="text-sm font-semibold cursor-pointer">
                  Select All
                </label>
              </div>
            </div>
            {PRODUCT_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={`product-column-${column.id}`}
                    checked={selectedColumnsForAction.has(column.id)}
                    onCheckedChange={() => toggleColumnSelection(column.id)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={`product-column-${column.id}`} className="text-sm cursor-pointer">
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

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Product</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Product</label>
              <select
                value={receiveForm.productId}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select product</option>
                {data.map((r) => (
                  <option key={r.productId} value={r.productId}>{r.masterSku || r.designerSku || `Product #${r.productId}`}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Employee / Vendor Name</label>
              <select
                value={receiveForm.employeeVendorName}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, employeeVendorName: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select person</option>
                {workforceMembers.map((m) => (
                  <option key={m.id} value={m.full_name}>{m.full_name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline mt-0.5 text-left">+ Quick Enrol Workforce</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Reference ID</label>
                <input
                  type="text"
                  value={receiveForm.referenceId}
                  onChange={(e) => setReceiveForm((prev) => ({ ...prev, referenceId: e.target.value }))}
                  placeholder="e.g. REF-001"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={receiveForm.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') { setReceiveForm((prev) => ({ ...prev, quantity: '' })); return; }
                    const num = Number(value);
                    setReceiveForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                  }}
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Price</label>
                <input
                  type="text"
                  value={receiveForm.price}
                  onChange={(e) => setReceiveForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Usage</label>
              <select
                value={receiveForm.usage}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, usage: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={createReceiveRequest}>Receive</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Product Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Product</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Product</label>
              <select
                value={issueForm.productId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select product</option>
                {data.map((r) => (
                  <option key={r.productId} value={r.productId}>{r.masterSku || r.designerSku || `Product #${r.productId}`}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  value={issueForm.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { setIssueForm((prev) => ({ ...prev, quantity: '' })); return; }
                    const num = Number(val);
                    setIssueForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                  }}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Issued To</label>
                <select
                  value={issueForm.issuedTo}
                  onChange={(e) => setIssueForm((prev) => ({ ...prev, issuedTo: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  <option value="">Select person</option>
                  {workforceMembers.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Issued By</label>
                <select
                  value={issueForm.issuedBy}
                  onChange={(e) => setIssueForm((prev) => ({ ...prev, issuedBy: e.target.value }))}
                  className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                >
                  <option value="">Select person</option>
                  {workforceMembers.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => setEnrollWorkforceOpen(true)} className="text-xs text-trust-blue hover:underline text-left">+ Enroll Workforce</button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Reason of Issue</label>
              <input
                type="text"
                value={issueForm.reason}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIssueOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition">
              Cancel
            </button>
            <button type="button" onClick={createIssueRequest} className="rounded-lg border border-trust-blue bg-trust-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition">
              Request
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={(open) => { setRequestDetailsOpen(open); if (!open) setReviewError(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>
          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3 text-sm">
              <div><span className="font-medium text-cool-gray">Product:</span> {activeRequest.item_name || activeRequest.productName}</div>
              <div><span className="font-medium text-cool-gray">Quantity:</span> {activeRequest.quantity}</div>
              <div><span className="font-medium text-cool-gray">Issued To:</span> {activeRequest.issued_to || activeRequest.issuedTo}</div>
              <div><span className="font-medium text-cool-gray">Issued By:</span> {activeRequest.issued_by || activeRequest.issuedBy || '-'}</div>
              <div><span className="font-medium text-cool-gray">Reason:</span> {activeRequest.reason || '-'}</div>
              <div><span className="font-medium text-cool-gray">Status:</span> {activeRequest.status.toUpperCase()}</div>
              <div><span className="font-medium text-cool-gray">Requested At:</span> {new Date(activeRequest.requested_at || activeRequest.requestedAt).toLocaleString()}</div>
            </div>
          ) : (
            <p className="text-sm text-cool-gray">Request not found.</p>
          )}
          {reviewError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {reviewError}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRequestDetailsOpen(false)}>Close</Button>
            {activeRequest?.status === 'pending' && (
              <>
                <Button variant="destructive" onClick={() => reviewIssueRequestAsync('rejected')}>Decline</Button>
                <Button onClick={() => reviewIssueRequestAsync('approved')}>Approve</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* EnrolWorkforceForm */}
      {enrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={enrollWorkforceOpen}
          onEnroll={() => { refreshWorkforce(); setEnrollWorkforceOpen(false); }}
          onClose={() => setEnrollWorkforceOpen(false)}
        />
      )}

      {/* Requests Panel */}
      {requestsPanelOpen && (
        <>
          <div className="fixed inset-0 z-[75] bg-black/20" onClick={() => setRequestsPanelOpen(false)} />
          <aside className="fixed right-2 top-[64px] z-[80] h-[calc(100vh-72px)] w-full max-w-[390px] rounded-2xl border border-soft-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-midnight-ink">Notifications</h3>
                  <p className="text-xs text-cool-gray">Issue requests for products</p>
                </div>
                <button onClick={() => setRequestsPanelOpen(false)} className="rounded-md p-1 text-cool-gray hover:bg-[#F3F4F6] hover:text-midnight-ink">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sortedIssueRequests.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-cool-gray">No requests yet.</div>
                ) : (
                  <div className="divide-y divide-soft-border">
                    {sortedIssueRequests.map((req, idx) => {
                      const statusClass = req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
                      const displayName = req.item_name || req.productName || 'Product';
                      const displayTo = req.issued_to || req.issuedTo || '-';
                      return (
                        <button key={req.id ?? idx} onClick={() => openRequestDetails(req.id)} className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-trust-blue">
                              {String(displayName).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-midnight-ink">
                                <span className="font-semibold">{displayTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {displayName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{req.status}</span>
                                <span className="text-[11px] text-cool-gray">{relativeTime(req.requested_at || req.requestedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="flex-1 pt-16 px-3 md:px-4 pb-16">
        <div className="mb-4 flex justify-end">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <MasterNavigationDrawer inHeader />
              <h1 className="text-xl font-bold tracking-tight text-midnight-ink">PRODUCT INVENTORY</h1>
            </div>
            <GlobalSearchBar />
            <DateTimeStamp />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">

          <Button onClick={loadData} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8" disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={handlePrintTable} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print
          </Button>

          <SortPopover
            columns={[
              { id: 'masterSku', label: 'Master SKU' },
              { id: 'designerSku', label: 'Designer SKU' },
              { id: 'productName', label: 'Product Name' },
            ]}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onClear={() => { setSortField(''); setSortDir('asc'); }}
          />

          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Manage Columns
          </Button>

          <Button
            onClick={handleEditRows}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit Row
          </Button>

          {/* Bulk Upload */}
          <div>
            <input ref={bulkFileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleBulkFileChange} />
            <Button
              onClick={() => bulkFileRef.current?.click()}
              variant="outline"
              className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8"
              disabled={isBulkUploading}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isBulkUploading ? 'Uploading...' : 'Bulk Upload'}
            </Button>
          </div>

          <Button onClick={handleExport} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>

          <Button
            onClick={openReceivePopup}
            variant="outline"
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            Add Product
          </Button>

          <Button
            onClick={openIssuePopup}
            variant="outline"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            Issue Product
          </Button>

          <Button onClick={() => setRequestsPanelOpen((prev) => !prev)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Requests
            {pendingIssueRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white leading-none">
                {pendingIssueRequests.length}
              </span>
            )}
          </Button>

          <Button
            onClick={() => {
              if (selectedRows.size === 0) { alert('Please select at least one row to delete'); return; }
              setIsDeleteConfirmOpen(true);
            }}
            variant="outline"
            className="border-danger text-danger hover:bg-danger/10 rounded-full px-4 text-sm h-8"
            disabled={editingRowIds.size > 0}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        </div>

        {/* Filters */}
        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <MultiselectFilterPopover
              label="Unit"
              selectedValues={filterUnit}
              onSelectValues={(value) => { setFilterUnit(value); setCurrentPage(1); }}
              options={UNIT_OPTIONS}
              storageKey="inventory:product:unit"
            />
            <MultiselectFilterPopover
              label="Location"
              selectedValues={filterLocation}
              onSelectValues={(value) => { setFilterLocation(value); setCurrentPage(1); }}
              options={locationOptions}
              storageKey="inventory:product:location"
            />
            <MultiselectFilterPopover
              label="Stock State"
              selectedValues={filterStockState}
              onSelectValues={(value) => { setFilterStockState(value); setCurrentPage(1); }}
              options={['In Stock', 'Out of Stock', 'WIP']}
              storageKey="inventory:product:stock-state"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterUnit([]);
                setFilterLocation([]);
                setFilterStockState([]);
                setCurrentPage(1);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Status messages */}
        {bulkUploadStatus && (
          <div className={`mb-3 rounded-md border px-4 py-2 text-sm ${bulkUploadStatus.success ? 'border-green-300 bg-success/10 text-success-dark' : 'border-danger/30 bg-danger/10 text-danger-dark'}`}>
            {bulkUploadStatus.message}
          </div>
        )}

        {isLoading && (
          <div className="mb-4 rounded-md border border-trust-blue/30 bg-trust-blue/10 px-4 py-2 text-sm text-deep-blue">Loading product inventory...</div>
        )}

        {!isLoading && fetchError && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger-dark flex items-center justify-between gap-3">
            <span>{fetchError}</span>
            <Button onClick={loadData} variant="outline" className="h-8 px-3 border-danger/40 text-danger-dark hover:bg-danger/10">Retry</Button>
          </div>
        )}

        {/* Table */}
        <div className="border border-soft-border rounded-lg bg-white overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-[#dbeafe]">
                <tr className="text-midnight-ink font-bold border-b-2 border-soft-border">
                  <th className="border border-soft-border p-2 w-8 sticky left-0 bg-[#dbeafe] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                      className="cursor-pointer"
                      disabled={filteredData.length === 0 || editingRowIds.size > 0}
                    />
                  </th>
                  {visibleColumns.has('image') && <th className="border border-soft-border p-2 min-w-[80px] bg-[#dbeafe]">IMAGE</th>}
                  {visibleColumns.has('masterSku') && <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">MASTER SKU</th>}
                  {visibleColumns.has('designerSku') && <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">DESIGNER SKU</th>}
                  {visibleColumns.has('finalSku') && <th className="border border-soft-border p-2 min-w-[140px] bg-[#dbeafe]">FINAL STOCK SKU</th>}
                  {visibleColumns.has('value') && <th className="border border-soft-border p-2 min-w-[90px] bg-[#dbeafe]">VALUE</th>}
                  {visibleColumns.has('unit') && <th className="border border-soft-border p-2 min-w-[70px] bg-[#dbeafe]">UNIT</th>}
                  {visibleColumns.has('location') && <th className="border border-soft-border p-2 min-w-[120px] bg-[#dbeafe]">LOCATION</th>}
                  {visibleColumns.has('wip') && <th className="border border-soft-border p-2 min-w-[80px] bg-[#dbeafe]">WIP</th>}
                  {visibleColumns.has('totalInDemand') && <th className="border border-soft-border p-2 min-w-[110px] bg-[#dbeafe]">TOTAL IN DEMAND</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={visibleTableColumnCount} className="border border-soft-border p-6 text-center text-cool-gray">
                      No product inventory found. Use Bulk Upload to add products.
                    </td>
                  </tr>
                )}
                {paginatedData.map((row) => (
                  <ProductRow
                    key={row.productId}
                    row={row}
                    isSelected={selectedRows.has(row.productId)}
                    isEditing={editingRowIds.size > 0 && selectedRows.has(row.productId)}
                    editBuffer={editBuffer}
                    visibleColumns={visibleColumns}
                    onToggleSelect={() => toggleRowSelection(row.productId)}
                    onUpdateBuffer={updateEditBuffer}
                    resolveImageUrl={resolveImageUrl}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Controls */}
        {editingRowIds.size > 0 && (
          <div className="mt-4 flex gap-2 items-center flex-wrap">
            <Button onClick={handleSaveEdit} className="bg-success hover:bg-success/90 text-white px-6" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancelEdit} variant="outline" className="border-red-600 text-danger hover:bg-danger/10 px-6" disabled={isSaving}>
              Cancel Edit
            </Button>
            {saveStatus && (
              <span className={`text-sm font-semibold ${saveStatus.success ? 'text-success' : 'text-danger'}`}>{saveStatus.message}</span>
            )}
          </div>
        )}

        {!editingRowIds.size && saveStatus && (
          <div className="mt-2">
            <span className={`text-sm font-semibold ${saveStatus.success ? 'text-success' : 'text-danger'}`}>{saveStatus.message}</span>
          </div>
        )}
        {deleteStatus && (
          <div className="mt-2">
            <span className={`text-sm font-semibold ${deleteStatus.success ? 'text-success' : 'text-danger'}`}>{deleteStatus.message}</span>
          </div>
        )}
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
            {[25, 50, 75, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{filteredData.length === 0 ? '0' : `${(safePage - 1) * rowsPerPage + 1}-${Math.min(safePage * rowsPerPage, filteredData.length)}`} of {filteredData.length}</span>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&lsaquo;</button>
          <span>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 border border-soft-border rounded disabled:opacity-40 hover:bg-cloud-gray">&rsaquo;</button>
        </div>
        <div className="flex gap-4">
          <span>Selected: {selectedRows.size}</span>
          {editingRowIds.size > 0 && <span className="text-trust-blue font-semibold">Editing {editingRowIds.size} item(s)</span>}
        </div>
        <LastUpdatedFooter timestamp={lastUpdated} username={currentUsername} compact />
      </div>
    </div>
  );
}

function ProductRow({ row, isSelected, isEditing, editBuffer, visibleColumns, onToggleSelect, onUpdateBuffer, resolveImageUrl }) {
  const subRows = row.subRows;
  const span = subRows.length || 1;
  const bgClass = isEditing ? 'bg-trust-blue/5' : 'hover:bg-cloud-gray';

  const renderSubCells = (sub) => {
    const buf = editBuffer[sub.id];
    const editing = isEditing && buf;
    return (
      <>
        {visibleColumns.has('finalSku') && <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input value={buf.finalSku} onChange={(e) => onUpdateBuffer(sub.id, 'finalSku', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.finalSku || '—'}</span>
          )}
        </td>}
        {visibleColumns.has('value') && <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input type="number" value={buf.value} onChange={(e) => onUpdateBuffer(sub.id, 'value', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.value}</span>
          )}
        </td>}
        {visibleColumns.has('unit') && <td className="border border-soft-border p-1.5">
          {editing ? (
            <select value={buf.unit} onChange={(e) => onUpdateBuffer(sub.id, 'unit', e.target.value)} className="border rounded px-1 py-1 text-sm h-8 w-full">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          ) : (
            <span className="px-1 text-sm">{sub.unit}</span>
          )}
        </td>}
        {visibleColumns.has('location') && <td className="border border-soft-border p-1.5">
          {editing ? (
            <Input value={buf.location} onChange={(e) => onUpdateBuffer(sub.id, 'location', e.target.value)} className="border-0 p-1 text-sm h-8" />
          ) : (
            <span className="px-1 text-sm">{sub.location || '—'}</span>
          )}
        </td>}
      </>
    );
  };

  const renderTotalInDemand = (sub) => {
    if (!visibleColumns.has('totalInDemand')) return null;
    const buf = editBuffer[sub.id];
    const editing = isEditing && buf;
    return (
      <td className="border border-soft-border p-1.5">
        {editing ? (
          <Input type="number" value={buf.totalInDemand} onChange={(e) => onUpdateBuffer(sub.id, 'totalInDemand', e.target.value)} className="border-0 p-1 text-sm h-8" />
        ) : (
          <span className="px-1 text-sm">{sub.totalInDemand}</span>
        )}
      </td>
    );
  };

  if (!subRows.length) {
    const noStockSpan = ['finalSku', 'value', 'unit', 'location'].filter((key) => visibleColumns.has(key)).length;
    return (
      <tr className="hover:bg-cloud-gray">
        <td className="border border-soft-border p-2 text-center sticky left-0 z-10 bg-white shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="cursor-pointer" />
        </td>
        {visibleColumns.has('image') && <td className="border border-soft-border p-1.5"><span className="text-xs text-cool-gray">—</span></td>}
        {visibleColumns.has('masterSku') && <td className="border border-soft-border p-1.5">
          <Link href={`/frontend?sku=${encodeURIComponent(row.masterSku)}`} className="text-deep-blue underline hover:text-deep-blue text-sm">{row.masterSku}</Link>
        </td>}
        {visibleColumns.has('designerSku') && <td className="border border-soft-border p-1.5 text-sm">{row.designerSku || '—'}</td>}
        {noStockSpan > 0 && <td colSpan={noStockSpan} className="border border-soft-border p-1.5 text-sm text-cool-gray">No stock entries</td>}
        {visibleColumns.has('wip') && <td className="border border-soft-border p-1.5 text-center text-sm">{row.wip || 0}</td>}
        {visibleColumns.has('totalInDemand') && <td className="border border-soft-border p-1.5 text-sm">—</td>}
      </tr>
    );
  }

  return (
    <>
      {subRows.map((sub, idx) => (
        <tr key={sub.id} className={`border-b border-soft-border ${bgClass}`}>
          {/* Shared cells — only rendered once, spanning all sub-rows */}
          {idx === 0 && (
            <>
              <td rowSpan={span} className={`border border-soft-border p-2 text-center align-middle sticky left-0 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${isEditing ? 'bg-[#eff6ff]' : 'bg-white'}`}>
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="cursor-pointer" disabled={isEditing} />
              </td>
              {visibleColumns.has('image') && <td rowSpan={span} className={`border border-soft-border p-1.5 align-middle ${isEditing ? 'bg-trust-blue/5' : ''}`}>
                {row.images.length > 0 ? (
                  <img
                    src={resolveImageUrl(row.images[0])}
                    alt="product"
                    className="w-10 h-10 object-cover rounded border border-soft-border"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-xs text-cool-gray">—</span>
                )}
              </td>}
              {visibleColumns.has('masterSku') && <td rowSpan={span} className={`border border-soft-border p-1.5 align-middle ${isEditing ? 'bg-trust-blue/5' : ''}`}>
                <Link href={`/frontend?sku=${encodeURIComponent(row.masterSku)}`} className="text-deep-blue underline hover:text-deep-blue text-sm">
                  {row.masterSku}
                </Link>
              </td>}
              {visibleColumns.has('designerSku') && <td rowSpan={span} className={`border border-soft-border p-1.5 text-sm align-middle ${isEditing ? 'bg-trust-blue/5' : ''}`}>
                {row.designerSku || '—'}
              </td>}
            </>
          )}
          {/* Per-sub-row cells: finalSku | value | unit | location */}
          {renderSubCells(sub)}
          {/* WIP — spans all sub-rows, rendered only on first */}
          {idx === 0 && visibleColumns.has('wip') && (
            <td rowSpan={span} className={`border border-soft-border p-1.5 text-center align-middle text-sm font-medium ${isEditing ? 'bg-trust-blue/5' : ''}`}>
              {row.wip || 0}
            </td>
          )}
          {/* Total In Demand — per sub-row */}
          {renderTotalInDemand(sub)}
        </tr>
      ))}
    </>
  );
}

