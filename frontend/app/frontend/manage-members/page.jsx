'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';

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

/* superuser = admin role OR workforce designation is Chairman / CEO */
function isSuperUser(sessionUser, workforceRecord) {
  if (!sessionUser) return false;
  if (sessionUser.role === 'admin') return true;
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
];

function defaultPermissions() {
  const sheets = {};
  MODULES.forEach((m) => { sheets[m.key] = { view: false, edit: false, create: false }; });
  return { sheets, manage_members: false };
}

function mergePermissions(saved) {
  const base = defaultPermissions();
  if (!saved || typeof saved !== 'object') return base;
  const savedSheets = saved.sheets || {};
  MODULES.forEach((m) => {
    if (savedSheets[m.key]) {
      base.sheets[m.key] = {
        view:   !!savedSheets[m.key].view,
        edit:   !!savedSheets[m.key].edit,
        create: !!savedSheets[m.key].create,
      };
    }
  });
  base.manage_members = !!saved.manage_members;
  return base;
}

/* ─── Delete Confirmation Modal ──────────────────────── */
function DeleteConfirmModal({ member, onClose, onDeleted }) {
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
      onDeleted(member.id);
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
          Their info will be kept in Master Workforce Sheet with status <span className="font-semibold text-red-500">Access Denied</span>.
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

/* ─── Permissions Modal ───────────────────────────────── */
function PermissionsModal({ member, canEdit, onClose, onSaved }) {
  const [perms, setPerms]     = useState(() => mergePermissions(member.permissions));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const name = member.full_name || member.email || 'Unknown';

  function toggleSheet(key, field) {
    setPerms((prev) => {
      const current = prev.sheets[key] || { view: false, edit: false, create: false };
      const newVal = !current[field];
      let updated = { ...current, [field]: newVal };

      if (newVal) {
        // Turning ON: cascade upward — enable all lower-level permissions
        if (field === 'create') { updated.view = true; updated.edit = true; }
        if (field === 'edit')   { updated.view = true; }
      } else {
        // Turning OFF: cascade downward — disable all higher-level permissions
        if (field === 'view')   { updated.edit = false; updated.create = false; }
        if (field === 'edit')   { updated.create = false; }
      }

      return { ...prev, sheets: { ...prev.sheets, [key]: updated } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/workforce/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved(member.id, perms);
      onClose();
    } catch {
      setError('Could not save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-soft-border shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${avatarColor(name)}`}>
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-midnight-ink truncate">{name}</p>
            {member.designation && (
              <p className="text-xs text-trust-blue">{member.designation}</p>
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
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-x-2 mb-2 px-1">
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide">Module</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">View</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Edit</span>
              <span className="text-xs font-bold text-cool-gray uppercase tracking-wide text-center">Create</span>
            </div>
            <div className="divide-y divide-soft-border rounded-xl border border-soft-border overflow-hidden">
              {MODULES.map((mod) => (
                <div key={mod.key} className="grid grid-cols-[1fr_60px_60px_60px] gap-x-2 items-center px-3 py-2.5 hover:bg-cloud-gray transition">
                  <span className="text-sm text-midnight-ink">{mod.label}</span>
                  {(['view', 'edit', 'create']).map((field) => (
                    <div key={field} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={perms.sheets[mod.key]?.[field] ?? false}
                        onChange={() => canEdit && toggleSheet(mod.key, field)}
                        disabled={!canEdit}
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
              onChange={() => canEdit && setPerms((p) => ({ ...p, manage_members: !p.manage_members }))}
              disabled={!canEdit}
              className="w-5 h-5 accent-trust-blue cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-soft-border shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-soft-border text-midnight-ink hover:bg-cloud-gray transition"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </button>
          {canEdit && (
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
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember]     = useState(null);
  const [deleteTarget, setDeleteTarget]         = useState(null);
  const [enrollOpen, setEnrollOpen]             = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (!res.ok || !result.success) { router.replace('/login'); return; }
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
        if (email) {
          const match = rawList.find(m => (m.email || '').toLowerCase() === email.toLowerCase());
          if (match) setMyWorkforce(match);
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const canEdit = isSuperUser(sessionUser, myWorkforce);

  function handlePermissionsSaved(memberId, newPerms) {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, permissions: newPerms } : m))
    );
  }

  function handleMemberDeleted(memberId) {
    setAllMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleEnrolled() {
    setEnrollOpen(false);
    // Refresh the member list after enrollment
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

  const filtered = allMembers.filter((m) => {
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
          onClose={() => setSelectedMember(null)}
          onSaved={handlePermissionsSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
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

      {/* Top bar */}
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-lg font-bold text-midnight-ink">Manage Members</h1>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
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
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-cool-gray text-sm italic">No members found.</div>
          ) : (
            <ul className="divide-y divide-soft-border">
              {filtered.map((m) => {
                const name = m.full_name || m.email || 'Unknown';
                const color = avatarColor(name);
                const isSelf = (m.email || '') === (sessionUser?.email || '');
                return (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-cloud-gray transition">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${color}`}>
                      {initials(name)}
                    </div>

                    {/* Name / email / designation — click opens permissions popup */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setSelectedMember(m)}
                    >
                      <p className="text-sm font-semibold text-midnight-ink truncate hover:text-trust-blue transition">
                        {name}
                        {isSelf && <span className="ml-1.5 text-xs font-normal text-trust-blue">(You)</span>}
                      </p>
                      <p className="text-xs text-cool-gray truncate">{m.email || '—'}</p>
                      {m.designation && (
                        <p className="text-xs font-medium text-trust-blue truncate mt-0.5">{m.designation}</p>
                      )}
                    </button>

                    {/* Edit / Delete — superusers only */}
                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          title="Edit Permissions"
                          onClick={() => setSelectedMember(m)}
                          className="p-1.5 rounded hover:bg-trust-blue/10 text-trust-blue transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Revoke Access"
                          onClick={() => setDeleteTarget(m)}
                          className="p-1.5 rounded hover:bg-red-50 text-cool-gray hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
