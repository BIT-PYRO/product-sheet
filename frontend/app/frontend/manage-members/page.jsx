'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Download, Search, Plus, Pencil, RotateCcw, Trash2, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';

/* ─── helpers ─────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

const AVATAR_COLORS = [
  'bg-[#2563EB]', 'bg-[#7C3AED]', 'bg-[#DB2777]',
  'bg-[#059669]', 'bg-[#D97706]', 'bg-[#0891B2]',
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* superuser = admin role OR Django is_superuser OR workforce designation is Chairman / CEO */
function isSuperUser(sessionUser, workforceRecord) {
  if (!sessionUser) return false;
  if (sessionUser.role === 'admin') return true;
  if (sessionUser.is_superuser) return true;
  const des = (workforceRecord?.designation || '').toLowerCase().trim();
  return des === 'chairman' || des === 'ceo';
}

/* ─── 19 modules ──────────────────────────────────────── */
const MODULES = [
  { key: 'product-sheet',          label: 'Product Sheet' },
  { key: 'master-product-sheet',   label: 'Master Product Sheet' },
  { key: 'master-inventory-sheet', label: 'Master Inventory Sheet' },
  { key: 'enrol-customer',         label: 'Enroll Customer' },
  { key: 'master-customer-sheet',  label: 'Master Customer Sheet' },
  { key: 'master-kyc-sheet',       label: 'Master KYC Sheet' },
  { key: 'enrol-workforce',        label: 'Enroll Workforce' },
  { key: 'master-workforce-sheet', label: 'Master Workforce Sheet' },
  { key: 'master-job-sheet',       label: 'Master Job Sheet' },
  { key: 'managers-dashboard',     label: 'Managers Dashboard' },
  { key: 'drafts',                 label: 'Drafts' },
  { key: 'orders',                 label: 'Orders' },
  { key: 'my-desk',                label: 'My Desk' },
  { key: 'create-generic-job',     label: 'Create Generic Job' },
  { key: 'master-designer-sheet',  label: 'Master Designer Sheet' },
  { key: 'designer-sheet',         label: 'Designer Sheet' },
  { key: 'finding-sheet',          label: 'Master Finding Sheet' },
  { key: 'finding-entry',          label: 'Finding Sheet' },
  { key: 'inventory',              label: 'Inventory' },
  { key: 'accountancy',            label: 'Accountancy' },
];

function defaultPermissions() {
  const sheets = {};
  MODULES.forEach((m) => { sheets[m.key] = { view: false, edit: false, create: false, export: false, amount: false }; });
  return { sheets, manage_members: false };
}

function mergePermissions(saved) {
  const base = defaultPermissions();
  if (!saved || typeof saved !== 'object') return base;
  const savedSheets = saved.sheets || {};
  MODULES.forEach((m) => {
    if (savedSheets[m.key]) {
      let p = {
        view:   !!savedSheets[m.key].view,
        edit:   !!savedSheets[m.key].edit,
        create: !!savedSheets[m.key].create,
        export: !!savedSheets[m.key].export,
        amount: !!savedSheets[m.key].amount,
      };
      // Apply cascading: create→edit+view, edit→view
      if (p.create) { p.edit = true; p.view = true; }
      if (p.edit)   { p.view = true; }
      base.sheets[m.key] = p;
    }
  });
  base.manage_members = !!saved.manage_members;
  return base;
}

/* ─── Delete Confirmation Modal ──────────────────────── */
function DeleteConfirmModal({ member, onClose, onRevoked }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');
  const name = member.full_name || member.email || 'Unknown';

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/workforce/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error();
      onRevoked(member.id);
      onClose();
    } catch {
      setError('Could not revoke access. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-bold text-midnight-ink mb-2">Revoke Access</h2>
        <p className="text-sm text-cool-gray mb-1">
          Are you sure you want to revoke access for <span className="font-semibold text-midnight-ink">{name}</span>?
        </p>
        <p className="text-xs text-cool-gray mb-5">
          Their info will be kept in Master Workforce Sheet with status <span className="font-semibold text-red-500">Revoked</span>.
        </p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-soft-border text-midnight-ink hover:bg-cloud-gray transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-60"
          >
            {deleting ? 'Revoking…' : 'Revoke Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Permanent Delete Confirmation Modal ───────────── */
function PermanentDeleteModal({ member, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');
  const name = member.full_name || member.email || 'Unknown';

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workforce_id: member.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Delete failed.');
      onDeleted(member.id);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not delete user. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-bold text-red-600 mb-2">Permanently Delete User</h2>
        <p className="text-sm text-cool-gray mb-1">
          Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span>{' '}
          <span className="font-semibold text-midnight-ink">{name}</span>?
        </p>
        <p className="text-xs text-cool-gray mb-1">
          This will remove the workforce record <span className="font-semibold">and</span> their login account.
        </p>
        <p className="text-xs font-semibold text-red-500 mb-5">This action cannot be undone.</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-soft-border text-midnight-ink hover:bg-cloud-gray transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white transition disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── All-permissions helper (for superusers) ────────── */
function allPermissions() {
  const sheets = {};
  MODULES.forEach((m) => { sheets[m.key] = { view: true, edit: true, create: true, export: true, amount: true }; });
  return { sheets, manage_members: true };
}

/* ─── Permissions Modal ───────────────────────────────── */
function PermissionsModal({ member, canEdit, isSelf, onClose, onSaved }) {
  // Superusers viewing themselves get all-perms as default
  const isMemberSuperUser = (() => {
    if (member.user_is_superuser) return true;
    const des = (member.designation || '').toLowerCase().trim();
    return des === 'chairman' || des === 'ceo';
  })();
  const effectiveCanEdit = canEdit && !isSelf; // nobody edits their own permissions

  const [perms, setPerms] = useState(() => {
    if (isMemberSuperUser) return allPermissions();
    if (isSelf && canEdit) return allPermissions();
    return mergePermissions(member.permissions);
  });
  const [isApproved, setIsApproved] = useState(member.user_is_approved ?? true);
  const [barcodeNumber, setBarcodeNumber] = useState(member.barcode_number || '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const name = member.full_name || member.email || 'Unknown';

  function toggleSheet(key, field) {
    if (!effectiveCanEdit) return;
    setPerms((prev) => {
      const current = prev.sheets[key] || { view: false, edit: false, create: false, export: false, amount: false };
      const newVal = !current[field];
      let updated = { ...current, [field]: newVal };

      // cascading rules for view/edit/create
      if (newVal) {
        if (field === 'create') { updated.view = true; updated.edit = true; }
        if (field === 'edit')   { updated.view = true; }
      } else {
        if (field === 'view')   { updated.edit = false; updated.create = false; }
        if (field === 'edit')   { updated.create = false; }
      }
      // export and amount are independent — no cascading

      return { ...prev, sheets: { ...prev.sheets, [key]: updated } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // Save sheet permissions
      const res = await fetch(`/api/workforce/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms, ...(barcodeNumber.trim() ? { barcode_number: barcodeNumber.trim() } : {}) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Save failed (${res.status})`);
      }

      // If approval status changed, update it
      const prevApproved = member.user_is_approved ?? true;
      if (isApproved !== prevApproved && member.email) {
        const approveRes = await fetch('/api/auth/approve-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: member.email, is_approved: isApproved }),
        });
        if (!approveRes.ok) {
          const errData = await approveRes.json().catch(() => null);
          throw new Error(errData?.message || `Approval update failed (${approveRes.status})`);
        }
      }

      onSaved(member.id, perms);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-soft-border shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${avatarColor(name)}`}>
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-midnight-ink truncate">
              {name}
              {isSelf && <span className="ml-1.5 text-xs font-normal text-trust-blue">(me)</span>}
            </p>
            {member.designation && (
              <p className="text-xs text-trust-blue">{member.designation}</p>
            )}
            {isSelf && (
              <p className="text-xs text-cool-gray mt-0.5 italic">You can only view your permissions</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-cloud-gray transition">
            <X className="h-5 w-5 text-cool-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Sheet permissions table */}
          <div className="mb-5">
            <div className="grid grid-cols-[1fr_56px_56px_64px_64px_66px] gap-x-2 mb-2 px-1">
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide">Module</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">View</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Edit</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Create</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Export</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Amount</span>
            </div>
            <div className="divide-y divide-soft-border rounded-xl border border-soft-border overflow-hidden">
              {MODULES.map((mod) => (
                <div key={mod.key} className="grid grid-cols-[1fr_56px_56px_64px_64px_66px] gap-x-2 items-center px-3 py-2.5 hover:bg-cloud-gray transition">
                  <span className="text-sm text-midnight-ink">{mod.label}</span>
                  {(['view', 'edit', 'create', 'export', 'amount']).map((field) => (
                    <div key={field} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={perms.sheets[mod.key]?.[field] ?? false}
                        onChange={() => effectiveCanEdit && toggleSheet(mod.key, field)}
                        disabled={!effectiveCanEdit}
                        className="w-4 h-4 accent-trust-blue cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Manage Members permission */}
          <div className="rounded-xl border border-soft-border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-midnight-ink">Manage Members</p>
              <p className="text-xs text-cool-gray mt-0.5">
                Allows this member to add / edit / remove team members
              </p>
            </div>
            <input
              type="checkbox"
              checked={perms.manage_members}
              onChange={() => effectiveCanEdit && setPerms((p) => ({ ...p, manage_members: !p.manage_members }))}
              disabled={!effectiveCanEdit}
              className="w-5 h-5 accent-trust-blue cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          {/* Barcode / ID Number — only visible to editors */}
          {effectiveCanEdit && (
            <div className="rounded-xl border border-soft-border px-4 py-3 mt-3">
              <p className="text-sm font-semibold text-midnight-ink mb-1">Barcode / Employee ID Number</p>
              <p className="text-xs text-cool-gray mb-2">Unique ID used to generate this member's ID card and barcode. Leave blank to auto-assign.</p>
              <input
                type="text"
                value={barcodeNumber}
                onChange={e => setBarcodeNumber(e.target.value)}
                placeholder={`e.g. WF-${String(member.id||'').padStart(4,'0')}`}
                className="w-full border border-soft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray text-midnight-ink"
              />
            </div>
          )}

          {/* Account approval — show when user is not yet approved */}
          {member.user_is_approved === false && (() => {
            const hasAnyPermission = perms.manage_members ||
              Object.values(perms.sheets).some((s) => s.view || s.edit || s.create);
            return (
              <div className={`mt-3 rounded-xl border px-4 py-3 ${isApproved ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-midnight-ink">Account Access</p>
                    <p className="text-xs text-cool-gray mt-0.5">
                      {isApproved
                        ? 'Access granted — user can access only the modules they have permissions for.'
                        : hasAnyPermission
                          ? 'Permissions assigned — turn on to grant this user access.'
                          : 'Account is pending approval — limited to Home & Settings only.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!effectiveCanEdit) return;
                      if (!hasAnyPermission && !isApproved) return;
                      setIsApproved((v) => !v);
                    }}
                    disabled={!effectiveCanEdit || (!hasAnyPermission && !isApproved)}
                    title={(!hasAnyPermission && !isApproved) ? 'Assign at least one permission first' : undefined}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none
                      ${(!hasAnyPermission && !isApproved) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      ${!effectiveCanEdit ? 'cursor-not-allowed' : ''}
                      ${isApproved ? 'bg-green-500' : 'bg-amber-400'}`}
                    aria-pressed={isApproved}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${isApproved ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {!hasAnyPermission && !isApproved && (
                  <p className="mt-2 text-xs text-amber-700 font-medium">
                    Assign at least one module permission above before granting account access.
                  </p>
                )}
              </div>
            );
          })()}

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-soft-border shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-soft-border text-midnight-ink hover:bg-cloud-gray transition"
          >
            {effectiveCanEdit ? 'Cancel' : 'Close'}
          </button>
          {effectiveCanEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-trust-blue hover:bg-deep-blue text-white transition disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Permissions'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ManageMembersPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);
  const [myWorkforce, setMyWorkforce] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember]       = useState(null);
  const [deleteTarget, setDeleteTarget]           = useState(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [enrollOpen, setEnrollOpen]               = useState(false);
  const [viewMember, setViewMember]               = useState(null);
  const [merging, setMerging]                     = useState(false);
  const [mergeError, setMergeError]               = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json().catch(() => null);
        if (res.status === 401) { router.replace('/login'); return; }
        if (!res.ok || !result?.success) { return; }
        setSessionUser(result.user);

        const allRes = await fetch('/api/workforce?page_size=200', { cache: 'no-store' });
        const allResult = await allRes.json().catch(() => null);
        const rawList =
          Array.isArray(allResult?.data) ? allResult.data
          : Array.isArray(allResult?.data?.results) ? allResult.data.results
          : Array.isArray(allResult?.results) ? allResult.results
          : [];
        setAllMembers(rawList);

        // find current user's workforce record to get their designation
        const email = result.user?.email || '';
        const username = result.user?.username || '';
        let match = email ? rawList.find(m => (m.email || '').toLowerCase() === email.toLowerCase()) : null;
        if (!match && username) {
          match = rawList.find(m => (m.username || '').toLowerCase() === username.toLowerCase());
        }
        if (match) setMyWorkforce(match);
      } catch {
        // Network/server error — show a retry prompt instead of redirecting away
        setLoadError('Could not connect to server. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const canEdit = isSuperUser(sessionUser, myWorkforce) || !!myWorkforce?.permissions?.manage_members;

  // Refresh list whenever EnrolWorkforceForm or another tab dispatches the event
  useEffect(() => {
    window.addEventListener('workforce-updated', refreshMembers);
    return () => window.removeEventListener('workforce-updated', refreshMembers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePermissionsSaved(memberId, newPerms) {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, permissions: newPerms } : m))
    );
  }

  function handleMemberRevoked(memberId) {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, active: false, permissions: {} } : m))
    );
  }

  function handleMemberDeleted(memberId) {
    setAllMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleMergeDuplicates(duplicateEmails) {
    setMerging(true);
    setMergeError('');
    try {
      for (const email of duplicateEmails) {
        const res = await fetch('/api/auth/merge-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Failed to merge ${email}`);
        }
      }
      await refreshMembers();
    } catch (e) {
      setMergeError(e.message || 'Merge failed. Please try again.');
    } finally {
      setMerging(false);
    }
  }

  async function refreshMembers() {
    try {
      const allRes = await fetch('/api/workforce?page_size=200', { cache: 'no-store' });
      const allResult = await allRes.json().catch(() => null);
      const rawList =
        Array.isArray(allResult?.data) ? allResult.data
        : Array.isArray(allResult?.data?.results) ? allResult.data.results
        : Array.isArray(allResult?.results) ? allResult.results
        : [];
      setAllMembers(rawList);
    } catch { /* keep existing list */ }
  }

  async function handleRestoreAccess(memberId) {
    try {
      const res = await fetch(`/api/workforce/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) throw new Error();
      await refreshMembers();
    } catch { /* list will refresh on next poll */ }
  }

  async function handleEnrolled() {
    setEnrollOpen(false);
    await refreshMembers();
  }

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const EXPORT_HEADERS = ['id','full_name','email','designation','department'];
  const buildExportRows = () => filtered.map((r) => EXPORT_HEADERS.map((h) => r[h] ?? ''));
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...buildExportRows()]), 'Members');
    XLSX.writeFile(wb, 'manage_members.xlsx');
    setExportMenuOpen(false);
  };
  const exportToPDF = () => {
    const rows = buildExportRows();
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Manage Members</title><style>body{font-family:sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#dbeafe}</style></head><body><h2>Manage Members</h2><table><thead><tr>${EXPORT_HEADERS.map((h)=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((c)=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
    setExportMenuOpen(false);
  };

  const filtered = allMembers.filter((m) => {
    // status tab filter
    if (statusFilter === 'active' && m.active === false) return false;
    if (statusFilter === 'revoked' && m.active !== false) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.designation || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-[#F3F4F6] font-sans">
      {/* Permissions modal */}
      {selectedMember && (
        <PermissionsModal
          member={selectedMember}
          canEdit={canEdit}
          isSelf={(selectedMember.email || '').toLowerCase() === (sessionUser?.email || '').toLowerCase()}
          onClose={() => setSelectedMember(null)}
          onSaved={handlePermissionsSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onRevoked={handleMemberRevoked}
        />
      )}

      {/* Permanent delete modal */}
      {permanentDeleteTarget && (
        <PermanentDeleteModal
          member={permanentDeleteTarget}
          onClose={() => setPermanentDeleteTarget(null)}
          onDeleted={handleMemberDeleted}
        />
      )}

      {/* Enroll Workforce modal */}
      {enrollOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-6">
            <EnrolWorkforceForm
              onEnroll={handleEnrolled}
              onClose={() => setEnrollOpen(false)}
            />
          </div>
        </div>
      )}

      {/* View / Edit member modal */}
      {viewMember && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-6">
            <EnrolWorkforceForm
              editingId={viewMember.id}
              readOnly={true}
              canEditOverride={canEdit || (viewMember.email || '').toLowerCase() === (sessionUser?.email || '').toLowerCase()}
              onEnroll={() => { setViewMember(null); handleEnrolled(); }}
              onClose={() => setViewMember(null)}
            />
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-lg font-bold text-midnight-ink">Manage Members</h1>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Duplicate email warning banner */}
        {(() => {
          const emailCounts = {};
          allMembers.forEach((m) => {
            if (m.email) emailCounts[m.email.toLowerCase()] = (emailCounts[m.email.toLowerCase()] || 0) + 1;
          });
          const dupes = Object.entries(emailCounts).filter(([, count]) => count > 1).map(([e]) => e);
          if (!dupes.length) return null;
          return (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ {dupes.length} duplicate email{dupes.length > 1 ? 's' : ''} detected.
                Merge to keep one record per person with the correct role and permissions.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {mergeError && <span className="text-xs text-red-500">{mergeError}</span>}
                {canEdit && (
                  <button
                    onClick={() => handleMergeDuplicates(dupes)}
                    disabled={merging}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition disabled:opacity-60"
                  >
                    {merging ? 'Merging…' : 'Merge Duplicates'}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Search + Add row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
            <input
              type="text"
              placeholder="Search members"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-soft-border bg-white text-sm text-midnight-ink placeholder-cool-gray focus:outline-none focus:ring-2 focus:ring-trust-blue"
            />
          </div>
          {canEdit && (
            <button
              onClick={() => setEnrollOpen(true)}
              className="flex items-center gap-2 bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="h-4 w-4" />
              Enroll Workforce
            </button>
          )}
          <div className="relative">
            {exportMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />}
            <button
              type="button"
              onClick={() => setExportMenuOpen((p) => !p)}
              className="relative z-20 flex items-center gap-1.5 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Download className="h-4 w-4" /> Export <ChevronDown className="h-4 w-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-10 z-30 w-52 rounded-lg bg-white shadow-lg border border-soft-border py-1">
                <button type="button" onClick={exportToExcel} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as Excel (.xlsx)</button>
                <button type="button" onClick={exportToPDF} className="w-full px-4 py-2 text-sm text-midnight-ink hover:bg-cloud-gray text-left">Export as PDF</button>
              </div>
            )}
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {[['all', 'All'], ['active', 'Active'], ['revoked', 'Revoked']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                statusFilter === val
                  ? val === 'revoked'
                    ? 'bg-red-500 text-white'
                    : val === 'active'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-trust-blue text-white'
                  : 'bg-white border border-soft-border text-cool-gray hover:bg-cloud-gray'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${
                statusFilter === val ? 'opacity-80' : 'text-cool-gray'
              }`}>
                ({allMembers.filter(m =>
                  val === 'all' ? true :
                  val === 'active' ? m.active !== false :
                  m.active === false
                ).length})
              </span>
            </button>
          ))}
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-cool-gray mb-3">
            {filtered.length === allMembers.length
              ? `1\u2013${allMembers.length} of ${allMembers.length} items`
              : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* Table card */}
        <div className="bg-white rounded-xl border border-soft-border overflow-hidden shadow-sm">
          {/* Column header */}
          <div className="px-5 py-3 border-b border-soft-border">
            <span className="text-sm font-bold text-midnight-ink">Member</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-cool-gray text-sm">Loading…</div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-red-500">{loadError}</p>
              <button
                onClick={() => { setLoadError(''); setLoading(true); window.location.reload(); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-trust-blue hover:bg-deep-blue text-white transition"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-cool-gray text-sm italic">No members found.</div>
          ) : (
            <ul className="divide-y divide-soft-border">
              {filtered.map((m) => {
                const name = m.full_name || m.email || 'Unknown';
                const color = avatarColor(name);
                const isSelf = (m.email || '') === (sessionUser?.email || '');
                return (
                  <li key={m.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-cloud-gray transition ${m.active === false ? 'opacity-60' : ''}`}>
                    {/* Avatar */}
                    {m.profile_photo_url ? (
                      <img
                        src={m.profile_photo_url}
                        alt={name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${color}`}>
                        {initials(name)}
                      </div>
                    )}

                    {/* Name / email / designation — click opens view/edit popup */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setViewMember(m)}
                    >
                      <p className="text-sm font-semibold text-midnight-ink truncate hover:text-trust-blue transition">
                        {name}
                        {isSelf && <span className="ml-1.5 text-xs font-normal text-trust-blue">(me)</span>}
                        {m.user_is_superuser && <sup className="ml-1 text-[10px] font-bold text-red-500 tracking-wide">superuser</sup>}
                      </p>
                      <p className="text-xs text-cool-gray truncate">{m.email || '—'}</p>
                      {m.active === false ? (
                        <p className="text-xs font-semibold text-red-500 mt-0.5">Revoked</p>
                      ) : (m.designation || m.department) && (
                        <p className="text-xs font-medium text-trust-blue truncate mt-0.5">
                          {[m.designation, m.department].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>

                    {/* Permissions / restore / revoke actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        title={m.active === false ? 'Member is revoked' : (canEdit ? 'Edit Permissions' : 'View Permissions')}
                        onClick={() => { if (m.active !== false) setSelectedMember(m); }}
                        disabled={m.active === false}
                        className={`p-1.5 rounded transition ${m.active === false ? 'text-cool-gray opacity-40 cursor-not-allowed' : 'hover:bg-trust-blue/10 text-trust-blue'}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canEdit && !m.user_is_superuser && m.active !== false && (
                        <button
                          title="Revoke Access"
                          onClick={() => setDeleteTarget(m)}
                          className="p-1.5 rounded hover:bg-red-50 text-cool-gray hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && m.active === false && (
                        <>
                          <button
                            title="Restore Access"
                            onClick={() => handleRestoreAccess(m.id)}
                            className="p-1.5 rounded hover:bg-green-50 text-cool-gray hover:text-green-600 transition"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            title="Permanently Delete User"
                            onClick={() => setPermanentDeleteTarget(m)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <DeletionHistoryDrawer appLabel="accounts" modelName="user" />
    </main>
  );
}
