'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';

// ── Static (hardcoded) workforce designation + department data ────────────────
const STATIC_DEPT_DATA = {
  'Marketing':                    { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Customer Relation Management': { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Operations':                   { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Design':                       { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Logistics':                    { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Purchase':                     { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate'] },
  'Sales / Business Development': { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Finance':                      { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Information Technology':       { roles: ['Chairman','CEO','Director','Department Head','General Manager','Project Manager','Developer','Associate','Intern'] },
  'Human Resource':               { roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Production':                   { roles: ['Chairman','CEO','Director','Department Head','General Manager','Manager','Supervisor','Labour'] },
  'Services':                     { roles: ['Security','Electrician','Plumber','CCTV','Carpenter','Ironsmith','Locksmith'] },
  'House Keeping':                { roles: ['Cook','Pantry Boy','Janitor','Messenger'] },
};

const DESIGNATION_ORDER = [
  'Chairman','CEO','Director','General Manager','Department Head','Project Manager',
  'Manager','Supervisor','Associate','Developer','Intern','Labour','Worker',
  'Cook','Pantry Boy','Janitor','Messenger','Security','Electrician','Plumber',
  'CCTV','Carpenter','Ironsmith','Locksmith',
];

// ── Build merged DEPT_DATA from static defaults + dynamic DB pairs ────────────
function buildDeptData(roleDeptPairs) {
  const merged = {};
  // Start with static
  Object.entries(STATIC_DEPT_DATA).forEach(([dept, { roles }]) => {
    merged[dept] = { roles: [...roles] };
  });
  // Overlay custom pairs from DB
  (roleDeptPairs || []).forEach(({ role, department }) => {
    const dept = (department || '').trim();
    const rol  = (role || '').trim();
    if (!rol) return;
    if (dept) {
      if (!merged[dept]) merged[dept] = { roles: [] };
      if (!merged[dept].roles.includes(rol)) merged[dept].roles.push(rol);
    } else {
      // role without department — add to every department that doesn't yet have it
      Object.values(merged).forEach(d => {
        if (!d.roles.includes(rol)) d.roles.push(rol);
      });
    }
  });
  return merged;
}

function deptsForDesignations(designations, deptData) {
  const departments = Object.keys(deptData);
  const set = new Set();
  designations.forEach(des => {
    departments.forEach(d => { if (deptData[d].roles.includes(des)) set.add(d); });
  });
  return departments.filter(d => set.has(d));
}

// ── Modules ───────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
        let p = { ...base.sheets[key], ...saved.sheets[key] };
        // Apply cascading: create→edit+view, edit→view
        if (p.create) { p.edit = true; p.view = true; }
        if (p.edit)   { p.view = true; }
        base.sheets[key] = p;
      }
    });
  }
  if (typeof saved.manage_members === 'boolean') base.manage_members = saved.manage_members;
  return base;
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function MultiSelect({ options, selected, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(val) {
    if (disabled) return;
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  }

  function toggleAll() {
    if (disabled) return;
    onChange(selected.length === options.length ? [] : [...options]);
  }

  const displayText = selected.length === 0
    ? (placeholder || '-- Select --')
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`h-8 px-2 pr-7 rounded-md border border-soft-border bg-white text-xs text-midnight-ink text-left
          focus:outline-none focus:ring-1 focus:ring-trust-blue min-w-[180px] relative
          disabled:opacity-50 disabled:cursor-not-allowed truncate`}
      >
        {displayText}
        <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cool-gray pointer-events-none" />
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left }}
          className="z-[9999] w-56 bg-white border border-soft-border rounded-lg shadow-lg"
        >
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-cloud-gray cursor-pointer border-b border-soft-border">
            <input
              type="checkbox"
              checked={selected.length === options.length && options.length > 0}
              ref={el => { if (el) el.indeterminate = selected.length > 0 && selected.length < options.length; }}
              onChange={toggleAll}
              className="accent-trust-blue w-3.5 h-3.5"
            />
            <span className="text-xs font-semibold text-midnight-ink">Select All</span>
          </label>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-cloud-gray cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-trust-blue w-3.5 h-3.5"
              />
              <span className="text-xs text-midnight-ink">{opt}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── 3-state checkbox ──────────────────────────────────────────────────────────
function TriCheckbox({ allOn, someOn, onChange, disabled }) {
  return (
    <input
      type="checkbox"
      checked={allOn}
      ref={el => { if (el) el.indeterminate = !allOn && someOn; }}
      onChange={onChange}
      disabled={disabled}
      className="accent-trust-blue w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RolePermissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);

  const [permsMap, setPermsMap] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isSaveError, setIsSaveError] = useState(false);

  // Dynamic dept/role data fetched from the backend
  const [deptData, setDeptData] = useState(STATIC_DEPT_DATA);
  const [allDesignations, setAllDesignations] = useState(() =>
    [...new Set(Object.values(STATIC_DEPT_DATA).flatMap(d => d.roles))].sort(
      (a, b) => {
        const ai = DESIGNATION_ORDER.indexOf(a); const bi = DESIGNATION_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
    )
  );

  // All departments available — departments and designations are independent
  const availableDepts = useMemo(
    () => Object.keys(deptData).sort(),
    [deptData]
  );

  // When designations are cleared, also clear departments
  useEffect(() => {
    if (selectedDesignations.length === 0) { setSelectedDepts([]); }
    setSaveMsg('');
  }, [selectedDesignations]);

  // All active designation x department combos — any pairing is allowed
  const activeKeys = useMemo(() => {
    const keys = [];
    selectedDesignations.forEach(des => {
      selectedDepts.forEach(dept => {
        keys.push(`${des}||${dept}`);
      });
    });
    return keys;
  }, [selectedDesignations, selectedDepts]);

  const hasSelection = activeKeys.length > 0;

  // ── Auth ───────────────────────────────────────────────────────────────────
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

  // ── Load all saved permissions + dynamic meta ──────────────────────────────
  const loadAllPermissions = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const [permRes, metaRes] = await Promise.all([
        fetch('/api/role-permissions', { cache: 'no-store' }),
        fetch('/api/workforce/meta', { cache: 'no-store' }),
      ]);

      if (permRes.ok) {
        const result = await permRes.json();
        if (result.success) {
          const map = {};
          (result.data || []).forEach((item) => {
            const key = `${item.role}||${item.department || ''}`;
            map[key] = mergePermissions(item.permissions);
          });
          setPermsMap(map);
        }
      }

      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta.success) {
          const merged = buildDeptData(meta.data?.role_dept_pairs || []);
          setDeptData(merged);
          const allRoles = [...new Set(Object.values(merged).flatMap(d => d.roles))].sort(
            (a, b) => {
              const ai = DESIGNATION_ORDER.indexOf(a); const bi = DESIGNATION_ORDER.indexOf(b);
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            }
          );
          setAllDesignations(allRoles);
        }
      }
    } catch { /* silent */ }
    finally { setLoadingPerms(false); }
  }, []);

  useEffect(() => { if (!loading) loadAllPermissions(); }, [loading, loadAllPermissions]);

  // ── Aggregated permissions across all active keys ───────────────────────────
  function getAggregated(moduleKey, col) {
    let on = 0;
    activeKeys.forEach(k => {
      const p = permsMap[k] || emptyPermissions();
      if (p.sheets[moduleKey]?.[col]) on++;
    });
    return { allOn: on === activeKeys.length, someOn: on > 0 };
  }

  function getAggregatedAll(moduleKey) {
    let on = 0;
    activeKeys.forEach(k => {
      const p = permsMap[k] || emptyPermissions();
      if (PERM_COLS.every(c => p.sheets[moduleKey]?.[c])) on++;
    });
    return { allOn: on === activeKeys.length, someOn: on > 0 };
  }

  function getAggregatedManageMembers() {
    let on = 0;
    activeKeys.forEach(k => {
      const p = permsMap[k] || emptyPermissions();
      if (p.manage_members) on++;
    });
    return { allOn: on === activeKeys.length, someOn: on > 0 };
  }

  // ── Permission toggles (apply to ALL active keys) ─────────────────────────
  function toggleSheetPerm(moduleKey, col) {
    const { allOn } = getAggregated(moduleKey, col);
    const newVal = !allOn;
    setPermsMap(prev => {
      const next = { ...prev };
      activeKeys.forEach(k => {
        const p = next[k] || emptyPermissions();
        let updated = { ...p.sheets[moduleKey], [col]: newVal };

        // cascading rules: create→edit+view, edit→view, unview→unedit+uncreate, unedit→uncreate
        if (newVal) {
          if (col === 'create') { updated.view = true; updated.edit = true; }
          if (col === 'edit')   { updated.view = true; }
        } else {
          if (col === 'view')   { updated.edit = false; updated.create = false; }
          if (col === 'edit')   { updated.create = false; }
        }

        next[k] = { ...p, sheets: { ...p.sheets, [moduleKey]: updated } };
      });
      return next;
    });
  }

  function toggleAllForModule(moduleKey) {
    const { allOn } = getAggregatedAll(moduleKey);
    const newVal = !allOn;
    setPermsMap(prev => {
      const next = { ...prev };
      activeKeys.forEach(k => {
        const p = next[k] || emptyPermissions();
        const newSheet = Object.fromEntries(PERM_COLS.map(c => [c, newVal]));
        next[k] = { ...p, sheets: { ...p.sheets, [moduleKey]: newSheet } };
      });
      return next;
    });
  }

  function toggleManageMembers() {
    const { allOn } = getAggregatedManageMembers();
    const newVal = !allOn;
    setPermsMap(prev => {
      const next = { ...prev };
      activeKeys.forEach(k => {
        const p = next[k] || emptyPermissions();
        next[k] = { ...p, manage_members: newVal };
      });
      return next;
    });
  }

  // ── Save (bulk-save all active combos) ──────────────────────────────────────
  async function handleSave() {
    if (!hasSelection || !canEdit) return;
    setSaveMsg(''); setIsSaveError(false); setSaving(true);
    try {
      const results = await Promise.all(
        activeKeys.map(k => {
          const [des, dept] = k.split('||');
          const perms = permsMap[k] || emptyPermissions();
          // Encode / → __SLASH__ and ' ' → __SP__ so path segments are pure alphanumeric+underscore
          const safeEncode = (s) => s.replace(/\//g, '__SLASH__').replace(/ /g, '__SP__');
          const safeDes  = safeEncode(des);
          const safeDept = safeEncode(dept);
          return fetch(
            `/api/role-permissions/${safeDes}/${safeDept}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ permissions: perms }),
            }
          ).then(r => r.json().then(j => ({ ok: r.ok, ...j })));
        })
      );
      const failed = results.filter(r => !r.ok || !r.success);
      if (failed.length > 0) {
        setSaveMsg(`${failed.length} of ${results.length} failed to save.`); setIsSaveError(true);
      } else {
        setSaveMsg(`Saved ${results.length} combo${results.length > 1 ? 's' : ''} successfully.`);
      }
    } catch {
      setSaveMsg('Unable to save. Please try again.'); setIsSaveError(true);
    } finally { setSaving(false); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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

      <div className="mx-auto px-4 py-8 max-w-[1400px]">
        <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-soft-border bg-cloud-gray flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-trust-blue shrink-0" />
              <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest whitespace-nowrap">Permissions</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-midnight-ink whitespace-nowrap">Designation</label>
              <MultiSelect
                options={allDesignations}
                selected={selectedDesignations}
                onChange={v => { setSelectedDesignations(v); setSaveMsg(''); }}
                placeholder="-- Select --"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-midnight-ink whitespace-nowrap">Department</label>
              <MultiSelect
                options={availableDepts}
                selected={selectedDepts}
                onChange={v => { setSelectedDepts(v); setSaveMsg(''); }}
                disabled={selectedDesignations.length === 0}
                placeholder={selectedDesignations.length === 0 ? '-- Select designation first --' : '-- Select --'}
              />
            </div>

            {loadingPerms && <div className="w-4 h-4 border-2 border-trust-blue border-t-transparent rounded-full animate-spin" />}

            {hasSelection && canEdit && (
              <div className="flex items-center gap-3 ml-auto">
                {saveMsg && (
                  <p className={`text-xs font-medium ${isSaveError ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-4 rounded-md bg-trust-blue hover:bg-deep-blue text-white text-xs font-semibold transition disabled:opacity-60 whitespace-nowrap"
                >
                  {saving ? 'Saving\u2026' : `Save (${activeKeys.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Selected chips */}
          {(selectedDesignations.length > 0 || selectedDepts.length > 0) && (
            <div className="flex items-center gap-2 px-5 py-2 border-b border-soft-border flex-wrap">
              {selectedDesignations.map(d => (
                <span key={`d-${d}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-trust-blue/10 text-trust-blue text-[10px] font-semibold">
                  {d}
                  <button onClick={() => setSelectedDesignations(prev => prev.filter(v => v !== d))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedDesignations.length > 0 && selectedDepts.length > 0 && (
                <span className="text-[10px] text-cool-gray font-medium">&times;</span>
              )}
              {selectedDepts.map(d => (
                <span key={`dept-${d}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">
                  {d}
                  <button onClick={() => setSelectedDepts(prev => prev.filter(v => v !== d))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {activeKeys.length > 0 && (
                <span className="text-[10px] text-cool-gray ml-auto">{activeKeys.length} combo{activeKeys.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Table */}
          {hasSelection ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-cloud-gray/60 border-b border-soft-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-midnight-ink sticky left-0 bg-cloud-gray/60 min-w-[180px]">Module</th>
                    {PERM_COLS.map(col => (
                      <th key={col} className="px-3 py-2.5 font-semibold text-midnight-ink capitalize text-center min-w-[70px]">{col}</th>
                    ))}
                    <th className="px-3 py-2.5 font-semibold text-midnight-ink text-center min-w-[50px]">All</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(({ key, label }, idx) => {
                    const aggAll = getAggregatedAll(key);
                    return (
                      <tr key={key} className={`border-b border-soft-border/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-cloud-gray/30'}`}>
                        <td className="px-4 py-2 font-medium text-midnight-ink sticky left-0 bg-inherit">{label}</td>
                        {PERM_COLS.map(col => {
                          const { allOn, someOn } = getAggregated(key, col);
                          return (
                            <td key={col} className="px-3 py-2 text-center">
                              <TriCheckbox
                                allOn={allOn}
                                someOn={someOn}
                                onChange={() => canEdit && toggleSheetPerm(key, col)}
                                disabled={!canEdit}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <TriCheckbox
                            allOn={aggAll.allOn}
                            someOn={aggAll.someOn}
                            onChange={() => canEdit && toggleAllForModule(key)}
                            disabled={!canEdit}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Manage Members */}
              <div className="px-4 py-3 border-t border-soft-border flex items-center justify-between">
                <label className={`flex items-center gap-3 select-none ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  {(() => { const { allOn, someOn } = getAggregatedManageMembers(); return (
                    <TriCheckbox allOn={allOn} someOn={someOn} onChange={() => canEdit && toggleManageMembers()} disabled={!canEdit} />
                  ); })()}
                  <span className="text-xs font-medium text-midnight-ink">Manage Members access</span>
                </label>
                {!canEdit && (
                  <p className="text-xs text-cool-gray italic">You have view-only access to default permissions.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-cool-gray text-sm">
              {selectedDesignations.length === 0
                ? 'Select designation(s) and department(s) to view permissions.'
                : 'Select department(s) to load permissions.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
