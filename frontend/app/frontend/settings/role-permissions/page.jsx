'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

// â”€â”€ Workforce designation + department data (mirrors enrol-workforce) â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEPT_DATA = {
  'Marketing':                    { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Customer Relation Management': { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Operations':                   { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Design':                       { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Logistics':                    { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Purchase':                     { roles: ['Associate','Manager','Department Head','Director'] },
  'Sales / Business Development': { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Finance':                      { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Information Technology':       { roles: ['Intern','Associate','Developer','Project Manager','General Manager','Director'] },
  'Human Resource':               { roles: ['Intern','Associate','Manager','Department Head','Director'] },
  'Production':                   { roles: ['Labour','Supervisor','Manager','General Manager','Department Head','Director'] },
  'Services':                     { roles: ['Security','Electrician','Plumber','CCTV Operator','Carpenter','Ironsmith','Locksmith'] },
  'House Keeping':                { roles: ['Cook','Pantry Boy','Janitor','Messenger'] },
};

const DEPARTMENTS = Object.keys(DEPT_DATA);

const DESIGNATION_ORDER = [
  'Chairman','CEO','Director','General Manager','Department Head','Project Manager',
  'Manager','Supervisor','Associate','Developer','Intern','Labour','Worker',
  'Cook','Pantry Boy','Janitor','Messenger','Security','Electrician','Plumber',
  'CCTV Operator','Carpenter','Ironsmith','Locksmith',
];

const ALL_DESIGNATIONS = [...new Set(Object.values(DEPT_DATA).flatMap(d => d.roles))]
  .sort((a, b) => {
    const ai = DESIGNATION_ORDER.indexOf(a); const bi = DESIGNATION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

function deptsForDesignation(designation) {
  return DEPARTMENTS.filter(d => DEPT_DATA[d].roles.includes(designation));
}

// â”€â”€ Modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (base.sheets[key]) base.sheets[key] = { ...base.sheets[key], ...saved.sheets[key] };
    });
  }
  if (typeof saved.manage_members === 'boolean') base.manage_members = saved.manage_members;
  return base;
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RolePermissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // permissions keyed by `${designation}||${department}`
  const [permsMap, setPermsMap] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isSaveError, setIsSaveError] = useState(false);

  const availableDepts = selectedDesignation ? deptsForDesignation(selectedDesignation) : [];
  const compositeKey = selectedDesignation && selectedDept ? `${selectedDesignation}||${selectedDept}` : null;
  const currentPerms = compositeKey ? (permsMap[compositeKey] || emptyPermissions()) : null;

  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (!res.ok || !result.success) { router.replace('/login'); return; }
        const u = result.user;
        setCanEdit(u?.is_superuser || u?.role === 'admin');
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // â”€â”€ Load all saved permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadAllPermissions = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const res = await fetch('/api/role-permissions', { cache: 'no-store' });
      const result = await res.json();
      if (res.ok && result.success) {
        const map = {};
        (result.data || []).forEach((item) => {
          const key = `${item.role}||${item.department || ''}`;
          map[key] = mergePermissions(item.permissions);
        });
        setPermsMap(map);
      }
    } catch { /* silent */ }
    finally { setLoadingPerms(false); }
  }, []);

  useEffect(() => { if (!loading) loadAllPermissions(); }, [loading, loadAllPermissions]);

  // â”€â”€ Auto-select dept when only one option â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!selectedDesignation) { setSelectedDept(''); return; }
    const depts = deptsForDesignation(selectedDesignation);
    setSelectedDept(depts.length === 1 ? depts[0] : '');
    setSaveMsg('');
  }, [selectedDesignation]);

  // â”€â”€ Permission toggles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function updateCurrent(updater) {
    if (!compositeKey) return;
    setPermsMap(prev => ({ ...prev, [compositeKey]: updater(prev[compositeKey] || emptyPermissions()) }));
  }

  function toggleSheetPerm(moduleKey, col) {
    updateCurrent(perms => ({
      ...perms,
      sheets: { ...perms.sheets, [moduleKey]: { ...perms.sheets[moduleKey], [col]: !perms.sheets[moduleKey][col] } },
    }));
  }

  function toggleAllForModule(moduleKey) {
    updateCurrent(perms => {
      const allOn = PERM_COLS.every(c => perms.sheets[moduleKey][c]);
      const newSheet = Object.fromEntries(PERM_COLS.map(c => [c, !allOn]));
      return { ...perms, sheets: { ...perms.sheets, [moduleKey]: newSheet } };
    });
  }

  function toggleManageMembers() {
    updateCurrent(perms => ({ ...perms, manage_members: !perms.manage_members }));
  }

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSave() {
    if (!compositeKey || !canEdit) return;
    setSaveMsg(''); setIsSaveError(false); setSaving(true);
    try {
      const res = await fetch(
        `/api/role-permissions/${encodeURIComponent(selectedDesignation)}/${encodeURIComponent(selectedDept)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: currentPerms }),
        }
      );
      const result = await res.json();
      if (!res.ok || !result.success) {
        setSaveMsg(result.message || 'Failed to save.'); setIsSaveError(true); return;
      }
      setSaveMsg('Saved successfully.');
    } catch {
      setSaveMsg('Unable to save. Please try again.'); setIsSaveError(true);
    } finally { setSaving(false); }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cloud-gray font-sans">
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/frontend/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-base font-bold text-midnight-ink">Default Role Permissions</h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Step 1 â€” Choose designation */}
        <div className="bg-white rounded-xl border border-soft-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-trust-blue" />
            <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Step 1 â€” Select Designation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_DESIGNATIONS.map(d => (
              <button
                key={d}
                onClick={() => { setSelectedDesignation(d === selectedDesignation ? '' : d); setSaveMsg(''); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                  selectedDesignation === d
                    ? 'bg-trust-blue text-white border-trust-blue'
                    : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                }`}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* Step 2 â€” Choose department (only when multiple depts) */}
        {selectedDesignation && availableDepts.length > 1 && (
          <div className="bg-white rounded-xl border border-soft-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-trust-blue" />
              <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Step 2 â€” Select Department</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableDepts.map(dep => (
                <button
                  key={dep}
                  onClick={() => { setSelectedDept(dep === selectedDept ? '' : dep); setSaveMsg(''); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                    selectedDept === dep
                      ? 'bg-trust-blue text-white border-trust-blue'
                      : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                  }`}
                >{dep}</button>
              ))}
            </div>
          </div>
        )}

        {/* Permissions table */}
        {compositeKey && (
          <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-soft-border bg-cloud-gray">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-trust-blue shrink-0" />
                <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">
                  Permissions â€” {selectedDesignation} Â· {selectedDept}
                </span>
              </div>
              {loadingPerms && <div className="w-4 h-4 border-2 border-trust-blue border-t-transparent rounded-full animate-spin" />}
            </div>

            <div className="p-5 space-y-4">
              {!currentPerms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-soft-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-cloud-gray border-b border-soft-border">
                          <th className="text-left px-3 py-2 font-semibold text-midnight-ink w-44">Module</th>
                          {PERM_COLS.map(col => (
                            <th key={col} className="px-2 py-2 font-semibold text-midnight-ink capitalize text-center w-16">{col}</th>
                          ))}
                          <th className="px-2 py-2 font-semibold text-midnight-ink text-center w-12">All</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(({ key, label }, idx) => {
                          const sheet = currentPerms.sheets[key] || {};
                          const allOn = PERM_COLS.every(c => sheet[c]);
                          return (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-cloud-gray/40'}>
                              <td className="px-3 py-2 font-medium text-midnight-ink">{label}</td>
                              {PERM_COLS.map(col => (
                                <td key={col} className="px-2 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!!sheet[col]}
                                    onChange={() => canEdit && toggleSheetPerm(key, col)}
                                    disabled={!canEdit}
                                    className="accent-trust-blue w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={allOn}
                                  onChange={() => canEdit && toggleAllForModule(key)}
                                  disabled={!canEdit}
                                  className="accent-trust-blue w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <label className={`flex items-center gap-3 select-none w-fit ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={!!currentPerms.manage_members}
                      onChange={() => canEdit && toggleManageMembers()}
                      disabled={!canEdit}
                      className="accent-trust-blue w-4 h-4"
                    />
                    <span className="text-xs font-medium text-midnight-ink">Manage Members access</span>
                  </label>

                  {canEdit ? (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 px-5 rounded-lg bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold transition disabled:opacity-60"
                      >
                        {saving ? 'Savingâ€¦' : `Save ${selectedDesignation} Â· ${selectedDept} Defaults`}
                      </button>
                      {saveMsg && (
                        <p className={`text-xs font-medium ${isSaveError ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-cool-gray italic">You have view-only access to default permissions.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!selectedDesignation && (
          <div className="text-center py-12 text-cool-gray text-sm">
            Select a designation above to view and edit its default permissions.
          </div>
        )}
        {selectedDesignation && availableDepts.length > 1 && !selectedDept && (
          <div className="text-center py-12 text-cool-gray text-sm">
            Now select a department to load the permissions for {selectedDesignation}.
          </div>
        )}
      </div>
    </div>
  );
}
