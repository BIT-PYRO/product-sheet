'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Printer, RefreshCw, Trash2, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';
import MultiselectFilterPopover from '@/components/multiselect-filter-popover';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';

// ISSUE_REQUESTS_KEY removed — now using API
const STONE_MANAGE_COLUMNS = [
  { id: 'stone_type', label: 'Type' },
  { id: 'species', label: 'Species' },
  { id: 'variety', label: 'Variety' },
  { id: 'color', label: 'Color' },
  { id: 'quality', label: 'Quality' },
  { id: 'wax_setting', label: 'Wax Setting' },
  { id: 'cut', label: 'Cut' },
  { id: 'shape', label: 'Shape' },
  { id: 'length', label: 'Length' },
  { id: 'width', label: 'Width' },
  { id: 'height', label: 'Height' },
  { id: 'qty', label: 'Qty' },
  { id: 'weight_cts', label: 'Weight (cts)' },
  { id: 'averageWeightStock', label: 'Avg Weight of Stock' },
  { id: 'dos', label: "Do's" },
  { id: 'donts', label: "Don'ts" },
  { id: 'actions', label: 'Actions' },
];

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function emptyStone() {
  return {
    stone_type: '',
    species: '',
    variety: '',
    color: '',
    quality: '',
    wax_setting: false,
    cut: '',
    dos: '',
    donts: '',
    shape: '',
    length: '',
    width: '',
    height: '',
  };
}

function calcAmount(price, qty, weight, priceBy) {
  const p = parseFloat(price) || 0;
  const q = parseFloat(qty) || 0;
  const w = parseFloat(weight) || 0;
  const val = priceBy === 'weight' ? p * w : p * q;
  return val > 0 ? val.toFixed(2) : '';
}

// â”€â”€â”€ tiny form-field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, value, onChange, textarea = false, type = 'text', disabled = false }) {
  const base =
    'w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink placeholder:text-cool-gray focus:outline-none focus:ring-1 focus:ring-trust-blue';
  const cls = `${base} ${disabled ? 'bg-[#F8F9FA] cursor-not-allowed text-cool-gray' : 'bg-white'}`;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
      {textarea ? (
        <textarea
          className={`${cls} resize-none`}
          rows={2}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          className={cls}
          type={type}
          min={type === 'number' ? 0 : undefined}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ inline cell input (for the stock popup table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CellInput({ value, onChange, type = 'text', disabled = false, placeholder = '' }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`w-full min-w-[80px] rounded border px-2 py-1 text-xs text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue ${
        disabled
          ? 'border-transparent bg-[#F8F9FA] text-cool-gray cursor-default'
          : 'border-soft-border bg-white'
      }`}
    />
  );
}

// â”€â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function StoneInventoryPage() {
  const { canView, canEdit, canCreate, canExport, canAmount, loading: permsLoading } = useSheetPermissions('inventory');
  const [stones, setStones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Row selection (main table checkboxes)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState([]);
  const [filterSpecies, setFilterSpecies] = useState([]);
  const [filterShape, setFilterShape] = useState([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(new Set(STONE_MANAGE_COLUMNS.map((column) => column.id)));

  // Add New Stone dialog
  const [addStoneOpen, setAddStoneOpen] = useState(false);
  const [stoneForm, setStoneForm] = useState(emptyStone());
  const [savingStone, setSavingStone] = useState(false);

  // Add Stone Stock dialog
  const [addStockOpen, setAddStockOpen] = useState(false);
  // stockRows: [{ stoneId, qty_added, weight_cts_added, price, price_by, amount, remark }]
  const [stockRows, setStockRows] = useState([]);
  const [savingStock, setSavingStock] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Issue Job workflow
  const [issueJobOpen, setIssueJobOpen] = useState(false);
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [issueRequests, setIssueRequests] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [issueForm, setIssueForm] = useState({
    stoneId: '',
    quantity: '',
    issuedTo: '',
    issuedBy: '',
    reason: '',
    cut: '',
    shape: '',
    length: '',
    width: '',
    height: '',
  });

  // Receive Stone workflow
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ stoneId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new', cut: '', shape: '', length: '', width: '', height: '' });
  const [workforceMembers, setWorkforceMembers] = useState([]);
  const [enrollWorkforceOpen, setEnrollWorkforceOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsernameRaw, setCurrentUsernameRaw] = useState('');

  // â”€â”€ load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadStones = useCallback(async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/stone-inventory', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
      setStones(items);
    } catch (err) {
      setStatusMsg(`Failed to load stones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStones();
  }, [loadStones]);

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

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
        setCurrentUserName(fullName);
        setCurrentUserEmail(u.email || '');
        setCurrentUsernameRaw(u.username || '');
      })
      .catch(() => {});
  }, []);

  const loadIssueRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/issue-requests?inventory_type=stone&page_size=200');
      if (!res.ok) return;
      const data = await res.json();
      const results = data?.data?.results ?? data?.data ?? data?.results ?? [];
      setIssueRequests(Array.isArray(results) ? results : []);
    } catch {}
  }, []);

  useEffect(() => { loadIssueRequests(); }, [loadIssueRequests]);

  // â”€â”€ row selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const filteredStones = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return stones.filter((stone) => {
      const matchesSearch = !search || [stone.stone_type, stone.species, stone.variety, stone.color].some((v) => String(v || '').toLowerCase().includes(search));
      const matchesType = filterType.length === 0 || filterType.some((type) => String(stone.stone_type || '').toLowerCase().includes(String(type || '').toLowerCase()));
      const matchesSpecies = filterSpecies.length === 0 || filterSpecies.some((species) => String(stone.species || '').toLowerCase().includes(String(species || '').toLowerCase()));
      const matchesShape = filterShape.length === 0 || filterShape.some((shape) => String(stone.shape || '').toLowerCase().includes(String(shape || '').toLowerCase()));
      return matchesSearch && matchesType && matchesSpecies && matchesShape;
    });
  }, [
    stones,
    searchTerm,
    filterType,
    filterSpecies,
    filterShape,
  ]);

  const typeOptions = useMemo(() => Array.from(new Set(stones.map((stone) => String(stone.stone_type || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [stones]);
  const speciesOptions = useMemo(() => Array.from(new Set(stones.map((stone) => String(stone.species || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [stones]);
  const shapeOptions = useMemo(() => Array.from(new Set(stones.map((stone) => String(stone.shape || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [stones]);

  const allSelected = filteredStones.length > 0 && filteredStones.every((stone) => selectedIds.has(stone.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const visibleTableColumnCount = 1 + STONE_MANAGE_COLUMNS.filter((column) => visibleColumns.has(column.id)).length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStones.forEach((stone) => next.delete(stone.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStones.forEach((stone) => next.add(stone.id));
        return next;
      });
    }
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // â”€â”€ open stock popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openStockPopup() {
    const selected = stones.filter((s) => selectedIds.has(s.id));
    setStockRows(
      selected.map((s) => ({
        stoneId: s.id,
        // pre-filled editable stone properties
        cut: s.cut || '',
        shape: s.shape || '',
        length: s.length || '',
        width: s.width || '',
        height: s.height || '',
        // transaction fields
        qty_added: '',
        weight_cts_added: '',
        price: '',
        price_by: 'pcs',
        amount: '',
        remark: '',
      }))
    );
    setAddStockOpen(true);
  }

  // â”€â”€ update a stock row field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function updateStockRow(stoneId, key, value) {
    setStockRows((prev) =>
      prev.map((row) => {
        if (row.stoneId !== stoneId) return row;
        const updated = { ...row, [key]: value };
        updated.amount = calcAmount(
          updated.price,
          updated.qty_added,
          updated.weight_cts_added,
          updated.price_by
        );
        return updated;
      })
    );
  }

  // selected stone objects for the popup (preserving order)
  const selectedStones = useMemo(
    () => stones.filter((s) => selectedIds.has(s.id)),
    [stones, selectedIds]
  );

  const pendingIssueRequests = useMemo(
    () => issueRequests.filter((r) => r.status === 'pending'),
    [issueRequests]
  );

  const sortedIssueRequests = useMemo(
    () => [...issueRequests].sort((a, b) => new Date(b.requested_at || b.requestedAt) - new Date(a.requested_at || a.requestedAt)),
    [issueRequests]
  );

  const activeRequest = useMemo(
    () => issueRequests.find((r) => r.id === activeRequestId) || null,
    [issueRequests, activeRequestId]
  );

  function stoneName(stone) {
    if (!stone) return 'Stone';
    return [stone.stone_type, stone.species, stone.variety].filter(Boolean).join(' / ') || `Stone #${stone.id}`;
  }

  function openIssueJobPopup() {
    const lEmail = currentUserEmail.toLowerCase();
    const lName = currentUserName.toLowerCase();
    const lUser = currentUsernameRaw.toLowerCase();
    const matchedMember = workforceMembers.find((w) => lEmail && w.email && w.email.toLowerCase() === lEmail)
      || workforceMembers.find((w) => lName && w.full_name && w.full_name.toLowerCase() === lName)
      || workforceMembers.find((w) => lUser && w.full_name && w.full_name.toLowerCase().startsWith(lUser));
    const issuedBy = matchedMember?.full_name || currentUserName;
    setIssueForm({
      stoneId: '',
      quantity: '',
      issuedTo: '',
      issuedBy,
      reason: '',
      cut: '',
      shape: '',
      length: '',
      width: '',
      height: '',
    });
    setIssueJobOpen(true);
  }

  function openReceivePopup() {
    setReceiveForm({ stoneId: '', quantity: '', employeeVendorName: '', referenceId: '', price: '', usage: 'new', cut: '', shape: '', length: '', width: '', height: '' });
    setReceiveOpen(true);
  }

  function createReceiveRequest() {
    const stoneIdNum = Number(receiveForm.stoneId);
    const quantityNum = Number(receiveForm.quantity);
    const employeeVendorName = receiveForm.employeeVendorName.trim();
    const referenceId = receiveForm.referenceId.trim();
    const price = receiveForm.price.trim();
    if (!stoneIdNum) { setStatusMsg('Please select a stone.'); return; }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) { setStatusMsg('Please enter a valid quantity greater than 0.'); return; }
    if (!employeeVendorName) { setStatusMsg('Please enter employee/vendor name.'); return; }
    if (!referenceId) { setStatusMsg('Please enter a reference ID.'); return; }
    if (!price) { setStatusMsg('Please enter a price.'); return; }
    const stone = stones.find((s) => s.id === stoneIdNum);
    if (receiveForm.usage === 'used') {
      setStones((prev) => prev.map((s) => s.id === stoneIdNum ? { ...s, used_qty: Number(s.used_qty || 0) + quantityNum } : s));
    } else {
      setStones((prev) => prev.map((s) => s.id === stoneIdNum ? { ...s, qty: Number(s.qty || 0) + quantityNum } : s));
    }
    setReceiveOpen(false);
    setStatusMsg(`Received ${quantityNum} of ${stone?.species || 'Stone #' + stoneIdNum} from ${employeeVendorName}.`);
  }

  async function createIssueRequest() {
    const stoneIdNum = Number(issueForm.stoneId);
    const quantityNum = Number(issueForm.quantity);
    const issuedTo = issueForm.issuedTo.trim();
    const issuedBy = issueForm.issuedBy.trim();
    const reason = issueForm.reason.trim();

    if (!stoneIdNum) {
      setStatusMsg('Please select a stone for the request.');
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setStatusMsg('Please enter a valid issue quantity greater than 0.');
      return;
    }
    if (!issuedTo) {
      setStatusMsg('Please enter who the stone is issued to.');
      return;
    }
    if (!issuedBy) {
      setStatusMsg('Please enter who issued the stone.');
      return;
    }
    if (!reason) {
      setStatusMsg('Please enter reason of issue.');
      return;
    }

    const stone = stones.find((s) => s.id === stoneIdNum);
    try {
      const res = await fetch('/api/issue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_type: 'stone',
          item_id: stoneIdNum,
          item_name: stoneName(stone),
          quantity: quantityNum,
          issued_to: issuedTo,
          issued_by: issuedBy,
          reason,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatusMsg(d?.message || `Error ${res.status}`); return; }
      await loadIssueRequests();
      setIssueJobOpen(false);
      setStatusMsg('Issue request created.');
    } catch (err) { setStatusMsg(err.message || 'Failed to create request'); }
  }

  function openRequestDetails(requestId) {
    setActiveRequestId(requestId);
    setRequestDetailsOpen(true);
  }

  async function reviewIssueRequest(nextStatus) {
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
      await loadStones();
      setRequestDetailsOpen(false);
      await loadIssueRequests();
      setStatusMsg(`Request ${nextStatus}.`);
    } catch (err) { setReviewError(err.message || 'Review failed'); }
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    return `${day}d`;
  }

  function printIssueVoucher(request) {
    if (!request) return;
    const opened = window.open('', '_blank', 'width=900,height=700');
    if (!opened) {
      setStatusMsg('Popup blocked. Please allow popups to print voucher.');
      return;
    }
    const requestedAt = request.requestedAt ? new Date(request.requestedAt).toLocaleString() : '-';
    const reviewedAt = request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-';
    const html = `
      <html>
        <head>
          <title>Stone Issue Voucher</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 16px; color: #6B7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #F8F9FA; width: 220px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #DCFCE7; color: #166534; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Stone Issue Voucher</h1>
          <p>Generated from Stone Inventory requests panel</p>
          <table>
            <tr><th>Request ID</th><td>${request.id}</td></tr>
            <tr><th>Stone Name</th><td>${request.stoneName}</td></tr>
            <tr><th>Quantity</th><td>${request.quantity}</td></tr>
            <tr><th>Issued To</th><td>${request.issuedTo}</td></tr>
            <tr><th>Issued By</th><td>${request.issuedBy || '-'}</td></tr>
            <tr><th>Reason of Issue</th><td>${request.reason || '-'}</td></tr>
            <tr><th>Cut</th><td>${request.cut || '-'}</td></tr>
            <tr><th>Shape</th><td>${request.shape || '-'}</td></tr>
            <tr><th>Length</th><td>${request.length || '-'}</td></tr>
            <tr><th>Width</th><td>${request.width || '-'}</td></tr>
            <tr><th>Height</th><td>${request.height || '-'}</td></tr>
            <tr><th>Status</th><td><span class="badge">${String(request.status || '').toUpperCase()}</span></td></tr>
            <tr><th>Requested At</th><td>${requestedAt}</td></tr>
            <tr><th>Reviewed At</th><td>${reviewedAt}</td></tr>
          </table>
        </body>
      </html>
    `;
    opened.document.open();
    opened.document.write(html);
    opened.document.close();
    opened.focus();
    opened.print();
  }

  function handlePrintTable() {
    window.print();
  }

  function handleEditRows() {
    openStockPopup();
  }

  function toggleColumnSelection(columnId) {
    const next = new Set(selectedColumnsForAction);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    setSelectedColumnsForAction(next);
  }

  function toggleSelectAllColumns() {
    if (selectedColumnsForAction.size === STONE_MANAGE_COLUMNS.length) {
      setSelectedColumnsForAction(new Set());
    } else {
      setSelectedColumnsForAction(new Set(STONE_MANAGE_COLUMNS.map((column) => column.id)));
    }
  }

  function handleHideColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.delete(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  function handleShowColumns() {
    const next = new Set(visibleColumns);
    selectedColumnsForAction.forEach((columnId) => next.add(columnId));
    setVisibleColumns(next);
    setSelectedColumnsForAction(new Set());
    setIsManageColumnsOpen(false);
  }

  // â”€â”€ add new stone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function stoneField(key) {
    return (val) => setStoneForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSaveStone() {
    setSavingStone(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/stone-inventory', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stoneForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      setStatusMsg('Stone added successfully.');
      setAddStoneOpen(false);
      setStoneForm(emptyStone());
      await loadStones();
    } catch (err) {
      setStatusMsg(`Error adding stone: ${err.message}`);
    } finally {
      setSavingStone(false);
    }
  }

  // â”€â”€ save stock entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleSaveStock() {
    const toSave = stockRows.filter(
      (r) => String(r.qty_added).trim() !== '' || String(r.weight_cts_added).trim() !== ''
    );
    if (toSave.length === 0) {
      setStatusMsg('Enter qty or weight for at least one stone.');
      return;
    }
    setSavingStock(true);
    setStatusMsg('');
    try {
      for (const row of toSave) {
        // 1. PATCH the stone item with the editable stone properties
        const stoneUpdate = {
          cut: row.cut,
          shape: row.shape,
          length: row.length,
          width: row.width,
          height: row.height,
        };
        const patchRes = await fetch(`/api/stone-inventory/${row.stoneId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stoneUpdate),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          throw new Error(JSON.stringify(err));
        }

        // 2. POST the stock transaction
        const payload = {
          stone: row.stoneId,
          qty_added: row.qty_added || '0',
          weight_cts_added: row.weight_cts_added || '0',
          price: row.price || '0',
          price_by: row.price_by,
          amount: row.amount || '0',
          remark: row.remark,
        };
        const res = await fetch('/api/stone-transactions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(JSON.stringify(err));
        }
      }
      setStatusMsg(`Stock updated for ${toSave.length} stone(s).`);
      setAddStockOpen(false);
      setSelectedIds(new Set());
      await loadStones();
    } catch (err) {
      setStatusMsg(`Error saving stock: ${err.message}`);
    } finally {
      setSavingStock(false);
    }
  }

  // â”€â”€ delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stone-inventory/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setStatusMsg('Stone deleted.');
      setDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      await loadStones();
    } catch (err) {
      setStatusMsg(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  // â”€â”€ main table columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const COLS = [
    { key: 'stone_type', label: 'Type' },
    { key: 'species', label: 'Species' },
    { key: 'variety', label: 'Variety' },
    { key: 'color', label: 'Color' },
    { key: 'quality', label: 'Quality' },
    { key: 'wax_setting', label: 'Wax Setting', render: (v) => (v ? 'Yes' : 'No') },
    { key: 'cut', label: 'Cut' },
    { key: 'shape', label: 'Shape' },
    { key: 'length', label: 'Length' },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'qty', label: 'Qty' },
    { key: 'used_qty', label: 'Used Qty' },
    { key: 'weight_cts', label: 'Weight (cts)' },
    { key: 'averageWeightStock', label: 'Avg Weight of Stock' },
    { key: 'dos', label: "Do's" },
    { key: 'donts', label: "Don'ts" },
  ];

  // locked fields = same as Add New Stone
  const LOCKED_KEYS = [
    { key: 'stone_type', label: 'Type', minW: 'min-w-[80px]' },
    { key: 'species', label: 'Species', minW: 'min-w-[80px]' },
    { key: 'variety', label: 'Variety', minW: 'min-w-[80px]' },
    { key: 'color', label: 'Color', minW: 'min-w-[70px]' },
    { key: 'quality', label: 'Quality', minW: 'min-w-[70px]' },
    { key: 'wax_setting', label: 'Wax Setting', minW: 'min-w-[80px]', render: (v) => (v ? 'Yes' : 'No') },
    { key: 'dos', label: "Do's", minW: 'min-w-[80px]' },
    { key: 'donts', label: "Don'ts", minW: 'min-w-[80px]' },
  ];

  // editable stone-property fields in the stock popup
  const EDITABLE_STONE_KEYS = [
    { key: 'cut', label: 'Cut', minW: 'min-w-[60px]' },
    { key: 'shape', label: 'Shape', minW: 'min-w-[70px]' },
    { key: 'length', label: 'Length', minW: 'min-w-[60px]' },
    { key: 'width', label: 'Width', minW: 'min-w-[60px]' },
    { key: 'height', label: 'Height', minW: 'min-w-[60px]' },
  ];

  // â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;
  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* â”€â”€ header â”€â”€ */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">STONE INVENTORY</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {/* toolbar */}
        <div className="mb-4 flex justify-end">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 md:gap-3 justify-end items-center">
          <Button onClick={loadStones} variant="outline" disabled={loading} className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handlePrintTable} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            <Printer size={14} className="mr-1.5" />
            Print
          </Button>
          <Button onClick={() => setIsManageColumnsOpen(true)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Manage Columns
          </Button>
          <Button onClick={() => { setStoneForm(emptyStone()); setAddStoneOpen(true); }} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Plus size={14} className="mr-1.5" />
            New Stone
          </Button>
          <Button onClick={handleEditRows} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
            <Pencil size={14} className="mr-1.5" />
            Edit Row
          </Button>
          {canEdit && (
            <Button onClick={openReceivePopup} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full px-4 text-sm h-8">
              Add Stone
            </Button>
          )}
          {canEdit && (
            <Button onClick={openIssueJobPopup} variant="outline" className="border-trust-blue text-trust-blue hover:bg-trust-blue/10 rounded-full px-4 text-sm h-8">
              Issue Stone
            </Button>
          )}
          <Button onClick={() => setRequestsPanelOpen((prev) => !prev)} variant="outline" className="border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8">
            Requests
            {pendingIssueRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white leading-none">
                {pendingIssueRequests.length}
              </span>
            )}
          </Button>
        </div>

        {/* â”€â”€ status â”€â”€ */}
        {statusMsg && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-soft-border bg-white px-4 py-2 text-sm text-midnight-ink shadow-sm">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')}>
              <X size={14} className="text-cool-gray hover:text-midnight-ink" />
            </button>
          </div>
        )}

        <section className="border border-soft-border rounded-lg mb-4 bg-[#dbeafe] p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="h-8 text-sm w-36 bg-white rounded-md border border-trust-blue/40 px-3"
            />
            <MultiselectFilterPopover
              label="Type"
              selectedValues={filterType}
              onSelectValues={setFilterType}
              options={typeOptions}
              storageKey="inventory:stone:type"
            />
            <MultiselectFilterPopover
              label="Species"
              selectedValues={filterSpecies}
              onSelectValues={setFilterSpecies}
              options={speciesOptions}
              storageKey="inventory:stone:species"
            />
            <MultiselectFilterPopover
              label="Shape"
              selectedValues={filterShape}
              onSelectValues={setFilterShape}
              options={shapeOptions}
              storageKey="inventory:stone:shape"
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterType([]);
                setFilterSpecies([]);
                setFilterShape([]);
              }}
              className="h-8 px-3 text-sm border rounded bg-trust-blue text-white border-trust-blue font-medium"
            >
              Clear
            </button>
          </div>
        </section>

        {/* â”€â”€ selection hint â”€â”€ */}
        {selectedIds.size > 0 && (
          <p className="mb-2 text-xs text-trust-blue">
            {selectedIds.size} stone{selectedIds.size !== 1 ? 's' : ''} selected â€” click &quot;Add Stone Stock&quot; to update stock.
          </p>
        )}

        {/* â”€â”€ main table â”€â”€ */}
        <div className="overflow-x-auto rounded-xl border border-soft-border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-soft-border bg-[#dbeafe]">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                </th>
                {COLS.filter((c) => visibleColumns.has(c.key)).map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray"
                  >
                    {c.label}
                  </th>
                ))}
                {visibleColumns.has('actions') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cool-gray">
                  Actions
                </th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={visibleTableColumnCount} className="px-4 py-6 text-center text-cool-gray">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filteredStones.length === 0 && (
                <tr>
                  <td colSpan={visibleTableColumnCount} className="px-4 py-6 text-center text-cool-gray">
                    No stones found. Add one using the button above.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredStones.map((stone) => {
                  const isSelected = selectedIds.has(stone.id);
                  return (
                    <tr
                      key={stone.id}
                      className={`border-b border-soft-border last:border-0 transition ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(stone.id)}
                          className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                        />
                      </td>
                      {COLS.filter((c) => visibleColumns.has(c.key)).map((c) => (
                        <td key={c.key} className="whitespace-nowrap px-4 py-2.5 text-midnight-ink">
                          {c.render ? c.render(stone[c.key]) : (stone[c.key] ?? 'â€”')}
                        </td>
                      ))}
                      {visibleColumns.has('actions') && <td className="px-4 py-2.5">
                        <button
                          onClick={() => setDeleteId(stone.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete stone"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft-border mb-3">
              <div className="flex items-center gap-3 flex-1">
                <input
                  id="select-all-stone-columns"
                  type="checkbox"
                  checked={selectedColumnsForAction.size === STONE_MANAGE_COLUMNS.length && STONE_MANAGE_COLUMNS.length > 0}
                  onChange={toggleSelectAllColumns}
                  className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                />
                <label htmlFor="select-all-stone-columns" className="text-sm font-semibold cursor-pointer">Select All</label>
              </div>
            </div>
            {STONE_MANAGE_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    id={`stone-column-${column.id}`}
                    type="checkbox"
                    checked={selectedColumnsForAction.has(column.id)}
                    onChange={() => toggleColumnSelection(column.id)}
                    className="h-4 w-4 cursor-pointer rounded border-soft-border accent-trust-blue"
                  />
                  <label htmlFor={`stone-column-${column.id}`} className="text-sm cursor-pointer">{column.label}</label>
                </div>
                <div className="text-sm font-semibold px-2 py-1 rounded">
                  {!visibleColumns.has(column.id)
                    ? <span className="bg-danger/10 text-danger-dark px-2 py-1 rounded-full text-sm">Hidden</span>
                    : <span className="bg-success/10 text-success-dark px-2 py-1 rounded-full text-sm">Visible</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={handleHideColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-danger border-danger/40 hover:bg-danger/10">Hide</Button>
            <Button onClick={handleShowColumns} disabled={selectedColumnsForAction.size === 0} variant="outline" className="text-success border-green-300 hover:bg-success/10">Show</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Add New Stone dialog
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={addStoneOpen} onOpenChange={setAddStoneOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add New Stone</DialogTitle>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Type" value={stoneForm.stone_type} onChange={stoneField('stone_type')} />
            <Field label="Species" value={stoneForm.species} onChange={stoneField('species')} />
            <Field label="Variety" value={stoneForm.variety} onChange={stoneField('variety')} />
            <Field label="Color" value={stoneForm.color} onChange={stoneField('color')} />
            <Field label="Quality" value={stoneForm.quality} onChange={stoneField('quality')} />

            {/* Wax Setting toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Wax Setting</label>
              <div className="flex items-center gap-3 pt-1">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStoneForm((prev) => ({ ...prev, wax_setting: opt === 'Yes' }))}
                    className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${
                      stoneForm.wax_setting === (opt === 'Yes')
                        ? 'border-trust-blue bg-trust-blue text-white'
                        : 'border-soft-border bg-white text-midnight-ink hover:border-trust-blue'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <Field label="Do's" value={stoneForm.dos} onChange={stoneField('dos')} textarea />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <Field label="Don'ts" value={stoneForm.donts} onChange={stoneField('donts')} textarea />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddStoneOpen(false)} disabled={savingStone}>
              Cancel
            </Button>
            <Button onClick={handleSaveStone} disabled={savingStone}>
              {savingStone ? 'Saving...' : 'Save Stone'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {requestsPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-[75] bg-black/20"
            onClick={() => setRequestsPanelOpen(false)}
          />
          <aside className="fixed right-2 top-[64px] z-[80] h-[calc(100vh-72px)] w-full max-w-[390px] rounded-2xl border border-soft-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-midnight-ink">Notifications</h3>
                  <p className="text-xs text-cool-gray">Issue requests for stones</p>
                </div>
                <button
                  onClick={() => setRequestsPanelOpen(false)}
                  className="rounded-md p-1 text-cool-gray hover:bg-[#F3F4F6] hover:text-midnight-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {sortedIssueRequests.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-cool-gray">No requests yet.</div>
                ) : (
                  <div className="divide-y divide-soft-border">
                    {sortedIssueRequests.map((req, idx) => {
                      const statusClass =
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800';
                      return (
                        <button
                          key={req.id ?? idx}
                          onClick={() => openRequestDetails(req.id)}
                          className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F9FAFB]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-trust-blue">
                              {String(req.stoneName || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-midnight-ink">
                                <span className="font-semibold">{req.issuedTo}</span> requested <span className="font-semibold">{req.quantity}</span> of {req.stoneName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-cool-gray">
                                Cut: {req.cut || '-'} | Shape: {req.shape || '-'} | L/W/H: {req.length || '-'} / {req.width || '-'} / {req.height || '-'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-cool-gray">Reason: {req.reason || '-'}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>
                                  {req.status}
                                </span>
                                {req.status === 'approved' && canExport && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printIssueVoucher(req);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-soft-border px-2 py-0.5 text-[10px] font-semibold text-midnight-ink hover:border-trust-blue"
                                  >
                                    <Printer size={10} />
                                    Print
                                  </button>
                                )}
                                <span className="text-[11px] text-cool-gray">{relativeTime(req.requestedAt)}</span>
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Add Stone Stock dialog â€” table of selected stones
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-midnight-ink">
              Add Stone Stock
              <span className="ml-2 text-sm font-normal text-cool-gray">
                ({stockRows.length} stone{stockRows.length !== 1 ? 's' : ''} selected)
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* scrollable table body */}
          <div className="flex-1 overflow-auto mt-3 rounded-lg border border-soft-border">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                {/* â”€â”€ row 1: section spans â”€â”€ */}
                <tr className="bg-[#EEF2F7]">
                  <th
                    colSpan={LOCKED_KEYS.length}
                    className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide"
                  >
                    Pre-filled (locked)
                  </th>
                  <th
                    colSpan={EDITABLE_STONE_KEYS.length}
                    className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-midnight-ink uppercase tracking-wide bg-amber-50"
                  >
                    Editable
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Weight (cts)
                  </th>
                  {canAmount && (
                    <th
                      colSpan={2}
                      className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide"
                    >
                      Price by (check one)
                    </th>
                  )}
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                      Price
                    </th>
                  )}
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-[#0d7a3e] uppercase tracking-wide bg-green-50">
                      Amount
                    </th>
                  )}
                  <th className="border border-soft-border px-3 py-1.5 text-center text-[11px] font-semibold text-cool-gray uppercase tracking-wide">
                    Remark
                  </th>
                </tr>
                {/* â”€â”€ row 2: column labels â”€â”€ */}
                <tr className="bg-[#F8F9FA]">
                  {LOCKED_KEYS.map((c) => (
                    <th
                      key={c.key}
                      className={`border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray ${c.minW}`}
                    >
                      {c.label}
                    </th>
                  ))}
                  {EDITABLE_STONE_KEYS.map((c) => (
                    <th
                      key={c.key}
                      className={`border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-midnight-ink bg-amber-50 ${c.minW}`}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">
                    Qty
                  </th>
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[100px]">
                    Weight (cts)
                  </th>
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[50px]">
                      Pcs
                    </th>
                  )}
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[60px]">
                      Weight
                    </th>
                  )}
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[90px]">
                      Price
                    </th>
                  )}
                  {canAmount && (
                    <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0d7a3e] min-w-[90px] bg-green-50">
                      Amount
                    </th>
                  )}
                  <th className="border border-soft-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cool-gray min-w-[120px]">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row) => {
                  const stone = selectedStones.find((s) => s.id === row.stoneId);
                  if (!stone) return null;
                  return (
                    <tr key={row.stoneId} className="hover:bg-blue-50">
                      {/* locked pre-filled cells */}
                      {LOCKED_KEYS.map((c) => (
                        <td
                          key={c.key}
                          className="border border-soft-border px-3 py-1.5 text-cool-gray bg-[#F8F9FA] whitespace-nowrap"
                        >
                          {c.render ? c.render(stone[c.key]) : (stone[c.key] || 'â€”')}
                        </td>
                      ))}
                      {/* editable stone property cells */}
                      {EDITABLE_STONE_KEYS.map((c) => (
                        <td key={c.key} className="border border-soft-border px-2 py-1 bg-amber-50">
                          <CellInput
                            value={row[c.key]}
                            onChange={(v) => updateStockRow(row.stoneId, c.key, v)}
                          />
                        </td>
                      ))}
                      {/* qty */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.qty_added}
                          placeholder="0"
                          onChange={(v) => updateStockRow(row.stoneId, 'qty_added', v)}
                        />
                      </td>

                      {/* weight */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.weight_cts_added}
                          placeholder="0.0000"
                          onChange={(v) => updateStockRow(row.stoneId, 'weight_cts_added', v)}
                        />
                      </td>

                      {/* price by pcs radio */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1 text-center">
                          <input
                            type="radio"
                            name={`price_by_${row.stoneId}`}
                            checked={row.price_by === 'pcs'}
                            onChange={() => updateStockRow(row.stoneId, 'price_by', 'pcs')}
                            className="h-4 w-4 cursor-pointer accent-trust-blue"
                          />
                        </td>
                      )}

                      {/* price by weight radio */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1 text-center">
                          <input
                            type="radio"
                            name={`price_by_${row.stoneId}`}
                            checked={row.price_by === 'weight'}
                            onChange={() => updateStockRow(row.stoneId, 'price_by', 'weight')}
                            className="h-4 w-4 cursor-pointer accent-trust-blue"
                          />
                        </td>
                      )}

                      {/* price */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1">
                          <CellInput
                            type="number"
                            value={row.price}
                            placeholder="0.00"
                            onChange={(v) => updateStockRow(row.stoneId, 'price', v)}
                          />
                        </td>
                      )}

                      {/* amount (auto-calculated, read-only) */}
                      {canAmount && (
  <td className="border border-soft-border px-3 py-1.5 bg-green-50 font-semibold text-[#0d7a3e] whitespace-nowrap text-right">
                          {row.amount !== '' ? row.amount : 'â€”'}
                        </td>
                      )}

                      {/* remark */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          value={row.remark}
                          placeholder="optional"
                          onChange={(v) => updateStockRow(row.stoneId, 'remark', v)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="flex-shrink-0 mt-2 text-[11px] text-cool-gray italic">
            Amount = Price Ã— Qty (Pcs selected) or Price Ã— Weight (Weight selected). Auto-calculated.
          </p>

          <div className="flex-shrink-0 mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddStockOpen(false)} disabled={savingStock}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={savingStock}>
              {savingStock ? 'Saving...' : 'Save Stock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Delete confirmation dialog
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Delete Stone</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-cool-gray">
            This will permanently delete the stone and all its stock history. This action cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={issueJobOpen} onOpenChange={setIssueJobOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Stone</DialogTitle>
          </DialogHeader>

          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Name of Stone</label>
              <select
                value={issueForm.stoneId}
                onChange={(e) => {
                  const stoneId = e.target.value;
                  const selectedStone = selectedStones.find((stone) => String(stone.id) === stoneId);
                  setIssueForm((prev) => ({
                    ...prev,
                    stoneId,
                    cut: String(selectedStone?.cut || ''),
                    shape: String(selectedStone?.shape || ''),
                    length: String(selectedStone?.length || ''),
                    width: String(selectedStone?.width || ''),
                    height: String(selectedStone?.height || ''),
                  }));
                }}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select stone</option>
                {stones.map((stone) => (
                  <option key={stone.id} value={stone.id}>{stoneName(stone)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Quantity"
                type="number"
                value={issueForm.quantity}
                onChange={(value) => {
                  if (value === '') {
                    setIssueForm((prev) => ({ ...prev, quantity: '' }));
                    return;
                  }
                  const num = Number(value);
                  setIssueForm((prev) => ({ ...prev, quantity: String(Number.isFinite(num) ? Math.max(0, num) : 0) }));
                }}
              />

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

            <Field
              label="Reason of Issue"
              value={issueForm.reason}
              onChange={(value) => setIssueForm((prev) => ({ ...prev, reason: value }))}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field
                label="Cut"
                value={issueForm.cut}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, cut: value }))}
              />
              <Field
                label="Shape"
                value={issueForm.shape}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, shape: value }))}
              />
              <Field
                label="Length"
                value={issueForm.length}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, length: value }))}
              />
              <Field
                label="Width"
                value={issueForm.width}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, width: value }))}
              />
              <Field
                label="Height"
                value={issueForm.height}
                onChange={(value) => setIssueForm((prev) => ({ ...prev, height: value }))}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIssueJobOpen(false)}>Cancel</Button>
            <Button onClick={createIssueRequest}>Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add Stone</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">Stone</label>
              <select
                value={receiveForm.stoneId}
                onChange={(e) => setReceiveForm((prev) => ({ ...prev, stoneId: e.target.value }))}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select stone</option>
                {stones.map((s) => (
                  <option key={s.id} value={s.id}>{s.species || s.variety || `Stone #${s.id}`}</option>
                ))}
              </select>
              {receiveForm.stoneId && (() => {
                const _stone = stones.find((s) => s.id === Number(receiveForm.stoneId));
                const _stock = Number(_stone?.qty ?? 0);
                return (
                  <p className="text-xs text-cool-gray mt-0.5">
                    Current stock: <span className="font-semibold text-emerald-600">{_stock}</span>
                  </p>
                );
              })()}
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
            <div className="grid grid-cols-5 gap-2">
              {[['Cut', 'cut'], ['Shape', 'shape'], ['Length', 'length'], ['Width', 'width'], ['Height', 'height']].map(([label, key]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    value={receiveForm[key]}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-md border border-soft-border px-2 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={createReceiveRequest}>Receive</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDetailsOpen} onOpenChange={(open) => { setRequestDetailsOpen(open); if (!open) setReviewError(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Issue Request Details</DialogTitle>
          </DialogHeader>

          {activeRequest ? (
            <div className="mt-2 grid grid-cols-1 gap-3">
              <Field label="Name of Stone" value={activeRequest.item_name || activeRequest.stoneName || ''} disabled />
              <Field label="Quantity" value={String(activeRequest.quantity)} disabled />
              <Field label="Issued To" value={activeRequest.issued_to || activeRequest.issuedTo || '-'} disabled />
              <Field label="Issued By" value={activeRequest.issued_by || activeRequest.issuedBy || '-'} disabled />
              <Field label="Reason of Issue" value={activeRequest.reason || '-'} disabled />
              <Field label="Status" value={activeRequest.status.toUpperCase()} disabled />
              <Field
                label="Requested At"
                value={new Date(activeRequest.requested_at || activeRequest.requestedAt).toLocaleString()}
                disabled
              />
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
                <Button variant="destructive" onClick={() => reviewIssueRequest('rejected')}>Decline</Button>
                <Button onClick={() => reviewIssueRequest('approved')}>Approve</Button>
              </>
            )}
            {activeRequest?.status === 'approved' && canExport && (
              <Button variant="outline" onClick={() => printIssueVoucher(activeRequest)}>
                <Printer size={14} className="mr-2" />
                Print
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {enrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={enrollWorkforceOpen}
          onEnroll={() => { refreshWorkforce(); setEnrollWorkforceOpen(false); }}
          onClose={() => setEnrollWorkforceOpen(false)}
        />
      )}
    </main>
  );
}
