'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const MODULES = [
  { key: 'product-sheet', label: 'Product Sheet' },
  { key: 'master-product-sheet', label: 'Master Product Sheet' },
  { key: 'master-inventory-sheet', label: 'Master Inventory Sheet' },
  { key: 'enrol-customer', label: 'Enroll Customer' },
  { key: 'master-customer-sheet', label: 'Master Customer Sheet' },
  { key: 'master-kyc-sheet', label: 'Master KYC Sheet' },
  { key: 'enrol-workforce', label: 'Enroll Workforce' },
  { key: 'master-workforce-sheet', label: 'Master Workforce Sheet' },
  { key: 'master-job-sheet', label: 'Master Job Sheet' },
  { key: 'managers-dashboard', label: 'Managers Dashboard' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'orders', label: 'Orders' },
  { key: 'my-desk', label: 'My Desk' },
  { key: 'create-generic-job', label: 'Create Generic Job' },
  { key: 'master-designer-sheet', label: 'Master Designer Sheet' },
  { key: 'designer-sheet', label: 'Designer Sheet' },
  { key: 'finding-sheet', label: 'Master Finding Sheet' },
  { key: 'finding-entry', label: 'Finding Sheet' },
  { key: 'inventory', label: 'Inventory' },
];

const PERM_COLS = ['view', 'edit', 'create', 'export', 'amount'];

const ROLE_TABS = [
  { key: 'admin', label: 'Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'staff', label: 'Staff' },
];

function emptyPermissions() {
  const sheets = {};
  MODULES.forEach(({ key }) => {
    sheets[key] = { view: false, edit: false, create: false, export: false, amount: false };
  });
  return { sheets, manage_members: false };
}

function mergePermissions(saved) {
  const base = emptyPermissions();
  if (!saved) return base;
  if (saved.sheets) {
    Object.keys(saved.sheets).forEach((key) => {
      if (base.sheets[key]) {
        base.sheets[key] = { ...base.sheets[key], ...saved.sheets[key] };
      }
    });
  }
  if (typeof saved.manage_members === 'boolean') {
    base.manage_members = saved.manage_members;
  }
  return base;
}

export default function SettingsPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Account settings state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Default role permissions state
  const [activeRole, setActiveRole] = useState('admin');
  const [rolePermissions, setRolePermissions] = useState({ admin: null, manager: null, staff: null });
  const [rolePermsLoading, setRolePermsLoading] = useState(false);
  const [rolePermsSaving, setRolePermsSaving] = useState(false);
  const [roleSaveMsg, setRoleSaveMsg] = useState('');
  const [isRoleSaveError, setIsRoleSaveError] = useState(false);

  const loadRolePermissions = useCallback(async () => {
    setRolePermsLoading(true);
    try {
      const res = await fetch('/api/role-permissions', { cache: 'no-store' });
      const result = await res.json();
      if (res.ok && result.success) {
        const map = { admin: null, manager: null, staff: null };
        (result.data || []).forEach((item) => {
          map[item.role] = mergePermissions(item.permissions);
        });
        // Fill any missing roles
        ROLE_TABS.forEach(({ key }) => {
          if (!map[key]) map[key] = emptyPermissions();
        });
        setRolePermissions(map);
      }
    } catch {
      // silent
    } finally {
      setRolePermsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (!res.ok || !result.success) { router.replace('/login'); return; }
        setSessionUser(result.user);
        if (result.user?.is_superuser) {
          loadRolePermissions();
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, loadRolePermissions]);

  async function handleSaveCredentials(e) {
    e.preventDefault();
    setMessage(''); setIsError(false);

    if (!newUsername.trim() || !newPassword.trim()) {
      setMessage('Username and password cannot be empty.');
      setIsError(true); return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setIsError(true); return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setIsError(true); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/set-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setMessage(result.message || 'Failed to save credentials.');
        setIsError(true); return;
      }
      setMessage('Credentials saved! Redirecting to login…');
      setIsError(false);
      setNewUsername(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => {
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          router.replace('/login');
        });
      }, 2000);
    } catch {
      setMessage('Unable to save. Please try again.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  function toggleSheetPerm(moduleKey, col) {
    setRolePermissions((prev) => {
      const perms = prev[activeRole];
      return {
        ...prev,
        [activeRole]: {
          ...perms,
          sheets: {
            ...perms.sheets,
            [moduleKey]: {
              ...perms.sheets[moduleKey],
              [col]: !perms.sheets[moduleKey][col],
            },
          },
        },
      };
    });
  }

  function toggleManageMembers() {
    setRolePermissions((prev) => {
      const perms = prev[activeRole];
      return {
        ...prev,
        [activeRole]: { ...perms, manage_members: !perms.manage_members },
      };
    });
  }

  function toggleAllForModule(moduleKey) {
    const perms = rolePermissions[activeRole];
    const currentSheet = perms.sheets[moduleKey];
    const allOn = PERM_COLS.every((c) => currentSheet[c]);
    const newSheet = {};
    PERM_COLS.forEach((c) => { newSheet[c] = !allOn; });
    setRolePermissions((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        sheets: { ...prev[activeRole].sheets, [moduleKey]: newSheet },
      },
    }));
  }

  async function handleSaveRolePermissions() {
    setRoleSaveMsg(''); setIsRoleSaveError(false);
    setRolePermsSaving(true);
    try {
      const res = await fetch(`/api/role-permissions/${activeRole}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePermissions[activeRole] }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setRoleSaveMsg(result.message || 'Failed to save.');
        setIsRoleSaveError(true); return;
      }
      setRoleSaveMsg('Saved successfully.');
    } catch {
      setRoleSaveMsg('Unable to save. Please try again.');
      setIsRoleSaveError(true);
    } finally {
      setRolePermsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPerms = rolePermissions[activeRole];

  return (
    <div className="min-h-screen bg-cloud-gray font-sans">
      {/* Header */}
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-base font-bold text-midnight-ink">Settings</h1>
      </header>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Account Settings card */}
        <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
            <KeyRound className="h-4 w-4 text-trust-blue shrink-0" />
            <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Account Settings</span>
          </div>

          <form onSubmit={handleSaveCredentials} className="px-5 py-4 space-y-3 max-w-lg">
            <p className="text-xs text-cool-gray">
              Set a username and password so you can log in directly next time.
              {sessionUser?.email && (
                <> Your account will remain linked to{' '}
                  <strong className="text-midnight-ink">{sessionUser.email}</strong>.
                </>
              )}
            </p>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 font-medium">
              Your username will be visible to everyone and used as your official name across the platform.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="new-username"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            {message && (
              <p className={`text-xs px-3 py-2 rounded-md font-medium ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-lg bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Credentials'}
            </button>
          </form>
        </div>

        {/* Default Role Permissions card — superuser only */}
        {sessionUser?.is_superuser && (
          <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
              <ShieldCheck className="h-4 w-4 text-trust-blue shrink-0" />
              <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Default Role Permissions</span>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-cool-gray">
                Set the default module permissions applied to new members based on their role.
              </p>

              {/* Role tabs */}
              <div className="flex gap-2">
                {ROLE_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveRole(key); setRoleSaveMsg(''); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border ${
                      activeRole === key
                        ? 'bg-trust-blue text-white border-trust-blue'
                        : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {rolePermsLoading || !currentPerms ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Permission grid */}
                  <div className="overflow-x-auto rounded-lg border border-soft-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-cloud-gray border-b border-soft-border">
                          <th className="text-left px-3 py-2 font-semibold text-midnight-ink w-40">Module</th>
                          {PERM_COLS.map((col) => (
                            <th key={col} className="px-2 py-2 font-semibold text-midnight-ink capitalize text-center w-16">
                              {col}
                            </th>
                          ))}
                          <th className="px-2 py-2 font-semibold text-midnight-ink text-center w-12">All</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(({ key, label }, idx) => {
                          const sheet = currentPerms.sheets[key] || {};
                          const allOn = PERM_COLS.every((c) => sheet[c]);
                          return (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-cloud-gray/40'}>
                              <td className="px-3 py-2 font-medium text-midnight-ink">{label}</td>
                              {PERM_COLS.map((col) => (
                                <td key={col} className="px-2 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!!sheet[col]}
                                    onChange={() => toggleSheetPerm(key, col)}
                                    className="accent-trust-blue w-3.5 h-3.5 cursor-pointer"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={allOn}
                                  onChange={() => toggleAllForModule(key)}
                                  className="accent-trust-blue w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Manage Members toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      checked={!!currentPerms.manage_members}
                      onChange={toggleManageMembers}
                      className="accent-trust-blue w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-midnight-ink">Manage Members access</span>
                  </label>

                  {/* Save row */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSaveRolePermissions}
                      disabled={rolePermsSaving}
                      className="h-9 px-5 rounded-lg bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold transition disabled:opacity-60"
                    >
                      {rolePermsSaving ? 'Saving…' : `Save ${ROLE_TABS.find(t => t.key === activeRole)?.label} Defaults`}
                    </button>
                    {roleSaveMsg && (
                      <p className={`text-xs font-medium ${isRoleSaveError ? 'text-red-600' : 'text-green-600'}`}>
                        {roleSaveMsg}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

